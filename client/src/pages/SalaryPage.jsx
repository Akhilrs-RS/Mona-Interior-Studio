import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import PayslipDocument from "../components/PayslipDocument";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Users, Wallet, X, ChevronRight, CheckCircle2, Clock,
  Search, Printer, CalendarDays, User, CreditCard, Banknote,
  MessageCircle, Eye, Send
} from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SalaryPage() {
  const today = new Date();
  
  const [employees, setEmployees] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[today.getMonth()]);
  const [selectedYear] = useState(today.getFullYear());
  const [searchTerm, setSearchTerm] = useState("");
  const [printData, setPrintData] = useState(null);
  const [viewPayslip, setViewPayslip] = useState(null); // payroll entry to preview
  
  // UI States
  const [actionType, setActionType] = useState("Salary"); // "Salary" | "Advance"
  const [historyTab, setHistoryTab] = useState("Salary"); // "Salary" | "Advance"

  // Load Data
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/employees');
        const data = await res.json();
        setEmployees(data);
      } catch (err) { console.error(err); }
    };
    const fetchPayroll = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/finance/payroll');
        const data = await res.json();
        setPayrollHistory(data);
      } catch (err) { console.error(err); }
    };
    
    fetchEmployees();
    fetchPayroll();
  }, []);

  const saveEmployees = async (emps) => {
    // We do not save all employees locally anymore
    setEmployees(emps);
  };

  const saveHistory = async (hist) => {
    // We update local state, API is called in the handlers
    setPayrollHistory(hist);
  };

  // Forms
  const [salForm, setSalForm] = useState({
    paidDays: "30",
    lopDays: "0",
    basic: "",
    otHours: "",
    otRate: "",
    advanceDeduction: "",
    otherDeductions: "",
    method: "Bank Transfer",
    paidOn: today.toISOString().split("T")[0],
  });

  const [advForm, setAdvForm] = useState({
    amount: "",
    method: "Bank Transfer",
    paidOn: today.toISOString().split("T")[0],
  });

  const componentRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: componentRef });

  // Dynamic Calculation for Basic based on Wage Type
  useEffect(() => {
    if (selectedEmployee && actionType === "Salary") {
      let calcBasic = 0;
      if (selectedEmployee.salaryType === "Daily") {
        const days = parseFloat(salForm.paidDays || 0);
        calcBasic = parseFloat(selectedEmployee.salary || 0) * days;
      } else {
        calcBasic = parseFloat(selectedEmployee.salary || 0);
      }
      
      setSalForm(f => ({
        ...f,
        basic: calcBasic.toString(),
        advanceDeduction: selectedEmployee.advanceBalance > 0 ? selectedEmployee.advanceBalance.toString() : "0"
      }));
    }
  }, [selectedEmployee, salForm.paidDays, actionType]);

  // Salary Calculations
  const basic = parseFloat(salForm.basic || 0);
  const otPayment = parseFloat(salForm.otHours || 0) * parseFloat(salForm.otRate || 0);
  const totalEarnings = basic + otPayment;
  const advanceDed = parseFloat(salForm.advanceDeduction || 0);
  const otherDed = parseFloat(salForm.otherDeductions || 0);
  const totalDeductions = advanceDed + otherDed;
  const netPay = totalEarnings - totalDeductions;

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setActionType("Salary");
    setSalForm(f => ({
      ...f,
      paidDays: "30",
      otHours: "",
      otRate: "",
      otherDeductions: "",
    }));
    setAdvForm(f => ({
      ...f,
      amount: "",
    }));
  };

  const handleProcessSalary = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    if (advanceDed > (selectedEmployee.advanceBalance || 0)) {
      if (!window.confirm(`Warning: You are deducting ₹${advanceDed} for advances, but the employee's outstanding advance balance is only ₹${selectedEmployee.advanceBalance || 0}. Continue?`)) {
        return;
      }
    }

    const entry = {
      id: `PR-SAL-${Date.now()}`,
      type: "Salary",
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      role: selectedEmployee.role,
      month: selectedMonth,
      year: selectedYear,
      basic,
      otHours: parseFloat(salForm.otHours || 0),
      otRate: parseFloat(salForm.otRate || 0),
      otPayment,
      advanceDeduction: advanceDed,
      otherDeductions: otherDed,
      netPay,
      paidDays: salForm.paidDays,
      lopDays: salForm.lopDays,
      paidOn: salForm.paidOn,
      method: salForm.method,
    };

    try {
      await fetch('http://localhost:5000/api/finance/payroll', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(entry)
      });
      saveHistory([entry, ...payrollHistory]);

      // Update Employee advance balance via API
      if (advanceDed > 0) {
        const newBalance = Math.max(0, (selectedEmployee.advanceBalance || 0) - advanceDed);
        await fetch(`http://localhost:5000/api/employees/${selectedEmployee.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...selectedEmployee, advanceBalance: newBalance})
        });
        const updatedEmps = employees.map(emp => {
          if (emp.id === selectedEmployee.id) {
            return { ...emp, advanceBalance: newBalance };
          }
          return emp;
        });
        saveEmployees(updatedEmps);
      }

      // Trigger print
      const pd = {
        name: selectedEmployee.name,
        gender: "Male",
        paidDays: salForm.paidDays,
        lopDays: salForm.lopDays,
        basic: salForm.basic,
        otHours: salForm.otHours,
        otRate: salForm.otRate,
        advance: salForm.advanceDeduction,
        otherDeductions: salForm.otherDeductions,
      };
      setPrintData(pd);
      setTimeout(() => handlePrint(), 300);

      setSelectedEmployee(null);
    } catch(err) { console.error(err); }
  };

  const handleGiveAdvance = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    
    const amt = parseFloat(advForm.amount || 0);
    if (amt <= 0) return alert("Enter a valid advance amount.");

    const entry = {
      id: `PR-ADV-${Date.now()}`,
      type: "Advance",
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      month: selectedMonth,
      year: selectedYear,
      amount: amt,
      paidOn: advForm.paidOn,
      method: advForm.method,
    };

    try {
      await fetch('http://localhost:5000/api/finance/payroll', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(entry)
      });
      saveHistory([entry, ...payrollHistory]);

      // Update Employee advance balance via API
      const newBalance = (selectedEmployee.advanceBalance || 0) + amt;
      await fetch(`http://localhost:5000/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...selectedEmployee, advanceBalance: newBalance})
      });
      const updatedEmps = employees.map(emp => {
        if (emp.id === selectedEmployee.id) {
          return { ...emp, advanceBalance: newBalance };
        }
        return emp;
      });
      saveEmployees(updatedEmps);
      alert(`Advance of ₹${amt} paid to ${selectedEmployee.name}.`);
      setSelectedEmployee(null);
    } catch(err) { console.error(err); }
  };

  const salaryHistory = payrollHistory.filter(
    (p) => p.type === "Salary" && p.month === selectedMonth && p.year === selectedYear
  );
  
  const advanceHistory = payrollHistory.filter(
    (p) => p.type === "Advance" && p.month === selectedMonth && p.year === selectedYear
  );

  const totalSalaryPaid = salaryHistory.reduce((s, p) => s + p.netPay, 0);
  const totalAdvancePaid = advanceHistory.reduce((s, p) => s + p.amount, 0);

  const alreadyPaidSalary = (emp) =>
    salaryHistory.some((p) => p.employeeId === emp.id);

  // ── PDF + WHATSAPP HELPERS ────────────────────────────────────────────────
  const generatePayslipPDF = (h) => {
    const doc = new jsPDF({ unit: "pt", format: "a5" });
    const W = doc.internal.pageSize.getWidth();

    // ─ Header band
    doc.setFillColor(30, 27, 75);
    doc.rect(0, 0, W, 70, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MONA INTERIOR STUDIO", W / 2, 28, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("PAYSLIP", W / 2, 44, { align: "center" });
    doc.setFontSize(8);
    doc.text(`${h.month} ${h.year}`, W / 2, 58, { align: "center" });

    // ─ Employee block
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(h.employeeName, 30, 92);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`${h.role || ""}   |   Paid on: ${h.paidOn}   |   Via: ${h.method}   |   Days: ${h.paidDays || 30}`, 30, 108);

    // ─ Earnings table
    const earnings = [
      ["Basic Pay", `Rs. ${(h.basic || 0).toLocaleString()}`],
    ];
    if (h.otPayment > 0) {
      earnings.push([`OT Pay (${h.otHours} hrs x Rs.${h.otRate}/hr)`, `Rs. ${h.otPayment.toLocaleString()}`]);
    }

    const deductions = [];
    if (h.advanceDeduction > 0) deductions.push(["Advance Recovery", `- Rs. ${h.advanceDeduction.toLocaleString()}`]);
    if (h.otherDeductions > 0) deductions.push(["Other Deductions", `- Rs. ${h.otherDeductions.toLocaleString()}`]);

    doc.autoTable({
      startY: 122,
      head: [["Earnings", "Amount"]],
      body: earnings,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: "right" } },
      margin: { left: 30, right: 30 },
    });

    if (deductions.length > 0) {
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [["Deductions", "Amount"]],
        body: deductions,
        theme: "grid",
        headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 9, textColor: [180, 0, 0] },
        columnStyles: { 1: { halign: "right" } },
        margin: { left: 30, right: 30 },
      });
    }

    // ─ Net Pay
    const netY = doc.lastAutoTable.finalY + 16;
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(30, netY, W - 60, 36, 6, 6, "F");
    doc.setTextColor(5, 150, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("NET PAY", 44, netY + 14);
    doc.setFontSize(14);
    doc.text(`Rs. ${h.netPay.toLocaleString()}`, W - 44, netY + 23, { align: "right" });

    // ─ Footer
    doc.setTextColor(180, 180, 180);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("This is a system-generated payslip. Mona Interior Studio.", W / 2, netY + 58, { align: "center" });

    const filename = `Payslip_${h.employeeName.replace(/\s+/g, "_")}_${h.month}_${h.year}.pdf`;
    doc.save(filename);
    return filename;
  };

  const sendWhatsApp = (h, phone) => {
    const filename = generatePayslipPDF(h);
    const cleaned = (phone || "").replace(/\D/g, "");
    const num = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
    const msg =
      `Hi ${h.employeeName},\n\nPlease find your payslip for *${h.month} ${h.year}* attached.\n\n*Net Pay: Rs. ${h.netPay.toLocaleString()}*\n\n_Mona Interior Studio_`;
    // Small delay to let the PDF download start before opening WhatsApp
    setTimeout(() => {
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
    }, 600);
  };

  const sendBulkWhatsApp = () => {
    if (salaryHistory.length === 0) return alert("No salary records for this month to send.");
    const eligible = salaryHistory.filter(h => {
      const emp = employees.find(e => e.id === h.employeeId);
      return !!emp?.phone;
    });
    if (eligible.length === 0) return alert("No employees with phone numbers found.");
    eligible.forEach((h, i) => {
      const emp = employees.find(e => e.id === h.employeeId);
      setTimeout(() => sendWhatsApp(h, emp.phone), i * 1200);
    });
  };

  const inputClass = "w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white font-bold text-sm transition";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1";

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Wallet className="text-violet-600" size={32} />
            Payroll & Advances
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Process regular salaries, manage daily wages, and track advances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Bulk WhatsApp */}
          <button
            onClick={sendBulkWhatsApp}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-2xl font-bold text-sm transition shadow-sm"
            title="Send payslips to all paid employees this month via WhatsApp"
          >
            <MessageCircle size={18} /> Bulk WhatsApp
          </button>
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
            <CalendarDays size={16} className="text-slate-400" />
            <select
              className="text-sm font-black text-slate-900 outline-none bg-transparent cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {MONTHS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <span className="text-slate-400 font-bold text-sm">{selectedYear}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* LEFT: Employee Roster + Actions */}
        <div className="xl:col-span-5 space-y-6 h-[calc(100vh-160px)] flex flex-col">
          
          {/* Employee Roster */}
          <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm">
                <Users size={16} className="text-violet-500" />
                Select Staff
              </h3>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
              {employees.length === 0 && <p className="p-4 text-center text-sm text-slate-400 font-bold">No employees found.</p>}
              {employees.map((emp) => {
                const paidSal = alreadyPaidSalary(emp);
                const isSelected = selectedEmployee?.id === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className={`w-full flex items-center justify-between px-5 py-4 text-left transition-all ${
                      isSelected ? "bg-violet-50 border-l-4 border-violet-500" : "hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <p className="font-black text-slate-900 text-sm flex items-center gap-2">
                        {emp.name} {paidSal && <CheckCircle2 size={14} className="text-emerald-500" title="Salary Processed" />}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        {emp.role} • {emp.salaryType} ({emp.salary})
                      </p>
                    </div>
                    <div className="text-right">
                      {emp.advanceBalance > 0 && (
                        <p className="text-[9px] font-black uppercase text-red-500 bg-red-50 px-2 py-0.5 rounded-md mb-1 border border-red-100">
                          Adv: ₹{emp.advanceBalance}
                        </p>
                      )}
                      <ChevronRight size={16} className={isSelected ? "text-violet-500 ml-auto" : "text-slate-300 ml-auto"} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Form */}
          {selectedEmployee && (
            <div className="bg-white rounded-[28px] border border-slate-200 shadow-xl overflow-hidden shrink-0">
              <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                <div>
                  <h3 className="font-black text-lg leading-none">{selectedEmployee.name}</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                    {selectedEmployee.salaryType} Wage
                  </p>
                </div>
                <button onClick={() => setSelectedEmployee(null)} className="text-slate-400 hover:text-white"><X size={20}/></button>
              </div>

              {/* Action Tabs */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setActionType("Salary")}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition ${
                    actionType === "Salary" ? "text-violet-600 bg-violet-50 border-b-2 border-violet-600" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Banknote size={16}/> Process Salary
                </button>
                <button
                  onClick={() => setActionType("Advance")}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition ${
                    actionType === "Advance" ? "text-amber-600 bg-amber-50 border-b-2 border-amber-600" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <CreditCard size={16}/> Give Advance
                </button>
              </div>

              {/* SALARY FORM */}
              {actionType === "Salary" && (
                <form onSubmit={handleProcessSalary} className="p-5 max-h-[50vh] overflow-y-auto">
                  {alreadyPaidSalary(selectedEmployee) && (
                    <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 size={16}/> Salary already processed for this month.
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={labelClass}>Paid Days</label>
                      <input type="number" className={inputClass} value={salForm.paidDays} onChange={(e) => setSalForm({...salForm, paidDays: e.target.value})} />
                    </div>
                    <div>
                      <label className={labelClass}>Basic (Editable)</label>
                      <input type="number" required className={inputClass} value={salForm.basic} onChange={(e) => setSalForm({...salForm, basic: e.target.value})} />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                    <p className={labelClass}>Overtime Config</p>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" placeholder="OT Hours" className={inputClass} value={salForm.otHours} onChange={(e) => setSalForm({...salForm, otHours: e.target.value})} />
                      <input type="number" placeholder="OT Rate / hr" className={inputClass} value={salForm.otRate} onChange={(e) => setSalForm({...salForm, otRate: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={labelClass}>Advance Deduct</label>
                      <input type="number" className={inputClass} value={salForm.advanceDeduction} onChange={(e) => setSalForm({...salForm, advanceDeduction: e.target.value})} />
                    </div>
                    <div>
                      <label className={labelClass}>Other Deduct</label>
                      <input type="number" className={inputClass} value={salForm.otherDeductions} onChange={(e) => setSalForm({...salForm, otherDeductions: e.target.value})} />
                    </div>
                  </div>

                  <div className="flex gap-4 items-center justify-between mb-6 bg-slate-900 rounded-2xl p-4 text-white">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Net Payable</p>
                      <p className="text-2xl font-black text-emerald-400">₹{netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </div>
                    <button type="submit" disabled={alreadyPaidSalary(selectedEmployee)} className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition">
                      <Printer size={16}/> Pay & Print
                    </button>
                  </div>
                </form>
              )}

              {/* ADVANCE FORM */}
              {actionType === "Advance" && (
                <form onSubmit={handleGiveAdvance} className="p-5">
                  <div className="mb-4">
                    <label className={labelClass}>Advance Amount (₹)</label>
                    <input type="number" required className={inputClass} value={advForm.amount} onChange={(e) => setAdvForm({...advForm, amount: e.target.value})} placeholder="e.g. 5000" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className={labelClass}>Method</label>
                      <select className={inputClass} value={advForm.method} onChange={(e) => setAdvForm({...advForm, method: e.target.value})}>
                        <option>Bank Transfer</option><option>Cash</option><option>UPI</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Date</label>
                      <input type="date" required className={inputClass} value={advForm.paidOn} onChange={(e) => setAdvForm({...advForm, paidOn: e.target.value})} />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-xl font-black uppercase tracking-widest transition">
                    Issue Advance
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: History & Logs */}
        <div className="xl:col-span-7 h-[calc(100vh-160px)] flex flex-col">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
            <div className="bg-violet-600 text-white p-6 rounded-3xl shadow-lg">
              <p className="text-violet-200 text-[10px] font-black uppercase tracking-widest mb-1">Total Salary Paid ({selectedMonth})</p>
              <h2 className="text-3xl font-black tracking-tighter">₹{totalSalaryPaid.toLocaleString()}</h2>
            </div>
            <div className="bg-amber-500 text-white p-6 rounded-3xl shadow-lg">
              <p className="text-amber-100 text-[10px] font-black uppercase tracking-widest mb-1">Advances Given ({selectedMonth})</p>
              <h2 className="text-3xl font-black tracking-tighter">₹{totalAdvancePaid.toLocaleString()}</h2>
            </div>
          </div>

          {/* History Panel */}
          <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
              <button onClick={() => setHistoryTab("Salary")} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition ${historyTab === "Salary" ? "text-violet-600 bg-white border-b-2 border-violet-600" : "text-slate-500 hover:bg-slate-100"}`}>
                Salary Logs
              </button>
              <button onClick={() => setHistoryTab("Advance")} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition ${historyTab === "Advance" ? "text-amber-600 bg-white border-b-2 border-amber-600" : "text-slate-500 hover:bg-slate-100"}`}>
                Advance Logs
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {historyTab === "Salary" && (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-6 py-3">Employee</th>
                      <th className="px-4 py-3 text-right">Basic</th>
                      <th className="px-4 py-3 text-right">OT Pay</th>
                      <th className="px-4 py-3 text-right">Deducted</th>
                      <th className="px-6 py-3 text-right">Net Pay</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {salaryHistory.length === 0 && (
                      <tr><td colSpan="6" className="py-12 text-center text-slate-400 font-bold text-sm">No salaries processed this month.</td></tr>
                    )}
                    {salaryHistory.map((h) => {
                      const emp = employees.find(e => e.id === h.employeeId);
                      return (
                        <tr key={h.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4">
                            <p className="font-black text-slate-900 text-sm">{h.employeeName}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{h.paidOn}</p>
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-slate-700">₹{h.basic.toLocaleString()}</td>
                          <td className="px-4 py-4 text-right font-bold text-blue-600">{h.otPayment > 0 ? `₹${h.otPayment.toLocaleString()}` : "-"}</td>
                          <td className="px-4 py-4 text-right font-bold text-red-500">{(h.advanceDeduction + h.otherDeductions) > 0 ? `₹${(h.advanceDeduction + h.otherDeductions).toLocaleString()}` : "-"}</td>
                          <td className="px-6 py-4 text-right font-black text-emerald-600 text-lg">₹{h.netPay.toLocaleString()}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setViewPayslip(h)}
                                title="View Payslip"
                                className="p-2 bg-violet-50 text-violet-600 rounded-xl hover:bg-violet-100 transition"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => sendWhatsApp(h, emp?.phone || "")}
                                title={emp?.phone ? `Send to ${emp.phone}` : "No phone on record"}
                                disabled={!emp?.phone}
                                className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <MessageCircle size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {historyTab === "Advance" && (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Employee</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {advanceHistory.length === 0 && (
                      <tr><td colSpan="4" className="py-12 text-center text-slate-400 font-bold text-sm">No advances issued this month.</td></tr>
                    )}
                    {advanceHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{h.paidOn}</td>
                        <td className="px-6 py-4 font-black text-slate-900 text-sm">{h.employeeName}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{h.method}</td>
                        <td className="px-6 py-4 text-right font-black text-amber-600 text-lg">₹{h.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Hidden Print */}
      {printData && (
        <div className="opacity-0 fixed top-0 left-0 pointer-events-none">
          <PayslipDocument ref={componentRef} data={printData} />
        </div>
      )}

      {/* ── VIEW PAYSLIP MODAL ────────────────────────────────────────── */}
      {viewPayslip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-black text-xl">Payslip</h3>
                <p className="text-slate-400 text-xs font-bold mt-0.5 uppercase tracking-wider">
                  {viewPayslip.month} {viewPayslip.year}
                </p>
              </div>
              <button onClick={() => setViewPayslip(null)} className="text-slate-400 hover:text-white"><X size={22}/></button>
            </div>

            {/* Employee Info */}
            <div className="bg-violet-50 px-6 py-4 border-b border-slate-100">
              <p className="font-black text-slate-900 text-lg">{viewPayslip.employeeName}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{viewPayslip.role} · Paid on {viewPayslip.paidOn} via {viewPayslip.method}</p>
            </div>

            {/* Details */}
            <div className="p-6 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Earnings</p>
              <div className="flex justify-between">
                <span className="text-sm font-bold text-slate-600">Basic Pay ({viewPayslip.paidDays} days)</span>
                <span className="text-sm font-black text-slate-900">₹{(viewPayslip.basic || 0).toLocaleString()}</span>
              </div>
              {viewPayslip.otPayment > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-slate-600">OT Pay ({viewPayslip.otHours}h × ₹{viewPayslip.otRate})</span>
                  <span className="text-sm font-black text-blue-600">₹{viewPayslip.otPayment.toLocaleString()}</span>
                </div>
              )}
              {(viewPayslip.advanceDeduction > 0 || viewPayslip.otherDeductions > 0) && (
                <>
                  <div className="h-px bg-slate-100 my-2" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deductions</p>
                  {viewPayslip.advanceDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-slate-600">Advance Recovery</span>
                      <span className="text-sm font-black text-red-500">- ₹{viewPayslip.advanceDeduction.toLocaleString()}</span>
                    </div>
                  )}
                  {viewPayslip.otherDeductions > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-slate-600">Other Deductions</span>
                      <span className="text-sm font-black text-red-500">- ₹{viewPayslip.otherDeductions.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
              <div className="h-px bg-slate-200 mt-4" />
              <div className="flex justify-between items-center pt-2">
                <span className="text-base font-black text-slate-900 uppercase tracking-tight">Net Pay</span>
                <span className="text-2xl font-black text-emerald-600">₹{viewPayslip.netPay.toLocaleString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => {
                  const emp = employees.find(e => e.id === viewPayslip.employeeId);
                  sendWhatsApp(viewPayslip, emp?.phone || "");
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-2xl font-black text-sm transition"
              >
                <MessageCircle size={16} /> Send WhatsApp
              </button>
              <button
                onClick={() => {
                  setPrintData({
                    name: viewPayslip.employeeName,
                    gender: "Male",
                    paidDays: viewPayslip.paidDays,
                    lopDays: viewPayslip.lopDays,
                    basic: viewPayslip.basic,
                    otHours: viewPayslip.otHours,
                    otRate: viewPayslip.otRate,
                    advance: viewPayslip.advanceDeduction,
                    otherDeductions: viewPayslip.otherDeductions,
                  });
                  setTimeout(() => handlePrint(), 300);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-2xl font-black text-sm transition"
              >
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
