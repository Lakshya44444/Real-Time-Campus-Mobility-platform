import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { z } from "zod";

const scheduleRideSchema = z.object({
  pickupLatitude: z.number(),
  pickupLongitude: z.number(),
  pickupAddress: z.string(),
  dropLatitude: z.number(),
  dropLongitude: z.number(),
  dropAddress: z.string(),
  scheduledTime: z.string().datetime(),
});

// GET - List scheduled rides
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

    const scheduledRides = await prisma.ride.findMany({
      where: {
        passengerId: decoded.userId,
        scheduledTime: {
          gte: new Date(),
        },
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { scheduledTime: "asc" },
    });

    return NextResponse.json({ rides: scheduledRides });
  } catch (error) {
    console.error("Get scheduled rides error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Schedule a ride
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
    const validatedData = scheduleRideSchema.parse(body);

    // Validate scheduled time is in future
    const scheduledDateTime = new Date(validatedData.scheduledTime);
    if (scheduledDateTime <= new Date()) {
      return NextResponse.json(
        { error: "Scheduled time must be in the future" },
        { status: 400 }
      );
    }

    // Create scheduled ride
    const ride = await prisma.ride.create({
      data: {
        passengerId: decoded.userId,
        ...validatedData,
        status: "REQUESTED",
      },
      include: {
        passenger: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(
      { message: "Ride scheduled successfully", ride },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Schedule ride error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
