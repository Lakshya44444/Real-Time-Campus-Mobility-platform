"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { LoadingSpinner, PageLoader } from "@/components/common/LoadingSpinner";
import { StatCard } from "@/components/common/Cards";

interface AnalyticsData {
  hourlyDemand: Array<{ hour: string; demand: number }>;
  dailyDemand: Array<{ date: string; rides: number }>;
  topLocations: Array<{ location: string; rides: number }>;
  peakHours: Array<{ hour: string; demand: number }>;
  totalRides: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/analytics/demand", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        router.push("/auth/login");
        return;
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <PageLoader />;
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">No data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Demand Analytics</h1>
          <p className="text-gray-600">Platform-wide ride demand insights</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Key Metrics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Rides (30 days)"
            value={data.totalRides}
            color="blue"
          />
          <StatCard
            title="Peak Hour"
            value={data.peakHours[0]?.hour || "N/A"}
            color="green"
          />
          <StatCard
            title="Top Location"
            value={data.topLocations[0]?.location || "N/A"}
            color="purple"
          />
        </div>

        {/* Hourly Demand Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Hourly Demand Pattern</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.hourlyDemand}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="demand" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Demand Trend */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Daily Ride Trend (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.dailyDemand}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="rides"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Pickup Locations */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Top Pickup Locations</h2>
            <div className="space-y-3">
              {data.topLocations.map((location, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-gray-700">{location.location}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(location.rides / Math.max(...data.topLocations.map((l) => l.rides))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="font-semibold text-gray-900">
                      {location.rides}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Hours */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Peak Hours</h2>
            <div className="space-y-3">
              {data.peakHours.map((peak, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{peak.hour}</p>
                      <p className="text-sm text-gray-600">
                        Rank #{idx + 1} peak hour
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {peak.demand}
                      </p>
                      <p className="text-xs text-gray-600">rides</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Insights Section */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-green-900 mb-3">Insights</h3>
          <ul className="space-y-2 text-sm text-green-800">
            <li>
              ✓ Peak demand occurs at{" "}
              <strong>{data.peakHours[0]?.hour}</strong>
            </li>
            <li>
              ✓ Most popular pickup location:{" "}
              <strong>{data.topLocations[0]?.location}</strong>
            </li>
            <li>
              ✓ Total rides in last 30 days: <strong>{data.totalRides}</strong>
            </li>
            <li>
              ✓ Average daily rides:{" "}
              <strong>
                {(data.totalRides / 30).toFixed(1)}
              </strong>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
