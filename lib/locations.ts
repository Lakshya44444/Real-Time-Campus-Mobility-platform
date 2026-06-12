// Preset campus locations (IIT Roorkee landmarks) with real-ish coordinates.
// Using a fixed list keeps the demo reliable (no external geocoding API) while
// still giving every pickup/drop pair a distinct distance — so fares vary.

export interface CampusLocation {
  name: string;
  lat: number;
  lng: number;
}

export const CAMPUS_LOCATIONS: CampusLocation[] = [
  { name: "Main Gate", lat: 29.8643, lng: 77.8960 },
  { name: "Mahatma Gandhi Central Library", lat: 29.8649, lng: 77.8967 },
  { name: "Lecture Hall Complex (LHC)", lat: 29.8657, lng: 77.8975 },
  { name: "Department of Computer Science", lat: 29.8665, lng: 77.8990 },
  { name: "Rajendra Bhawan (Hostel)", lat: 29.8688, lng: 77.8935 },
  { name: "Cautley Bhawan (Hostel)", lat: 29.8702, lng: 77.8951 },
  { name: "Ravindra Bhawan (Hostel)", lat: 29.8675, lng: 77.8912 },
  { name: "Sports Complex / Stadium", lat: 29.8721, lng: 77.8989 },
  { name: "Institute Hospital", lat: 29.8634, lng: 77.8998 },
  { name: "Tinkering Lab / Tech Block", lat: 29.8669, lng: 77.9015 },
  { name: "Multi Activity Centre (MAC)", lat: 29.8696, lng: 77.8973 },
  { name: "Railway Station Gate", lat: 29.8590, lng: 77.8880 },
];

// Straight-line distance in kilometres (Haversine).
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Fare model shared by client (preview) and server (authoritative):
// ₹20 base + ₹12 per km, minimum ₹25. Short campus hops are intentionally
// scaled up a little so distinct routes show distinct fares.
export function estimateFare(distanceKm: number): number {
  return Math.max(25, Math.round(20 + distanceKm * 12));
}
