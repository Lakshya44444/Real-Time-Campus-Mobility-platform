"use client";

import { useState } from "react";
import { showToast } from "@/components/common/Toast";

interface PaymentModalProps {
  rideId: string;
  amount: number;
  onPaymentComplete?: (transactionId: string) => void;
  onClose?: () => void;
}

type Method = "UPI" | "CARD" | "WALLET" | "CASH";
type Status = "idle" | "processing" | "success";

const METHODS: { id: Method; label: string }[] = [
  { id: "UPI", label: "UPI" },
  { id: "CARD", label: "Card" },
  { id: "WALLET", label: "Wallet" },
  { id: "CASH", label: "Cash" },
];

export function PaymentModal({ rideId, amount, onPaymentComplete, onClose }: PaymentModalProps) {
  const [method, setMethod] = useState<Method>("UPI");
  const [status, setStatus] = useState<Status>("idle");
  const [upiId, setUpiId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setError(null);
    if (method === "UPI" && upiId && !/^[\w.\-]+@[\w]+$/.test(upiId)) {
      setError("Enter a valid UPI ID (e.g. name@bank) or leave blank to use QR");
      return;
    }
    setStatus("processing");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId, amount, paymentMethod: method }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("idle");
        setError(data.error || "Payment failed");
        return;
      }
      setStatus("success");
      showToast("Payment successful", "success");
      onPaymentComplete?.(data.transactionId);
      setTimeout(() => onClose?.(), 1800);
    } catch {
      setStatus("idle");
      setError("An error occurred. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-gray-900">Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        {status === "success" ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-lg font-bold text-green-600 mb-1">Payment Successful</h3>
            <p className="text-gray-500 text-sm">₹{amount} paid via {method}</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-5 text-center">
              <p className="text-gray-500 text-sm">Total Amount</p>
              <p className="text-3xl font-bold text-blue-600">₹{amount}</p>
            </div>

            <p className="text-sm font-semibold text-gray-700 mb-2">Payment Method</p>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setMethod(m.id); setError(null); }}
                  className={`py-2 rounded-lg border-2 text-sm font-semibold transition ${
                    method === m.id ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* UPI: QR + ID entry */}
            {method === "UPI" && (
              <div className="mb-5">
                <div className="flex flex-col items-center bg-slate-50 border border-gray-100 rounded-xl p-4 mb-3">
                  <QrPlaceholder />
                  <p className="text-xs text-gray-500 mt-2">Scan with any UPI app to pay ₹{amount}</p>
                  <p className="text-xs text-gray-400">ridehub@upi</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-gray-400">or enter UPI ID</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>
                <input
                  type="text"
                  placeholder="yourname@bank"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full mt-3 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
              </div>
            )}

            {method === "CARD" && (
              <div className="mb-5 space-y-3">
                <input placeholder="Card number" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="MM/YY" className="px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="CVV" className="px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}

            {method === "CASH" && (
              <p className="text-sm text-gray-500 mb-5 bg-amber-50 border border-amber-100 rounded-lg p-3">
                Pay ₹{amount} in cash to your driver at the end of the ride.
              </p>
            )}

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <button
              onClick={handlePay}
              disabled={status === "processing"}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50"
            >
              {status === "processing" ? "Processing..." : method === "CASH" ? "Confirm Cash Payment" : `Pay ₹${amount}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Simple deterministic QR-style graphic (decorative, no external image).
function QrPlaceholder() {
  const cells = 11;
  return (
    <div
      className="grid bg-white p-2 rounded-lg border border-gray-200"
      style={{ gridTemplateColumns: `repeat(${cells}, 1fr)`, width: 140, height: 140 }}
    >
      {Array.from({ length: cells * cells }).map((_, i) => {
        const r = Math.floor(i / cells);
        const c = i % cells;
        const corner =
          (r < 3 && c < 3) || (r < 3 && c > cells - 4) || (r > cells - 4 && c < 3);
        const on = corner || (i * 7) % 3 === 0;
        return <div key={i} className={on ? "bg-gray-900" : "bg-white"} />;
      })}
    </div>
  );
}
