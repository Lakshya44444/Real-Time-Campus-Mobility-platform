import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { emitNewRideRequest } from "@/lib/socket";
import { haversineKm, estimateFare } from "@/lib/locations";
import { z } from "zod";

const createRideSchema = z.object({
  pickupLatitude: z.number(),
  pickupLongitude: z.number(),
  pickupAddress: z.string(),
  dropLatitude: z.number(),
  dropLongitude: z.number(),
  dropAddress: z.string(),
  scheduledTime: z.string().datetime().optional(),
});

// GET - List rides for user
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

    const rides = await prisma.ride.findMany({
      // Load relations with a single JOINed query instead of one round-trip per
      // relation — important latency win against a remote database.
      relationLoadStrategy: "join",
      where: {
        OR: [
          { passengerId: decoded.userId },
          { driverId: decoded.userId },
        ],
      },
      include: {
        passenger: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        driver: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        rating: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ rides });
  } catch (error) {
    console.error("Get rides error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create ride request
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = createRideSchema.parse(body);

    // Estimate fare from straight-line distance (shared model with the client).
    const distanceKm = haversineKm(
      validatedData.pickupLatitude,
      validatedData.pickupLongitude,
      validatedData.dropLatitude,
      validatedData.dropLongitude
    );
    const estimatedFare = estimateFare(distanceKm);

    // Create ride
    const ride = await prisma.ride.create({
      data: {
        passengerId: decoded.userId,
        ...validatedData,
        estimatedFare,
        status: "REQUESTED",
      },
      include: {
        passenger: {
          select: { firstName: true, lastName: true, phone: true },
        },
      },
    });

    // Broadcast the new request to all online drivers in real time.
    if (!ride.scheduledTime) {
      emitNewRideRequest(ride);
    }

    return NextResponse.json(
      { message: "Ride request created", ride },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Create ride error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
