import React from "react";
import { 
  FileText, FileSpreadsheet, Users, Briefcase, IndianRupee, 
  Receipt, Wallet, FileCheck, Map, TrendingUp, Download, Building, Landmark
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const ReportsPage = () => {
  // --- DATA FETCHERS ---
  const getData = (key) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  const getReportData = (reportId) => {
    let header = [];
    let rows = [];
    let title = "Report";

    switch(reportId) {
      // HR
      case 'employees': {
        const data = getData('monaEmployees');
        title = "Staff Directory";
        header = ["ID", "Name", "Role", "Phone", "Salary Type", "Salary", "Status"];
        rows = data.map(e => [e.workerId, e.name, e.role, e.phone, e.salaryType, e.salary, e.status]);
        break;
      }
      case 'advance': {
        const data = getData('monaEmployees').filter(e => e.advanceBalance > 0);
        title = "Advance Salary Balances";
        header = ["ID", "Name", "Role", "Advance Balance"];
        rows = data.map(e => [e.workerId, e.name, e.role, e.advanceBalance]);
        break;
      }
      case 'salary': {
        const data = getData('monaEmployees');
        title = "Salary Disbursal History";
        header = ["Date", "Employee Name", "Role", "Amount", "Method"];
        data.forEach(emp => {
          if(emp.payments) {
            emp.payments.forEach(p => rows.push([p.date, emp.name, emp.role, p.amount, p.method]));
          }
        });
        rows.sort((a,b) => new Date(b[0]) - new Date(a[0])); // Sort descending by date
        break;
      }
      // Finance
      case 'expenses': {
        const data = getData('monaExpenses');
        title = "Expense Register";
        header = ["Date", "Category", "Description", "Amount", "Mode"];
        rows = data.map(e => [e.date, e.category, e.description, e.amount, e.paymentMode]);
        break;
      }
      case 'invoices': {
        const data = getData('monaInvoices');
        title = "Invoice Register";
        header = ["Date", "Invoice No", "Client", "Total", "Status"];
        rows = data.map(e => [e.date, e.invoiceNumber, e.clientName, e.total, e.status]);
        break;
      }
      case 'quotations': {
        const data = getData('monaQuotations');
        title = "Quotation Register";
        header = ["Date", "Quote No", "Client", "Total", "Status"];
        rows = data.map(e => [e.date, e.quoteNumber, e.clientName, e.total, e.status]);
        break;
      }
      case 'accounts': {
        const data = getData('monaAccounts');
        title = "Account Ledger";
        header = ["Date", "Type", "Category", "Description", "Amount"];
        rows = data.map(e => [e.date, e.type.toUpperCase(), e.category, e.description, e.amount]);
        break;
      }
      // Projects & CRM
      case 'sites': {
        const data = getData('monaSites');
        title = "Project Sites Register";
        header = ["Site Name", "Client", "Location", "Budget", "Status", "Completion %"];
        rows = data.map(e => [e.name, e.client, e.location, e.budget, e.status, `${e.completion || 0}%`]);
        break;
      }
      case 'clients': {
        const data = getData('monaCRM');
        title = "Client Directory";
        header = ["Name", "Phone", "Email", "Status", "Source"];
        rows = data.map(e => [e.name, e.phone, e.email || "-", e.status, e.source || "Unknown"]);
        break;
      }
      case 'growth': {
        const crmData = getData('monaCRM');
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

    return { title, header, rows };
  };

  // --- EXPORT TRIGGERS ---
  const exportPDF = (reportId) => {
    const { title, header, rows } = getReportData(reportId);
    if(rows.length === 0) return alert("No data available for this report.");
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    doc.autoTable({
      startY: 35,
      head: [header],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const exportExcel = (reportId) => {
    const { title, header, rows } = getReportData(reportId);
    if(rows.length === 0) return alert("No data available for this report.");

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "Report Data");
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
  };

  // --- UI COMPONENTS ---
  const ReportCard = ({ id, title, description, icon: Icon, colorClass }) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4 mb-6">
        <div className={`p-3 rounded-2xl ${colorClass.bg} ${colorClass.text}`}>
          <Icon size={24} />
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-lg leading-tight mb-1">{title}</h3>
          <p className="text-xs font-bold text-slate-400">{description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => exportPDF(id)}
          className="flex-1 flex justify-center items-center gap-1.5 bg-rose-50 text-rose-600 py-2.5 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors"
        >
          <FileText size={14} /> PDF
        </button>
        <button 
          onClick={() => exportExcel(id)}
          className="flex-1 flex justify-center items-center gap-1.5 bg-emerald-50 text-emerald-600 py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors"
        >
          <FileSpreadsheet size={14} /> Excel
        </button>
      </div>
    </div>
  );

  const SectionHeading = ({ title }) => (
    <div className="flex items-center gap-4 mb-6 mt-12 first:mt-0">
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      <div className="flex-1 h-px bg-slate-200"></div>
    </div>
  );

  const reportCategories = [
    {
      title: "HR & Payroll",
      reports: [
        { id: "employees", title: "Staff Directory", description: "Complete list of employees, contact info, and roles.", icon: Users, colorClass: { bg: 'bg-blue-50', text: 'text-blue-600' } },
        { id: "salary", title: "Salary History", description: "Historical log of all payroll disbursements.", icon: Briefcase, colorClass: { bg: 'bg-indigo-50', text: 'text-indigo-600' } },
        { id: "advance", title: "Advance Salaries", description: "Employees currently holding advance balances.", icon: IndianRupee, colorClass: { bg: 'bg-amber-50', text: 'text-amber-600' } },
      ]
    },
    {
      title: "Financial Reports",
      reports: [
        { id: "accounts", title: "Accounts Ledger", description: "Master ledger of all credits and debits.", icon: Landmark, colorClass: { bg: 'bg-purple-50', text: 'text-purple-600' } },
        { id: "expenses", title: "Expense Register", description: "Detailed log of all categorized business expenses.", icon: Wallet, colorClass: { bg: 'bg-rose-50', text: 'text-rose-600' } },
        { id: "invoices", title: "Invoice History", description: "Register of all generated client invoices.", icon: Receipt, colorClass: { bg: 'bg-emerald-50', text: 'text-emerald-600' } },
        { id: "quotations", title: "Quotations Sent", description: "List of all project proposals and their statuses.", icon: FileCheck, colorClass: { bg: 'bg-cyan-50', text: 'text-cyan-600' } },
      ]
    },
    {
      title: "Projects & CRM",
      reports: [
        { id: "sites", title: "Sites History", description: "Overview of all active and past construction sites.", icon: Building, colorClass: { bg: 'bg-orange-50', text: 'text-orange-600' } },
        { id: "clients", title: "Client Directory", description: "Export of all CRM leads and client contacts.", icon: Map, colorClass: { bg: 'bg-teal-50', text: 'text-teal-600' } },
        { id: "growth", title: "Growth Metrics", description: "Monthly breakdown of leads and conversion rates.", icon: TrendingUp, colorClass: { bg: 'bg-pink-50', text: 'text-pink-600' } },
      ]
    }
  ];

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans">
      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-2">
          <Download className="text-indigo-600" size={32} />
          Report Downloads
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-base">
          Centralized hub to generate and download tabular data across all modules.
        </p>
      </div>

      {/* REPORT CATEGORIES */}
      {reportCategories.map((category, index) => (
        <div key={index}>
          <SectionHeading title={category.title} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {category.reports.map((report) => (
              <ReportCard key={report.id} {...report} />
            ))}
          </div>
        </div>
      ))}

    </div>
  );
};

export default ReportsPage;
