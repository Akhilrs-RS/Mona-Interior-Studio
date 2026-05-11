import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useNavigate, useLocation } from "react-router-dom";
import PrintableInvoice from "../components/PrintableInvoice";
import {
  Trash2,
  Printer,
  Save,
  RotateCcw,
  Search,
  History,
  X,
  Eye,
  Edit3,
  ArrowLeft,
  FileText,
  Plus,
} from "lucide-react";

export default function BillingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editBadge, setEditBadge] = useState("");
  const [billType, setBillType] = useState("GST"); // 'GST' | 'Non-GST'
  const [items, setItems] = useState([]);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toLocaleDateString("en-GB"),
  );

  // Footer fields
  const [discount, setDiscount] = useState(0);
  const [lessAmount, setLessAmount] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);

  // Modal States
  const [showQuoteSearch, setShowQuoteSearch] = useState(false);
  const [savedQuotations, setSavedQuotations] = useState([]);
  const [savedInvoices, setSavedInvoices] = useState([]);

  const [newItem, setNewItem] = useState({
    work: "",
    unit: "Sq.Ft",
    area: "",
    price: "",
    gstPerc: 18,
  });

  // ── MULTI-SESSION LOGIC ──────────────────────────────────────
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem("billing_sessions");
    return saved
      ? JSON.parse(saved)
      : [{ id: "default", title: "New Invoice", data: null }];
  });
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem("active_billing_session") || "default";
  });

  // Load session data when active session changes
  useEffect(() => {
    const session = sessions.find((s) => s.id === activeSessionId);
    if (session && session.data) {
      const d = session.data;
      setItems(d.items || []);
      setClientName(d.clientName || "");
      setClientAddress(d.clientAddress || "");
      setProjectTitle(d.projectTitle || "");
      setWorkDescription(d.workDescription || "");
      setBillType(d.billType || "GST");
      setDiscount(d.discount || 0);
      setLessAmount(d.lessAmount || 0);
      setAdvanceAmount(d.advanceAmount || 0);
      setReceivedAmount(d.receivedAmount || 0);
      setIsEditMode(d.isEditMode || false);
      setEditBadge(d.editBadge || "");
      if (d.invoiceNo) setInvoiceNo(d.invoiceNo);
    } else {
      // Clear for a new session if no data
      setItems([]);
      setClientName("");
      setClientAddress("");
      setBillType("GST");
      setDiscount(0);
      setLessAmount(0);
      setAdvanceAmount(0);
      setReceivedAmount(0);
      setIsEditMode(false);
      setEditBadge("");
      const lastNum = localStorage.getItem("lastInvoiceNumber") || "1000";
      setInvoiceNo(`MI/SRV/${parseInt(lastNum) + 1}/26-27`);
    }
    localStorage.setItem("active_billing_session", activeSessionId);
  }, [activeSessionId]);

  // Persist current state to sessions array
  useEffect(() => {
    const timer = setTimeout(() => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                title: clientName || "New Invoice",
                data: {
                  items,
                  clientName,
                  clientAddress,
                  projectTitle,
                  workDescription,
                  billType,
                  discount,
                  lessAmount,
                  advanceAmount,
                  receivedAmount,
                  isEditMode,
                  editBadge,
                  invoiceNo,
                },
              }
            : s,
        ),
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [
    items,
    clientName,
    clientAddress,
    projectTitle,
    workDescription,
    billType,
    discount,
    lessAmount,
    advanceAmount,
    receivedAmount,
    isEditMode,
    editBadge,
    invoiceNo,
    activeSessionId,
  ]);

  useEffect(() => {
    localStorage.setItem("billing_sessions", JSON.stringify(sessions));
  }, [sessions]);

  const createNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession = { id: newId, title: "New Invoice", data: null };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newId);
  };

  const closeSession = (id, e) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      // Don't close the last session, just clear it
      setSessions([{ id: "default", title: "New Invoice", data: null }]);
      setActiveSessionId("default");
      setItems([]);
      setClientName("");
      setClientAddress("");
      setBillType("GST");
      setDiscount(0);
      setLessAmount(0);
      setAdvanceAmount(0);
      setReceivedAmount(0);
      setIsEditMode(false);
      setEditBadge("");
      return;
    }
    const newSessions = sessions.filter((s) => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions[newSessions.length - 1].id);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        saveInvoice();
      }
      if (e.key === "F5") {
        e.preventDefault();
        handlePrint();
      }
      if (e.key === "F8") {
        e.preventDefault();
        clearForm();
      }
      if (e.key === "F9") {
        e.preventDefault();
        navigate("/invoices");
      }
      if (e.key === "F1") {
        e.preventDefault();
        deleteInvoice();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, clientName, isEditMode]); // Add dependencies as needed

  // Load Data + handle incoming navigation state
  useEffect(() => {
    // ── Handle: Auto-fill from Work Order ────────────────────────
    if (location.state?.autoFill) {
      const { name, address, desc } = location.state.autoFill;
      setClientName(name);
      setClientAddress(address);
      setProjectTitle(name);
      setWorkDescription(desc || "");
    }

    const lastNum = localStorage.getItem("lastInvoiceNumber") || "1000";
    const newNum = parseInt(lastNum) + 1;
    setInvoiceNo(`MI/SRV/${newNum}/26-27`);

    // Fetch Quotations for 'FROM QUOTE' functionality
    const fetchQuotes = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/quotations");
        const data = await res.json();
        setSavedQuotations(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchQuotes();

    // ── Handle: Convert from Quotation ───────────────────────────
    if (location.state?.convertQuote) {
      const q = location.state.convertQuote;
      setClientName(q.clientName);
      setClientAddress(q.clientAddress || "");
      setProjectTitle(q.projectTitle || "");
      setWorkDescription(q.workDescription || "");
      const isNonGST = q.billType === "Non-GST";
      if (isNonGST) setBillType("Non-GST");
      const mapped = q.items.map((i) => {
        const taxable = parseFloat(i.area || 1) * parseFloat(i.rate);
        const gst = isNonGST ? 0 : (taxable * 18) / 100;
        return {
          work: i.description,
          unit: i.unit || "Sq.Ft",
          area: i.area,
          price: i.rate,
          gstPerc: isNonGST ? 0 : 18,
          taxableAmount: taxable,
          gstAmount: gst,
          amount: taxable + gst,
          id: Date.now() + Math.random(),
        };
      });
      setItems(mapped);
      setEditBadge(
        `Converted from Quotation (${isNonGST ? "Non-GST" : "GST"}) — Review & save as Invoice`,
      );
      return;
    }

    // ── Handle: Edit existing Invoice ─────────────────────────────
    if (location.state?.editInvoice) {
      const inv = location.state.editInvoice;
      setInvoiceNo(inv.invoiceNo);
      setClientName(inv.clientName);
      setClientAddress(inv.clientAddress || "");
      setProjectTitle(inv.projectTitle || "");
      setWorkDescription(inv.workDescription || "");
      setItems(inv.items || []);
      setDiscount(inv.discount || 0);
      setLessAmount(inv.lessAmount || 0);
      setAdvanceAmount(inv.advanceAmount || 0);
      setReceivedAmount(inv.receivedAmount || 0);
      setInvoiceDate(inv.invoiceDate || new Date().toLocaleDateString("en-GB"));
      setIsEditMode(true);
      setEditBadge(`Editing Invoice: ${inv.invoiceNo}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFromQuote = (quote) => {
    setClientName(quote.clientName);
    setClientAddress(quote.clientAddress || "");
    setProjectTitle(quote.projectTitle || "");
    setWorkDescription(quote.workDescription || "");
    const isNonGST = quote.billType === "Non-GST";
    const type = isNonGST ? "Non-GST" : "GST";
    setBillType(type);
    const mappedItems = quote.items.map((i) => {
      const taxable = parseFloat(i.area || 1) * parseFloat(i.rate);
      const gst = isNonGST ? 0 : (taxable * 18) / 100;
      return {
        work: i.description,
        unit: i.unit || "Sq.Ft",
        area: i.area,
        price: i.rate,
        gstPerc: isNonGST ? 0 : 18,
        taxableAmount: taxable,
        gstAmount: gst,
        amount: taxable + gst,
        id: Date.now() + Math.random(),
      };
    });
    setItems(mappedItems);
    setShowQuoteSearch(false);
  };

  const componentRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: componentRef });

  const addItem = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newItem.work || !newItem.price) return;
    const taxableAmount =
      parseFloat(newItem.area || 1) * parseFloat(newItem.price);
    const effectiveGST =
      billType === "Non-GST" ? 0 : parseFloat(newItem.gstPerc || 0);
    const gstAmount = (taxableAmount * effectiveGST) / 100;
    const totalAmount = taxableAmount + gstAmount;
    setItems([
      ...items,
      {
        ...newItem,
        gstPerc: effectiveGST,
        taxableAmount,
        gstAmount,
        amount: totalAmount,
        id: Date.now(),
      },
    ]);
    setNewItem({
      work: "",
      unit: "Sq.Ft",
      area: "",
      price: "",
      gstPerc: billType === "Non-GST" ? 0 : 18,
    });
  };

  const removeItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const subTotal = items.reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalGst = items.reduce((sum, item) => sum + item.gstAmount, 0);
  const totalArea = items.reduce(
    (sum, item) => sum + parseFloat(item.area || 0),
    0,
  );

  const discountAmt = (subTotal * (parseFloat(discount) || 0)) / 100;
  const grandTotal =
    subTotal - discountAmt - (parseFloat(lessAmount) || 0) + totalGst;
  const balanceAmount =
    grandTotal -
    (parseFloat(advanceAmount) || 0) -
    (parseFloat(receivedAmount) || 0);

  const saveInvoice = async () => {
    if (!clientName || items.length === 0)
      return alert("Missing client or items");

    const currentNum = invoiceNo.split("/")[2];
    localStorage.setItem("lastInvoiceNumber", currentNum);

    const newInvoice = {
      id: isEditMode ? location.state.editInvoice.id : `INV-${Date.now()}`,
      invoiceNo,
      invoiceDate,
      clientName,
      clientAddress,
      projectTitle,
      workDescription,
      items: {
        itemsList: items,
        discount,
        lessAmount,
        advanceAmount,
        receivedAmount,
        balanceAmount,
        subTotal,
        totalGst,
        grandTotal,
      },
      date: new Date().toISOString().split("T")[0], // For database
      total: grandTotal,
      billType,
      status: "Unpaid",
    };

    try {
      if (isEditMode) {
        await fetch(
          `http://localhost:5000/api/finance/invoices/${newInvoice.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newInvoice),
          },
        );
      } else {
        await fetch("http://localhost:5000/api/finance/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newInvoice),
        });
      }
      setIsEditMode(false);
      setEditBadge("");
      alert(
        isEditMode
          ? "Invoice Updated Successfully!"
          : "Invoice Saved Successfully!",
      );
    } catch (err) {
      console.error(err);
    }
  };

  const loadOldInvoice = (inv) => {
    // This function is kept for potential future use within the page, though it's typically loaded via router state.
    setInvoiceNo(inv.invoiceNo);
    setClientName(inv.clientName);
    setClientAddress(inv.clientAddress);
    setItems(inv.items?.itemsList || inv.items);
    setDiscount(inv.items?.discount || 0);
    setLessAmount(inv.items?.lessAmount || 0);
    setAdvanceAmount(inv.items?.advanceAmount || 0);
    setReceivedAmount(inv.items?.receivedAmount || 0);
    setIsEditMode(true);
    setEditBadge(`Editing Invoice: ${inv.invoiceNo}`);
  };

  const deleteInvoice = async () => {
    if (!isEditMode) return clearForm();
    if (
      !window.confirm(
        "Are you sure you want to delete this invoice? This cannot be undone.",
      )
    )
      return;

    try {
      const id = location.state.editInvoice.id;
      await fetch(`http://localhost:5000/api/finance/invoices/${id}`, {
        method: "DELETE",
      });
      alert("Invoice deleted successfully");
      setIsEditMode(false);
      setEditBadge("");
      setItems([]);
      setClientName("");
      setClientAddress("");
      // Optionally navigate back or create new session
      navigate("/invoices");
    } catch (err) {
      console.error(err);
      alert("Error deleting invoice");
    }
  };

  const toggleBillType = (type) => {
    setBillType(type);
    const newGst = type === "Non-GST" ? 0 : 18;
    setNewItem((p) => ({ ...p, gstPerc: newGst }));

    setItems((prevItems) =>
      prevItems.map((item) => {
        const taxable = parseFloat(item.area || 1) * parseFloat(item.price);
        const gst = type === "Non-GST" ? 0 : (taxable * 18) / 100;
        return {
          ...item,
          gstPerc: type === "Non-GST" ? 0 : 18,
          gstAmount: gst,
          amount: taxable + gst,
        };
      }),
    );
  };

  const clearForm = () => {
    if (window.confirm("Clear all data?")) {
      setItems([]);
      setClientName("");
      setClientAddress("");
      setProjectTitle("");
      setWorkDescription("");
      setDiscount(0);
      setLessAmount(0);
      setAdvanceAmount(0);
      setReceivedAmount(0);
      setIsEditMode(false);
      setEditBadge("");
    }
  };

  return (
    <div className="bg-gray-200 min-h-screen font-sans text-slate-800 flex flex-col">
      {/* Sessions Tab Bar */}
      <div className="bg-slate-800 px-2 pt-2 flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-700">
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => setActiveSessionId(s.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
              activeSessionId === s.id
                ? "bg-gray-200 text-slate-800 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]"
                : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
            }`}
          >
            <FileText
              size={12}
              className={
                activeSessionId === s.id ? "text-blue-600" : "text-slate-500"
              }
            />
            <span className="max-w-[100px] truncate">{s.title}</span>
            <button
              onClick={(e) => closeSession(s.id, e)}
              className={`p-0.5 rounded-full hover:bg-black/10 transition ${activeSessionId === s.id ? "text-slate-400 hover:text-red-500" : "text-slate-500 hover:text-white"}`}
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button
          onClick={createNewSession}
          className="p-1.5 text-blue-400 hover:text-blue-300 transition hover:bg-white/5 rounded-full mb-1"
          title="New Invoice Session"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>

      {/* Edit / Conversion Mode Banner */}
      {editBadge && (
        <div
          className={`px-4 py-2 flex items-center justify-between text-xs font-bold ${
            isEditMode
              ? "bg-violet-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <Edit3 size={13} />
            {editBadge}
          </div>
          <button
            onClick={() => {
              setEditBadge("");
              setIsEditMode(false);
            }}
            className="opacity-70 hover:opacity-100 transition"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {/* Invoice Info Bar */}
      <div className="bg-blue-50 p-2 grid grid-cols-12 gap-2 border-b border-blue-200 items-end text-slate-600">
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Invoice Number
          </label>
          <div className="flex">
            <input
              disabled
              value={invoiceNo}
              className="w-full bg-blue-100 border border-blue-200 px-2 py-1 text-sm font-bold text-blue-800 outline-none"
            />
            <button
              onClick={() => navigate("/invoices")}
              className="bg-blue-600 text-white px-2 hover:bg-blue-700 transition"
              title="View Invoice History"
            >
              <History size={14} />
            </button>
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Invoice Date
          </label>
          <input
            disabled
            value={invoiceDate}
            className="w-full bg-blue-100 border border-blue-200 px-2 py-1 text-sm font-bold text-slate-700"
          />
        </div>
        {/* Bill Type Toggle */}
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Bill Type
          </label>
          <div className="flex bg-gray-200 rounded p-0.5 gap-0.5">
            <button
              onClick={() => toggleBillType("GST")}
              className={`flex-1 py-1 text-[10px] font-black uppercase rounded transition ${billType === "GST" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              GST
            </button>
            <button
              onClick={() => toggleBillType("Non-GST")}
              className={`flex-1 py-1 text-[10px] font-black uppercase rounded transition ${billType === "Non-GST" ? "bg-rose-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              Non-GST
            </button>
          </div>
        </div>
        <div className="col-span-3">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Client Name
          </label>
          <div className="flex">
            <input
              placeholder="Search Client..."
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-white border border-blue-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
            />
            <button
              onClick={() => setShowQuoteSearch(true)}
              className="bg-amber-600 text-white px-2 text-[10px] font-bold hover:bg-amber-700"
            >
              FROM QUOTE
            </button>
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Site Address
          </label>
          <input
            placeholder="Work site address..."
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            className="w-full bg-white border border-blue-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <div className="col-span-1 flex flex-col items-end justify-end text-[10px] font-bold pb-0.5">
          {billType === "GST" ? (
            <>
              <div>
                CGST:{" "}
                <span className="text-blue-700">
                  ₹{(totalGst / 2).toFixed(0)}
                </span>
              </div>
              <div>
                SGST:{" "}
                <span className="text-blue-700">
                  ₹{(totalGst / 2).toFixed(0)}
                </span>
              </div>
            </>
          ) : (
            <div className="text-rose-600 font-black uppercase tracking-wider">
              Non-GST Bill
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-2 grid grid-cols-12 gap-2 border-b border-blue-200 items-end text-slate-600">
        <div className="col-span-4">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Project Title
          </label>
          <input
            placeholder="e.g. 3BHK Apartment Interior"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="w-full bg-white border border-blue-200 px-2 py-1 text-sm outline-none focus:border-blue-400 font-bold"
          />
        </div>
        <div className="col-span-8">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Work Description
          </label>
          <input
            placeholder="General scope of work summary..."
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            className="w-full bg-white border border-blue-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* Work Entry Row */}
      <div className="bg-orange-50 p-1 grid grid-cols-12 gap-1 border-b border-orange-200">
        <div className="col-span-4">
          <label className="block text-[10px] font-bold text-orange-800 text-center uppercase">
            Work Description
          </label>
          <input
            placeholder="e.g. Living Room False Ceiling"
            value={newItem.work}
            onChange={(e) => setNewItem({ ...newItem, work: e.target.value })}
            onKeyPress={(e) => e.key === "Enter" && addItem()}
            className="w-full bg-white border border-orange-200 px-2 py-1 text-sm outline-none focus:border-orange-400 font-medium"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-[10px] font-bold text-orange-800 text-center uppercase">
            Unit
          </label>
          <select
            value={newItem.unit}
            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
            className="w-full bg-white border border-orange-200 px-2 py-1 text-sm outline-none focus:border-orange-400"
          >
            <option>Sq.Ft</option>
            <option>L.Ft</option>
            <option>Nos</option>
            <option>LS</option>
          </select>
        </div>
        <div className="col-span-1">
          <label className="block text-[10px] font-bold text-orange-800 text-center uppercase">
            Area
          </label>
          <input
            type="number"
            value={newItem.area}
            onChange={(e) => setNewItem({ ...newItem, area: e.target.value })}
            className="w-full bg-white border border-orange-200 px-2 py-1 text-sm text-center outline-none focus:border-orange-400"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-orange-800 text-center uppercase tracking-tighter">
            Price / Unit(₹)
          </label>
          <input
            type="number"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
            onKeyPress={(e) => e.key === "Enter" && addItem()}
            className="w-full bg-white border border-orange-200 px-2 py-1 text-sm text-right outline-none focus:border-orange-400 font-bold"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-[10px] font-bold text-orange-800 text-center uppercase">
            GST %
          </label>
          <input
            type="number"
            value={newItem.gstPerc}
            onChange={(e) =>
              setNewItem({ ...newItem, gstPerc: e.target.value })
            }
            className="w-full bg-white border border-orange-200 px-2 py-1 text-sm text-center outline-none focus:border-orange-400"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-orange-800 text-center uppercase">
            Total Incl Tax ₹
          </label>
          <div className="w-full bg-orange-100 border border-orange-200 px-2 py-1 text-sm text-right font-bold text-orange-700 h-[26px]">
            {(
              parseFloat(newItem.area || 1) *
              parseFloat(newItem.price || 0) *
              (1 + parseFloat(newItem.gstPerc || 0) / 100)
            ).toFixed(2)}
          </div>
        </div>
        <div className="col-span-1 flex items-end">
          <button
            onClick={addItem}
            type="button"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white h-[26px] flex items-center justify-center rounded shadow-sm transition-all active:scale-95"
            title="Add Item to Invoice"
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-grow bg-white overflow-y-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-100 border-b border-gray-300 sticky top-0">
            <tr className="uppercase text-gray-600 font-bold">
              <th className="px-2 py-1 border-r border-gray-300 text-center w-12">
                Rem
              </th>
              <th className="px-2 py-1 border-r border-gray-300 text-center w-10">
                S#
              </th>
              <th className="px-2 py-1 border-r border-gray-300 text-left">
                Work Description
              </th>
              <th className="px-2 py-1 border-r border-gray-300 text-center w-16">
                Unit
              </th>
              <th className="px-2 py-1 border-r border-gray-300 text-center w-16">
                Area
              </th>
              <th className="px-2 py-1 border-r border-gray-300 text-right w-24">
                Price
              </th>
              <th className="px-2 py-1 border-r border-gray-300 text-right w-24">
                Amount
              </th>
              {billType === "GST" && (
                <>
                  <th className="px-2 py-1 border-r border-gray-300 text-center w-12">
                    GST%
                  </th>
                  <th className="px-2 py-1 border-r border-gray-300 text-right w-20">
                    GST ₹
                  </th>
                </>
              )}
              <th className="px-2 py-1 text-right w-24">Net Amt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-blue-50">
                <td className="px-2 py-1 border-r border-gray-200 text-center">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
                <td className="px-2 py-1 border-r border-gray-200 text-center font-bold text-gray-400">
                  {idx + 1}
                </td>
                <td className="px-2 py-1 border-r border-gray-200 uppercase font-medium">
                  {item.work}
                </td>
                <td className="px-2 py-1 border-r border-gray-200 text-center text-gray-500">
                  {item.unit}
                </td>
                <td className="px-2 py-1 border-r border-gray-200 text-center">
                  {item.area}
                </td>
                <td className="px-2 py-1 border-r border-gray-200 text-right">
                  {parseFloat(item.price).toFixed(2)}
                </td>
                <td className="px-2 py-1 border-r border-gray-200 text-right font-semibold text-gray-600">
                  {item.taxableAmount.toFixed(2)}
                </td>
                {billType === "GST" && (
                  <>
                    <td className="px-2 py-1 border-r border-gray-200 text-center text-blue-600">
                      {item.gstPerc}%
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-right text-blue-700 font-medium">
                      {item.gstAmount.toFixed(2)}
                    </td>
                  </>
                )}
                <td className="px-2 py-1 text-right font-black text-slate-900">
                  {item.amount.toFixed(2)}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan="10"
                  className="py-20 text-center text-gray-300 font-bold uppercase tracking-widest italic"
                >
                  No work details added to invoice
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Section */}
      <div className="bg-gray-100 p-2 border-t border-gray-300 flex justify-between items-end gap-4">
        {/* Left: Stats */}
        <div className="flex gap-4 mb-2">
          <div className="bg-blue-50 border border-blue-200 px-3 py-1 flex gap-2 items-center">
            <span className="text-[10px] font-bold text-blue-800 uppercase">
              Tot Amount:
            </span>
            <span className="text-sm font-bold text-blue-900">
              ₹{subTotal.toFixed(2)}
            </span>
          </div>
          {billType === "GST" && (
            <div className="bg-blue-50 border border-blue-200 px-3 py-1 flex gap-2 items-center">
              <span className="text-[10px] font-bold text-blue-800 uppercase">
                Tot GST:
              </span>
              <span className="text-sm font-bold text-blue-900">
                ₹{totalGst.toFixed(2)}
              </span>
            </div>
          )}
          {billType === "Non-GST" && (
            <div className="bg-rose-50 border border-rose-200 px-3 py-1 flex gap-2 items-center">
              <span className="text-[10px] font-black text-rose-700 uppercase">
                Non-GST Bill — No Tax
              </span>
            </div>
          )}
        </div>

        {/* Center: Adjustments */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-orange-50/50 p-2 border border-orange-100 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Invoice Disc %
            </label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-20 bg-white border border-orange-200 px-1 py-0.5 text-xs text-right outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Invoice Less ₹
            </label>
            <input
              type="number"
              value={lessAmount}
              onChange={(e) => setLessAmount(e.target.value)}
              className="w-20 bg-white border border-orange-200 px-1 py-0.5 text-xs text-right outline-none"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Amount Received
            </label>
            <input
              type="number"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              className="w-20 bg-white border border-orange-200 px-1 py-0.5 text-xs text-right outline-none"
            />
          </div>
        </div>

        {/* Right: Big Total */}
        <div className="flex items-center gap-4">
          <div className="text-4xl text-slate-400 font-light">₹</div>
          <div className="bg-yellow-100 border border-yellow-200 px-10 py-2 rounded shadow-inner text-right min-w-[200px]">
            <div className="text-[10px] font-bold text-yellow-800 uppercase -mb-1">
              Net Payable
            </div>
            <div className="text-5xl font-black text-emerald-600 tracking-tighter">
              {grandTotal.toFixed(2)}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
              Bal: ₹{balanceAmount.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-slate-800 p-1 flex justify-center gap-1">
        <button
          onClick={clearForm}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <RotateCcw size={14} /> Clear - F8
        </button>
        <button
          onClick={() => navigate("/invoices")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <History size={14} /> Invoices - F9
        </button>
        <button
          onClick={deleteInvoice}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <Trash2 size={14} /> Delete - F1
        </button>
        <button
          onClick={() => handlePrint()}
          className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <Printer size={14} /> Print - F5
        </button>
        <button
          onClick={saveInvoice}
          className={`${isEditMode ? "bg-violet-600 hover:bg-violet-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white px-8 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm`}
        >
          {isEditMode ? <Edit3 size={14} /> : <Save size={14} />}
          {isEditMode ? "Update Invoice" : "Save - F2"}
        </button>
      </div>

      {/* MODALS */}
      {showQuoteSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="bg-amber-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Search size={20} /> Fetch from Saved Quotations
              </h3>
              <button onClick={() => setShowQuoteSearch(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {savedQuotations.length === 0 && (
                <p className="text-center text-gray-400 py-10">
                  No saved quotations found.
                </p>
              )}
              <div className="grid gap-2">
                {savedQuotations.map((q) => (
                  <div
                    key={q.id}
                    className="border p-3 rounded-xl hover:bg-amber-50 flex justify-between items-center transition"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{q.clientName}</p>
                      <p className="text-xs text-slate-500">
                        {q.date} | {q.items.length} Items
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {q.clientAddress}
                      </p>
                    </div>
                    <button
                      onClick={() => fetchFromQuote(q)}
                      className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg font-bold text-xs hover:bg-amber-200"
                    >
                      SELECT
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="opacity-0 fixed top-0 left-0 pointer-events-none">
        <PrintableInvoice
          ref={componentRef}
          data={{
            customer: clientName,
            address: clientAddress,
            projectTitle,
            workDescription,
            items,
            invoiceNo,
            invoiceDate,
            discount,
            lessAmount,
            advanceAmount,
            receivedAmount,
            subTotal,
            totalGst,
            grandTotal,
            balanceAmount,
          }}
          docType="Invoice"
        />
      </div>
    </div>
  );
}
