"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { StatCard } from "@/components/common/Cards";

interface ForecastData {
  forecast: Array<{ date: string; forecast: number }>;
  confidence: number;
  avgDailyRides: number;
  method: string;
  peakHoursPredicted: Array<{ hour: string; demand: number }>;
  historicalAverage: number;
}

export default function ForecastPage() {
  const router = useRouter();
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecast();
  }, []);

  async function fetchForecast() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/analytics/forecast", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        router.push("/auth/login");
        return;
      }

      const forecastData = await response.json();
      setData(forecastData);
    } catch (error) {
      console.error("Failed to fetch forecast:", error);
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
        <div className="text-lg text-gray-600">No forecast data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Demand Forecast</h1>
          <p className="text-gray-600">
            7-day ride demand prediction using machine learning
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Key Metrics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Predicted Daily Avg"
            value={data.avgDailyRides}
            color="blue"
          />
          <StatCard
            title="Model Confidence"
            value={`${data.confidence}%`}
            color="green"
          />
          <StatCard
            title="Historical Average"
            value={data.historicalAverage}
            color="purple"
          />
        </div>

        {/* Forecast Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">7-Day Demand Forecast</h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.forecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [
                  value,
                  "Predicted Rides",
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#F59E0B"
                strokeWidth={3}
                dot={{ r: 5 }}
                name="Forecast"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Forecast Details */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Peak Hours Prediction */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Predicted Peak Hours</h3>
            <div className="space-y-3">
              {data.peakHoursPredicted.map((peak, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                >
                  <span className="font-semibold text-gray-900">
                    {peak.hour}
                  </span>
                  <span className="text-lg font-bold text-yellow-600">
                    {peak.demand}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Model Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Model Details</h3>
            <div className="space-y-3">
              <div className="border-b pb-3">
                <p className="text-sm text-gray-600">Forecasting Method</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {data.method.replace("_", " ")}
                </p>
              </div>
              <div className="border-b pb-3">
                <p className="text-sm text-gray-600">Model Confidence</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${data.confidence}%` }}
                    />
                  </div>
                  <span className="font-semibold text-gray-900">
                    {data.confidence}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Training Period</p>
                <p className="font-semibold text-gray-900">Last 30 days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-2">
            How Forecasting Works
          </h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>
              ✓ Uses exponential smoothing on 30 days of historical data
            </li>
            <li>✓ Predicts demand for the next 7 days</li>
            <li>✓ Identifies peak hours based on historical patterns</li>
            <li>✓ Confidence score indicates model reliability</li>
            <li>
              ✓ Updates automatically as new ride data becomes available
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
