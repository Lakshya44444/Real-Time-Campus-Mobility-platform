import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";
import { CAMPUS_LOCATIONS, haversineKm, estimateFare } from "../lib/locations";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcryptjs.hash("password123", 10);

  // Demo passenger
  const passenger = await prisma.user.upsert({
    where: { email: "passenger@example.com" },
    update: {},
    create: {
      email: "passenger@example.com",
      password: hashedPassword,
      firstName: "John",
      lastName: "Doe",
      userType: "PASSENGER",
      passengerProfile: { create: {} },
    },
  });

  // Demo driver
  const driver = await prisma.user.upsert({
    where: { email: "driver@example.com" },
    update: {},
    create: {
      email: "driver@example.com",
      password: hashedPassword,
      firstName: "Jane",
      lastName: "Smith",
      userType: "DRIVER",
      driverProfile: {
        create: {
          licenseNumber: "DL123456789",
          licenseExpiry: new Date("2030-12-31"),
          vehicleType: "Sedan",
          vehicleNumber: "KA01AB1234",
          vehicleColor: "White",
          seatingCapacity: 4,
          isVerified: true,
          isOnline: false,
          currentLatitude: 29.8643,
          currentLongitude: 77.896,
          totalRides: 0,
          averageRating: 0,
          totalEarnings: 0,
        },
      },
    },
  });

  // --- Historical completed rides for analytics & forecasting ---------------
  // Wipe previously generated demo rides so re-seeding stays idempotent.
  await prisma.ride.deleteMany({ where: { passengerId: passenger.id } });

  // Demand peaks in the morning (8-10) and evening (17-19) commute windows.
  const peakHours = [8, 9, 10, 17, 18, 19];
  const offHours = [11, 12, 13, 14, 15, 16, 20, 21];
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  let totalEarnings = 0;
  let totalRides = 0;
  const ratingsToCreate: { rideId: string; userId: string; rating: number; feedback?: string }[] = [];

  for (let day = 0; day < 30; day++) {
    // 2-6 rides per day, more on recent days.
    const count = 2 + Math.floor(Math.random() * 5);
    for (let n = 0; n < count; n++) {
      const usePeak = Math.random() < 0.65;
      const hour = usePeak ? pick(peakHours) : pick(offHours);

      const created = new Date();
      created.setDate(created.getDate() - day);
      created.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

      let a = Math.floor(Math.random() * CAMPUS_LOCATIONS.length);
      let b = Math.floor(Math.random() * CAMPUS_LOCATIONS.length);
      while (b === a) b = Math.floor(Math.random() * CAMPUS_LOCATIONS.length);
      const from = CAMPUS_LOCATIONS[a];
      const to = CAMPUS_LOCATIONS[b];
      const fare = estimateFare(haversineKm(from.lat, from.lng, to.lat, to.lng));

      const end = new Date(created.getTime() + (8 + Math.random() * 15) * 60000);
      const ride = await prisma.ride.create({
        data: {
          passengerId: passenger.id,
          driverId: driver.id,
          status: "COMPLETED",
          pickupAddress: from.name,
          pickupLatitude: from.lat,
          pickupLongitude: from.lng,
          dropAddress: to.name,
          dropLatitude: to.lat,
          dropLongitude: to.lng,
          estimatedFare: fare,
          actualFare: fare,
          startTime: created,
          endTime: end,
          createdAt: created,
        },
      });

      totalEarnings += fare;
      totalRides += 1;

      // ~60% of rides get rated 4-5 stars.
      if (Math.random() < 0.6) {
        ratingsToCreate.push({
          rideId: ride.id,
          userId: driver.id,
          rating: Math.random() < 0.7 ? 5 : 4,
        });
      }
    }
  }

  for (const r of ratingsToCreate) {
    await prisma.rating.create({ data: r });
  }

  const avg =
    ratingsToCreate.length > 0
      ? ratingsToCreate.reduce((s, r) => s + r.rating, 0) / ratingsToCreate.length
      : 0;

  await prisma.driverProfile.update({
    where: { userId: driver.id },
    data: {
      totalRides,
      totalEarnings,
      averageRating: Number(avg.toFixed(2)),
    },
  });

  console.log(
    `Seeded demo users + ${totalRides} historical rides ` +
      `(₹${totalEarnings} earnings, ${ratingsToCreate.length} ratings, avg ${avg.toFixed(2)}).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
