"use client";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color: "blue" | "green" | "yellow" | "purple";
}

export function StatCard({ title, value, icon, color }: StatCardProps) {
  const bgColor = {
    blue: "bg-blue-50",
    green: "bg-green-50",
    yellow: "bg-yellow-50",
    purple: "bg-purple-50",
  }[color];

  const textColor = {
    blue: "text-blue-600",
    green: "text-green-600",
    yellow: "text-yellow-600",
    purple: "text-purple-600",
  }[color];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {icon && (
        <div className={`${bgColor} ${textColor} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
          {icon}
        </div>
      )}
      <h3 className="text-gray-600 text-sm font-medium mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

interface RideCardProps {
  id: string;
  pickupAddress: string;
  dropAddress: string;
  status: string;
  fare?: number;
  driverName?: string;
  onClick?: () => void;
}

export function RideCard({
  id,
  pickupAddress,
  dropAddress,
  status,
  fare,
  driverName,
  onClick,
}: RideCardProps) {
  const statusColor = {
    REQUESTED: "bg-blue-100 text-blue-700",
    ACCEPTED: "bg-purple-100 text-purple-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  }[status] || "bg-gray-100 text-gray-700";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Pickup</p>
          <p className="text-sm text-gray-600">{pickupAddress}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
          {status}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-900">Drop-off</p>
        <p className="text-sm text-gray-600">{dropAddress}</p>
      </div>

      <div className="flex justify-between items-center pt-3 border-t">
        {driverName && (
          <p className="text-sm text-gray-600">Driver: {driverName}</p>
        )}
        {fare && <p className="font-semibold text-green-600">₹{fare}</p>}
      </div>
    </div>
  );
}

interface DriverCardProps {
  id: string;
  name: string;
  rating: number;
  vehicle: string;
  distance?: number;
  onClick?: () => void;
}

export function DriverCard({ id, name, rating, vehicle, distance, onClick }: DriverCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-gray-900">{name}</h4>
          <p className="text-sm text-gray-600">{vehicle}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-yellow-500 flex items-center gap-1 justify-end">
            <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.28 3.94a1 1 0 00.95.69h4.15c.97 0 1.37 1.24.59 1.81l-3.36 2.44a1 1 0 00-.36 1.12l1.28 3.94c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 00-1.18 0l-3.36 2.44c-.79.57-1.84-.2-1.54-1.12l1.28-3.94a1 1 0 00-.36-1.12L2.33 9.37c-.78-.57-.38-1.81.59-1.81h4.15a1 1 0 00.95-.69l1.28-3.94z" /></svg>
            {rating.toFixed(1)}
          </p>
          {distance && <p className="text-xs text-gray-500">{distance.toFixed(1)} km</p>}
        </div>
      </div>
    </div>
  );
}
