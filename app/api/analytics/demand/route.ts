import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get all completed rides to analyze
    const rides = await prisma.ride.findMany({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      select: {
        createdAt: true,
        pickupAddress: true,
        pickupLatitude: true,
        pickupLongitude: true,
      },
    });

    // Calculate hourly demand
    const hourlyDemand: { [key: number]: number } = {};
    for (let i = 0; i < 24; i++) {
      hourlyDemand[i] = 0;
    }

    rides.forEach((ride) => {
      const hour = ride.createdAt.getHours();
      hourlyDemand[hour]++;
    });

    // Convert to array format for charts
    const hourlyData = Object.entries(hourlyDemand).map(([hour, count]) => ({
      hour: `${hour}:00`,
      demand: count,
    }));

    // Calculate popular pickup locations
    const locationMap: { [key: string]: number } = {};
    rides.forEach((ride) => {
      const location = ride.pickupAddress.split(",")[0]; // First part of address
      locationMap[location] = (locationMap[location] || 0) + 1;
    });

    const topLocations = Object.entries(locationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([location, count]) => ({
        location,
        rides: count,
      }));

    // Calculate daily demand for the last 7 days
    const dailyDemand: { [key: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      dailyDemand[key] = 0;
    }

    rides.forEach((ride) => {
      const key = ride.createdAt.toISOString().split("T")[0];
      if (key in dailyDemand) {
        dailyDemand[key]++;
      }
    });

    const dailyData = Object.entries(dailyDemand).map(([date, count]) => ({
      date,
      rides: count,
    }));

    // Calculate peak hours
    const peakHours = Object.entries(hourlyDemand)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({
        hour: `${hour}:00`,
        demand: count,
      }));

    return NextResponse.json({
      hourlyDemand: hourlyData,
      dailyDemand: dailyData,
      topLocations,
      peakHours,
      totalRides: rides.length,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
