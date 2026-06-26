// app/dashboard/extruder/components/StartJobForm.tsx
import { useState } from 'react';
import api from '@/lib/api';
import { Play, Hash, Package, User, Target, Scale } from 'lucide-react';
import { parseNum } from '../utils'; // ลบ MILL_LIST, PAIRING_MAP ออก

interface Props {
  selectedLine: number;
  fetchActiveJob: () => void;
  onJoinJob?: (id: number) => void;
}

export default function StartJobForm({ selectedLine, fetchActiveJob, onJoinJob }: Props) {
  // ลบ state 'mill' ทิ้ง
  const [header, setHeader] = useState({ 
    po: '', code: '', op: '', targetPots: '', targetKg: '' 
  });

  const handleStartJob = async () => {
    if (!header.po || !header.code || !header.targetPots || !header.targetKg) return alert("Fill Header info");
    try {
      const res = await api.post('/process/job/start', {
        po_no: header.po, 
        product_code: header.code, 
        operator_name: header.op, 
        extruder_line: selectedLine, 
        planned_mill_line: 0, // ✅ ส่ง 0 ไปเลย (Backend เราไม่แคร์แล้ว)
        target_pots: parseNum(header.targetPots), 
        target_kg: parseNum(header.targetKg)
      });
      if (onJoinJob && res.data?.job_id) onJoinJob(res.data.job_id); else fetchActiveJob();
    } catch (err: any) { alert(err.response?.data?.detail || "Error"); }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-slate-300 max-w-3xl mx-auto animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-slate-100 rounded-lg mb-4 text-slate-700"><Play size={32} fill="currentColor" /></div>
            <h2 className="text-2xl font-bold text-slate-800">Start New Job</h2>
            <p className="text-slate-600 font-medium mt-2">Enter details to begin production</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <div className="relative group"><div className="absolute top-3.5 left-3.5 text-slate-500"><Hash size={18}/></div><input type="text" value={header.po} onChange={e => setHeader({...header, po: e.target.value})} className="w-full pl-10 pr-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-200 bg-slate-50 font-bold text-slate-800 placeholder:text-slate-400" placeholder="PO Number" /></div>
            <div className="relative group"><div className="absolute top-3.5 left-3.5 text-slate-500"><Package size={18}/></div><input type="text" value={header.code} onChange={e => setHeader({...header, code: e.target.value})} className="w-full pl-10 pr-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-200 bg-slate-50 font-bold text-slate-800 placeholder:text-slate-400" placeholder="Product Code" /></div>
            <div className="md:col-span-2 relative group"><div className="absolute top-3.5 left-3.5 text-slate-500"><User size={18}/></div><input type="text" value={header.op} onChange={e => setHeader({...header, op: e.target.value})} className="w-full pl-10 pr-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-200 bg-slate-50 font-bold text-slate-800 placeholder:text-slate-400" placeholder="Operator Name" /></div>
            <div className="relative group"><div className="absolute top-3.5 left-3.5 text-slate-500"><Target size={18}/></div><input type="number" value={header.targetPots} onChange={e => setHeader({...header, targetPots: e.target.value})} className="w-full pl-10 pr-12 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-200 bg-slate-50 font-bold text-slate-800 placeholder:text-slate-400" placeholder="จำนวนถังผสม (Target Pots)" /><span className="absolute right-4 top-3.5 text-slate-500 text-xs font-bold mt-1">Pots</span></div>
            <div className="relative group"><div className="absolute top-3.5 left-3.5 text-slate-500"><Scale size={18}/></div><input type="number" value={header.targetKg} onChange={e => setHeader({...header, targetKg: e.target.value})} className="w-full pl-10 pr-12 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-200 bg-slate-50 font-bold text-slate-800 placeholder:text-slate-400" placeholder="ปริมาณที่ต้องผลิต (Target Kg)" /><span className="absolute right-4 top-3.5 text-slate-500 text-xs font-bold mt-1">Kg</span></div>
        </div>
        <button onClick={handleStartJob} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-bold text-lg flex justify-center items-center shadow-lg active:scale-[0.98]">Start Production <Play className="w-5 h-5 ml-2 fill-current" /></button>
    </div>
  );
}