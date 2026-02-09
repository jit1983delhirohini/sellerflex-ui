export default function Filters({
  warehouses = [],
  brands = [],
  warehouse,
  brand,
  product,
  setWarehouse,
  setBrand,
  setProduct,
}) {
  return (
    <div className="bg-white p-4 rounded-xl shadow grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* =========================
          Warehouse Filter
      ========================= */}
      <div>
        <label className="block text-xs text-slate-500 mb-1">
          Warehouse
        </label>
        <select
          value={warehouse}
          onChange={(e) => setWarehouse(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="">All Warehouses</option>
          {warehouses.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      {/* =========================
          Brand Filter
      ========================= */}
      <div>
        <label className="block text-xs text-slate-500 mb-1">
          Brand
        </label>
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {/* =========================
          Product Search
      ========================= */}
      <div>
        <label className="block text-xs text-slate-500 mb-1">
          Product
        </label>
        <input
          type="text"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="Type at least 3 letters"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
