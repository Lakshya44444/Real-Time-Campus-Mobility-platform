import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  try {
    const { email } = schema.parse(await request.json());

    // Don't send OTP if the account already exists.
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.emailVerification.upsert({
      where: { email },
      update: { otp, expiresAt, verified: false },
      create: { email, otp, expiresAt },
    });

    const { delivered } = await sendOtpEmail(email, otp);

    return NextResponse.json({
      message: delivered
        ? "Verification code sent to your email"
        : "Verification code generated (check server console — email not configured)",
      delivered,
      // Only exposed in dev when no real email was sent, so the flow is testable.
      ...(!delivered && process.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
