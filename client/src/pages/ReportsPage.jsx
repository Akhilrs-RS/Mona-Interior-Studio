import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, FileSpreadsheet, Download, 
  TrendingUp, TrendingDown, Users, Building, PieChart as PieChartIcon, Activity
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ReportsPage = () => {
  const [selectedReport, setSelectedReport] = useState("invoices");
  const [dashboardData, setDashboardData] = useState({ accounts: [], crm: [], sites: [], loading: true });

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const [accRes, crmRes, sitesRes] = await Promise.all([
          fetch('http://localhost:5000/api/finance/accounts'),
          fetch('http://localhost:5000/api/crm'),
          fetch('http://localhost:5000/api/sites')
        ]);
        const accounts = await accRes.json();
        const crm = await crmRes.json();
        const sites = await sitesRes.json();
        setDashboardData({ accounts, crm, sites, loading: false });
      } catch (err) {
        console.error("Failed to load insights", err);
        setDashboardData(prev => ({ ...prev, loading: false }));
      }
    };
    fetchInsights();
  }, []);

  const { totalInflow, totalOutflow, activeProjects, totalLeads, leadSources, cashflowTrend } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    dashboardData.accounts.forEach(a => {
      if (a.type.toLowerCase() === 'credit') inflow += a.amount;
      else if (a.type.toLowerCase() === 'debit') outflow += a.amount;
    });

    const activeProjectsCount = dashboardData.sites.filter(s => s.status !== 'Completed').length;
    const leadsCount = dashboardData.crm.length;

    // Lead Sources Pie Chart
    const sourcesMap = {};
    dashboardData.crm.forEach(c => {
      const s = c.source || 'Other';
      sourcesMap[s] = (sourcesMap[s] || 0) + 1;
    });
    const sources = Object.keys(sourcesMap).map(k => ({ name: k, value: sourcesMap[k] }));

    // Cashflow Trend (Monthly)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIndex = new Date().getMonth();
    const trendMap = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      let d = new Date();
      d.setMonth(currentMonthIndex - i);
      trendMap[`${months[d.getMonth()]} ${d.getFullYear()}`] = { name: months[d.getMonth()], inflow: 0, outflow: 0, sortDate: new Date(d.getFullYear(), d.getMonth(), 1) };
    }

    dashboardData.accounts.forEach(a => {
      const d = new Date(a.date);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (trendMap[key]) {
        if (a.type.toLowerCase() === 'credit') trendMap[key].inflow += a.amount;
        else if (a.type.toLowerCase() === 'debit') trendMap[key].outflow += a.amount;
      }
    });

    const trend = Object.values(trendMap).sort((a,b) => a.sortDate - b.sortDate);

    return { totalInflow: inflow, totalOutflow: outflow, activeProjects: activeProjectsCount, totalLeads: leadsCount, leadSources: sources, cashflowTrend: trend };
  }, [dashboardData]);


  // --- DATA FETCHERS FOR EXPORTS ---
  const fetchReportData = async (reportId) => {
    let header = [];
    let rows = [];
    let title = "Report";

    try {
      switch(reportId) {
        // HR
        case 'employees': {
          const res = await fetch('http://localhost:5000/api/employees');
          const data = await res.json();
          title = "Staff Directory";
          header = ["ID", "Name", "Role", "Phone", "Salary Type", "Salary", "Status"];
          rows = data.map(e => [e.workerId, e.name, e.role, e.phone, e.salaryType, e.salary, e.status]);
          break;
        }
        case 'advance': {
          const res = await fetch('http://localhost:5000/api/employees');
          let data = await res.json();
          data = data.filter(e => e.advanceBalance > 0);
          title = "Advance Salary Balances";
          header = ["ID", "Name", "Role", "Advance Balance"];
          rows = data.map(e => [e.workerId, e.name, e.role, e.advanceBalance]);
          break;
        }
        case 'salary': {
          const res = await fetch('http://localhost:5000/api/finance/payroll');
          const data = await res.json();
          title = "Salary Disbursal History";
          header = ["Date", "Employee Name", "Type", "Amount", "Month", "Year"];
          data.forEach(p => {
            rows.push([p.date, p.employeeName, p.type, p.amount, p.month, p.year]);
          });
          rows.sort((a,b) => new Date(b[0]) - new Date(a[0]));
          break;
        }
        // Finance
        case 'expenses': {
          const res = await fetch('http://localhost:5000/api/finance/expenses');
          const data = await res.json();
          title = "Expense Register";
          header = ["Date", "Type", "Category/Client", "Description", "Amount"];
          rows = data.map(e => {
            const dateStr = new Date(e.date).toLocaleDateString('en-IN');
            return [dateStr, e.expenseType, e.client || e.category, e.material || e.description, e.cost];
          });
          break;
        }
        case 'invoices': {
          const res = await fetch('http://localhost:5000/api/finance/invoices');
          const data = await res.json();
          title = "Invoice Register";
          header = ["Date", "Invoice No", "Client", "Total", "Status"];
          rows = data.map(e => [new Date(e.date).toLocaleDateString('en-IN'), e.invoiceNo, e.clientName, e.total, e.status || "Paid"]);
          break;
        }
        case 'quotations': {
          const res = await fetch('http://localhost:5000/api/quotations');
          const data = await res.json();
          title = "Quotation Register";
          header = ["Date", "Quote No", "Client", "Total", "Status"];
          rows = data.map(e => [new Date(e.date).toLocaleDateString('en-IN'), e.quoteNo, e.clientName, e.total, e.status || "Pending"]);
          break;
        }
        case 'accounts': {
          const res = await fetch('http://localhost:5000/api/finance/accounts');
          const data = await res.json();
          title = "Account Ledger";
          header = ["Date", "Type", "Category", "Description", "Amount"];
          rows = data.map(e => [new Date(e.date).toLocaleDateString('en-IN'), e.type.toUpperCase(), e.category || "-", e.description, e.amount]);
          break;
        }
        // Projects & CRM
        case 'sites': {
          const res = await fetch('http://localhost:5000/api/sites');
          const data = await res.json();
          title = "Project Sites Register";
          header = ["Site Name", "Client", "Location", "Budget", "Status", "Completion %"];
          rows = data.map(e => [e.name, e.client, e.location || "-", e.budget, e.status, `${e.completion || 0}%`]);
          break;
        }
        case 'clients': {
          const res = await fetch('http://localhost:5000/api/crm');
          const data = await res.json();
          title = "Client Directory";
          header = ["Name", "Phone", "Email", "Status", "Source"];
          rows = data.map(e => [e.name, e.phone, e.email || "-", e.status, e.source || "Unknown"]);
          break;
        }
        case 'growth': {
          const res = await fetch('http://localhost:5000/api/crm');
          const crmData = await res.json();
          title = "Sales & Growth Report";
          header = ["Month", "Total Leads", "Converted", "Conversion Rate"];
          
          const monthly = {};
          crmData.forEach(lead => {
            const d = new Date(lead.date || Date.now());
            const month = d.toISOString().slice(0, 7);
            if(!monthly[month]) monthly[month] = { total: 0, converted: 0 };
            monthly[month].total++;
            if(lead.status === "Converted") monthly[month].converted++;
          });

          Object.keys(monthly).sort().reverse().forEach(m => {
            const rate = ((monthly[m].converted / monthly[m].total) * 100).toFixed(1) + "%";
            rows.push([m, monthly[m].total, monthly[m].converted, rate]);
          });
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch data for report.");
    }

    return { title, header, rows };
  };

  // --- EXPORT TRIGGERS ---
  const exportPDF = async () => {
    const { title, header, rows } = await fetchReportData(selectedReport);
    if(rows.length === 0) return alert("No data available for this report.");
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);
    
    doc.autoTable({
      startY: 35,
      head: [header],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const exportExcel = async () => {
    const { title, header, rows } = await fetchReportData(selectedReport);
    if(rows.length === 0) return alert("No data available for this report.");

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "Report Data");
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
  };

  const reportOptions = [
    { group: "HR & Payroll", options: [{id: "employees", label: "Staff Directory"}, {id: "salary", label: "Salary History"}, {id: "advance", label: "Advance Salaries"}] },
    { group: "Financial Reports", options: [{id: "accounts", label: "Accounts Ledger"}, {id: "expenses", label: "Expense Register"}, {id: "invoices", label: "Invoice History"}, {id: "quotations", label: "Quotations Sent"}] },
    { group: "Projects & CRM", options: [{id: "sites", label: "Sites History"}, {id: "clients", label: "Client Directory"}, {id: "growth", label: "Growth Metrics"}] },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-[#faf9f8] text-stone-800 font-sans relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[0%] w-[30%] h-[50%] rounded-full bg-stone-200/50 blur-[120px]" />
      </div>

      {/* HEADER */}
      <div className="mb-8">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-3xl md:text-4xl font-black text-stone-900 tracking-tight flex items-center gap-3">
          <Activity className="text-stone-900" size={32} />
          Reports & Insights
        </motion.h1>
        <p className="text-stone-500 mt-2 font-medium">Generate comprehensive reports and monitor real-time business metrics.</p>
      </div>

      {!dashboardData.loading && (
        <>
          {/* KPI ROW */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            <div className="bg-white/80 border border-stone-200 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all">
              <h3 className="text-stone-500 font-bold text-xs mb-2 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14} className="text-emerald-500" /> Total Inflow</h3>
              <div className="text-3xl font-black text-stone-900">₹{(totalInflow / 100000).toFixed(2)}L</div>
            </div>
            <div className="bg-white/80 border border-stone-200 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all">
              <h3 className="text-stone-500 font-bold text-xs mb-2 uppercase tracking-widest flex items-center gap-2"><TrendingDown size={14} className="text-rose-500" /> Total Outflow</h3>
              <div className="text-3xl font-black text-stone-900">₹{(totalOutflow / 100000).toFixed(2)}L</div>
            </div>
            <div className="bg-white/80 border border-stone-200 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all">
              <h3 className="text-stone-500 font-bold text-xs mb-2 uppercase tracking-widest flex items-center gap-2"><Users size={14} className="text-blue-500" /> CRM Leads</h3>
              <div className="text-3xl font-black text-stone-900">{totalLeads}</div>
            </div>
            <div className="bg-white/80 border border-stone-200 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all">
              <h3 className="text-stone-500 font-bold text-xs mb-2 uppercase tracking-widest flex items-center gap-2"><Building size={14} className="text-purple-500" /> Active Projects</h3>
              <div className="text-3xl font-black text-stone-900">{activeProjects}</div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
            {/* INSIGHTS CHARTS (LEFT 2 COLS) */}
            <div className="xl:col-span-2 space-y-6 lg:space-y-8">
              <div className="bg-white/80 border border-stone-200 backdrop-blur-xl rounded-[2rem] p-6 lg:p-8 shadow-sm">
                <h3 className="text-sm font-black text-stone-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                  <Activity size={16}/> Cashflow Overview (6 Months)
                </h3>
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={250} minWidth={1}>
                    <BarChart data={cashflowTrend} margin={{ top:5, right:10, left:0, bottom:5 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize:11, fontWeight:700, fill:'#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize:11, fontWeight:700, fill:'#94a3b8' }} tickFormatter={(val) => `₹${val/1000}k`} />
                      <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius:'12px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="inflow" name="Cash Inflow" fill="#10b981" radius={[4,4,0,0]} />
                      <Bar dataKey="outflow" name="Cash Outflow" fill="#f43f5e" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white/80 border border-stone-200 backdrop-blur-xl rounded-[2rem] p-6 lg:p-8 shadow-sm">
                <h3 className="text-sm font-black text-stone-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                  <PieChartIcon size={16}/> CRM Lead Sources
                </h3>
                <div className="w-full flex justify-center">
                  <ResponsiveContainer width="100%" height={250} minWidth={1}>
                    <PieChart>
                      <Pie data={leadSources} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                        {leadSources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius:'12px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* REPORT GENERATOR (RIGHT COL) */}
            <div className="xl:col-span-1">
              <div className="bg-stone-900 rounded-[2rem] p-6 lg:p-8 shadow-xl sticky top-8 text-white relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5"><FileText size={150} /></div>
                
                <h3 className="text-xl font-black mb-2 flex items-center gap-2 tracking-tight">Report Generator</h3>
                <p className="text-xs text-stone-400 font-medium mb-8">Select a dataset to compile into a downloadable document.</p>
                
                <div className="space-y-6 relative z-10">
                  <div>
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 block">Select Dataset</label>
                    <select 
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl p-3 text-sm text-white font-bold focus:ring-2 focus:ring-stone-500 outline-none transition-all cursor-pointer appearance-none"
                      value={selectedReport}
                      onChange={(e) => setSelectedReport(e.target.value)}
                    >
                      {reportOptions.map((group, idx) => (
                        <optgroup key={idx} label={group.group} className="text-stone-500 font-black">
                          {group.options.map(opt => (
                            <option key={opt.id} value={opt.id} className="text-stone-200 font-medium">{opt.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 border-t border-stone-800 space-y-3">
                    <button 
                      onClick={exportPDF}
                      className="w-full flex justify-center items-center gap-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 py-3.5 rounded-xl font-black text-sm transition-all"
                    >
                      <FileText size={16} /> Download as PDF
                    </button>
                    <button 
                      onClick={exportExcel}
                      className="w-full flex justify-center items-center gap-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 py-3.5 rounded-xl font-black text-sm transition-all"
                    >
                      <FileSpreadsheet size={16} /> Download as Excel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
