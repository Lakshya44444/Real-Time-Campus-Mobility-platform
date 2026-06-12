import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateToken } from "@/lib/auth";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  userType: z.enum(["PASSENGER", "DRIVER"]),
  otp: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, userType, otp } =
      signupSchema.parse(body);

    // Verify the email OTP before creating the account.
    const verification = await prisma.emailVerification.findUnique({ where: { email } });
    if (!verification || verification.otp !== otp) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }
    if (verification.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Verification code expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, userType },
    });

    // Create the matching profile so dashboards work immediately.
    if (userType === "PASSENGER") {
      await prisma.passengerProfile.create({ data: { userId: user.id } });
    } else {
      // Driver details/verification are completed later; use unique placeholders
      // so the @unique constraints hold for every new driver.
      await prisma.driverProfile.create({
        data: {
          userId: user.id,
          licenseNumber: `PENDING-${user.id}`,
          licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          vehicleType: "Not specified",
          vehicleNumber: `PENDING-${user.id}`,
          isVerified: false,
        },
      });
    }

    // Clean up the verification record.
    await prisma.emailVerification.delete({ where: { email } }).catch(() => {});

    const token = generateToken(user.id, user.email);

    return NextResponse.json(
      {
        message: "User created successfully",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
