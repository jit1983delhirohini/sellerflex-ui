export default function SummaryCards({ rows }) {
  const totalSkus = rows.length;
  const critical = rows.filter((r) => r.status === "Reorder").length;
  const reorderQty = rows.reduce((s, r) => s + r.reorder_qty, 0);
  const avgDos =
    rows.length === 0
      ? 0
      : (
          rows.reduce((s, r) => s + (r.dos || 0), 0) / rows.length
        ).toFixed(1);

  const Card = ({ title, value }) => (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card title="Total SKUs" value={totalSkus} />
      <Card title="Reorder SKUs" value={critical} />
      <Card title="Total Reorder Qty" value={reorderQty} />
      <Card title="Avg DOS" value={avgDos} />
    </div>
  );
}
