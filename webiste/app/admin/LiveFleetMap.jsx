"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import styles from "./admin.module.css";

const FRESH_LOCATION_MS = 5 * 60 * 1000;

function coordinates(value) {
  const lat = Number(value?.lat ?? value?.latitude);
  const lng = Number(value?.lng ?? value?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}

function driverCoordinates(driver) {
  return coordinates(driver?.partnerProfile?.currentLocation);
}

function orderCoordinates(stop) {
  return coordinates(stop?.location || stop);
}

function locationAgeLabel(updatedAt) {
  if (!updatedAt) return "Update time unavailable";
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  if (!Number.isFinite(ageMs)) return "Update time unavailable";
  const minutes = Math.max(0, Math.floor(ageMs / 60_000));
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  return `Updated ${Math.floor(hours / 24)} day(s) ago`;
}

function MapController({ selectedPosition, allPositions }) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 50);
    return () => window.clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (selectedPosition) {
      map.flyTo(selectedPosition, Math.max(map.getZoom(), 14), { duration: 0.55 });
      return;
    }

    if (allPositions.length > 1) {
      map.fitBounds(allPositions, { padding: [50, 50], maxZoom: 14 });
    } else if (allPositions.length === 1) {
      map.setView(allPositions[0], 14);
    }
  }, [allPositions, map, selectedPosition]);

  return null;
}

export default function LiveFleetMap({ drivers, selectedDriverId, onSelectDriver }) {
  const locatedDrivers = useMemo(
    () => drivers
      .map((driver) => ({ driver, position: driverCoordinates(driver) }))
      .filter((item) => item.position),
    [drivers],
  );

  const selectedDriver = drivers.find((driver) => driver._id === selectedDriverId) || null;
  const selectedPosition = driverCoordinates(selectedDriver);
  const pickupPosition = orderCoordinates(selectedDriver?.activeOrder?.pickup);
  const dropPosition = orderCoordinates(selectedDriver?.activeOrder?.drop);
  const routePositions = pickupPosition && dropPosition ? [pickupPosition, dropPosition] : null;
  const initialCenter = selectedPosition || locatedDrivers[0]?.position;

  if (!initialCenter) {
    return <div className={styles.mapEmptyNotice}>No drivers in this view have sent GPS coordinates yet.</div>;
  }

  return (
    <>
      <MapContainer
        center={initialCenter}
        zoom={locatedDrivers.length ? 13 : 11}
        className={styles.realMap}
        scrollWheelZoom
        preferCanvas
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapController
          selectedPosition={selectedPosition}
          allPositions={locatedDrivers.map((item) => item.position)}
        />

        {routePositions && (
          <>
            <Polyline positions={routePositions} pathOptions={{ color: "#6d28d9", weight: 5, opacity: 0.8, dashArray: "10 8" }} />
            <CircleMarker center={pickupPosition} radius={8} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#059669", fillOpacity: 1 }}>
              <Tooltip permanent direction="top">Pickup</Tooltip>
            </CircleMarker>
            <CircleMarker center={dropPosition} radius={8} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#e11d48", fillOpacity: 1 }}>
              <Tooltip permanent direction="top">Drop</Tooltip>
            </CircleMarker>
          </>
        )}

        {locatedDrivers.map(({ driver, position }) => {
          const location = driver.partnerProfile?.currentLocation;
          const updatedAt = location?.updatedAt;
          const updatedTime = updatedAt ? new Date(updatedAt).getTime() : 0;
          const fresh = updatedTime > 0 && Date.now() - updatedTime <= FRESH_LOCATION_MS;
          const online = Boolean(driver.partnerProfile?.online);
          const selected = driver._id === selectedDriverId;
          const markerColor = selected ? "#6d28d9" : online && fresh ? "#059669" : online ? "#d97706" : "#64748b";

          return (
            <CircleMarker
              key={driver._id}
              center={position}
              radius={selected ? 11 : 8}
              pathOptions={{
                color: "#ffffff",
                weight: selected ? 4 : 3,
                fillColor: markerColor,
                fillOpacity: 1,
              }}
              eventHandlers={{ click: () => onSelectDriver(driver._id) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent={selected}>
                {driver.name} · {Number(location?.speed || 0)} km/h
              </Tooltip>
              <Popup>
                <div className={styles.mapPopup}>
                  <strong>{driver.name}</strong>
                  <span>{driver.partnerProfile?.vehicleNumber || "Vehicle number not added"}</span>
                  <span>{online ? "Online" : "Offline"} · {locationAgeLabel(updatedAt)}</span>
                  <span>{position[0].toFixed(5)}, {position[1].toFixed(5)}</span>
                  <button type="button" onClick={() => onSelectDriver(driver._id)}>Select driver</button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className={styles.mapLegend} aria-label="Map status legend">
        <span><i className={styles.legendLive}></i>Live</span>
        <span><i className={styles.legendStale}></i>Stale GPS</span>
        <span><i className={styles.legendOffline}></i>Offline</span>
      </div>
    </>
  );
}
