import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Plus,
  Search,
  Building,
  CheckCircle2,
  Clock,
  Wrench,
  Camera,
  History,
  AlertTriangle,
  X,
  PlaySquare,
  Users,
  Image as ImageIcon,
  FileText,
  Receipt,
  IndianRupee,
  Edit,
  Briefcase,
  User,
} from "lucide-react";

export default function SitesPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("media"); // media, history, maintenance, financials
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Form State for Editing
  const [editFormData, setEditFormData] = useState(null);

  // Load data
  const loadSites = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/sites');
      const data = await res.json();
      
      // Clean mapping: use backend names as primary state properties
      const mapped = data.map(s => ({
        ...s,
        // Ensure legacy field usage in other parts of the app doesn't break
        location: s.address,
        client: s.clientName,
        team: s.assignedTeam,
        history: Array.isArray(s.workHistory) ? s.workHistory : [],
        media: s.media || [],
        maintenance: s.maintenance || { required: false, frequency: "", lastDone: "", nextDue: "" }
      }));
      
      setSites(mapped);
    } catch(err) { console.error("Load Sites Error:", err); }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || null;

  const filteredSites = sites.filter((s) => {
    const matchStatus = statusFilter === "All" || s.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.address && s.address.toLowerCase().includes(term)) ||
      (s.clientName && s.clientName.toLowerCase().includes(term));
    return matchStatus && matchSearch;
  });

  // STATUS COLORS
  const getStatusColor = (status) => {
    if (status === "Completed") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "Currently working" || status === "In Progress") return "bg-indigo-100 text-indigo-700 border-indigo-200";
    if (status === "Pre-Construction" || status === "Yet to work") return "bg-amber-100 text-amber-700 border-amber-200";
    if (status === "Maintenance") return "bg-rose-100 text-rose-700 border-rose-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  // HANDLERS
  const updateSiteProperty = async (siteId, key, value) => {
    const s = sites.find(s => s.id === siteId);
    if (!s) return;
    
    // Create payload using backend property names
    const payload = { 
      name: key === "name" ? value : s.name, 
      address: key === "address" ? value : s.address, 
      clientName: key === "clientName" ? value : s.clientName, 
      assignedTeam: key === "assignedTeam" ? value : s.assignedTeam,
      status: key === "status" ? value : s.status,
      workHistory: key === "workHistory" ? value : s.workHistory,
      startDate: key === "startDate" ? value : s.startDate,
      budget: key === "budget" ? parseFloat(value) : s.budget,
      description: key === "description" ? value : s.description,
      isArchived: s.isArchived
    };

    try {
      const res = await fetch(`http://localhost:5000/api/sites/${siteId}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if (res.ok) await loadSites();
    } catch (e) { console.error("Update Property Error:", e); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    
    const payload = {
      name: fd.get("name"),
      clientName: fd.get("clientName"),
      address: fd.get("address"),
      assignedTeam: fd.get("assignedTeam"),
      status: fd.get("status"),
      startDate: fd.get("startDate"),
      budget: parseFloat(fd.get("budget") || 0),
      description: fd.get("description"),
      isArchived: selectedSite.isArchived,
      workHistory: selectedSite.workHistory 
    };

    try {
      const res = await fetch(`http://localhost:5000/api/sites/${selectedSite.id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        await loadSites();
        setIsEditModalOpen(false);
      } else {
        alert("Failed to update project details.");
      }
    } catch (e) { 
      console.error("Edit Submit Error:", e); 
      alert("Error connecting to server.");
    }
  };

  const handleCreateSite = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newSite = { 
      name: fd.get("name"), 
      address: fd.get("address"), 
      clientName: fd.get("clientName"), 
      assignedTeam: fd.get("assignedTeam"),
      status: fd.get("status"), 
      startDate: new Date().toISOString().split("T")[0], 
      budget: 0, 
      description: "", 
      workHistory: [] 
    };
    try {
      const res = await fetch('http://localhost:5000/api/sites', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(newSite)
      });
      if (res.ok) {
        await loadSites();
        setIsSiteModalOpen(false);
      }
    } catch (e) { console.error("Create Site Error:", e); }
  };

  const handleAddMedia = async (e) => {
    e.preventDefault();
    alert("Media added (Mock).");
    setIsMediaModalOpen(false);
  };

  const handleAddHistory = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newHistory = {
      id: `h-${Date.now()}`,
      date: fd.get("date"),
      desc: fd.get("desc"),
    };
    const s = sites.find(s => s.id === selectedSiteId);
    if (!s) return;
    const updatedHistory = [newHistory, ...s.history];
    await updateSiteProperty(selectedSiteId, "workHistory", updatedHistory);
    setIsHistoryModalOpen(false);
  };

  const handleGoToBilling = () => {
    navigate("/billing", { 
      state: { 
        autoFill: { 
          name: selectedSite.clientName, 
          address: selectedSite.address, 
          desc: `Project: ${selectedSite.name}` 
        } 
      } 
    });
  };

  const handleGoToReceipt = () => {
    navigate("/receipts", { 
      state: { 
        autoFill: { 
          name: selectedSite.clientName, 
          desc: `Payment for site: ${selectedSite.name}` 
        } 
      } 
    });
  };

  const handleGoToExpenses = () => {
    navigate("/expenses", { 
      state: { 
        view: "ClientOnly",
        autoFill: { 
          id: selectedSite.id,
          name: selectedSite.name 
        } 
      } 
    });
  };

  return (
    <div className="bg-slate-100 min-h-screen font-sans text-slate-900">
      <div className="p-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <Building className="text-indigo-600" size={32} />
              Work Orders
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              Manage site operations, financial links, and project progress.
            </p>
          </div>
          <button
            onClick={() => setIsSiteModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition"
          >
            <Plus size={20} /> Create New Work Order
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* ── LEFT PANEL: SITES ROSTER ── */}
          <div className="xl:col-span-4 flex flex-col h-[calc(100vh-160px)]">
            {/* Filters */}
            <div className="bg-white rounded-t-3xl border border-slate-200 p-4 shadow-sm z-10 relative">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search site, client or location..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                {["All", "Pre-Construction", "In Progress", "Completed", "Maintenance"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition ${
                      statusFilter === status
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-b-3xl border border-t-0 border-slate-200 shadow-sm flex-1 overflow-y-auto">
              {filteredSites.length === 0 ? (
                <p className="p-8 text-center text-slate-400 font-bold text-sm">No work orders found.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredSites.map((site) => (
                    <button
                      key={site.id}
                      onClick={() => setSelectedSiteId(site.id)}
                      className={`w-full text-left p-5 transition-all ${
                        selectedSiteId === site.id ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-black text-slate-900 text-[15px]">{site.name}</h3>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded border uppercase font-black tracking-wider ${getStatusColor(
                            site.status
                          )}`}
                        >
                          {site.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <MapPin size={12} /> {site.address}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-2 uppercase">
                        <User size={10} /> {site.clientName || "No Client"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: SITE PROFILE ── */}
          <div className="xl:col-span-8 h-[calc(100vh-160px)]">
            {selectedSite ? (
              <div className="bg-white border border-slate-200 shadow-sm rounded-3xl h-full flex flex-col overflow-hidden relative">
                
                {/* Profile Header */}
                <div className="p-8 border-b border-slate-100 bg-slate-900 text-white relative">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black">{selectedSite.name}</h2>
                        <button 
                          onClick={() => {
                            setEditFormData(selectedSite);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-indigo-400 transition-colors"
                          title="Edit Project Details"
                        >
                          <Edit size={18} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3">
                        <div className="flex items-center gap-2 text-indigo-300 text-sm font-medium">
                          <MapPin size={16} /> {selectedSite.address}
                        </div>
                        <div className="flex items-center gap-2 text-indigo-300 text-sm font-medium border-l border-slate-700 pl-4">
                          <User size={16} /> <span className="text-slate-400">Client:</span> {selectedSite.clientName || "N/A"}
                        </div>
                      </div>
                      {selectedSite.description && (
                        <div className="mt-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 max-w-3xl">
                          <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Project Overview</h4>
                          <p className="text-slate-300 text-sm font-medium leading-relaxed italic">
                            "{selectedSite.description}"
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <select
                        value={selectedSite.status}
                        onChange={(e) => updateSiteProperty(selectedSite.id, "status", e.target.value)}
                        className={`font-black text-xs uppercase tracking-widest outline-none py-2 px-4 rounded-xl cursor-pointer ${getStatusColor(
                          selectedSite.status
                        )}`}
                      >
                        <option className="bg-white text-slate-900">Pre-Construction</option>
                        <option className="bg-white text-slate-900">In Progress</option>
                        <option className="bg-white text-slate-900">Completed</option>
                        <option className="bg-white text-slate-900">Maintenance</option>
                      </select>
                      <div className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                        Project ID: #{selectedSite.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-sm border-t border-slate-700 pt-4">
                    <div className="flex items-center gap-2">
                      <Users size={16} />
                      <span className="font-bold text-slate-300">Team Assigned:</span>{" "}
                      <span className="text-indigo-400 font-black uppercase tracking-wider">
                        {selectedSite.assignedTeam || "No Team Members Assigned"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="text-xs font-bold">
                         <span className="text-slate-500 uppercase">Budget:</span> 
                         <span className="text-emerald-400 ml-1">₹{selectedSite.budget?.toLocaleString() || 0}</span>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Profile Tabs */}
                <div className="flex bg-slate-50 border-b border-slate-200">
                  {[
                    { id: "media", label: "Gallery", icon: <Camera size={16} /> },
                    { id: "history", label: "Timeline", icon: <History size={16} /> },
                    { id: "financials", label: "Billing & Finance", icon: <IndianRupee size={16} /> },
                    { id: "maintenance", label: "Maintenance", icon: <Wrench size={16} /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition ${
                        activeTab === tab.id
                          ? "bg-white text-indigo-600 border-b-2 border-indigo-600"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* Profile Content Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                  
                  {/* TAB: MEDIA GALLERY */}
                  {activeTab === "media" && (
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Photos & Videos</h3>
                        <button
                          onClick={() => setIsMediaModalOpen(true)}
                          className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2"
                        >
                          <Plus size={14} /> Add Media
                        </button>
                      </div>
                      
                      {(selectedSite.media || []).length === 0 ? (
                        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400">
                          <ImageIcon className="mx-auto mb-3" size={40} />
                          <p className="font-bold text-sm">No media uploaded yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {(selectedSite.media || []).map((m) => (
                            <div key={m.id} className="group relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 aspect-video flex items-center justify-center">
                              {m.type === "image" ? (
                                <img src={m.url} alt={m.category} className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90" />
                              ) : (
                                <>
                                  <video src={m.url} className="w-full h-full object-cover opacity-60" />
                                  <PlaySquare size={48} className="absolute text-white/80" />
                                </>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                <span className="text-white font-bold text-sm">{m.category}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: WORK TIMELINE */}
                  {activeTab === "history" && (
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Activity Log</h3>
                        <button
                          onClick={() => setIsHistoryModalOpen(true)}
                          className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2"
                        >
                          <Plus size={14} /> Log Update
                        </button>
                      </div>

                      {(selectedSite.history || []).length === 0 ? (
                        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400">
                          <Clock className="mx-auto mb-3" size={40} />
                          <p className="font-bold text-sm">No timeline entries yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-100 before:to-transparent">
                          {(selectedSite.history || []).sort((a,b) => new Date(b.date) - new Date(a.date)).map((entry, idx) => (
                            <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                <CheckCircle2 size={16} />
                              </div>
                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm">
                                <time className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1 block">
                                  {new Date(entry.date).toLocaleDateString('en-GB')}
                                </time>
                                <p className="text-slate-700 text-sm font-medium">{entry.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: FINANCIALS */}
                  {activeTab === "financials" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Billing Action */}
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl flex flex-col items-center text-center group hover:border-indigo-300 transition-all">
                          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FileText size={32} />
                          </div>
                          <h4 className="font-black text-slate-900 mb-2">Billing & Invoices</h4>
                          <p className="text-xs text-slate-500 font-medium mb-6">Generate GST/Non-GST invoices for this client.</p>
                          <button 
                            onClick={handleGoToBilling}
                            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition"
                          >
                            Create Invoice
                          </button>
                        </div>

                        {/* Receipt Action */}
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl flex flex-col items-center text-center group hover:border-emerald-300 transition-all">
                          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Receipt size={32} />
                          </div>
                          <h4 className="font-black text-slate-900 mb-2">Payment Receipts</h4>
                          <p className="text-xs text-slate-500 font-medium mb-6">Generate and track customer payment receipts.</p>
                          <button 
                            onClick={handleGoToReceipt}
                            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-emerald-700 transition"
                          >
                            Generate Receipt
                          </button>
                        </div>

                        {/* Expense Action */}
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl flex flex-col items-center text-center group hover:border-amber-300 transition-all">
                          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Briefcase size={32} />
                          </div>
                          <h4 className="font-black text-slate-900 mb-2">Project Expenses</h4>
                          <p className="text-xs text-slate-500 font-medium mb-6">Log material costs and labor for this specific site.</p>
                          <button 
                            onClick={handleGoToExpenses}
                            className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-amber-700 transition"
                          >
                            Log Expenses
                          </button>
                        </div>
                      </div>

                      <div className="bg-indigo-900 rounded-3xl p-8 text-white flex justify-between items-center">
                        <div>
                          <h4 className="text-xl font-black mb-1">Financial Summary</h4>
                          <p className="text-indigo-300 text-sm font-medium">Quick overview of the project budget and scope.</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black">₹{selectedSite.budget?.toLocaleString() || 0}</div>
                          <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Allocated Budget</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: MAINTENANCE CONFIG */}
                  {activeTab === "maintenance" && (
                    <div className="max-w-2xl mx-auto mt-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8">
                        <div className="flex items-center gap-3 text-amber-700 mb-6">
                          <AlertTriangle size={24} />
                          <h3 className="text-lg font-black tracking-tight">Periodic Maintenance Protocol</h3>
                        </div>
                        
                        <form className="space-y-6">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              name="required"
                              defaultChecked={selectedSite.maintenance?.required}
                              className="w-5 h-5 accent-amber-600"
                            />
                            <span className="font-bold text-slate-800">Enable Periodic Maintenance Alerts</span>
                          </label>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Frequency</label>
                              <select 
                                name="frequency"
                                defaultValue={selectedSite.maintenance?.frequency || ""}
                                className="w-full p-3 border border-amber-200 rounded-xl outline-none focus:border-amber-500 bg-white"
                              >
                                <option value="">Select frequency...</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                                <option value="Bi-Annually">Bi-Annually</option>
                                <option value="Yearly">Yearly</option>
                              </select>
                            </div>
                            <div></div>

                            <div>
                              <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Last Serviced</label>
                              <input 
                                type="date"
                                name="lastDone"
                                defaultValue={selectedSite.maintenance?.lastDone}
                                className="w-full p-3 border border-amber-200 rounded-xl outline-none focus:border-amber-500 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Next Due Date</label>
                              <input 
                                type="date"
                                name="nextDue"
                                defaultValue={selectedSite.maintenance?.nextDue}
                                className="w-full p-3 border border-amber-200 rounded-xl outline-none focus:border-amber-500 bg-white font-bold text-amber-900"
                              />
                            </div>
                          </div>

                          <div className="pt-4 border-t border-amber-200/50">
                            <button type="button" onClick={() => alert("Maintenance updated locally.")} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-amber-200 transition">
                              Save Maintenance Setup
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                <Building size={64} className="mb-4 text-slate-300" />
                <p className="font-bold text-lg uppercase tracking-widest">Select a Work Order</p>
                <p className="text-sm font-medium mt-2">View timeline, financials, media, and maintenance.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}

      {/* Site Create Modal */}
      {isSiteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSite} className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <h2 className="text-xl font-black">Create Work Order</h2>
              <button type="button" onClick={() => setIsSiteModalOpen(false)} className="hover:text-slate-300"><X/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Name</label>
                <input required name="name" placeholder="e.g. Modern Villa Interior" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Name</label>
                <input required name="clientName" placeholder="e.g. John Doe" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site Address</label>
                <input required name="address" placeholder="e.g. Kochi, Kerala" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Initial Status</label>
                  <select name="status" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium">
                    <option>Pre-Construction</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assigned Team</label>
                  <input name="assignedTeam" placeholder="Lead + Staff" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest mt-4 shadow-lg">Save Work Order</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Site Info Modal */}
      {isEditModalOpen && editFormData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <div>
                <h2 className="text-xl font-black">Edit Project Details</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Ref: #{editFormData.id}</p>
              </div>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="hover:text-slate-300"><X/></button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Name</label>
                <input required name="name" defaultValue={editFormData.name} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Name</label>
                <input required name="clientName" defaultValue={editFormData.clientName} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assigned Team</label>
                <input name="assignedTeam" defaultValue={editFormData.assignedTeam} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site Address</label>
                <textarea required name="address" rows={2} defaultValue={editFormData.address} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Status</label>
                <select name="status" defaultValue={editFormData.status} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-bold">
                  <option>Pre-Construction</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                <input type="date" name="startDate" defaultValue={editFormData.startDate} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Budget (₹)</label>
                <input type="number" name="budget" defaultValue={editFormData.budget} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-bold text-emerald-600" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Description</label>
                <textarea name="description" rows={2} defaultValue={editFormData.description} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" placeholder="Internal notes or project scope..." />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex gap-4">
               <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-white border text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-100 transition">Cancel</button>
               <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition">Update Project Information</button>
            </div>
          </form>
        </div>
      )}

      {/* Media Upload Modal */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddMedia} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 flex justify-between items-center border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-800">Add Media Link</h2>
              <button type="button" onClick={() => setIsMediaModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Media Type</label>
                <select name="type" className="w-full border p-3 rounded-xl outline-none bg-slate-50">
                  <option value="image">Image / Render</option>
                  <option value="video">Video Walkthrough</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Caption / Room</label>
                <input required name="category" placeholder="e.g. Master Bedroom" className="w-full border p-3 rounded-xl outline-none bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Media URL</label>
                <input required name="url" placeholder="https://..." className="w-full border p-3 rounded-xl outline-none bg-slate-50" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-2">Add to Gallery</button>
            </div>
          </form>
        </div>
      )}

      {/* History Log Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddHistory} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 flex justify-between items-center border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-800">Log Activity</h2>
              <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                <input required type="date" name="date" defaultValue={new Date().toISOString().split("T")[0]} className="w-full border p-3 rounded-xl outline-none bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Work Description</label>
                <textarea required name="desc" rows={3} placeholder="What was done?" className="w-full border p-3 rounded-xl outline-none bg-slate-50" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-2">Post to Timeline</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
