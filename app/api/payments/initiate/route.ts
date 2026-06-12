import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { z } from "zod";

const paymentSchema = z.object({
  rideId: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["UPI", "CARD", "WALLET", "CASH"]),
});

// Simulated payment processing
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
    const { rideId, amount, paymentMethod } = paymentSchema.parse(body);

    // Persist the charged amount on the ride so dashboards/earnings are accurate.
    await prisma.ride
      .update({ where: { id: rideId }, data: { actualFare: amount } })
      .catch(() => {});

    // Simulated payment gateway response (always succeeds for the demo).
    const transactionId = `TXN-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    return NextResponse.json(
      {
        success: true,
        transactionId,
        rideId,
        amount,
        paymentMethod,
        timestamp: new Date().toISOString(),
        message: "Payment processed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
