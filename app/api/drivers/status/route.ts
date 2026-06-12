import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { emitDriverAvailability } from "@/lib/socket";
import { z } from "zod";

const statusSchema = z.object({
  isOnline: z.boolean(),
  currentLatitude: z.number().optional(),
  currentLongitude: z.number().optional(),
});

// PATCH - Update driver status and location
export async function PATCH(request: NextRequest) {
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
    const { isOnline, currentLatitude, currentLongitude } = statusSchema.parse(body);

    // Check if user is a driver
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: decoded.userId },
    });

    if (!driverProfile) {
      return NextResponse.json(
        { error: "User is not a driver" },
        { status: 400 }
      );
    }

    // Update driver status
    const updatedDriver = await prisma.driverProfile.update({
      where: { userId: decoded.userId },
      data: {
        isOnline,
        currentLatitude: currentLatitude ?? driverProfile.currentLatitude,
        currentLongitude: currentLongitude ?? driverProfile.currentLongitude,
      },
    });

    // Tell passengers in real time that the available-driver pool changed.
    emitDriverAvailability({
      driverId: decoded.userId,
      isOnline: updatedDriver.isOnline,
      currentLatitude: updatedDriver.currentLatitude,
      currentLongitude: updatedDriver.currentLongitude,
    });

    return NextResponse.json({
      message: `Driver status updated to ${isOnline ? "online" : "offline"}`,
      driver: updatedDriver,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Update status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get current driver status
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

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: decoded.userId },
    });

    if (!driverProfile) {
      return NextResponse.json(
        { error: "User is not a driver" },
        { status: 400 }
      );
    }

    return NextResponse.json({ driver: driverProfile });
  } catch (error) {
    console.error("Get status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
