import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { emitRideUpdate, emitToUser } from "@/lib/socket";
import { z } from "zod";

const updateRideSchema = z.object({
  status: z.enum(["REQUESTED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  cancellationReason: z.string().optional(),
  actualFare: z.number().optional(),
});

// GET - Get ride details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const ride = await prisma.ride.findUnique({
      relationLoadStrategy: "join",
      where: { id: params.id },
      include: {
        passenger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImage: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImage: true,
          },
        },
        rating: true,
      },
    });

    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    // Check access
    if (ride.passengerId !== decoded.userId && ride.driverId !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ride });
  } catch (error) {
    console.error("Get ride error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update ride status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const validatedData = updateRideSchema.parse(body);

    const ride = await prisma.ride.findUnique({ where: { id: params.id } });
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    // Authorization check based on action
    if (validatedData.status === "ACCEPTED" && ride.passengerId === decoded.userId) {
      return NextResponse.json(
        { error: "Only drivers can accept rides" },
        { status: 403 }
      );
    }

    // ACCEPT is the contended operation: enforce that a ride is assigned to a
    // single driver. Use a conditional updateMany that only succeeds while the
    // ride is still REQUESTED — this is atomic at the DB level, so the second
    // driver to accept gets count: 0 and a clean conflict response.
    if (validatedData.status === "ACCEPTED") {
      const claim = await prisma.ride.updateMany({
        where: { id: params.id, status: "REQUESTED", driverId: null },
        data: { status: "ACCEPTED", driverId: decoded.userId },
      });

      if (claim.count === 0) {
        return NextResponse.json(
          { error: "This ride has already been accepted by another driver" },
          { status: 409 }
        );
      }
    } else {
      // Non-accept transitions: only the assigned driver or the passenger may act.
      if (ride.passengerId !== decoded.userId && ride.driverId !== decoded.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await prisma.ride.update({
        where: { id: params.id },
        data: {
          ...validatedData,
          ...(validatedData.status === "IN_PROGRESS" && { startTime: new Date() }),
          ...(validatedData.status === "COMPLETED" && { endTime: new Date() }),
        },
      });

      // On completion, roll the ride into the driver's lifetime stats so the
      // dashboard's Total Rides / Total Earnings actually move.
      if (validatedData.status === "COMPLETED" && ride.driverId) {
        await prisma.driverProfile.update({
          where: { userId: ride.driverId },
          data: {
            totalRides: { increment: 1 },
            totalEarnings: { increment: ride.actualFare ?? ride.estimatedFare ?? 0 },
          },
        });
      }
    }

    const updatedRide = await prisma.ride.findUnique({
      where: { id: params.id },
      include: {
        passenger: { select: { id: true, firstName: true, lastName: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
        rating: true,
      },
    });

    // Real-time fan-out: everyone in the ride room sees the new state, and the
    // passenger is notified directly when a driver accepts.
    emitRideUpdate(params.id, "ride:status_updated", updatedRide);
    if (validatedData.status === "ACCEPTED" && updatedRide) {
      emitToUser(updatedRide.passengerId, "ride:accepted", updatedRide);
    }

    return NextResponse.json({
      message: "Ride updated",
      ride: updatedRide,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Update ride error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
