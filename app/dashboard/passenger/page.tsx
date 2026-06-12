"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRidesSocket } from "@/lib/useSocket";

interface User {
  id: string;
  firstName: string;
  userType: "PASSENGER" | "DRIVER";
}

interface Ride {
  id: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  estimatedFare: number | null;
  createdAt: string;
  driver?: { firstName: string; lastName: string } | null;
  rating?: { rating: number } | null;
}

const STATUS_STYLES: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function PassengerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [active, setActive] = useState<Ride[]>([]);
  const [recent, setRecent] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const loadRides = useCallback(async () => {
    const res = await fetch("/api/rides", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const rides: Ride[] = (await res.json()).rides;
      setActive(rides.filter((r) => ["REQUESTED", "ACCEPTED", "IN_PROGRESS"].includes(r.status)));
      setRecent(rides.filter((r) => ["COMPLETED", "CANCELLED"].includes(r.status)).slice(0, 5));
    }
  }, [token]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/auth/login");
      return;
    }
    const parsed: User = JSON.parse(userData);
    if (parsed.userType !== "PASSENGER") {
      router.push("/dashboard/driver");
      return;
    }
    setUser(parsed);
    loadRides().finally(() => setLoading(false));
  }, [router, token, loadRides]);

  useRidesSocket(user?.id ?? null, {
    "ride:accepted": () => loadRides(),
    "ride:status_updated": () => loadRides(),
  });

  function logout() {
    localStorage.clear();
    router.push("/auth/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Gradient hero header */}
      <header className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-purple-400/20 rounded-full translate-y-1/2 blur-2xl" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 flex justify-between items-center">
          <div>
            <p className="text-blue-100 text-sm font-medium">Passenger Dashboard</p>
            <h1 className="text-3xl font-bold text-white mt-1">Welcome back, {user.firstName}</h1>
            <p className="text-blue-100/80 text-sm mt-1">Where would you like to go today?</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-lg font-medium backdrop-blur transition border border-white/20"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 -mt-6 pb-12 relative z-10 space-y-8">
        {/* Primary action cards with depth + hover lift */}
        <div className="grid sm:grid-cols-3 gap-6">
          <ActionCard
            href="/request-ride"
            title="Request a Ride"
            subtitle="Book a ride now"
            gradient="from-blue-500 to-blue-600"
            icon={<CarIcon />}
            primary
          />
          <ActionCard
            href="/schedule-ride"
            title="Schedule Ride"
            subtitle="Book in advance"
            gradient="from-purple-500 to-purple-600"
            icon={<CalendarIcon />}
          />
          <ActionCard
            href="/my-rides"
            title="My Rides"
            subtitle="View full history"
            gradient="from-emerald-500 to-emerald-600"
            icon={<RouteIcon />}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <InsightCard
            href="/analytics"
            title="Demand Analytics"
            subtitle="Platform-wide demand insights & trends"
            icon={<ChartIcon />}
          />
          <InsightCard
            href="/forecast"
            title="Demand Forecast"
            subtitle="ML-powered 7-day demand predictions"
            icon={<SparkIcon />}
          />
        </div>

        {/* Active rides */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Active Rides</h2>
            <span className="text-xs font-medium text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live
            </span>
          </div>
          {active.length === 0 ? (
            <EmptyState text="No active rides. Request one to get started." />
          ) : (
            <div className="space-y-3">
              {active.map((r) => (
                <div
                  key={r.id}
                  className="border border-gray-100 rounded-xl p-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white"
                >
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">{r.pickupAddress} → {r.dropAddress}</p>
                    <p className="text-gray-500">
                      {r.driver ? `Driver: ${r.driver.firstName} ${r.driver.lastName}` : "Finding a driver..."}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>
                    {r.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent rides */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Rides</h2>
          {recent.length === 0 ? (
            <EmptyState text="Your completed rides will appear here." />
          ) : (
            <div className="space-y-3">
              {recent.map((r) => (
                <div key={r.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-gray-900">{r.pickupAddress} → {r.dropAddress}</p>
                    <p className="text-gray-500">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                    {r.status === "COMPLETED" && !r.rating && (
                      <Link href="/my-rides" className="block text-blue-600 text-xs mt-1 font-medium">
                        Rate ride →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ActionCard({
  href, title, subtitle, gradient, icon, primary,
}: {
  href: string; title: string; subtitle: string; gradient: string; icon: React.ReactNode; primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative block p-6 rounded-2xl text-white bg-gradient-to-br ${gradient} shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${
        primary ? "ring-2 ring-white/40" : ""
      }`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-xl group-hover:scale-125 transition-transform" />
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-bold mb-1">{title}</h3>
        <p className="text-white/80 text-sm">{subtitle}</p>
      </div>
    </Link>
  );
}

function InsightCard({
  href, title, subtitle, icon,
}: {
  href: string; title: string; subtitle: string; icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>
        <span className="text-blue-600 text-sm font-medium mt-2 inline-block">Open →</span>
      </div>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
        <RouteIcon />
      </div>
      <p className="text-gray-500 text-sm">{text}</p>
    </div>
  );
}

/* Inline SVG icons (no external images, fully free, never broken) */
function CarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l2-5a2 2 0 012-1.5h10A2 2 0 0119 8l2 5m-18 0v4a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-4m-18 0h18M6 16.5h.01M18 16.5h.01" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function RouteIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6m4 6V9m4 10V5M5 19h14" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
