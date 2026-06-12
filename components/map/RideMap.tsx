"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Location {
  lat: number;
  lng: number;
  label: string;
  type: "pickup" | "dropoff" | "driver";
}

interface RideMapProps {
  locations: Location[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
}

export function RideMap({
  locations,
  centerLat = 28.2439,
  centerLng = 79.6441,
  zoom = 14,
}: RideMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = L.map(mapContainer.current).setView([centerLat, centerLng], zoom);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map.current);

    // Add markers for each location
    locations.forEach((location) => {
      const color =
        location.type === "pickup"
          ? "#16a34a"
          : location.type === "dropoff"
          ? "#dc2626"
          : "#2563eb";

      const marker = L.marker([location.lat, location.lng], {
        title: location.label,
      }).addTo(map.current!);

      marker.bindPopup(
        `<div class="text-sm font-semibold"><span style="display:inline-block;width:9px;height:9px;border-radius:9999px;background:${color};margin-right:6px;vertical-align:middle"></span>${location.label}</div>`
      );
    });

    // Draw route if pickup and dropoff exist
    const pickup = locations.find((l) => l.type === "pickup");
    const dropoff = locations.find((l) => l.type === "dropoff");

    if (pickup && dropoff) {
      const route = L.polyline([
        [pickup.lat, pickup.lng],
        [dropoff.lat, dropoff.lng],
      ]);
      route.addTo(map.current);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [locations, centerLat, centerLng, zoom]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-96 rounded-lg shadow-lg border border-gray-200"
    />
  );
}

interface DriverLocationMapProps {
  drivers: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
  }>;
  pickupLat?: number;
  pickupLng?: number;
}

export function DriverLocationMap({
  drivers,
  pickupLat = 28.2439,
  pickupLng = 79.6441,
}: DriverLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = L.map(mapContainer.current).setView([pickupLat, pickupLng], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map.current);

    // Add pickup location
    L.marker([pickupLat, pickupLng], {
      title: "Your Location",
    })
      .addTo(map.current)
      .bindPopup("<div class='text-sm font-semibold'>Pickup Location</div>");

    // Add drivers
    drivers.forEach((driver) => {
      L.marker([driver.lat, driver.lng], {
        title: driver.name,
      })
        .addTo(map.current!)
        .bindPopup(`<div class='text-sm font-semibold'>Driver: ${driver.name}</div>`);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [drivers, pickupLat, pickupLng]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-96 rounded-lg shadow-lg border border-gray-200"
    />
  );
}
