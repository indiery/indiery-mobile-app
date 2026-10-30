"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMaps } from "./googleMaps";
import styles from "./admin.module.css";

export default function OrderRouteMap({ orderId }) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const overlays = useRef([]);
  const [route, setRoute] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return undefined;
    const controller = new AbortController();
    setRoute(null);
    setError("");
    fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/route`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || "Could not load the route.");
        return data?.route;
      })
      .then(setRoute)
      .catch((cause) => {
        if (cause?.name !== "AbortError") setError(cause?.message || "Could not load the route.");
      });
    return () => controller.abort();
  }, [orderId]);

  const routePoints = useMemo(
    () => (route?.coordinates || [])
      .map((point) => ({ lat: Number(point.latitude), lng: Number(point.longitude) }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
    [route],
  );
  const locations = useMemo(
    () => (route?.locations || [])
      .map((point) => ({ lat: Number(point.latitude), lng: Number(point.longitude) }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
    [route],
  );

  useEffect(() => {
    if (!route || locations.length === 0 || !mapElement.current) return undefined;
    let disposed = false;
    let resizeObserver;
    loadGoogleMaps()
      .then((maps) => {
        if (disposed || !mapElement.current) return;
        const map = new maps.Map(mapElement.current, {
          center: locations[0],
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });
        mapInstance.current = map;
        overlays.current = [];
        if (route.source === "google_directions" && routePoints.length > 1) {
          overlays.current.push(new maps.Polyline({
            map,
            path: routePoints,
            geodesic: true,
            strokeColor: "#6d28d9",
            strokeOpacity: 0.95,
            strokeWeight: 5,
          }));
        }
        locations.forEach((position, index) => {
          const label = index === 0 ? "P" : index === locations.length - 1 ? "D" : String(index);
          const title = index === 0 ? "Pickup" : index === locations.length - 1 ? "Drop" : `Stop ${index}`;
          overlays.current.push(new maps.Marker({ map, position, label: { text: label, color: "#fff", fontWeight: "700" }, title }));
        });
        const bounds = new maps.LatLngBounds();
        locations.forEach((point) => bounds.extend(point));
        routePoints.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds, 36);
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => maps.event.trigger(map, "resize"));
          resizeObserver.observe(mapElement.current);
        }
      })
      .catch((cause) => {
        if (!disposed) setError(cause?.message || "Google Maps could not be loaded.");
      });
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      overlays.current.forEach((overlay) => overlay.setMap(null));
      overlays.current = [];
      mapInstance.current = null;
    };
  }, [route, routePoints, locations]);

  if (error) return <div className={styles.routeMapMessage}>{error}</div>;
  if (!route) return <div className={styles.routeMapMessage}>Loading Google Maps driving route…</div>;
  if (locations.length === 0) {
    return <div className={styles.routeMapMessage}>Google couldn’t confirm exact coordinates for this order’s addresses. Update the pickup/drop map pins and try again.</div>;
  }

  return (
    <div className={styles.assignmentRouteMap}>
      <div ref={mapElement} className={styles.assignmentRouteMapCanvas} role="application" aria-label="Google Maps order route" />
      <div className={styles.routeMapBadge}>
        {route.source === "google_directions" ? "Google driving route" : "Google-verified pins · driving route unavailable"}
      </div>
    </div>
  );
}
