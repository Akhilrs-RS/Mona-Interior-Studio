import React, { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { Receipt, Search, Printer, Plus, User, Calendar, IndianRupee, Trash2 } from "lucide-react";

export default function ReceiptPage() {
  const [receipts, setReceipts] = useState(() => {
    const saved = localStorage.getItem("payment_receipts");
    return saved ? JSON.parse(saved) : [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    receiptNo: "",
    date: new Date().toISOString().split("T")[0],
    clientName: "",
    amount: "",
    category: "Advance Payment",
    description: "",
    comments: "",
    paymentMode: "Cash"
  });

  useEffect(() => {
    localStorage.setItem("payment_receipts", JSON.stringify(receipts));
  }, [receipts]);

  const componentRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: componentRef });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Save the last number
    const parts = formData.receiptNo.split("/");
    if (parts.length >= 3) {
      localStorage.setItem("lastReceiptNumber", parts[2]);
    }

    setReceipts([{ ...formData, id: Date.now() }, ...receipts]);
    setIsModalOpen(false);
  };

  const openModal = () => {
    const lastNum = localStorage.getItem("lastReceiptNumber") || "1000";
    const newNum = parseInt(lastNum) + 1;
    const yearSuffix = "26-27"; // Standard for the current financial year in this app

    setFormData({ 
      ...formData, 
      receiptNo: `MI/RCP/${newNum}/${yearSuffix}`,
      clientName: "",
      amount: "",
      category: "Advance Payment",
      description: "",
      comments: ""
    });
    setIsModalOpen(true);
  };

  const deleteReceipt = (id) => {
    if(window.confirm("Are you sure you want to delete this receipt?")) {
      setReceipts(receipts.filter(r => r.id !== id));
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            < Receipt className="text-blue-600" size={32} />
            Payment Receipts
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Generate and track customer payment receipts.</p>
        </div>
        <button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition"
        >
          <Plus size={20} /> Create Project Receipt
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-white">
              <th className="px-8 py-5">Receipt No</th>
              <th className="px-8 py-5">Date</th>
              <th className="px-8 py-5">Client Name</th>
              <th className="px-8 py-5">Category / Desc</th>
              <th className="px-8 py-5 text-right">Amount</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {receipts.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 font-bold text-slate-900">{r.receiptNo}</td>
                <td className="px-8 py-5 text-slate-500">{new Date(r.date).toLocaleDateString("en-IN")}</td>
                <td className="px-8 py-5 font-bold">{r.clientName}</td>
                <td className="px-8 py-5 text-xs uppercase font-black text-blue-600">
                  {r.category}
                  {r.description && <span className="block text-[9px] text-slate-400 normal-case font-medium">{r.description}</span>}
                </td>
                <td className="px-8 py-5 text-right font-black text-emerald-600">₹{parseFloat(r.amount).toLocaleString()}</td>
                <td className="px-8 py-5 text-right">
                   <div className="flex justify-end gap-2">
                     <button onClick={() => { setFormData(r); setTimeout(() => handlePrint(), 100); }} className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-widest px-3 py-1 bg-blue-50 rounded-lg">Print</button>
                     <button onClick={() => deleteReceipt(r.id)} className="text-rose-600 hover:text-rose-800 p-1 bg-rose-50 rounded-lg"><Trash2 size={16}/></button>
                   </div>
                </td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr><td colSpan="6" className="py-20 text-center text-slate-300 font-bold uppercase text-xs">No receipts found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[32px] w-full max-w-lg shadow-2xl relative border border-slate-100">
            <h2 className="text-2xl font-black mb-6">New Payment Receipt</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Receipt No</label>
                  <input readOnly value={formData.receiptNo} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 border border-slate-100 rounded-xl text-sm font-bold" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Client Name</label>
                <input required value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="e.g. John Doe" className="w-full p-3 border border-slate-100 rounded-xl text-sm font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-3 border border-slate-100 rounded-xl text-sm font-bold">
                    <option>Advance Payment</option>
                    <option>Partial Payment</option>
                    <option>Closing Payment</option>
                    <option>Security Deposit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Amount (₹)</label>
                  <input required type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="w-full p-3 border border-slate-100 rounded-xl text-sm font-bold text-emerald-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Payment Mode</label>
                  <select value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value})} className="w-full p-3 border border-slate-100 rounded-xl text-sm font-bold">
                    <option>Cash</option>
                    <option>UPI / Online</option>
                    <option>Cheque</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Description</label>
                  <input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="e.g. Master Bedroom Work" className="w-full p-3 border border-slate-100 rounded-xl text-sm font-bold" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Comments (Optional)</label>
                <input value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} placeholder="Any additional details..." className="w-full p-3 border border-slate-100 rounded-xl text-sm font-bold" />
              </div>
            </div>
            <div className="flex gap-2 mt-8">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-xs">Cancel</button>
              <button type="submit" className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg">Generate Receipt</button>
            </div>
          </form>
        </div>
      )}

      {/* Hidden Print Content */}
      <div style={{ display: "none" }}>
        <div ref={componentRef} className="p-16 bg-white text-slate-900 font-sans border-[12px] border-slate-100 min-h-[500px]">
          <div className="flex justify-between border-b-2 border-slate-900 pb-8 mb-10">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">Mona Interior Studio</h1>
              <p className="font-bold text-slate-500">Official Payment Receipt</p>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-black text-slate-200"># {formData.receiptNo}</h2>
              <p className="font-bold">Date: {new Date(formData.date).toLocaleDateString("en-IN")}</p>
            </div>
          </div>
          
          <div className="space-y-8 text-lg">
            <p>Received with thanks from <span className="font-black border-b-2 border-slate-200 px-4 inline-block min-w-[200px]">{formData.clientName}</span></p>
            <p>the sum of Rupees <span className="font-black border-b-2 border-slate-200 px-4 inline-block min-w-[150px]">₹ {parseFloat(formData.amount || 0).toLocaleString()}</span></p>
            <p>by <span className="font-black border-b-2 border-slate-200 px-4 inline-block">{formData.paymentMode}</span></p>
            <p>towards <span className="font-black border-b-2 border-slate-200 px-4 inline-block">{formData.category} {formData.description ? `(${formData.description})` : ""}</span></p>
            {formData.comments && <p className="text-sm text-slate-500 italic">Note: {formData.comments}</p>}
          </div>

          <div className="flex justify-between items-end mt-32">
            <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
               <p className="text-xs font-bold text-slate-400 uppercase mb-1">Amount Received</p>
               <p className="text-4xl font-black">₹ {parseFloat(formData.amount || 0).toLocaleString()}</p>
            </div>
            <div className="text-center">
               <div className="w-48 border-t-2 border-slate-900 mb-2"></div>
               <p className="font-black uppercase tracking-widest text-xs">Authorized Signatory</p>
               <p className="text-[10px] text-slate-400">Mona Interior Studio</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
