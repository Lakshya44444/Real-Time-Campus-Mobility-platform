"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { RideCard } from "@/components/common/Cards";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { showToast } from "@/components/common/Toast";

interface Ride {
  id: string;
  pickupAddress: string;
  dropAddress: string;
  status: string;
  actualFare?: number;
  driver?: {
    firstName: string;
    lastName: string;
  };
  rating?: { rating: number; feedback?: string | null } | null;
  createdAt: string;
}

export default function MyRidesPage() {
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [filter, setFilter] = useState<"all" | "completed" | "active" | "cancelled">("all");
  const [ratingValue, setRatingValue] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  async function submitRating() {
    if (!selectedRide || ratingValue === 0) {
      showToast("Please select a star rating", "error");
      return;
    }
    setSubmittingRating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/rides/${selectedRide.id}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: ratingValue, feedback: feedback || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to submit rating", "error");
        return;
      }
      showToast("Thanks for your rating!", "success");
      setRatingValue(0);
      setFeedback("");
      setSelectedRide(null);
      fetchRides();
    } catch {
      showToast("An error occurred. Please try again.", "error");
    } finally {
      setSubmittingRating(false);
    }
  }

  useEffect(() => {
    fetchRides();
  }, []);

  async function fetchRides() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/rides", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        router.push("/auth/login");
        return;
      }

      const data = await response.json();
      setRides(data.rides || []);
    } catch (error) {
      showToast("Failed to fetch rides", "error");
    } finally {
      setLoading(false);
    }
  }

  const filteredRides = rides.filter((ride) => {
    if (filter === "all") return true;
    if (filter === "completed") return ride.status === "COMPLETED";
    if (filter === "active")
      return ["REQUESTED", "ACCEPTED", "IN_PROGRESS"].includes(ride.status);
    if (filter === "cancelled") return ride.status === "CANCELLED";
    return true;
  });

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">My Rides</h1>
          <p className="text-gray-600">View your ride history</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter Buttons */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {(["all", "active", "completed", "cancelled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:border-gray-400"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Rides List */}
        {filteredRides.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 text-lg">No rides found</p>
            <button
              onClick={() => router.push("/request-ride")}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Book a Ride
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRides.map((ride) => (
              <div
                key={ride.id}
                onClick={() => { setSelectedRide(ride); setRatingValue(0); setFeedback(""); }}
                className="cursor-pointer"
              >
                <RideCard
                  id={ride.id}
                  pickupAddress={ride.pickupAddress}
                  dropAddress={ride.dropAddress}
                  status={ride.status}
                  fare={ride.actualFare}
                  driverName={
                    ride.driver
                      ? `${ride.driver.firstName} ${ride.driver.lastName}`
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        )}

        {/* Ride Details Modal */}
        {selectedRide && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedRide(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Ride Details</h2>
                <button
                  onClick={() => setSelectedRide(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Pickup</p>
                  <p className="font-semibold">{selectedRide.pickupAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Drop-off</p>
                  <p className="font-semibold">{selectedRide.dropAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold">{selectedRide.status}</p>
                </div>
                {selectedRide.driver && (
                  <div>
                    <p className="text-sm text-gray-600">Driver</p>
                    <p className="font-semibold">
                      {selectedRide.driver.firstName} {selectedRide.driver.lastName}
                    </p>
                  </div>
                )}
                {selectedRide.actualFare && (
                  <div>
                    <p className="text-sm text-gray-600">Fare</p>
                    <p className="text-xl font-bold text-green-600">
                      ₹{selectedRide.actualFare}
                    </p>
                  </div>
                )}
              </div>

              {selectedRide.status === "COMPLETED" && !selectedRide.actualFare && (
                <button
                  onClick={() => {
                    setShowPayment(true);
                  }}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 mb-3"
                >
                  Pay Now
                </button>
              )}

              {/* Rating section — only for completed rides not yet rated */}
              {selectedRide.status === "COMPLETED" && (
                <div className="border-t border-gray-200 pt-4 mb-3">
                  {selectedRide.rating ? (
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Your rating</p>
                      <div className="flex justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} filled={s <= selectedRide.rating!.rating} />
                        ))}
                      </div>
                      {selectedRide.rating.feedback && (
                        <p className="text-sm text-gray-500 mt-2 italic">"{selectedRide.rating.feedback}"</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-900 mb-2">Rate your ride</p>
                      <div className="flex justify-center gap-2 mb-3">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button key={s} type="button" onClick={() => setRatingValue(s)} className="transition hover:scale-110">
                            <Star filled={s <= ratingValue} size="lg" />
                          </button>
                        ))}
                      </div>
                      <textarea
                        placeholder="Optional feedback..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 resize-none"
                      />
                      <button
                        onClick={submitRating}
                        disabled={submittingRating || ratingValue === 0}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                      >
                        {submittingRating ? "Submitting..." : "Submit Rating"}
                      </button>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={() => setSelectedRide(null)}
                className="w-full mt-3 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPayment && selectedRide && (
          <PaymentModal
            rideId={selectedRide.id}
            amount={selectedRide.actualFare || 250}
            onPaymentComplete={() => {
              setShowPayment(false);
              setSelectedRide(null);
              showToast("Payment successful!", "success");
            }}
            onClose={() => setShowPayment(false)}
          />
        )}
      </main>
    </div>
  );
}

function Star({ filled, size = "sm" }: { filled: boolean; size?: "sm" | "lg" }) {
  return (
    <svg
      className={`${size === "lg" ? "w-9 h-9" : "w-5 h-5"} ${filled ? "text-amber-400" : "text-gray-300"}`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.28 3.94a1 1 0 00.95.69h4.15c.97 0 1.37 1.24.59 1.81l-3.36 2.44a1 1 0 00-.36 1.12l1.28 3.94c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 00-1.18 0l-3.36 2.44c-.79.57-1.84-.2-1.54-1.12l1.28-3.94a1 1 0 00-.36-1.12L2.33 9.37c-.78-.57-.38-1.81.59-1.81h4.15a1 1 0 00.95-.69l1.28-3.94z" />
    </svg>
  );
}
