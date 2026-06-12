"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { showToast } from "@/components/common/Toast";
import { CAMPUS_LOCATIONS, haversineKm, estimateFare } from "@/lib/locations";

export default function ScheduleRidePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pickupIdx, setPickupIdx] = useState(-1);
  const [dropIdx, setDropIdx] = useState(-1);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const pickup = pickupIdx >= 0 ? CAMPUS_LOCATIONS[pickupIdx] : null;
  const drop = dropIdx >= 0 ? CAMPUS_LOCATIONS[dropIdx] : null;

  const farePreview = useMemo(() => {
    if (!pickup || !drop) return null;
    const km = haversineKm(pickup.lat, pickup.lng, drop.lat, drop.lng);
    return { km, fare: estimateFare(km) };
  }, [pickup, drop]);

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!pickup || !drop) {
      showToast("Please select pickup and drop locations", "error");
      return;
    }
    if (pickupIdx === dropIdx) {
      showToast("Pickup and drop cannot be the same", "error");
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      showToast("Please select date and time", "error");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      const res = await fetch("/api/rides/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pickupAddress: pickup.name,
          pickupLatitude: pickup.lat,
          pickupLongitude: pickup.lng,
          dropAddress: drop.name,
          dropLatitude: drop.lat,
          dropLongitude: drop.lng,
          scheduledTime: scheduledDateTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to schedule ride", "error");
        return;
      }
      showToast("Ride scheduled successfully", "success");
      router.push("/dashboard/passenger");
    } catch {
      showToast("An error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Schedule a Ride</h1>

        <form onSubmit={handleSchedule} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Pickup Location</label>
              <select value={pickupIdx} onChange={(e) => setPickupIdx(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" required>
                <option value={-1}>Select pickup point</option>
                {CAMPUS_LOCATIONS.map((l, i) => <option key={l.name} value={i}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Drop Location</label>
              <select value={dropIdx} onChange={(e) => setDropIdx(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" required>
                <option value={-1}>Select drop point</option>
                {CAMPUS_LOCATIONS.map((l, i) => <option key={l.name} value={i}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Time</label>
              <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" required />
            </div>
          </div>

          {farePreview && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
              <div className="text-sm text-gray-600">
                <p>Distance: <span className="font-semibold text-gray-900">{farePreview.km.toFixed(2)} km</span></p>
                <p className="text-xs text-gray-500">Estimated fare</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">₹{farePreview.fare}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 font-semibold flex items-center justify-center">
            {loading ? <LoadingSpinner /> : "Schedule Ride"}
          </button>
        </form>

        <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="font-bold text-gray-900 mb-3">How it works</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Schedule rides up to 30 days in advance</li>
            <li>• Drivers receive your scheduled request near the pickup time</li>
            <li>• You'll see confirmation once a driver accepts</li>
            <li>• Cancel anytime before the scheduled time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
