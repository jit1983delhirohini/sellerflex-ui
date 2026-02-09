import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import twbpLogo from "../assets/twbp-logo.png";
import * as XLSX from "xlsx";
import LogoutButton from "../components/LogoutButton";
//import { useAuthUser } from "../hooks/useAuthUser";

/* ======================================================
   DRR TABS (SYSTEM DRR REMOVED)
====================================================== */
const DRR_TABS = ["ALL", "7D", "15D", "30D", "YTD"];

export default function Dashboard({ role }) {
  const [activeTab, setActiveTab] = useState("ALL");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ---------------- FILTERS ---------------- */
  const [warehouse, setWarehouse] = useState("ALL");
  const [brand, setBrand] = useState("ALL");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
const [reorderFilter, setReorderFilter] = useState("ALL");


  /* Sorting */
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  
  const [loadingTime, setLoadingTime] = useState(0);

/* ================= NEW: REPORT META ================= */
  const [reportMeta, setReportMeta] = useState(null);
  
  /* ======================================================
     FETCH DATA (ONLY v_reorder_final)
  ====================================================== */
  useEffect(() => {
    fetchData();
	fetchReportMeta(); // ✅ added safely
  }, []);

async function fetchReportMeta() {
  try {
    const { data, error } = await supabase
      .from("v_report_last_updated")
      .select("*")
      .single();

    if (error) throw error;
    setReportMeta(data);
  } catch (err) {
    console.error("Report meta fetch failed:", err);
  }
}


 async function fetchData(retry = 0) {
  setLoading(true);
  const startTime = Date.now();
  setLoadingTime(0);

  const timer = setInterval(() => {
    setLoadingTime(Math.floor((Date.now() - startTime) / 1000));
  }, 500);

  try {
    const { data, error } = await supabase
      .from("v_reorder_final")
      .select("*");

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Empty dataset");

    setRows(data);
  } catch (err) {
    console.error("Fetch error:", err);

    if (retry < 1) {
      setTimeout(() => fetchData(retry + 1), 800);
      return;
    }

    setRows([]);
  } finally {
    clearInterval(timer);
    setLoading(false);
  }
}

function formatDate(date, withTime = false) {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime && {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
}


  /* ======================================================
     FILTER OPTIONS (NO EXTRA API)
  ====================================================== */
  const warehouseOptions = useMemo(() => {
    return ["ALL", ...new Set(rows.map(r => r.warehouse).filter(Boolean))];
  }, [rows]);

  const brandOptions = useMemo(() => {
    return ["ALL", ...new Set(rows.map(r => r.brand).filter(Boolean))];
  }, [rows]);

const statusOptions = useMemo(() => {
  return ["ALL", "CRITICAL", "HEALTHY"];
}, []);


  /* ======================================================
     CORE BUSINESS LOGIC (LOCKED)
  ====================================================== */

  function getEffectiveDRR(r) {
    if (activeTab === "ALL") return r.drr_15d; // 🔒 ALL → 15D
    if (activeTab === "7D") return r.drr_7d;
    if (activeTab === "15D") return r.drr_15d;
    if (activeTab === "30D") return r.drr_30d;
    if (activeTab === "YTD") return r.drr_ytd;
    return null;
  }

  /* ======================================================
     Sorting Handle
  ====================================================== */

function handleSort(key) {
  if (sortKey === key) {
    setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
  } else {
    setSortKey(key);
    setSortDir("asc");
  }
}


/* ======================================================
   FILTER + CALCULATE + SORT (SINGLE SOURCE OF TRUTH)
====================================================== */
const filteredRows = useMemo(() => {
  if (!rows.length) return [];

  // 1️⃣ FIRST: calculate status & reorder_qty
  let calculated = rows.map(r => {
    const drr = getEffectiveDRR(r);
    const dos = drr && drr > 0 ? r.current_stock / drr : null;

    let status = "HEALTHY";
    if (r.current_stock <= 0) status = "CRITICAL";
    else if (dos !== null && dos < 7) status = "CRITICAL";

    const reorder_qty =
      drr && dos !== null && dos <= 7
        ? Math.max(0, Math.ceil(drr * 15 - r.current_stock))
        : 0;

    return {
      ...r,
      _effective_drr: drr,
      dos,
      status,
      reorder_qty,
    };
  });

  // 2️⃣ THEN: apply filters
  let result = calculated.filter(r => {
    if (warehouse !== "ALL" && r.warehouse !== warehouse) return false;
    if (brand !== "ALL" && r.brand !== brand) return false;

    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;

    if (reorderFilter === "REORDER_ONLY" && r.reorder_qty <= 0) return false;

    if (
      search &&
      search.length >= 3 &&
      !r.product_name?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // 3️⃣ SORT
  if (sortKey) {
    result.sort((a, b) => {
      const valA = a[sortKey] ?? 0;
      const valB = b[sortKey] ?? 0;

      if (typeof valA === "string") {
        return sortDir === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortDir === "asc" ? valA - valB : valB - valA;
    });
  }

  return result;
}, [
  rows,
  warehouse,
  brand,
  search,
  statusFilter,
  reorderFilter,
  activeTab,
  sortKey,
  sortDir,
]);



 /* ======================================================
   KPI CALCULATIONS
====================================================== */

const totalSkus = filteredRows.length;

const criticalSkus = filteredRows.filter(
  r => r.status === "CRITICAL"
).length;

const reorderQty = filteredRows.reduce(
  (s, r) => s + (r.reorder_qty || 0),
  0
);

const avgDos =
  filteredRows.filter(r => r.dos !== null).length > 0
    ? (
        filteredRows.reduce((s, r) => s + (r.dos || 0), 0) /
        filteredRows.filter(r => r.dos !== null).length
      ).toFixed(1)
    : "NA";


 /* ======================================================
    handle Export Excel
  ====================================================== */

function handleExportExcel() {
  if (!filteredRows.length) {
    alert("No data to export");
    return;
  }

  const exportData = filteredRows.map(r => {
    const base = {
      Warehouse: r.warehouse,
      Product: r.product_name,
      Brand: r.brand,
      Stock: r.current_stock,
    };

    // ---- DRR COLUMNS BASED ON TAB ----
    if (activeTab === "ALL") {
      base["7D DRR"] = r.drr_7d != null ? Number(r.drr_7d.toFixed(2)) : 0;
      base["15D DRR"] = r.drr_15d != null ? Number(r.drr_15d.toFixed(2)) : 0;
      base["30D DRR"] = r.drr_30d != null ? Number(r.drr_30d.toFixed(2)) : 0;
      base["YTD DRR"] = r.drr_ytd != null ? Number(r.drr_ytd.toFixed(2)) : 0;
    }

    if (activeTab === "7D") base["7D DRR"] = Number(r.drr_7d || 0).toFixed(2);
    if (activeTab === "15D") base["15D DRR"] = Number(r.drr_15d || 0).toFixed(2);
    if (activeTab === "30D") base["30D DRR"] = Number(r.drr_30d || 0).toFixed(2);
    if (activeTab === "YTD") base["YTD DRR"] = Number(r.drr_ytd || 0).toFixed(2);

    return {
      ...base,
      DOS: r.dos !== null ? Number(r.dos.toFixed(1)) : "NA",
      Status: r.status,
      Reorder_Qty: r.reorder_qty,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Reorder");

  XLSX.writeFile(workbook, "TWBP_Reorder_Report.xlsx");
}


 /* ======================================================
     Get Invisible DRR colums
  ====================================================== */
  
function getVisibleDRRColumns() {
  if (activeTab === "ALL") {
    return [
      { key: "drr_7d", label: "7D DRR" },
      { key: "drr_15d", label: "15D DRR" },
      { key: "drr_30d", label: "30D DRR" },
      { key: "drr_ytd", label: "YTD DRR" },
    ];
  }

  if (activeTab === "7D") return [{ key: "drr_7d", label: "7D DRR" }];
  if (activeTab === "15D") return [{ key: "drr_15d", label: "15D DRR" }];
  if (activeTab === "30D") return [{ key: "drr_30d", label: "30D DRR" }];
  if (activeTab === "YTD") return [{ key: "drr_ytd", label: "YTD DRR" }];

  return [];
}


  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* HEADER */}
      <div className="mb-8 relative">
        <div className="flex flex-col items-center text-center gap-3">
          <img src={twbpLogo} alt="TWBP" className="h-12 opacity-90" />
          <h1 className="text-3xl font-semibold">
            TWBP Reorder Intelligence
          </h1>
          <p className="text-slate-400 text-sm">
            Inventory health & replenishment insights
          </p>
        </div>

  {/* HEADER ACTION BUTTONS */}
<div className="absolute top-0 right-0 flex items-center gap-2">

  {/* Stock Import */}
  <a
    href="/stock-import"
    className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-medium"
  >
    Stock Import
  </a>

  {/* Sales Import */}
  <a
    href="/sales-import"
    className="bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-lg text-sm font-medium"
  >
    Sales Import
  </a>

  {/* Export */}
  <button
    onClick={handleExportExcel}
    className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium"
  >
    Export Excel
  </button>

  {/* Logout */}
  <LogoutButton />

</div>



      </div>
	  
	{reportMeta && (
  <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-300">
    <div className="flex flex-wrap gap-x-10 gap-y-1">
      <div>
        Stock data till:
        <span className="ml-1 font-medium text-slate-100">
          {formatDate(reportMeta.stock_business_date)}
        </span>
      </div>

      <div>
        Stock file uploaded:
        <span className="ml-1 font-medium text-slate-100">
          {formatDate(reportMeta.stock_uploaded_at, true)}
        </span>
      </div>

      <div>
        Sales data till:
        <span className="ml-1 font-medium text-slate-100">
          {formatDate(reportMeta.sales_business_date)}
        </span>
      </div>

      <div>
        Sales file uploaded:
        <span className="ml-1 font-medium text-slate-100">
          {formatDate(reportMeta.sales_uploaded_at, true)}
        </span>
      </div>
    </div>
  </div>
)}
  

      {/* DRR TABS */}
      <div className="flex gap-2 mb-6">
        {DRR_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              activeTab === tab
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {tab === "ALL" ? "All DRR" : `${tab} DRR`}
          </button>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="sticky top-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <select
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
          value={warehouse}
          onChange={e => setWarehouse(e.target.value)}
        >
          {warehouseOptions.map(w => (
            <option key={w} value={w}>
              {w === "ALL" ? "All Warehouses" : w}
            </option>
          ))}
        </select>

        <select
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
          value={brand}
          onChange={e => setBrand(e.target.value)}
        >
          {brandOptions.map(b => (
            <option key={b} value={b}>
              {b === "ALL" ? "All Brands" : b}
            </option>
          ))}
        </select>

<select
  value={statusFilter}
  onChange={(e) => setStatusFilter(e.target.value)}
  className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
>
  {statusOptions.map(s => (
    <option key={s} value={s} className="bg-slate-800">
      {s === "ALL" ? "All Status" : s}
    </option>
  ))}
</select>




<select
  value={reorderFilter}
  onChange={(e) => setReorderFilter(e.target.value)}
  className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
>
  <option value="ALL" className="bg-slate-800">
    All Reorders
  </option>
  <option value="REORDER_ONLY" className="bg-slate-800">
    Reorder Required
  </option>
</select>






        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search product (min 3 letters)"
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
        />
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat title="Total SKUs" value={totalSkus} />
        <Stat title="Critical SKUs" value={criticalSkus} color="red" />
        <Stat title="Reorder Qty" value={reorderQty} />
        <Stat title="Avg DOS" value={avgDos} />
      </div>

      {/* TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-h-[65vh] overflow-y-auto">
       {loading ? (
  <div className="p-6 space-y-4">
    <div className="text-slate-400 text-sm">
      Loading data… {loadingTime}s
    </div>

    {/* Progress shimmer */}
    <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
      <div className="h-full bg-indigo-500 animate-pulse w-2/3" />
    </div>

    {/* Skeleton rows */}
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="h-8 bg-slate-800 rounded animate-pulse"
      />
    ))}
  </div>
) : (

          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-300 sticky top-0 z-20">
              <tr>
                <th
  className="p-3 text-left cursor-pointer"
  onClick={() => handleSort("warehouse")}
>
  Warehouse {sortKey === "warehouse" ? (sortDir === "asc" ? "▲" : "▼") : ""}
</th>

               <th
  className="p-3 text-left cursor-pointer"
  onClick={() => handleSort("product_name")}
>
  Product {sortKey === "product_name" ? (sortDir === "asc" ? "▲" : "▼") : ""}
</th>

                <th className="p-3 text-left">Brand</th>
              <th
  className="p-3 text-right cursor-pointer"
  onClick={() => handleSort("current_stock")}
>
  Stock {sortKey === "current_stock" ? (sortDir === "asc" ? "▲" : "▼") : ""}
</th>

                {getVisibleDRRColumns().map(col => (
  <th key={col.key} className="p-3 text-right">
    {col.label}
  </th>
))}

               <th
  className="p-3 text-right cursor-pointer"
  onClick={() => handleSort("dos")}
>
  DOS {sortKey === "dos" ? (sortDir === "asc" ? "▲" : "▼") : ""}
</th>

                <th className="p-3 text-center">Status</th>
                <th
  className="p-3 text-right cursor-pointer"
  onClick={() => handleSort("reorder_qty")}
>
  Reorder {sortKey === "reorder_qty" ? (sortDir === "asc" ? "▲" : "▼") : ""}
</th>

              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr
                  key={i}
                  className="border-t border-slate-800 hover:bg-slate-800/50"
                >
                  <td className="p-3">{r.warehouse}</td>
                  <td className="p-3">{r.product_name}</td>
                  <td className="p-3">{r.brand}</td>
                  <td className="p-3 text-right">{r.current_stock}</td>
             {getVisibleDRRColumns().map(col => (
  <td key={col.key} className="p-3 text-right">
   {Number(r[col.key] || 0).toFixed(2)}
  </td>
))}

                  <td className="p-3 text-right">
                    {r.dos !== null ? r.dos.toFixed(1) : "0.0"}
                  </td>
                  <td className="p-3 text-center">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {r.reorder_qty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ======================================================
   SMALL COMPONENTS (UNCHANGED STYLE)
====================================================== */

function Stat({ title, value, color }) {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-4">
      <p className="text-slate-400 text-sm">{title}</p>
      <p
        className={`text-2xl font-semibold ${
          color === "red" ? "text-red-400" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    CRITICAL: "bg-red-500/20 text-red-400",
    HEALTHY: "bg-green-500/20 text-green-400",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        map[status] || "bg-slate-700 text-slate-300"
      }`}
    >
      {status}
    </span>
  );
}
