const tabs = ["ALL", "7D", "15D", "30D", "YTD"];

export default function Tabs({ active, onChange }) {
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-2 rounded text-sm font-medium
            ${
              active === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }
          `}
        >
          {tab === "ALL" ? "All DRR" : `${tab} DRR`}
        </button>
      ))}
    </div>
  );
}
