import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Receipt,
  Search,
  TrendingUp,
  TrendingDown,
  X,
  Plus,
  User,
  Building2,
  Tag,
  Calendar,
  Layers,
  Filter,
  ListPlus,
  Save,
  RotateCcw,
  Trash2,
  ArrowLeft,
} from "lucide-react";

const OVERHEAD_CATEGORIES = [
  "Office Rent",
  "Electricity",
  "Internet & Phone",
  "Vehicle & Fuel",
  "Office Supplies",
  "Maintenance",
  "Software & Tools",
  "Marketing",
  "Miscellaneous",
];

const INITIAL_EXPENSES = [];

export default function ExpensePage() {
  const location = useLocation();
  const [uiMode, setUiMode] = useState("Dashboard");
  
  // Bulk States
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkExpenseType, setBulkExpenseType] = useState("Client");
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split("T")[0]);
  const [bulkClient, setBulkClient] = useState("");
  const [bulkCategory, setBulkCategory] = useState(OVERHEAD_CATEGORIES[0]);
  
  const [bulkNewItem, setBulkNewItem] = useState({
    material: "",
    qty: "",
    cost: ""
  });

  const addBulkItem = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!bulkNewItem.cost || (!bulkNewItem.material && !bulkNewItem.description)) return;
    setBulkItems([...bulkItems, {
      ...bulkNewItem,
      id: Date.now(),
      expenseType: bulkExpenseType,
      date: bulkDate,
      client: bulkExpenseType === "Client" ? bulkClient : "",
      category: bulkExpenseType === "Overhead" ? bulkCategory : "",
      description: bulkExpenseType === "Overhead" ? bulkNewItem.material : "",
      material: bulkExpenseType === "Client" ? bulkNewItem.material : "",
      cost: parseFloat(bulkNewItem.cost || 0)
    }]);
    setBulkNewItem({ material: "", qty: "", cost: "" });
  };

  const removeBulkItem = (id) => setBulkItems(bulkItems.filter((i) => i.id !== id));

  const [activeTab, setActiveTab] = useState("All");
  const [viewType, setViewType] = useState("Monthly");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseHistory, setExpenseHistory] = useState([]);

  const isClientOnlyView = location.state?.view === "ClientOnly";

  useEffect(() => {
    if (isClientOnlyView) {
      setActiveTab("Client");
    }
  }, [isClientOnlyView]);

  const loadExpenses = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/finance/expenses');
      const data = await res.json();
      setExpenseHistory(data.map(e => ({ ...e, cost: e.amount, expenseType: e.type, client: e.clientId, material: e.description })));
    } catch(err) { console.error(err); }
  };

  React.useEffect(() => {
    loadExpenses();
  }, []);

  const saveBulkExpenses = async () => {
    if (bulkItems.length === 0) return alert("No items to save.");
    
    // Some basic validation
    const invalidClient = bulkItems.find(i => i.expenseType === "Client" && !i.client);
    if (invalidClient) return alert("Please make sure all client expenses have a Client Name specified before adding to the list.");

    try {
      for (const item of bulkItems) {
        await fetch('http://localhost:5000/api/finance/expenses', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ date: item.date, category: item.category, description: item.expenseType === "Client" ? item.material : item.description, amount: item.cost, clientId: item.client, type: item.expenseType })
        });
      }
      setBulkItems([]);
      loadExpenses();
      alert("Bulk expenses saved successfully!");
    } catch(err) { console.error(err); }
  };

  const [newExpense, setNewExpense] = useState({
    expenseType: "Client",
    client: "",
    material: "",
    qty: "",
    cost: "",
    category: OVERHEAD_CATEGORIES[0],
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (location.state?.autoFill) {
      const { name } = location.state.autoFill;
      setNewExpense(prev => ({ ...prev, client: name, expenseType: "Client" }));
      setIsModalOpen(true);
    }
  }, [location.state]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const entry = {
      ...newExpense,
      id: `EXP-${Date.now()}`,
      cost: parseFloat(newExpense.cost),
    };
    try {
      await fetch('http://localhost:5000/api/finance/expenses', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ date: entry.date, category: entry.category, description: entry.expenseType === "Client" ? entry.material : entry.description, amount: entry.cost, clientId: entry.client, type: entry.expenseType })
      });
      loadExpenses();
      setIsModalOpen(false);
      setNewExpense({
        expenseType: "Client",
        client: "",
        material: "",
        qty: "",
        cost: "",
        category: OVERHEAD_CATEGORIES[0],
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch(err) { console.error(err); }
  };

  const timeFiltered = expenseHistory.filter((item) => {
    const itemDate = new Date(item.date);
    const today = new Date();
    if (viewType === "Monthly") {
      return (
        itemDate.getMonth() === today.getMonth() &&
        itemDate.getFullYear() === today.getFullYear()
      );
    }
    const fiscalYearStart =
      today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return itemDate >= new Date(`${fiscalYearStart}-04-01`);
  });

  const tabFiltered = timeFiltered.filter((e) => {
    if (activeTab === "Client") return e.expenseType === "Client";
    if (activeTab === "Overhead") return e.expenseType === "Overhead";
    return true;
  });

  const searchFiltered = tabFiltered.filter((e) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (
      e.client?.toLowerCase().includes(q) ||
      e.material?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q)
    );

    if (isClientOnlyView && location.state?.autoFill?.name) {
      return matchesSearch && e.client === location.state.autoFill.name;
    }

    return matchesSearch;
  });

  const totalClientCost = timeFiltered
    .filter((e) => e.expenseType === "Client")
    .reduce((s, e) => s + e.cost, 0);
  const totalOverheadCost = timeFiltered
    .filter((e) => e.expenseType === "Overhead")
    .reduce((s, e) => s + e.cost, 0);
  const grandTotal = totalClientCost + totalOverheadCost;

  const TABS = ["All", "Client", "Overhead"];

  useEffect(() => {
    if (isClientOnlyView) {
      setBulkExpenseType("Client");
      if (location.state?.autoFill?.name) {
        setBulkClient(location.state.autoFill.name);
      }
    }
  }, [isClientOnlyView, location.state]);

  if (uiMode === "Bulk") {
    return (
      <div className="bg-gray-200 min-h-screen font-sans text-slate-800 flex flex-col">
        {/* ── TOP INFO BAR ── */}
        <div className="bg-indigo-50 p-2 grid grid-cols-12 gap-2 border-b border-indigo-200 items-end text-slate-600">
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Expense Type</label>
            <select
              value={bulkExpenseType}
              onChange={(e) => setBulkExpenseType(e.target.value)}
              disabled={isClientOnlyView}
              className={`w-full bg-white border border-indigo-200 px-2 py-1 text-sm outline-none focus:border-indigo-400 font-bold ${isClientOnlyView ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option>Client</option>
              {!isClientOnlyView && <option>Overhead</option>}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Date</label>
            <input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              className="w-full bg-white border border-indigo-200 px-2 py-1 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          {bulkExpenseType === "Client" ? (
            <div className="col-span-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Client Name</label>
              <input
                placeholder="Enter client name..."
                value={bulkClient}
                onChange={(e) => setBulkClient(e.target.value)}
                className="w-full bg-white border border-indigo-200 px-2 py-1 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          ) : (
            <div className="col-span-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Category</label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="w-full bg-white border border-indigo-200 px-2 py-1 text-sm outline-none focus:border-indigo-400"
              >
                {OVERHEAD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="col-span-4 flex flex-col items-end justify-end pb-0.5">
            <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-widest">Bulk Total</span>
            <span className="text-sm font-black text-indigo-800">
              ₹{bulkItems.reduce((s, i) => s + i.cost, 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── ENTRY ROW ── */}
        <div className="bg-blue-50 p-1 grid grid-cols-12 gap-1 border-b border-blue-200">
          <div className="col-span-6">
            <label className="block text-[10px] font-bold text-blue-800 text-center uppercase">
              {bulkExpenseType === "Client" ? "Material / Item" : "Description"}
            </label>
            <input
              placeholder={bulkExpenseType === "Client" ? "e.g. Plywood" : "e.g. Office Rent"}
              value={bulkNewItem.material}
              onChange={(e) => setBulkNewItem({ ...bulkNewItem, material: e.target.value })}
              onKeyPress={(e) => e.key === "Enter" && addBulkItem()}
              className="w-full bg-white border border-blue-200 px-2 py-1 text-sm outline-none focus:border-blue-400 font-medium"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-[10px] font-bold text-blue-800 text-center uppercase">Qty / Unit (Optional)</label>
            <input
              placeholder="e.g. 10 Sheets"
              value={bulkNewItem.qty}
              onChange={(e) => setBulkNewItem({ ...bulkNewItem, qty: e.target.value })}
              onKeyPress={(e) => e.key === "Enter" && addBulkItem()}
              className="w-full bg-white border border-blue-200 px-2 py-1 text-sm text-center outline-none focus:border-blue-400"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-[10px] font-bold text-blue-800 text-center uppercase tracking-tighter">Total Cost (₹)</label>
            <input
              type="number"
              placeholder="0.00"
              value={bulkNewItem.cost}
              onChange={(e) => setBulkNewItem({ ...bulkNewItem, cost: e.target.value })}
              onKeyPress={(e) => e.key === "Enter" && addBulkItem()}
              className="w-full bg-white border border-blue-200 px-2 py-1 text-sm text-right outline-none focus:border-blue-400 font-bold"
            />
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="flex-grow bg-white overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-gray-100 border-b border-gray-300 sticky top-0">
              <tr className="uppercase text-gray-600 font-bold">
                <th className="px-2 py-1 border-r border-gray-300 text-center w-12">Rem</th>
                <th className="px-2 py-1 border-r border-gray-300 text-center w-10">S#</th>
                <th className="px-2 py-1 border-r border-gray-300 text-center w-24">Type</th>
                <th className="px-2 py-1 border-r border-gray-300 text-left">Client/Category</th>
                <th className="px-2 py-1 border-r border-gray-300 text-left">Details</th>
                <th className="px-2 py-1 border-r border-gray-300 text-center w-20">Qty</th>
                <th className="px-2 py-1 text-right w-28">Cost (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bulkItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-indigo-50">
                  <td className="px-2 py-1 border-r border-gray-200 text-center">
                    <button onClick={() => removeBulkItem(item.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  </td>
                  <td className="px-2 py-1 border-r border-gray-200 text-center font-bold text-gray-400">{idx + 1}</td>
                  <td className="px-2 py-1 border-r border-gray-200 text-center font-semibold text-indigo-700">{item.expenseType}</td>
                  <td className="px-2 py-1 border-r border-gray-200 uppercase font-medium">{item.client || item.category}</td>
                  <td className="px-2 py-1 border-r border-gray-200">{item.material || item.description}</td>
                  <td className="px-2 py-1 border-r border-gray-200 text-center text-gray-500">{item.qty || "—"}</td>
                  <td className="px-2 py-1 text-right font-black text-indigo-700">{item.cost.toFixed(2)}</td>
                </tr>
              ))}
              {bulkItems.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-20 text-center text-gray-300 font-bold uppercase tracking-widest italic">
                    No items in bulk entry list
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── ACTION BAR ── */}
        <div className="bg-slate-800 p-1 flex justify-center gap-1">
          <button
            onClick={() => setUiMode("Dashboard")}
            className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <button
            onClick={() => {
              if (window.confirm("Clear bulk list?")) setBulkItems([]);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
          >
            <RotateCcw size={14} /> Clear List
          </button>
          <button
            onClick={saveBulkExpenses}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
          >
            <Save size={14} /> Save All Expenses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Receipt className="text-indigo-600" size={32} />
            {isClientOnlyView ? `Project Expenses: ${location.state.autoFill?.name}` : 'Utilities Management'}
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            {isClientOnlyView 
              ? `Tracking all material and service costs for this work order.` 
              : 'Track client material costs & business overhead separately.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-white p-1 rounded-xl border shadow-sm">
            {["Monthly", "Financial Year"].map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                  viewType === type
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <button
            onClick={() => setUiMode("Bulk")}
            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 h-11 px-6 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <ListPlus size={18} /> Bulk Entry
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white h-11 px-6 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <Plus size={18} /> Log Utility
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div className={`bg-slate-900 text-white p-7 rounded-3xl shadow-xl ${isClientOnlyView ? 'lg:col-span-1' : ''}`}>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">
            Total {isClientOnlyView ? 'Project' : 'Utilities'}
          </p>
          <h2 className="text-4xl font-black tracking-tighter">
            ₹{(isClientOnlyView ? totalClientCost : grandTotal).toLocaleString()}
          </h2>
          <div className="mt-3 flex items-center gap-2 text-slate-400 text-xs font-bold">
            <Layers size={14} />
            <span>{viewType} view</span>
          </div>
        </div>

        <div className={`bg-white p-7 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between ${isClientOnlyView ? 'lg:col-span-2' : ''}`}>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Client Expenses
            </p>
            <h2 className="text-3xl font-black text-indigo-600">
              ₹{totalClientCost.toLocaleString()}
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Materials &amp; procurement {isClientOnlyView && `for ${location.state.autoFill?.name}`}
            </p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-500">
            <User size={28} />
          </div>
        </div>

        {!isClientOnlyView && (
          <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Overhead Expenses
              </p>
              <h2 className="text-3xl font-black text-amber-600">
                ₹{totalOverheadCost.toLocaleString()}
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Rent, utilities &amp; ops
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-3xl text-amber-500">
              <Building2 size={28} />
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {TABS.filter(t => !isClientOnlyView || t !== "Overhead").map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === tab
                    ? tab === "Client"
                      ? "bg-indigo-600 text-white shadow"
                      : tab === "Overhead"
                      ? "bg-amber-500 text-white shadow"
                      : "bg-slate-900 text-white shadow"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search expenses..."
              className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/50">
                <th className="px-8 py-4">Type</th>
                <th className="px-8 py-4">Date</th>
                <th className="px-8 py-4">Details</th>
                <th className="px-8 py-4">Category / Client</th>
                <th className="px-8 py-4">Qty / Unit</th>
                <th className="px-8 py-4 text-right">Cost (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {searchFiltered.map((expense) => (
                <tr
                  key={expense.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="px-8 py-5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        expense.expenseType === "Client"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {expense.expenseType === "Client" ? (
                        <User size={10} />
                      ) : (
                        <Building2 size={10} />
                      )}
                      {expense.expenseType}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm text-slate-500 font-medium whitespace-nowrap">
                    {new Date(expense.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-900 text-sm">
                      {expense.expenseType === "Client"
                        ? expense.material
                        : expense.description}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    {expense.expenseType === "Client" ? (
                      <span className="text-indigo-700 font-black text-xs uppercase tracking-wide">
                        {expense.client}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">
                        <Tag size={10} />
                        {expense.category}
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-xs text-slate-500 font-bold uppercase">
                    {expense.qty || "—"}
                  </td>
                  <td className="px-8 py-5 text-right font-black text-slate-900 text-base">
                    ₹{expense.cost.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {searchFiltered.length === 0 && (
          <div className="py-20 text-center">
            <Filter className="mx-auto text-slate-200 mb-3" size={40} />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
              No expenses found for the selected filters.
            </p>
          </div>
        )}

        {/* Footer totals */}
        {searchFiltered.length > 0 && (
          <div className="border-t border-slate-100 px-8 py-4 bg-slate-50/50 flex justify-end">
            <div className="text-sm font-black text-slate-900">
              Showing {searchFiltered.length} entries &nbsp;|&nbsp; Total:{" "}
              <span className="text-indigo-700 text-base">
                ₹
                {searchFiltered
                  .reduce((s, e) => s + e.cost, 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <form
            onSubmit={handleAddExpense}
            className="bg-white p-10 rounded-[40px] w-full max-w-xl shadow-2xl relative border border-slate-100"
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition"
            >
              <X size={28} />
            </button>

            <h2 className="text-3xl font-black mb-2 text-slate-900 tracking-tighter">
              Log New Utility
            </h2>
            <p className="text-slate-400 text-sm mb-8 font-medium">
              Choose whether this is a client project cost or a business
              overhead.
            </p>

            {/* Expense Type Toggle */}
            <div className="flex gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl">
              {["Client", "Overhead"].filter(t => !isClientOnlyView || t === "Client").map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setNewExpense({ ...newExpense, expenseType: type })
                  }
                  className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                    newExpense.expenseType === type
                      ? type === "Client"
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "bg-amber-500 text-white shadow-lg"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {type === "Client" ? (
                    <User size={16} />
                  ) : (
                    <Building2 size={16} />
                  )}
                  {type} Expense
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {newExpense.expenseType === "Client" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                        Client Name
                      </label>
                      <input
                        required
                        placeholder="Full name"
                        className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-indigo-500 font-bold text-sm transition"
                        value={newExpense.client}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            client: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                        Date
                      </label>
                      <input
                        required
                        type="date"
                        className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-indigo-500 font-bold text-sm transition"
                        value={newExpense.date}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                      Material / Item
                    </label>
                    <input
                      required
                      placeholder="e.g. Marine Plywood, Paint..."
                      className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-indigo-500 font-bold text-sm transition"
                      value={newExpense.material}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          material: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                        Quantity
                      </label>
                      <input
                        placeholder="e.g. 10 units"
                        className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-indigo-500 font-bold text-sm transition"
                        value={newExpense.qty}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, qty: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                        Total Cost (₹)
                      </label>
                      <input
                        required
                        type="number"
                        placeholder="0.00"
                        className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-indigo-500 font-bold text-sm transition"
                        value={newExpense.cost}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            cost: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                        Category
                      </label>
                      <select
                        className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-amber-500 font-bold text-sm transition"
                        value={newExpense.category}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            category: e.target.value,
                          })
                        }
                      >
                        {OVERHEAD_CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                        Date
                      </label>
                      <input
                        required
                        type="date"
                        className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-amber-500 font-bold text-sm transition"
                        value={newExpense.date}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                      Description
                    </label>
                    <input
                      required
                      placeholder="e.g. April office rent payment"
                      className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-amber-500 font-bold text-sm transition"
                      value={newExpense.description}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                      Amount (₹)
                    </label>
                    <input
                      required
                      type="number"
                      placeholder="0.00"
                      className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-amber-500 font-bold text-sm transition"
                      value={newExpense.cost}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, cost: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className={`w-full text-white py-5 rounded-[25px] font-black text-sm uppercase tracking-[0.2em] mt-4 shadow-xl transition-all active:scale-95 ${
                  newExpense.expenseType === "Client"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                Save Utility Entry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
