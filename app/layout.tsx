import type { Metadata } from "next";
import { ToastContainer } from "@/components/common/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Ride Platform",
  description: "Real-time ride management for campus mobility",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
