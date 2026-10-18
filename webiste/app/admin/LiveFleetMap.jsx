"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMaps } from "./googleMaps";
import styles from "./admin.module.css";

const FRESH_LOCATION_MS = 5 * 60 * 1000;

function coordinates(value) {
  const lat = Number(value?.lat ?? value?.latitude);
  const lng = Number(value?.lng ?? value?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function driverCoordinates(driver) {
  return coordinates(driver?.partnerProfile?.currentLocation);
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

export default function LiveFleetMap({ drivers, selectedDriverId, onSelectDriver }) {
  const mapElement = useRef(null);
  const [mapError, setMapError] = useState("");
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState("");
  const locatedDrivers = useMemo(
    () => drivers.map((driver) => ({ driver, position: driverCoordinates(driver) })).filter((item) => item.position),
    [drivers],
  );
  const selectedDriver = drivers.find((driver) => driver._id === selectedDriverId) || null;
  const activeOrderId = selectedDriver?.activeOrder?._id;

  useEffect(() => {
    if (!activeOrderId) {
      setRoute(null);
      return undefined;
    }
    const controller = new AbortController();
    setRoute(null);
    setRouteError("");
    fetch(`/api/admin/orders/${encodeURIComponent(activeOrderId)}/route`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || "Route unavailable");
        return data?.route;
      })
      .then(setRoute)
      .catch((cause) => {
        if (cause?.name !== "AbortError") {
          setRoute(null);
          setRouteError(cause?.message || "Could not load the Google route.");
        }
      });
    return () => controller.abort();
  }, [activeOrderId]);

  const routePositions = useMemo(() => (route?.source === "google_directions" ? (route.coordinates || []) : [])
      .map((point) => ({ lat: Number(point.latitude), lng: Number(point.longitude) }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)), [route]);
  const routeLocations = useMemo(() => (route?.locations || [])
    .map((point) => ({ lat: Number(point.latitude), lng: Number(point.longitude) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)), [route]);

  useEffect(() => {
    if (!locatedDrivers.length || !mapElement.current) return undefined;
    let disposed = false;
    let resizeObserver;
    const overlays = [];
    loadGoogleMaps()
      .then((maps) => {
        if (disposed || !mapElement.current) return;
        setMapError("");
        const selectedPosition = selectedDriver ? driverCoordinates(selectedDriver) : null;
        const map = new maps.Map(mapElement.current, {
          center: selectedPosition || locatedDrivers[0].position,
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });

        if (routePositions.length > 1) {
          overlays.push(new maps.Polyline({
            map,
            path: routePositions,
            geodesic: true,
            strokeColor: "#6d28d9",
            strokeOpacity: 0.9,
            strokeWeight: 5,
          }));
        }
        routeLocations.forEach((position, index) => {
          const label = index === 0 ? "P" : index === routeLocations.length - 1 ? "D" : String(index);
          const title = index === 0 ? "Pickup" : index === routeLocations.length - 1 ? "Drop" : `Stop ${index}`;
          overlays.push(new maps.Marker({ map, position, label: { text: label, color: "#fff", fontWeight: "700" }, title }));
        });

        locatedDrivers.forEach(({ driver, position }) => {
          const location = driver.partnerProfile?.currentLocation;
          const updatedTime = location?.updatedAt ? new Date(location.updatedAt).getTime() : 0;
          const fresh = updatedTime > 0 && Date.now() - updatedTime <= FRESH_LOCATION_MS;
          const online = Boolean(driver.partnerProfile?.online);
          const selected = driver._id === selectedDriverId;
          const fillColor = selected ? "#6d28d9" : online && fresh ? "#059669" : online ? "#d97706" : "#64748b";
          const marker = new maps.Marker({
            map,
            position,
            title: `${driver.name} · ${driver.partnerProfile?.vehicleNumber || "Vehicle number not added"} · ${online ? "Online" : "Offline"} · ${locationAgeLabel(location?.updatedAt)}`,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: selected ? 10 : 8,
              fillColor,
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
            zIndex: selected ? 100 : 1,
          });
          marker.addListener("click", () => onSelectDriver(driver._id));
          overlays.push(marker);
        });

        const bounds = new maps.LatLngBounds();
        locatedDrivers.forEach(({ position }) => bounds.extend(position));
        routeLocations.forEach((position) => bounds.extend(position));
        routePositions.forEach((position) => bounds.extend(position));
        if (locatedDrivers.length > 1 || routePositions.length > 1 || routeLocations.length > 1) map.fitBounds(bounds, 48);
        else if (selectedPosition) map.setCenter(selectedPosition);
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => maps.event.trigger(map, "resize"));
          resizeObserver.observe(mapElement.current);
        }
      })
      .catch((cause) => {
        if (!disposed) setMapError(cause?.message || "Google Maps could not be loaded.");
      });
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      overlays.forEach((overlay) => overlay.setMap(null));
    };
  }, [drivers, locatedDrivers, onSelectDriver, routeLocations, routePositions, selectedDriver, selectedDriverId]);

  if (!locatedDrivers.length) {
    return <div className={styles.mapEmptyNotice}>No drivers in this view have sent GPS coordinates yet.</div>;
  }

  return (
    <>
      <div ref={mapElement} className={styles.realMap} role="application" aria-label="Google Maps live driver fleet" />
      {mapError && <div className={styles.googleMapError}>{mapError}</div>}
      {selectedDriver?.activeOrder && (
        <div className={styles.routeMapBadge}>
          {routeError || (route?.source === "google_directions"
            ? "Google driving route"
            : route?.locations?.length
              ? "Google-verified pins · driving route unavailable"
              : "Resolving exact Google Maps locations…")}
        </div>
      )}
      <div className={styles.mapLegend} aria-label="Map status legend">
        <span><i className={styles.legendLive}></i>Live</span>
        <span><i className={styles.legendStale}></i>Stale GPS</span>
        <span><i className={styles.legendOffline}></i>Offline</span>
      </div>
    </>
  );
}
