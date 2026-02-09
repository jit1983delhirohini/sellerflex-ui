import { useState } from "react";
import { supabase } from "../lib/supabase";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";

export default function StockImport() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

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

          // 🔎 Header validation
          const requiredCols = [
            "warehouse",
            "product_id",
            "cat_a_qty",
            "snapshot_date",
          ];

          for (const col of requiredCols) {
            if (!(col in rows[0])) {
              throw new Error(`Missing column: ${col}`);
            }
          }

          // 🧾 Prepare staging rows
          const payload = rows.map((r, idx) => ({
            upload_id: uploadId,
            warehouse: r.warehouse,
            product_id: r.product_id,
            cat_a_qty: Number(r.cat_a_qty),
            snapshot_date: r.snapshot_date,
          }));

          // 📥 Insert into staging table
          const { error: insertError } = await supabase
            .from("staging_inventory_upload")
            .insert(payload);

          if (insertError) throw insertError;

          // ⚙️ Call processing function
          const { error: processError } = await supabase.rpc(
            "apply_inventory_snapshot",
            { p_upload_id: uploadId }
          );

          if (processError) throw processError;

          setSuccess(
            `Stock uploaded successfully. Snapshot date: ${rows[0].snapshot_date}`
          );
        } catch (err) {
          console.error(err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setError(err.message);
        setLoading(false);
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-10">
      <h1 className="text-2xl font-semibold mb-2">Stock CSV Import</h1>
      <p className="text-slate-400 mb-6">
        Upload full stock snapshot (CSV). Data is validated via staging.
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-4"
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium"
        >
          {loading ? "Uploading..." : "Upload Stock CSV"}
        </button>

        {error && (
          <div className="mt-4 text-red-400 bg-red-500/10 p-3 rounded">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mt-4 text-green-400 bg-green-500/10 p-3 rounded">
            ✅ {success}
          </div>
        )}
      </div>

      <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-4 max-w-2xl text-sm text-slate-300">
        <b>CSV format (exact):</b>
        <pre className="mt-2 bg-slate-950 p-3 rounded text-xs overflow-x-auto">
warehouse,product_id,cat_a_qty,snapshot_date
Bhiwandi,UUID,293,2026-02-08
        </pre>
      </div>
    </div>
  );
}
