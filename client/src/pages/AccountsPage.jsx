import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Landmark,
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  Filter,
  FileText,
  Wallet,
  Receipt,
  IndianRupee,
} from "lucide-react";

const CATEGORY_COLORS = {
  "Project Income": { bg: "bg-emerald-100", text: "text-emerald-700", icon: TrendingUp },
  "Employee Payroll": { bg: "bg-violet-100", text: "text-violet-700", icon: Wallet },
  "Material Purchase": { bg: "bg-amber-100", text: "text-amber-700", icon: Receipt },
  "Overhead": { bg: "bg-orange-100", text: "text-orange-700", icon: Receipt },
  "Other": { bg: "bg-slate-100", text: "text-slate-700", icon: FileText },
};

function getCategoryStyle(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS["Other"];
}

function buildTransactions() {
  const txns = [];

  // From Invoices (Credits)
  try {
    const invoices = JSON.parse(localStorage.getItem("savedInvoices") || "[]");
    invoices.forEach((inv) => {
      if ((inv.advanceAmount || 0) > 0) {
        txns.push({
          id: `INV-ADV-${inv.invoiceNo}`,
          date: inv.invoiceDate?.split("/").reverse().join("-") || "2026-04-01",
          description: `Advance — ${inv.invoiceNo} (${inv.clientName})`,
          type: "Credit",
          category: "Project Income",
          amount: parseFloat(inv.advanceAmount),
        });
      }
      if ((inv.receivedAmount || 0) > 0) {
        txns.push({
          id: `INV-REC-${inv.invoiceNo}`,
          date: inv.invoiceDate?.split("/").reverse().join("-") || "2026-04-01",
          description: `Payment — ${inv.invoiceNo} (${inv.clientName})`,
          type: "Credit",
          category: "Project Income",
          amount: parseFloat(inv.receivedAmount),
        });
      }
    });
  } catch (_) {}

  // From Expenses (Debits)
  try {
    const expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
    expenses.forEach((exp) => {
      txns.push({
        id: `EXP-${exp.id}`,
        date: exp.date,
        description:
          exp.expenseType === "Client"
            ? `Material: ${exp.material} — ${exp.client}`
            : `${exp.category}: ${exp.description}`,
        type: "Debit",
        category: exp.expenseType === "Overhead" ? "Overhead" : "Material Purchase",
        amount: parseFloat(exp.cost),
      });
    });
  } catch (_) {}

  // From Payroll (Debits)
  try {
    const payrolls = JSON.parse(localStorage.getItem("processedPayrolls") || "[]");
    payrolls.forEach((p) => {
      txns.push({
        id: `PAY-${p.id}`,
        date: p.paidOn,
        description: `Salary — ${p.employeeName} (${p.month} ${p.year})`,
        type: "Debit",
        category: "Employee Payroll",
        amount: parseFloat(p.netPay),
      });
    });
  } catch (_) {}

  // Fallback seed data if everything is empty
  if (txns.length === 0) {
    return [
      { id: "TXN-001", date: "2026-04-28", description: "Invoice MI/SRV/1001/26-27 — Rajesh Gowda (Advance)", type: "Credit", category: "Project Income", amount: 20000 },
      { id: "TXN-002", date: "2026-04-28", description: "Invoice MI/SRV/1002/26-27 — Anita Nair (Full Payment)", type: "Credit", category: "Project Income", amount: 47200 },
      { id: "TXN-003", date: "2026-04-30", description: "Salary — Rahul Kumar (April 2026)", type: "Debit", category: "Employee Payroll", amount: 42000 },
      { id: "TXN-004", date: "2026-04-30", description: "Salary — Meena R. (April 2026)", type: "Debit", category: "Employee Payroll", amount: 38000 },
      { id: "TXN-005", date: "2026-04-15", description: "Material: Marine Plywood — Rajesh Gowda", type: "Debit", category: "Material Purchase", amount: 45000 },
      { id: "TXN-006", date: "2026-04-01", description: "Office Rent: April 2026 office rent payment", type: "Debit", category: "Overhead", amount: 35000 },
      { id: "TXN-007", date: "2026-04-05", description: "Electricity: Electricity bill April 2026", type: "Debit", category: "Overhead", amount: 4800 },
    ];
  }

  return txns.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export default function AccountsPage() {
  const [transactions, setTransactions] = useState([]);
  const [viewType, setViewType] = useState("Monthly");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setTransactions(buildTransactions());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Time filter
  const timeFiltered = transactions.filter((item) => {
    const itemDate = new Date(item.date);
    const today = new Date();
    if (viewType === "Monthly") {
      return (
        itemDate.getMonth() === today.getMonth() &&
        itemDate.getFullYear() === today.getFullYear()
      );
    }
    const fiscalYearStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return itemDate >= new Date(fiscalYearStart, 3, 1);
  });

  // Apply all filters
  const finalFiltered = timeFiltered.filter((t) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    const matchCat = categoryFilter === "All" || t.category === categoryFilter;
    const matchType = typeFilter === "All" || t.type === typeFilter;
    return matchSearch && matchCat && matchType;
  });

  const totalCredit = timeFiltered.filter((t) => t.type === "Credit").reduce((s, t) => s + t.amount, 0);
  const totalDebit = timeFiltered.filter((t) => t.type === "Debit").reduce((s, t) => s + t.amount, 0);
  const balance = totalCredit - totalDebit;

  // Running balance (chronological order for calculation)
  const sorted = [...finalFiltered].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const withBalance = sorted.map((t) => {
    running += t.type === "Credit" ? t.amount : -t.amount;
    return { ...t, runningBalance: running };
  }).reverse();

  const uniqueCategories = ["All", ...Array.from(new Set(transactions.map((t) => t.category)))];

  // PDF Export
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("MONA INTERIOR — ACCOUNT STATEMENT", 14, 18);
    doc.setFontSize(10);
    doc.text(`Period: ${viewType} | Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, 26);
    doc.autoTable({
      head: [["Date", "Description", "Category", "Debit (₹)", "Credit (₹)", "Balance (₹)"]],
      body: withBalance.map((t) => [
        new Date(t.date).toLocaleDateString("en-IN"),
        t.description,
        t.category,
        t.type === "Debit" ? t.amount.toLocaleString() : "",
        t.type === "Credit" ? t.amount.toLocaleString() : "",
        t.runningBalance.toLocaleString(),
      ]),
      startY: 32,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });
    doc.save(`Statement_${viewType}_${Date.now()}.pdf`);
  };

  // Excel Export
  const exportToExcel = () => {
    const rows = withBalance.map((t) => ({
      Date: new Date(t.date).toLocaleDateString("en-IN"),
      Description: t.description,
      Category: t.category,
      Type: t.type,
      Debit: t.type === "Debit" ? t.amount : "",
      Credit: t.type === "Credit" ? t.amount : "",
      "Running Balance": t.runningBalance,
    }));

    // Summary rows
    rows.push({});
    rows.push({ Description: "TOTAL CREDITS", Credit: totalCredit });
    rows.push({ Description: "TOTAL DEBITS", Debit: totalDebit });
    rows.push({ Description: "CLOSING BALANCE", "Running Balance": balance });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statement");
    XLSX.writeFile(wb, `Mona_Statement_${viewType}_${Date.now()}.xlsx`);
  };

  const TYPE_TABS = ["All", "Credit", "Debit"];

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-black tracking-widest mb-2">
            <Landmark size={14} />
            <span>Compliance</span>
            <ChevronRight size={12} />
            <span className="text-slate-900">Accounts</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Landmark className="text-indigo-600" size={32} />
            Account Statement
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Read-only balance sheet — auto-synced from all modules.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-600 font-bold text-xs">
          <Clock size={14} />
          {currentTime.toLocaleTimeString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">
            {viewType} Net Balance
          </p>
          <h2 className={`text-5xl font-black tracking-tighter ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ₹{Math.abs(balance).toLocaleString()}
          </h2>
          <p className="text-slate-500 text-xs mt-2 font-medium">
            {balance >= 0 ? "Surplus" : "Deficit"}
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Total Inflow
            </p>
            <h2 className="text-3xl font-black text-emerald-600">
              ₹{totalCredit.toLocaleString()}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Credits (Income)</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-3xl text-emerald-500">
            <ArrowUpCircle size={32} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Total Outflow
            </p>
            <h2 className="text-3xl font-black text-red-500">
              ₹{totalDebit.toLocaleString()}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Debits (Expenses)</p>
          </div>
          <div className="p-4 bg-red-50 rounded-3xl text-red-500">
            <ArrowDownCircle size={32} />
          </div>
        </div>
      </div>

      {/* Statement Table */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Period Toggle */}
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              {["Monthly", "Financial Year"].map((type) => (
                <button
                  key={type}
                  onClick={() => setViewType(type)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    viewType === type
                      ? "bg-slate-900 text-white shadow"
                      : "text-slate-400 hover:text-slate-800"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {TYPE_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    typeFilter === t
                      ? t === "Credit"
                        ? "bg-emerald-600 text-white shadow"
                        : t === "Debit"
                        ? "bg-red-500 text-white shadow"
                        : "bg-slate-900 text-white shadow"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <select
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {uniqueCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium w-56"
                placeholder="Search statement..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Export PDF */}
            <button
              onClick={exportToPDF}
              className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition shadow-sm"
            >
              <Download size={15} /> PDF
            </button>
            {/* Export Excel */}
            <button
              onClick={exportToExcel}
              className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-emerald-700 transition shadow-sm"
            >
              <FileSpreadsheet size={15} /> Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-white">
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Description</th>
                <th className="px-8 py-5">Category</th>
                <th className="px-8 py-5 text-right">Debit</th>
                <th className="px-8 py-5 text-right">Credit</th>
                <th className="px-8 py-5 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {withBalance.map((txn) => {
                const { bg, text, icon: CatIcon } = getCategoryStyle(txn.category);
                return (
                  <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5 text-sm text-slate-500 font-medium whitespace-nowrap">
                      {new Date(txn.date).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-8 py-5 max-w-xs">
                      <p className="font-bold text-slate-900 text-sm leading-tight">
                        {txn.description}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${bg} ${text}`}>
                        <CatIcon size={10} />
                        {txn.category}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-red-500">
                      {txn.type === "Debit" ? `₹${txn.amount.toLocaleString()}` : ""}
                    </td>
                    <td className="px-8 py-5 text-right font-black text-emerald-600">
                      {txn.type === "Credit" ? `₹${txn.amount.toLocaleString()}` : ""}
                    </td>
                    <td className={`px-8 py-5 text-right font-black text-base ${
                      txn.runningBalance >= 0 ? "text-slate-900" : "text-red-600"
                    }`}>
                      ₹{txn.runningBalance.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer */}
            {withBalance.length > 0 && (
              <tfoot className="border-t-4 border-slate-900">
                <tr className="bg-slate-50">
                  <td colSpan={3} className="px-8 py-6 text-right font-black text-slate-400 uppercase tracking-widest text-[10px]">
                    Period Total
                  </td>
                  <td className="px-8 py-6 text-right font-black text-red-500 text-lg italic border-r border-slate-100">
                    −₹{totalDebit.toLocaleString()}
                  </td>
                  <td className="px-8 py-6 text-right font-black text-emerald-600 text-lg italic">
                    +₹{totalCredit.toLocaleString()}
                  </td>
                  <td className="px-8 py-6 text-right font-black text-slate-400 text-sm">
                    —
                  </td>
                </tr>
                <tr className="bg-slate-900 text-white">
                  <td colSpan={4} className="px-8 py-8 text-right font-black uppercase tracking-widest text-xs text-slate-400">
                    {viewType} Closing Balance
                  </td>
                  <td colSpan={2} className="px-8 py-8 text-right">
                    <span className={`text-3xl font-black tracking-tighter ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      ₹{Math.abs(balance).toLocaleString()}
                    </span>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                      {balance >= 0 ? "Surplus" : "Deficit"}
                    </p>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {withBalance.length === 0 && (
          <div className="py-20 text-center">
            <Filter className="mx-auto text-slate-200 mb-3" size={40} />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
              No transactions found for the selected filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
