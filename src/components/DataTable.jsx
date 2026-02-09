const colors = {
  "Stock Out": "bg-red-100 text-red-700",
  Reorder: "bg-orange-100 text-orange-700",
  OK: "bg-green-100 text-green-700",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded
        ${colors[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}
