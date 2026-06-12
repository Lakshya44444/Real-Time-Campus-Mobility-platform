"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRidesSocket } from "@/lib/useSocket";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  userType: "PASSENGER" | "DRIVER";
}

interface Ride {
  id: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  estimatedFare: number | null;
  createdAt: string;
  passenger?: { firstName: string; lastName: string };
  rating?: { rating: number } | null;
}

interface Stats {
  totalRides: number;
  averageRating: number;
  totalEarnings: number;
  isOnline: boolean;
}

export default function DriverDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalRides: 0,
    averageRating: 0,
    totalEarnings: 0,
    isOnline: false,
  });
  const [requests, setRequests] = useState<Ride[]>([]);
  const [activeRides, setActiveRides] = useState<Ride[]>([]);
  const [history, setHistory] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const authHeaders = useCallback(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/drivers/status", { headers: authHeaders() });
    if (res.ok) {
      const { driver } = await res.json();
      setStats({
        totalRides: driver.totalRides,
        averageRating: driver.averageRating,
        totalEarnings: driver.totalEarnings,
        isOnline: driver.isOnline,
      });
    }
  }, [authHeaders]);

  const loadRequests = useCallback(async () => {
    const res = await fetch("/api/rides/requests", { headers: authHeaders() });
    if (res.ok) setRequests((await res.json()).rides);
  }, [authHeaders]);

  const loadRides = useCallback(async () => {
    const res = await fetch("/api/rides", { headers: authHeaders() });
    if (res.ok) {
      const rides: Ride[] = (await res.json()).rides;
      setActiveRides(rides.filter((r) => ["ACCEPTED", "IN_PROGRESS"].includes(r.status)));
      setHistory(rides.filter((r) => ["COMPLETED", "CANCELLED"].includes(r.status)));
    }
  }, [authHeaders]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/auth/login");
      return;
    }
    const parsed: User = JSON.parse(userData);
    if (parsed.userType !== "DRIVER") {
      router.push("/dashboard/passenger");
      return;
    }
    setUser(parsed);
    Promise.all([loadStats(), loadRequests(), loadRides()]).finally(() => setLoading(false));
  }, [router, token, loadStats, loadRequests, loadRides]);

  // Real-time: new requests appear instantly; status changes refresh active list.
  useRidesSocket(user?.id ?? null, {
    "ride:requested": (data) => {
      const ride = data as Ride;
      if (stats.isOnline) setRequests((prev) => [ride, ...prev.filter((r) => r.id !== ride.id)]);
    },
    "ride:status_updated": () => {
      loadRequests();
      loadRides();
    },
  });

  async function toggleOnline() {
    const res = await fetch("/api/drivers/status", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        isOnline: !stats.isOnline,
        currentLatitude: 29.8543,
        currentLongitude: 77.8880,
      }),
    });
    if (res.ok) {
      setStats((s) => ({ ...s, isOnline: !s.isOnline }));
      loadRequests();
    }
  }

  async function updateRide(id: string, status: string) {
    // Optimistic UI: update local state immediately so the button feels instant,
    // then confirm with the server and reconcile in the background.
    const accepted = requests.find((r) => r.id === id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setActiveRides((prev) => {
      if (status === "ACCEPTED" && accepted) {
        return [{ ...accepted, status: "ACCEPTED" }, ...prev];
      }
      if (status === "COMPLETED") {
        return prev.filter((r) => r.id !== id);
      }
      return prev.map((r) => (r.id === id ? { ...r, status } : r));
    });

    const res = await fetch(`/api/rides/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      alert(error || "Action failed");
    }
    // Background refresh (not awaited) keeps stats/history accurate without
    // blocking the button.
    loadStats();
    loadRequests();
    loadRides();
  }

  function logout() {
    localStorage.clear();
    router.push("/auth/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
            <p className="text-gray-500 text-sm">Welcome back, {user.firstName}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleOnline}
              className={`px-5 py-2 rounded-lg font-semibold transition border ${
                stats.isOnline
                  ? "bg-green-50 text-green-700 border-green-300"
                  : "bg-gray-50 text-gray-600 border-gray-300"
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  stats.isOnline ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              {stats.isOnline ? "Online" : "Offline"}
            </button>
            <button onClick={logout} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Stat cards */}
        <div className="grid sm:grid-cols-3 gap-6">
          <StatCard label="Total Rides" value={stats.totalRides.toString()} accent="text-blue-600" />
          <StatCard label="Average Rating" value={stats.averageRating.toFixed(1)} accent="text-amber-500" />
          <StatCard label="Total Earnings" value={`₹${stats.totalEarnings.toFixed(0)}`} accent="text-green-600" />
        </div>

        {/* Incoming requests */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Incoming Ride Requests</h2>
            {stats.isOnline && (
              <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live
              </span>
            )}
          </div>
          {!stats.isOnline ? (
            <p className="text-gray-500 text-sm">Go online to receive ride requests.</p>
          ) : requests.length === 0 ? (
            <p className="text-gray-500 text-sm">Waiting for ride requests...</p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">
                      {r.passenger?.firstName} {r.passenger?.lastName}
                    </p>
                    <p className="text-gray-600">{r.pickupAddress} → {r.dropAddress}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.estimatedFare != null && (
                      <span className="text-sm font-semibold text-gray-700">₹{r.estimatedFare.toFixed(0)}</span>
                    )}
                    <button
                      onClick={() => updateRide(r.id, "ACCEPTED")}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active rides */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Active Rides</h2>
          {activeRides.length === 0 ? (
            <p className="text-gray-500 text-sm">No active rides.</p>
          ) : (
            <div className="space-y-3">
              {activeRides.map((r) => (
                <div key={r.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">{r.pickupAddress} → {r.dropAddress}</p>
                    <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                      {r.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {r.status === "ACCEPTED" && (
                      <button
                        onClick={() => updateRide(r.id, "IN_PROGRESS")}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                      >
                        Start Ride
                      </button>
                    )}
                    {r.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => updateRide(r.id, "COMPLETED")}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* History */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Ride History</h2>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm">No completed rides yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4 font-medium">Route</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Rating</th>
                    <th className="py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-gray-900">{r.pickupAddress} → {r.dropAddress}</td>
                      <td className="py-2 pr-4 text-gray-600">{r.status}</td>
                      <td className="py-2 pr-4 text-gray-600">{r.rating ? `${r.rating.rating}/5` : "—"}</td>
                      <td className="py-2 text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
