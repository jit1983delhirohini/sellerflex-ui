import { useState } from "react";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabase";

export default function SalesImport() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      setStatus({ type: "error", message: "Please select a CSV file" });
      return;
    }

    setLoading(true);
    setStatus(null);

    const uploadId = uuidv4();

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data;

          if (!rows.length) {
            throw new Error("CSV is empty");
          }

          // 🔹 Map CSV → staging_sales_upload (EXACT columns)
          const stagingRows = rows.map((r) => ({
            upload_id: uploadId,
            file_name: file.name,
            sale_date: r.sale_date,
            warehouse_city: r.warehouse_city,
            product_name: r.product_name,
            quantity_sold: Number(r.quantity_sold),
            marketplace: r.marketplace,
            brand: r.brand,
          }));

          // 1️⃣ Insert into staging
          const { error: stagingError } = await supabase
            .from("staging_sales_upload")
            .insert(stagingRows);

          if (stagingError) {
            throw stagingError;
          }

          // 🔍 Ensure staging actually has rows
          const { count } = await supabase
            .from("staging_sales_upload")
            .select("*", { count: "exact", head: true })
            .eq("upload_id", uploadId);

          if (!count || count === 0) {
            throw new Error("No rows inserted into staging");
          }

          // 2️⃣ Apply sales
          const { data, error: applyError } = await supabase.rpc(
            "apply_sales_upload",
            { p_upload_id: uploadId }
          );

          if (applyError) {
            throw applyError;
          }

          setStatus({
            type: "success",
            message: `Sales uploaded successfully (Inserted: ${data.rows_inserted}, Replaced: ${data.rows_deleted})`,
          });

          setFile(null);
        } catch (err) {
          console.error(err);
          setStatus({
            type: "error",
            message: err.message || "Sales upload failed",
          });
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setLoading(false);
        setStatus({ type: "error", message: err.message });
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-10">
      <h1 className="text-2xl font-semibold mb-2">Sales CSV Import</h1>
      <p className="text-slate-400 mb-6">
        Upload Easyecom sales (CSV). Data is validated via staging.
      </p>

      <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-800">
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="block text-sm text-slate-300"
          />

          <button
            onClick={handleUpload}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-2 rounded-lg font-medium"
          >
            {loading ? "Uploading..." : "Upload Sales CSV"}
          </button>
        </div>

        {status && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              status.type === "success"
                ? "bg-emerald-900/40 text-emerald-300"
                : "bg-red-900/40 text-red-300"
            }`}
          >
            {status.message}
          </div>
        )}
      </div>

      <div className="mt-8 bg-slate-900/40 rounded-xl p-5 border border-slate-800">
        <h3 className="font-medium mb-2">CSV format (exact)</h3>
        <code className="block text-sm text-slate-300 mb-3">
          sale_date,warehouse_city,product_name,quantity_sold,marketplace,brand
        </code>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• Date format: YYYY-MM-DD</li>
          <li>• Previous dates will be replaced</li>
          <li>• Returns allowed (quantity may reduce)</li>
          <li>• Duplicate file name → warning only</li>
        </ul>
      </div>
    </div>
  );
}
