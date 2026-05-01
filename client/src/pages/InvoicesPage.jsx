import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import PrintableInvoice from "../components/PrintableInvoice";
import {
  FileText,
  Search,
  Eye,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  IndianRupee,
  TrendingUp,
  Calendar,
  X,
  Filter,
  Edit2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function getStatusInfo(inv) {
  const bal = parseFloat(inv.balanceAmount || 0);
  const total = parseFloat(inv.grandTotal || 0);
  if (bal <= 0) return { label: "Paid", color: "emerald", icon: CheckCircle2 };
  if (bal < total) return { label: "Partial", color: "amber", icon: Clock };
  return { label: "Pending", color: "red", icon: AlertCircle };
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const componentRef = useRef();

  const handlePrint = useReactToPrint({ contentRef: componentRef });

  useEffect(() => {
    const inv = JSON.parse(localStorage.getItem("savedInvoices") || "[]");
    // Seed sample data if empty
    if (inv.length === 0) {
      const sample = [
        {
          invoiceNo: "MI/SRV/1001/26-27",
          invoiceDate: "01/05/2026",
          clientName: "Rajesh Gowda",
          clientAddress: "Kochi, Kerala",
          items: [
            { work: "Living Room Design", unit: "Sq.Ft", area: 450, price: 120, taxableAmount: 54000, gstAmount: 9720, amount: 63720, gstPerc: 18 },
          ],
          subTotal: 54000,
          totalGst: 9720,
          grandTotal: 63720,
          discount: 0,
          lessAmount: 0,
          advanceAmount: 20000,
          receivedAmount: 10000,
          balanceAmount: 33720,
        },
        {
          invoiceNo: "MI/SRV/1002/26-27",
          invoiceDate: "15/04/2026",
          clientName: "Anita Nair",
          clientAddress: "Trivandrum, Kerala",
          items: [
            { work: "Kitchen Remodel", unit: "Sq.Ft", area: 200, price: 200, taxableAmount: 40000, gstAmount: 7200, amount: 47200, gstPerc: 18 },
          ],
          subTotal: 40000,
          totalGst: 7200,
          grandTotal: 47200,
          discount: 0,
          lessAmount: 0,
          advanceAmount: 47200,
          receivedAmount: 0,
          balanceAmount: 0,
        },
        {
          invoiceNo: "MI/SRV/1003/26-27",
          invoiceDate: "10/04/2026",
          clientName: "Tech Corp Solutions",
          clientAddress: "Bangalore, Karnataka",
          items: [
            { work: "Office Interior", unit: "Sq.Ft", area: 1200, price: 150, taxableAmount: 180000, gstAmount: 32400, amount: 212400, gstPerc: 18 },
          ],
          subTotal: 180000,
          totalGst: 32400,
          grandTotal: 212400,
          discount: 5,
          lessAmount: 0,
          advanceAmount: 0,
          receivedAmount: 0,
          balanceAmount: 212400,
        },
      ];
      localStorage.setItem("savedInvoices", JSON.stringify(sample));
      setSavedInvoices(sample);
    } else {
      setSavedInvoices(inv);
    }
  }, []);

  const filtered = savedInvoices.filter((inv) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      inv.clientName?.toLowerCase().includes(q) ||
      inv.invoiceNo?.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (statusFilter === "All") return true;
    const { label } = getStatusInfo(inv);
    return label === statusFilter;
  });

  const totalInvoiced = savedInvoices.reduce(
    (s, i) => s + parseFloat(i.grandTotal || 0),
    0
  );
  const totalCollected = savedInvoices.reduce(
    (s, i) =>
      s +
      parseFloat(i.advanceAmount || 0) +
      parseFloat(i.receivedAmount || 0),
    0
  );
  const totalOutstanding = savedInvoices.reduce(
    (s, i) => s + Math.max(0, parseFloat(i.balanceAmount || 0)),
    0
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <FileText className="text-blue-600" size={32} />
            Invoice History
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            View, search, and print all generated invoices.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div className="bg-slate-900 text-white p-7 rounded-3xl shadow-xl">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
            <IndianRupee size={12} /> Total Invoiced
          </p>
          <h2 className="text-4xl font-black tracking-tighter">
            ₹{totalInvoiced.toLocaleString()}
          </h2>
          <p className="text-slate-500 text-xs mt-2 font-medium">
            {savedInvoices.length} invoice{savedInvoices.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Amount Collected
            </p>
            <h2 className="text-3xl font-black text-emerald-600">
              ₹{totalCollected.toLocaleString()}
            </h2>
          </div>
          <div className="p-4 bg-emerald-50 rounded-3xl text-emerald-500">
            <TrendingUp size={28} />
          </div>
        </div>
        <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Outstanding Balance
            </p>
            <h2 className="text-3xl font-black text-red-500">
              ₹{totalOutstanding.toLocaleString()}
            </h2>
          </div>
          <div className="p-4 bg-red-50 rounded-3xl text-red-500">
            <AlertCircle size={28} />
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Status Filter */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {["All", "Paid", "Partial", "Pending"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  statusFilter === s
                    ? s === "Paid"
                      ? "bg-emerald-600 text-white shadow"
                      : s === "Partial"
                      ? "bg-amber-500 text-white shadow"
                      : s === "Pending"
                      ? "bg-red-500 text-white shadow"
                      : "bg-slate-900 text-white shadow"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {s}
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
              placeholder="Search by client or invoice no..."
              className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium w-72"
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
                <th className="px-8 py-4">Invoice No.</th>
                <th className="px-8 py-4">Date</th>
                <th className="px-8 py-4">Client</th>
                <th className="px-8 py-4 text-right">Grand Total</th>
                <th className="px-8 py-4 text-right">Collected</th>
                <th className="px-8 py-4 text-right">Balance</th>
                <th className="px-8 py-4 text-center">Status</th>
                <th className="px-8 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((inv) => {
                const { label, color, icon: StatusIcon } = getStatusInfo(inv);
                const collected =
                  parseFloat(inv.advanceAmount || 0) +
                  parseFloat(inv.receivedAmount || 0);
                return (
                  <tr
                    key={inv.invoiceNo}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-8 py-5">
                      <span className="font-black text-blue-700 text-sm">
                        {inv.invoiceNo}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-500 font-medium flex items-center gap-2">
                      <Calendar size={13} className="text-slate-300" />
                      {inv.invoiceDate}
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-900 text-sm">
                        {inv.clientName}
                      </p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {inv.clientAddress}
                      </p>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-slate-900 text-base">
                      ₹{parseFloat(inv.grandTotal).toLocaleString()}
                    </td>
                    <td className="px-8 py-5 text-right font-bold text-emerald-600">
                      ₹{collected.toLocaleString()}
                    </td>
                    <td className="px-8 py-5 text-right font-bold text-red-500">
                      ₹{Math.max(0, parseFloat(inv.balanceAmount || 0)).toLocaleString()}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-${color}-100 text-${color}-700`}
                      >
                        <StatusIcon size={10} />
                        {label}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() =>
                            navigate("/billing", {
                              state: { editInvoice: inv },
                            })
                          }
                          className="p-2 bg-violet-50 text-violet-600 rounded-xl hover:bg-violet-100 transition"
                          title="Edit Invoice"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setPreviewInvoice(inv)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition"
                          title="Preview"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setPreviewInvoice(inv);
                            setTimeout(() => handlePrint(), 400);
                          }}
                          className="p-2 bg-teal-50 text-teal-600 rounded-xl hover:bg-teal-100 transition"
                          title="Print"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <Filter className="mx-auto text-slate-200 mb-3" size={40} />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
              No invoices found.{" "}
              {savedInvoices.length === 0
                ? "Generate invoices from the Billing page."
                : "Try a different search or filter."}
            </p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg">{previewInvoice.invoiceNo}</h3>
                <p className="text-slate-400 text-sm">{previewInvoice.clientName}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition"
                >
                  <Printer size={16} /> Print
                </button>
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="text-slate-400 hover:text-white transition p-2"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Client</p>
                    <p className="font-black text-slate-900 mt-1">{previewInvoice.clientName}</p>
                    <p className="text-slate-500 text-xs">{previewInvoice.clientAddress}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Invoice Date</p>
                    <p className="font-bold text-slate-700 mt-1">{previewInvoice.invoiceDate}</p>
                  </div>
                </div>
                <table className="w-full text-sm border border-slate-100 rounded-2xl overflow-hidden mt-4">
                  <thead className="bg-slate-50">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-4 py-3 text-left">Work</th>
                      <th className="px-4 py-3 text-center">Area</th>
                      <th className="px-4 py-3 text-right">Taxable</th>
                      <th className="px-4 py-3 text-right">GST</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewInvoice.items?.map((item, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium">{item.work}</td>
                        <td className="px-4 py-3 text-center">{item.area} {item.unit}</td>
                        <td className="px-4 py-3 text-right">₹{parseFloat(item.taxableAmount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-blue-600">₹{parseFloat(item.gstAmount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-black">₹{parseFloat(item.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-slate-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-bold">₹{parseFloat(previewInvoice.subTotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total GST</span>
                    <span className="font-bold text-blue-600">₹{parseFloat(previewInvoice.totalGst || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black border-t border-slate-200 pt-2 mt-2">
                    <span>Grand Total</span>
                    <span className="text-emerald-600">₹{parseFloat(previewInvoice.grandTotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Advance Paid</span>
                    <span className="font-bold">₹{parseFloat(previewInvoice.advanceAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Received</span>
                    <span className="font-bold">₹{parseFloat(previewInvoice.receivedAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-red-600 border-t border-slate-200 pt-2">
                    <span>Balance Due</span>
                    <span>₹{Math.max(0, parseFloat(previewInvoice.balanceAmount || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print target */}
      {previewInvoice && (
        <div className="opacity-0 fixed top-0 left-0 pointer-events-none">
          <PrintableInvoice
            ref={componentRef}
            data={{
              customer: previewInvoice.clientName,
              address: previewInvoice.clientAddress,
              items: previewInvoice.items || [],
              invoiceNo: previewInvoice.invoiceNo,
              invoiceDate: previewInvoice.invoiceDate,
              discount: previewInvoice.discount,
              lessAmount: previewInvoice.lessAmount,
              advanceAmount: previewInvoice.advanceAmount,
              receivedAmount: previewInvoice.receivedAmount,
              subTotal: previewInvoice.subTotal,
              totalGst: previewInvoice.totalGst,
              grandTotal: previewInvoice.grandTotal,
              balanceAmount: previewInvoice.balanceAmount,
            }}
            docType="Invoice"
          />
        </div>
      )}
    </div>
  );
}
