import * as XLSX from "xlsx";

export default function ExportExcel({ rows }) {
  function handleExport() {
    if (!rows.length) return;

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reorder");

    XLSX.writeFile(workbook, "sellerflex_reorder.xlsx");
  }

  return (
    <button
      onClick={handleExport}
      className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
    >
      Export Excel
    </button>
  );
}
