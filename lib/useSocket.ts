"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

/**
 * Connects to the /rides Socket.IO namespace and registers the current user to
 * their personal room. Returns a ref to the live socket so callers can emit
 * (join-ride) and the passed handlers receive server events.
 *
 * handlers is a map of eventName -> callback. It is re-read on every render via
 * a ref, so callers can pass inline functions without re-connecting.
 */
export function useRidesSocket(
  userId: string | null,
  handlers: Record<string, (data: unknown) => void>
) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!userId) return;

    const socket = io("/rides", { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("register", userId));

    // Bridge every server event through the latest handler map.
    socket.onAny((event: string, data: unknown) => {
      handlersRef.current[event]?.(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return socketRef;
}
