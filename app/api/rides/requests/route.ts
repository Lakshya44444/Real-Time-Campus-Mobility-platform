import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET - Open (unassigned) ride requests for online drivers to pick up.
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

    // Only drivers should be polling open requests.
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: decoded.userId },
    });
    if (!driverProfile) {
      return NextResponse.json({ error: "User is not a driver" }, { status: 403 });
    }

    const rides = await prisma.ride.findMany({
      relationLoadStrategy: "join",
      where: { status: "REQUESTED", driverId: null, scheduledTime: null },
      include: {
        passenger: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    return NextResponse.json({ rides });
  } catch (error) {
    console.error("Get ride requests error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
