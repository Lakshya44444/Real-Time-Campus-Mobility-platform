"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { showToast } from "@/components/common/Toast";
import { useRidesSocket } from "@/lib/useSocket";
import { CAMPUS_LOCATIONS, haversineKm, estimateFare } from "@/lib/locations";

const RideMap = dynamic(() => import("@/components/map/RideMap").then((m) => m.RideMap), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

type Step = "location" | "searching" | "accepted";

interface Ride {
  id: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  estimatedFare: number | null;
  driver?: { firstName: string; lastName: string } | null;
}

export default function RequestRidePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("location");
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [ride, setRide] = useState<Ride | null>(null);
  const [pickupIdx, setPickupIdx] = useState<number>(-1);
  const [dropIdx, setDropIdx] = useState<number>(-1);

  const user = useMemo(() => {
    if (typeof window === "undefined") return null;
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);

  const pickup = pickupIdx >= 0 ? CAMPUS_LOCATIONS[pickupIdx] : null;
  const drop = dropIdx >= 0 ? CAMPUS_LOCATIONS[dropIdx] : null;

  // Live fare preview using the same model the server uses.
  const farePreview = useMemo(() => {
    if (!pickup || !drop) return null;
    const km = haversineKm(pickup.lat, pickup.lng, drop.lat, drop.lng);
    return { km, fare: estimateFare(km) };
  }, [pickup, drop]);

  // Listen for a driver accepting this ride in real time.
  useRidesSocket(user?.id ?? null, {
    "ride:accepted": (data) => {
      const accepted = data as Ride;
      if (ride && accepted.id === ride.id) {
        setRide(accepted);
        setStep("accepted");
        showToast("A driver accepted your ride!", "success");
      }
    },
  });

  async function handleRequest() {
    if (!pickup || !drop) {
      showToast("Please select both pickup and drop locations", "error");
      return;
    }
    if (pickupIdx === dropIdx) {
      showToast("Pickup and drop cannot be the same", "error");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pickupAddress: pickup.name,
          pickupLatitude: pickup.lat,
          pickupLongitude: pickup.lng,
          dropAddress: drop.name,
          dropLatitude: drop.lat,
          dropLongitude: drop.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to create ride request", "error");
        return;
      }
      setRide(data.ride);
      setStep("searching");
      // Join the ride room so we also get generic status updates.
      // (ride:accepted is delivered to our personal room via the socket hook.)
    } catch {
      showToast("An error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function cancelSearch() {
    if (!ride) return;
    const token = localStorage.getItem("token");
    await fetch(`/api/rides/${ride.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "CANCELLED", cancellationReason: "Cancelled by passenger" }),
    });
    showToast("Ride request cancelled", "info");
    setRide(null);
    setStep("location");
  }

  function handlePaymentComplete() {
    showToast("Ride confirmed! Your driver is on the way.", "success");
    setShowPayment(false);
    setTimeout(() => router.push("/dashboard/passenger"), 1500);
  }

  const stepIndex = step === "location" ? 0 : step === "searching" ? 1 : 2;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Request a Ride</h1>

        {/* Step indicator */}
        <div className="flex gap-6 mb-8">
          {["Pick Location", "Find Driver", "Confirm & Pay"].map((label, idx) => (
            <div key={label} className={`flex items-center gap-2 ${idx === stepIndex ? "text-blue-600" : idx < stepIndex ? "text-green-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${idx < stepIndex ? "bg-green-600 text-white" : idx === stepIndex ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                {idx + 1}
              </div>
              <span className="hidden sm:inline font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: location */}
        {step === "location" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold mb-5 text-gray-900">Where to?</h2>
            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pickup Location</label>
                <select
                  value={pickupIdx}
                  onChange={(e) => setPickupIdx(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                >
                  <option value={-1}>Select pickup point</option>
                  {CAMPUS_LOCATIONS.map((loc, i) => (
                    <option key={loc.name} value={i}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Drop Location</label>
                <select
                  value={dropIdx}
                  onChange={(e) => setDropIdx(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                >
                  <option value={-1}>Select drop point</option>
                  {CAMPUS_LOCATIONS.map((loc, i) => (
                    <option key={loc.name} value={i}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live fare estimate */}
            {farePreview && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
                <div className="text-sm text-gray-600">
                  <p>Distance: <span className="font-semibold text-gray-900">{farePreview.km.toFixed(2)} km</span></p>
                  <p className="text-xs text-gray-500">Estimated fare (₹20 base + ₹12/km)</p>
                </div>
                <p className="text-3xl font-bold text-blue-600">₹{farePreview.fare}</p>
              </div>
            )}

            {pickup && drop && (
              <div className="mb-5">
                <RideMap
                  locations={[
                    { lat: pickup.lat, lng: pickup.lng, label: pickup.name, type: "pickup" },
                    { lat: drop.lat, lng: drop.lng, label: drop.name, type: "dropoff" },
                  ]}
                />
              </div>
            )}

            <button
              onClick={handleRequest}
              disabled={loading || !pickup || !drop}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 font-semibold"
            >
              {loading ? "Requesting..." : "Request Ride"}
            </button>
          </div>
        )}

        {/* Step 2: searching */}
        {step === "searching" && ride && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Finding a driver...</h2>
            <p className="text-gray-500 mb-1">{ride.pickupAddress} → {ride.dropAddress}</p>
            <p className="text-gray-900 font-semibold mb-6">Estimated fare: ₹{ride.estimatedFare}</p>
            <p className="text-xs text-gray-400 mb-6">
              A nearby online driver will accept shortly. Updates appear here live — no need to refresh.
            </p>
            <button onClick={cancelSearch} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
              Cancel Request
            </button>
          </div>
        )}

        {/* Step 3: accepted */}
        {step === "accepted" && ride && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Driver Assigned</h2>
                <p className="text-gray-500 text-sm">
                  {ride.driver ? `${ride.driver.firstName} ${ride.driver.lastName} is on the way` : "Your driver is on the way"}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-sm">
              <div className="flex justify-between py-1"><span className="text-gray-500">Route</span><span className="font-medium text-gray-900">{ride.pickupAddress} → {ride.dropAddress}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-500">Fare</span><span className="font-bold text-blue-600">₹{ride.estimatedFare}</span></div>
            </div>
            <button
              onClick={() => setShowPayment(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:shadow-lg transition font-semibold"
            >
              Proceed to Payment
            </button>
          </div>
        )}

        {showPayment && ride && (
          <PaymentModal
            rideId={ride.id}
            amount={ride.estimatedFare ?? 0}
            onPaymentComplete={handlePaymentComplete}
            onClose={() => setShowPayment(false)}
          />
        )}
      </div>
    </div>
  );
}
