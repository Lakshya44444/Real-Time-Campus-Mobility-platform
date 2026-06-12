import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { z } from "zod";

const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
  feedback: z.string().optional(),
});

// POST - Create rating for a completed ride
export async function POST(
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
    const { rating, feedback } = ratingSchema.parse(body);

    const ride = await prisma.ride.findUnique({ where: { id: params.id } });
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    // Only passenger can rate
    if (ride.passengerId !== decoded.userId) {
      return NextResponse.json(
        { error: "Only passenger can rate this ride" },
        { status: 403 }
      );
    }

    // Can only rate completed rides
    if (ride.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Can only rate completed rides" },
        { status: 400 }
      );
    }

    // Check if already rated
    const existingRating = await prisma.rating.findUnique({
      where: { rideId: params.id },
    });

    if (existingRating) {
      return NextResponse.json(
        { error: "This ride has already been rated" },
        { status: 400 }
      );
    }

    // Create rating
    const newRating = await prisma.rating.create({
      data: {
        rideId: params.id,
        userId: ride.driverId!,
        rating,
        feedback,
      },
    });

    // Update driver's average rating
    const driverRatings = await prisma.rating.findMany({
      where: { userId: ride.driverId! },
    });

    const averageRating =
      driverRatings.reduce((sum, r) => sum + r.rating, 0) / driverRatings.length;

    await prisma.driverProfile.update({
      where: { userId: ride.driverId! },
      data: { averageRating },
    });

    return NextResponse.json(
      { message: "Rating submitted successfully", rating: newRating },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Rating error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
