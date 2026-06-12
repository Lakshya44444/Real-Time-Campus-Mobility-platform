import type { Server as SocketIOServer } from "socket.io";

/**
 * The Socket.IO server is created in server.js and stored on globalThis so that
 * Next.js API route handlers (running in the same Node process) can emit through
 * the exact same instance. Webpack gives API routes their own module graph, so a
 * plain module-level singleton would be a different instance and never emit.
 */
function getIO(): SocketIOServer | null {
  return (globalThis as unknown as { __io?: SocketIOServer }).__io ?? null;
}

/** Notify everyone watching a specific ride (both passenger and driver). */
export function emitRideUpdate(rideId: string, event: string, data: unknown) {
  getIO()?.of("/rides").to(`ride-${rideId}`).emit(event, data);
}

/** Notify a specific user by their personal room (e.g. assignment to a driver). */
export function emitToUser(userId: string, event: string, data: unknown) {
  getIO()?.of("/rides").to(`user-${userId}`).emit(event, data);
}

/** Broadcast a new ride request to every connected (online) driver. */
export function emitNewRideRequest(data: unknown) {
  getIO()?.of("/rides").emit("ride:requested", data);
}

/** Broadcast a driver availability change to all passengers. */
export function emitDriverAvailability(data: unknown) {
  getIO()?.of("/drivers").emit("driver:availability_changed", data);
}
