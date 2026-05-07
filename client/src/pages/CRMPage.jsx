import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  User, Briefcase, Calendar, Plus, Phone, MapPin, Search, DollarSign,
  TrendingUp, Activity, Star, CheckCircle, Clock, Mail, Tag, Percent,
  CheckSquare, BarChart2, Download, Filter, PieChart, Trash2
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Light Premium Modal
function Modal({ open, onClose, children, size = "max-w-lg" }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-20">
        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className={`bg-white/95 border border-stone-200/50 backdrop-blur-xl rounded-[2rem] shadow-2xl p-8 w-full ${size} relative text-stone-800 my-auto`}>
          <button onClick={onClose} className="absolute top-5 right-5 text-stone-400 hover:text-red-500 text-3xl leading-none transition-colors">&times;</button>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const CRMPage = () => {
  const [activeTab, setActiveTab] = useState("deals");
  const [searchTerm, setSearchTerm] = useState("");

  const [contacts, setContacts] = useState([]);
  const [pipeline, setPipeline] = useState({
    LEAD: { id: "LEAD", title: "LEADS", deals: [] },
    CONTACTED: { id: "CONTACTED", title: "CONTACTED", deals: [] },
    PROPOSAL: { id: "PROPOSAL", title: "PROPOSALS", deals: [] },
    NEGOTIATION: { id: "NEGOTIATION", title: "NEGOTIATING", deals: [] },
    WON: { id: "WON", title: "CLOSED WON", deals: [] },
    LOST: { id: "LOST", title: "CLOSED LOST", deals: [] },
  });
  const [activities, setActivities] = useState([]);

  const [editContact, setEditContact] = useState(null);
  const [editDeal, setEditDeal] = useState(null);
  const [editActivity, setEditActivity] = useState(null);
  const [feedback, setFeedback] = useState("");

  const loadData = async () => {
    try {
      const [cRes, dRes, aRes] = await Promise.all([
        fetch('http://localhost:5000/api/crm').then(res => res.json()),
        fetch('http://localhost:5000/api/crm/deals/all').then(res => res.json()),
        fetch('http://localhost:5000/api/crm/activities/all').then(res => res.json()),
      ]);
      setContacts(cRes);
      
      const newPipe = {
        LEAD: { id: "LEAD", title: "LEADS", deals: [] },
        CONTACTED: { id: "CONTACTED", title: "CONTACTED", deals: [] },
        PROPOSAL: { id: "PROPOSAL", title: "PROPOSALS", deals: [] },
        NEGOTIATION: { id: "NEGOTIATION", title: "NEGOTIATING", deals: [] },
        WON: { id: "WON", title: "CLOSED WON", deals: [] },
        LOST: { id: "LOST", title: "CLOSED LOST", deals: [] },
      };
      dRes.forEach(d => {
        const stage = d.stage || "LEAD";
        if(newPipe[stage]) {
          newPipe[stage].deals.push({ id: d.id, contactId: d.contact_id, title: d.title, value: Number(d.value), closeDate: d.close_date ? d.close_date.split('T')[0] : '' });
        }
      });
      setPipeline(newPipe);
      setActivities(aRes.map(a => ({ id: a.id, type: a.type, date: a.date ? a.date.split('T')[0] : '', client: a.client, status: a.status })));
    } catch(err) {
      console.error(err);
    }
  };

  React.useEffect(() => { loadData(); }, []);

  const showFeedback = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(""), 2500); };

  const handleContactSave = async (updated) => {
    try {
      if (!updated.id) {
        updated.id = `c${Date.now()}`;
        updated.date = new Date().toISOString().split('T')[0];
        await fetch('http://localhost:5000/api/crm', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updated) });
      } else {
        await fetch(`http://localhost:5000/api/crm/${updated.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updated) });
      }
      loadData();
      setEditContact(null); showFeedback("Client profile saved successfully");
    } catch(err) { showFeedback("Error saving"); }
  };

  const handleDealSave = async (updated) => {
    try {
      if (!updated.id) {
        updated.id = `deal-${Date.now()}`;
        updated.stage = "LEAD";
        await fetch('http://localhost:5000/api/crm/deals', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...updated, closeDate: updated.closeDate}) });
      } else {
        // Find existing stage to keep it
        let stage = "LEAD";
        for (const [key, col] of Object.entries(pipeline)) {
          if(col.deals.some(d => d.id === updated.id)) stage = key;
        }
        await fetch(`http://localhost:5000/api/crm/deals/${updated.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...updated, closeDate: updated.closeDate, stage}) });
      }
      loadData();
      setEditDeal(null); showFeedback("Project deal saved successfully");
    } catch(err) { showFeedback("Error saving"); }
  };

  const handleActivitySave = async (updated) => {
    try {
      if (!updated.id) {
        await fetch('http://localhost:5000/api/crm/activities', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updated) });
      } else {
        await fetch(`http://localhost:5000/api/crm/activities/${updated.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updated) });
      }
      loadData();
      setEditActivity(null); showFeedback("Activity tracked successfully");
    } catch(err) { showFeedback("Error saving"); }
  };

  const completeActivity = async (act) => {
    try {
      await fetch(`http://localhost:5000/api/crm/activities/${act.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...act, status: 'Completed'}) });
      loadData(); showFeedback("Activity marked as completed");
    } catch(err) { showFeedback("Error completing activity"); }
  };

  const deleteActivity = async (id) => {
    if (!window.confirm("Are you sure you want to delete this activity?")) return;
    try {
      await fetch(`http://localhost:5000/api/crm/activities/${id}`, { method: 'DELETE' });
      loadData(); showFeedback("Activity deleted");
    } catch(err) { showFeedback("Error deleting activity"); }
  };

  // --- ADVANCED METRICS (Removed Probability Weighted) ---
  const { totalValue, wonValue, activeCount } = useMemo(() => {
    let t = 0, won = 0, count = 0;
    Object.values(pipeline).forEach((col) => {
      col.deals.forEach((d) => {
        t += d.value;
        if (col.id === 'WON') won += d.value;
        else if (col.id !== 'LOST') { count++; }
      });
    });
    return { totalValue: t, wonValue: won, activeCount: count };
  }, [pipeline]);

  // --- EXPORT TO PDF ---
  const exportContactsToPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text("Mona Interior Studio - Client List", 14, 22);
    const tableColumn = ["Name", "Project", "Phone", "Status", "Source"];
    const tableRows = contacts.map(c => [c.name, c.project, c.phone, c.status, c.source || "N/A"]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30, theme: 'grid', headStyles: { fillColor: [41, 37, 36] } });
    doc.save("clients_report.pdf");
    showFeedback("PDF Report Exported!");
  };

  // Filters
  const filteredContacts = contacts.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.project.toLowerCase().includes(searchTerm.toLowerCase()) || (c.tags && c.tags.join(" ").toLowerCase().includes(searchTerm.toLowerCase())));
  const filteredActivities = activities.filter((a) => {
    const clientName = contacts.find(c => c.id === a.client)?.name || "";
    return clientName.toLowerCase().includes(searchTerm.toLowerCase()) || a.type.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const sourceCol = pipeline[source.droppableId];
    const destCol = pipeline[destination.droppableId];
    const sourceDeals = [...sourceCol.deals];
    const destDeals = [...destCol.deals];
    const [movedDeal] = sourceDeals.splice(source.index, 1);
    
    if (source.droppableId === destination.droppableId) {
      sourceDeals.splice(destination.index, 0, movedDeal);
      setPipeline({ ...pipeline, [source.droppableId]: { ...sourceCol, deals: sourceDeals } });
    } else {
      destDeals.splice(destination.index, 0, movedDeal);
      setPipeline({ ...pipeline, [source.droppableId]: { ...sourceCol, deals: sourceDeals }, [destination.droppableId]: { ...destCol, deals: destDeals } });
      
      // Update in DB
      try {
        await fetch(`http://localhost:5000/api/crm/deals/${movedDeal.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...movedDeal, stage: destination.droppableId})
        });
      } catch (e) {
        console.error("Failed to update deal stage", e);
      }
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-[#faf9f8] text-stone-800 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-orange-100/40 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-stone-200/50 blur-[120px]" />
      </div>

      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            <span className="bg-stone-900 text-white px-4 py-1.5 rounded-xl text-3xl shadow-md">M</span>
            Mona Studio CRM
          </h1>
          <p className="text-stone-500 mt-2 font-medium">Elevated pipeline, client management, and analytics.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full md:w-80 group shadow-sm rounded-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-stone-800 transition-colors" size={18} />
            <input type="text" placeholder={`Search ${activeTab}...`} className="w-full pl-12 pr-4 py-3 rounded-2xl border border-stone-200 bg-white/80 backdrop-blur-md text-stone-800 focus:ring-2 focus:ring-stone-800 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex w-full md:w-auto gap-1 p-1 rounded-2xl border border-stone-200 bg-white/80 backdrop-blur-md shadow-sm overflow-x-auto">
            {[
              { id: "deals", label: "Pipeline", icon: <Briefcase size={16} /> },
              { id: "contacts", label: "Clients", icon: <User size={16} /> },
              { id: "activities", label: "Schedule", icon: <Calendar size={16} /> },
              { id: "insights", label: "Insights", icon: <BarChart2 size={16} /> },
            ].map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchTerm(""); }} className={`flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-300 ${activeTab === tab.id ? "bg-stone-900 text-white shadow-md" : "text-stone-500 hover:text-stone-800 hover:bg-stone-100/50"}`}>
                {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* METRICS ROW */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        <div className="bg-white/80 border border-stone-200 backdrop-blur-xl p-6 rounded-[2rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign size={100} className="text-stone-900" /></div>
          <h3 className="text-stone-500 font-bold text-xs mb-2 uppercase tracking-widest flex items-center gap-2"><DollarSign size={14}/> Total Pipeline</h3>
          <div className="text-3xl font-black text-stone-900">₹{(totalValue / 100000).toFixed(2)}L</div>
          <div className="mt-3 flex items-center text-xs font-bold text-stone-500">All Deals Pipeline Value</div>
        </div>
        <div className="bg-white/80 border border-stone-200 backdrop-blur-xl p-6 rounded-[2rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={100} className="text-emerald-600" /></div>
          <h3 className="text-emerald-600 font-bold text-xs mb-2 uppercase tracking-widest flex items-center gap-2"><Percent size={14}/> Closed Revenue</h3>
          <div className="text-3xl font-black text-emerald-700">₹{(wonValue / 100000).toFixed(2)}L</div>
          <div className="mt-3 flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 w-max px-2 py-0.5 rounded-lg border border-emerald-100">Revenue successfully closed</div>
        </div>
        <div className="bg-white/80 border border-stone-200 backdrop-blur-xl p-6 rounded-[2rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Briefcase size={100} className="text-blue-600" /></div>
          <h3 className="text-blue-600 font-bold text-xs mb-2 uppercase tracking-widest flex items-center gap-2"><Activity size={14}/> Active Projects</h3>
          <div className="text-3xl font-black text-blue-700">{activeCount}</div>
          <div className="mt-3 flex items-center text-xs font-bold text-blue-600 bg-blue-50 w-max px-2 py-0.5 rounded-lg border border-blue-100">Currently in pipeline</div>
        </div>
        <div onClick={() => { if (activeTab === "contacts") setEditContact({ status: 'Cold', tags: [] }); else if (activeTab === "deals") setEditDeal({ value: 0, contactId: contacts[0]?.id || '' }); else setEditActivity({ type: '', date: new Date().toISOString().split('T')[0], client: contacts[0]?.id || '', status: 'Pending' }); }} className="bg-stone-900 backdrop-blur-xl p-6 rounded-[2rem] relative overflow-hidden group hover:bg-stone-800 transition-all cursor-pointer flex flex-col items-center justify-center text-center shadow-lg hover:shadow-xl transform hover:-translate-y-1 border border-stone-700">
          <div className="bg-white text-stone-900 p-3 rounded-2xl mb-3 group-hover:scale-110 transition-transform shadow-md"><Plus size={24} /></div>
          <h3 className="text-white font-black text-lg">Quick Add</h3>
          <p className="text-stone-400 text-sm font-medium mt-1">New {activeTab.slice(0, -1)}</p>
        </div>
      </motion.div>

      {/* MAIN CONTENT AREA */}
      <motion.div layout className="bg-white border border-stone-200 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[500px]">
        
        {/* SECTION: DEALS (KANBAN) */}
        {activeTab === "deals" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-5 bg-stone-50/30 overflow-hidden w-full">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex flex-row gap-2 sm:gap-3 w-full">
                {Object.values(pipeline).map((column) => (
                  <div key={column.id} className="flex-1 min-w-0 flex flex-col bg-stone-100/80 rounded-[1.25rem] border border-stone-200/60 p-2 sm:p-3 shadow-inner">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-3 gap-1">
                      <h3 className="text-[9px] sm:text-[10px] font-black text-stone-500 tracking-widest uppercase truncate">{column.title}</h3>
                      <span className="bg-white text-stone-600 border border-stone-200 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm self-start xl:self-auto">{column.deals.length}</span>
                    </div>
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className={`flex-1 min-h-[300px] rounded-[1rem] transition-colors ${snapshot.isDraggingOver ? "bg-stone-200/50 border-2 border-dashed border-stone-400 p-1" : ""}`}>
                          {column.deals.filter((d) => d.title.toLowerCase().includes(searchTerm.toLowerCase())).map((deal, index) => {
                            const contact = contacts.find((c) => c.id === deal.contactId);

                            return (
                              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                                {(provided, snapshot) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`bg-white p-3 sm:p-4 rounded-xl border mb-3 transition-all ${snapshot.isDragging ? "shadow-2xl border-stone-400 scale-[1.02] rotate-1" : "shadow-sm border-stone-200 hover:border-stone-300 hover:shadow-md hover:-translate-y-1"}`}>
                                    <div className="mb-2">
                                      <h4 className="font-black text-stone-900 text-xs sm:text-sm leading-snug truncate">{deal.title}</h4>
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-5 h-5 rounded-md bg-stone-900 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">{contact?.name.charAt(0) || '?'}</div>
                                      <p className="text-[10px] sm:text-[11px] font-bold text-stone-500 truncate">{contact?.name || 'Unknown'}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-stone-500 mb-4">
                                      <Phone size={12} className="text-stone-400" /> {contact?.phone || 'N/A'}
                                    </div>
                                    <div className="text-xs sm:text-sm font-black text-emerald-600 mb-3 bg-emerald-50 w-max px-2 py-0.5 rounded-md border border-emerald-100">₹{(deal.value/100000).toFixed(2)}L</div>
                                    
                                    <div className="pt-2 border-t border-stone-100 flex justify-between items-center">
                                      <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-stone-400 truncate"><Clock size={10} /> {new Date(deal.closeDate).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}</span>
                                      <button className="text-[9px] sm:text-[10px] font-bold text-stone-600 hover:text-stone-900 px-2 py-1 bg-stone-100 rounded-md transition-colors hover:bg-stone-200" onClick={() => setEditDeal({ ...deal })}>Edit</button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          </motion.div>
        )}

        {/* SECTION: CLIENTS */}
        {activeTab === "contacts" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto">
            <div className="flex justify-between items-center p-6 bg-stone-50/50 border-b border-stone-200">
              <h2 className="text-lg font-black text-stone-900">Client Directory</h2>
              <button onClick={exportContactsToPDF} className="flex items-center gap-2 bg-white border border-stone-200 text-stone-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-stone-50 transition-colors"><Download size={16}/> Export PDF</button>
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr className="text-stone-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="p-5 pl-8">Client Profile</th>
                  <th className="p-5">Project Focus</th>
                  <th className="p-5">Tags / Source</th>
                  <th className="p-5">Contact Details</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/50 transition-colors group">
                    <td className="p-5 pl-8">
                      <div className="flex items-center gap-4">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=292524&color=fff&rounded=xl&bold=true`} alt={c.name} className="w-10 h-10 rounded-xl shadow-sm"/>
                        <div>
                          <div className="font-black text-stone-900">{c.name}</div>
                          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">ID: {c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="bg-white text-stone-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-stone-200 shadow-sm">{c.project}</span>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {c.tags?.map(t => <span key={t} className="bg-stone-100 text-stone-500 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-stone-200"><Tag size={8} className="inline mr-1"/>{t}</span>)}
                      </div>
                      <div className="text-[10px] text-stone-400 font-bold flex items-center gap-1"><Filter size={10}/> {c.source || 'Unknown'}</div>
                    </td>
                    <td className="p-5 text-stone-500 text-xs font-medium space-y-1">
                      <div className="flex items-center gap-2"><Phone size={12} className="text-stone-400" /> {c.phone}</div>
                      <div className="flex items-center gap-2"><Mail size={12} className="text-stone-400" /> {c.email || 'N/A'}</div>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${c.status === 'Hot' ? 'bg-orange-50 text-orange-600 border-orange-200' : c.status === 'Warm' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                        {c.status || 'Cold'}
                      </span>
                    </td>
                    <td className="p-5 pr-8 text-right">
                      <button className="text-stone-400 hover:text-stone-900 font-bold px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors border border-transparent hover:border-stone-200 text-xs" onClick={() => setEditContact(c)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* SECTION: ACTIVITIES */}
        {activeTab === "activities" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[{ type: "Follow-up Call", icon: <Phone size={18} />, color: "blue" }, { type: "Site Visit", icon: <MapPin size={18} />, color: "orange" }, { type: "Send Quotation", icon: <DollarSign size={18} />, color: "emerald" }].map(({ type, icon, color }) => (
                <button key={type} onClick={() => setEditActivity({ type: type, date: new Date().toISOString().split('T')[0], client: contacts[0]?.id || '', status: 'Pending' })} className="flex items-center justify-between p-4 bg-white border border-stone-200 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={`bg-${color}-50 text-${color}-600 p-2.5 rounded-xl border border-${color}-100 group-hover:scale-110 transition-transform`}>{icon}</div>
                    <span className="font-bold text-stone-800 text-sm">{type}</span>
                  </div>
                  <Plus size={16} className="text-stone-400 group-hover:text-stone-900" />
                </button>
              ))}
            </div>
            <div className="bg-stone-50 rounded-[2rem] p-6 lg:p-8 border border-stone-200">
              <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Clock size={14} /> Upcoming Schedule</h3>
              <div className="space-y-3">
                {filteredActivities.sort((a,b) => new Date(a.date) - new Date(b.date)).map((act) => {
                  const contact = contacts.find(c => c.id === act.client);
                  const isOverdue = new Date(act.date) < new Date() && act.status !== 'Completed';
                  const displayStatus = isOverdue ? 'Overdue' : act.status;
                  const actDate = new Date(act.date);
                  return (
                    <div key={act.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-stone-200 rounded-xl shadow-sm hover:shadow-md transition-all">
                      <div className="flex gap-4 items-center">
                        <div className="bg-stone-50 border border-stone-200 px-3 py-2 rounded-lg text-center min-w-[60px]">
                          <p className="text-[9px] font-black text-stone-500 uppercase tracking-widest">{actDate.toLocaleString('default', { month: 'short' })}</p>
                          <p className="text-lg font-black text-stone-900">{actDate.getDate()}</p>
                        </div>
                        <div>
                          <p className="font-black text-stone-900 text-sm mb-0.5">{act.type}</p>
                          <p className="text-xs font-bold text-stone-500 flex items-center gap-1.5"><User size={12} /> {contact ? contact.name : "Unknown Client"} <span className="ml-2 flex items-center gap-1 text-stone-400"><Clock size={12}/> {actDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></p>
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-0 border-stone-100 pt-3 sm:pt-0">
                        <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 border rounded-md ${displayStatus === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : displayStatus === 'Overdue' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                          {displayStatus === 'Completed' ? <CheckCircle size={12} /> : displayStatus === 'Pending' ? <Clock size={12} /> : <Calendar size={12} />}{displayStatus}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                           {act.status !== 'Completed' && (
                             <button title="Mark Completed" className="text-emerald-600 hover:text-emerald-700 font-bold px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200 text-xs flex items-center gap-1" onClick={() => completeActivity(act)}><CheckCircle size={14}/></button>
                           )}
                           <button className="text-stone-500 hover:text-stone-900 font-bold px-3 py-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors border border-stone-200 text-xs" onClick={() => setEditActivity(act)}>Edit</button>
                           <button title="Delete Activity" className="text-red-500 hover:text-red-700 font-bold px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors border border-red-200 text-xs flex items-center gap-1" onClick={() => deleteActivity(act.id)}><Trash2 size={14}/></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* SECTION: INSIGHTS & ANALYTICS */}
        {activeTab === "insights" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 lg:p-8 space-y-8 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Pipeline Funnel */}
              <div className="bg-stone-50 border border-stone-200 rounded-[2rem] p-6">
                <h3 className="text-sm font-black text-stone-900 mb-6 flex items-center gap-2"><Filter size={16}/> Sales Funnel</h3>
                <div className="space-y-4">
                  {Object.values(pipeline).filter(c => c.id !== 'LOST').map((col, i) => {
                    const totalVal = col.deals.reduce((a, b) => a + b.value, 0);
                    const percentage = totalValue === 0 ? 0 : Math.max(5, (totalVal / totalValue) * 100);
                    return (
                      <div key={col.id} className="relative">
                        <div className="flex justify-between text-xs font-bold text-stone-500 mb-1">
                          <span>{col.title} ({col.deals.length})</span>
                          <span>₹{(totalVal/100000).toFixed(2)}L</span>
                        </div>
                        <div className="h-4 w-full bg-stone-200 rounded-full overflow-hidden">
                          <div className="h-full bg-stone-800 rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lead Sources & Win Rate */}
              <div className="space-y-6">
                <div className="bg-stone-50 border border-stone-200 rounded-[2rem] p-6">
                  <h3 className="text-sm font-black text-stone-900 mb-4 flex items-center gap-2"><PieChart size={16}/> Lead Sources</h3>
                  <div className="space-y-3">
                    {/* DYNAMICALLY generated list of all unique lead sources in the database */}
                    {Array.from(new Set(contacts.map(c => c.source || 'Other'))).map(source => {
                      const count = contacts.filter(c => (c.source || 'Other') === source).length;
                      if (count === 0) return null;
                      return (
                        <div key={source} className="flex justify-between items-center p-3 bg-white border border-stone-200 rounded-xl">
                          <span className="text-xs font-bold text-stone-600">{source}</span>
                          <span className="text-xs font-black bg-stone-100 px-2 py-1 rounded text-stone-800">{count} Clients</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-stone-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-10"><Activity size={100} /></div>
                  <h3 className="text-sm font-black text-stone-400 mb-2 uppercase tracking-widest">Win Rate</h3>
                  <div className="text-4xl font-black text-white">
                    {totalValue > 0 ? Math.round((wonValue / totalValue) * 100) : 0}%
                  </div>
                  <p className="text-xs text-stone-400 mt-2 font-medium">Of total pipeline value successfully closed.</p>
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </motion.div>

      {/* FEEDBACK TOAST */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="fixed bottom-8 right-8 bg-stone-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 font-bold border border-stone-700">
            <CheckCircle size={20} className="text-emerald-400" />{feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <Modal open={!!editContact} onClose={() => setEditContact(null)}>
        {editContact && <EditContactForm contact={editContact} onSave={handleContactSave} onCancel={() => setEditContact(null)} />}
      </Modal>

      <Modal open={!!editDeal} onClose={() => setEditDeal(null)}>
        {editDeal && <EditDealForm deal={editDeal} contacts={contacts} onSave={handleDealSave} onCancel={() => setEditDeal(null)} />}
      </Modal>

      <Modal open={!!editActivity} onClose={() => setEditActivity(null)}>
        {editActivity && <EditActivityForm activity={editActivity} contacts={contacts} onSave={handleActivitySave} onCancel={() => setEditActivity(null)} />}
      </Modal>
    </div>
  );
};

// --- EXTENDED FORMS ---
function EditContactForm({ contact, onSave, onCancel }) {
  const [form, setForm] = useState(contact || { name: '', project: '', phone: '', email: '', address: '', status: 'Cold', source: '', tags: [] });
  const [tagInput, setTagInput] = useState("");

  const addTag = () => { if (tagInput.trim() && !form.tags.includes(tagInput.trim())) { setForm({...form, tags: [...form.tags, tagInput.trim()]}); setTagInput(""); } };

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-6">
      <h2 className="font-black text-3xl mb-1 text-stone-900 tracking-tight">Client Profile</h2>
      <p className="text-stone-500 font-medium text-sm mb-6 pb-4 border-b border-stone-200">Comprehensive details for your design client.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
          <input className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-900 font-bold focus:ring-2 focus:ring-stone-900 outline-none transition-all" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Phone Number</label>
          <input className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-900 font-bold focus:ring-2 focus:ring-stone-900 outline-none transition-all" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
        </div>
        <div>
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Email Address</label>
          <input className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-900 font-bold focus:ring-2 focus:ring-stone-900 outline-none transition-all" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Project Focus</label>
          <input className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-900 font-bold focus:ring-2 focus:ring-stone-900 outline-none transition-all" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} required />
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Physical Address</label>
          <input className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-900 font-bold focus:ring-2 focus:ring-stone-900 outline-none transition-all" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required />
        </div>
        <div className="md:col-span-2">
          {/* Replaced fixed select with input + datalist so ANY lead source can be entered */}
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Lead Source</label>
          <input list="lead-sources" placeholder="e.g. Instagram" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-900 font-bold focus:ring-2 focus:ring-stone-900 outline-none transition-all" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
          <datalist id="lead-sources">
            <option value="Instagram" />
            <option value="Website" />
            <option value="Referral" />
            <option value="Direct Walk-in" />
          </datalist>
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-5 border-t border-stone-200">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-stone-500 hover:bg-stone-100 transition-colors">Cancel</button>
        <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold bg-stone-900 text-white shadow-md hover:bg-stone-800 transition-all">Save Profile</button>
      </div>
    </form>
  );
}

function EditDealForm({ deal, contacts, onSave, onCancel }) {
  const initialContact = contacts.find(c => c.id == deal?.contactId);
  const [form, setForm] = useState({ 
    title: deal?.title || '', 
    value: deal?.value || 0, 
    contactName: initialContact?.name || '', 
    closeDate: deal?.closeDate || new Date().toISOString().split('T')[0],
    id: deal?.id
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const existing = contacts.find(c => c.name.toLowerCase() === form.contactName.trim().toLowerCase());
    onSave({
      id: form.id,
      title: form.title,
      value: form.value,
      closeDate: form.closeDate,
      contactId: existing ? existing.id.toString() : form.contactName.trim()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="font-black text-3xl mb-1 text-stone-900 tracking-tight">Project Deal</h2>
      <p className="text-stone-500 font-medium text-sm mb-6 pb-4 border-b border-stone-200">Track and update the estimated budget and assign to a client.</p>
      
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Deal Title</label>
          <input className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-900 font-bold focus:ring-2 focus:ring-stone-900 outline-none transition-all" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Client (Optional)</label>
          <input 
            list="client-list"
            placeholder="Type new or select existing..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-900 font-bold focus:ring-2 focus:ring-stone-900 outline-none transition-all" 
            value={form.contactName} 
            onChange={e => setForm({ ...form, contactName: e.target.value })} 
          />
          <datalist id="client-list">
            {contacts.map(c => <option key={c.id} value={c.name} />)}
          </datalist>
        </div>
        <div>
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Est. Value (₹)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">₹</span>
            <input className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 pl-9 text-sm text-stone-900 font-black focus:ring-2 focus:ring-stone-900 outline-none transition-all" value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} type="number" required min="0" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-5 border-t border-stone-200">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-stone-500 hover:bg-stone-100 transition-colors">Cancel</button>
        <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold bg-stone-900 text-white shadow-md hover:bg-stone-800 transition-all">Save Project</button>
      </div>
    </form>
  );
}

function EditActivityForm({ activity, contacts, onSave, onCancel }) {
  // We manage date and time separately in the form state, but combine them on save.
  const defaultDateStr = activity?.date || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const initialDate = defaultDateStr.split('T')[0];
  const initialTime = defaultDateStr.split('T')[1] || '12:00';
  const initialContact = contacts.find(c => c.id == activity?.client);

  const [form, setForm] = useState({ 
    id: activity?.id,
    type: activity?.type || '', 
    datePart: initialDate,
    timePart: initialTime,
    contactName: initialContact?.name || '', 
    status: activity?.status || 'Pending' 
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const existing = contacts.find(c => c.name.toLowerCase() === form.contactName.trim().toLowerCase());
    
    onSave({
      id: form.id,
      type: form.type,
      date: `${form.datePart}T${form.timePart}`,
      client: existing ? existing.id.toString() : form.contactName.trim(),
      status: form.status || 'Pending'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="font-black text-3xl mb-1 text-stone-900 tracking-tight">Schedule Activity</h2>
      <p className="text-stone-500 font-medium text-sm mb-6 pb-4 border-b border-stone-200">Plan your meetings, site visits, and calls.</p>
      
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Activity Title/Type</label>
          <input className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-900 font-bold focus:ring-2 focus:ring-stone-900 outline-none transition-all" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} required placeholder="e.g. Discuss Floor Plan" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Date</label>
            <input className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-900 font-bold focus:ring-2 focus:ring-stone-900 outline-none transition-all" value={form.datePart} onChange={e => setForm({ ...form, datePart: e.target.value })} type="date" required />
          </div>
          <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Time</label>
            <input className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-900 font-bold focus:ring-2 focus:ring-stone-900 outline-none transition-all" value={form.timePart} onChange={e => setForm({ ...form, timePart: e.target.value })} type="time" required />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Client (Optional)</label>
          <input 
            list="activity-client-list"
            placeholder="Type new or select existing..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-900 font-bold focus:ring-2 focus:ring-stone-900 outline-none transition-all" 
            value={form.contactName} 
            onChange={e => setForm({ ...form, contactName: e.target.value })} 
          />
          <datalist id="activity-client-list">
            {contacts.map(c => <option key={c.id} value={c.name} />)}
          </datalist>
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-5 border-t border-stone-200">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-stone-500 hover:bg-stone-100 transition-colors">Cancel</button>
        <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold bg-stone-900 text-white shadow-md hover:bg-stone-800 transition-all">Save Schedule</button>
      </div>
    </form>
  );
}

export default CRMPage;
