// app/dashboard/mill/components/StartJobForm.tsx
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Package, Scale, Play, Search, AlertCircle, Clock, CheckCircle, Users, PlusCircle, Send, Settings } from 'lucide-react';
import api from '@/lib/api';

export default function StartJobForm({ millLine, pendingJobs, onBack, onJoinJob, refetchActiveJob }: any) {
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const [boxWeight, setBoxWeight] = useState<number>(20);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualPo, setManualPo] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [manualTarget, setManualTarget] = useState('');

    // ✅ 1. เพิ่ม State สำหรับเก็บค่า Machine Condition Setup
    const [feederSet, setFeederSet] = useState<string>('');
    const [separatorSet, setSeparatorSet] = useState<string>('');
    const [rotorSet, setRotorSet] = useState<string>('');
    const [airFlowSet, setAirFlowSet] = useState<string>('');

    const queryClient = useQueryClient();

    const { data: activeMillPools = [] } = useQuery({
        queryKey: ['activeMillPools'],
        queryFn: async () => {
            const res = await api.get('/mill/jobs/active/all');
            return res.data || [];
        },
        refetchInterval: 5000
    });

    const displayJobs = useMemo(() => {
        let filtered = pendingJobs;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((j: any) => 
                j.product_code.toLowerCase().includes(term) || j.po_no.toLowerCase().includes(term)
            );
        }
        return filtered.sort((a: any, b: any) => (a.status === 'WAITING_MILL' ? -1 : 1));
    }, [pendingJobs, searchTerm]);

    const triggerScreenUpdate = (newJobId: number) => {
        if (onJoinJob) onJoinJob(newJobId);
    };

    const handleStartJob = async () => {
        if (!selectedJobId) return alert("Please select a job");
        if (!feederSet || !separatorSet || !rotorSet || !airFlowSet) return alert("กรุณาระบุค่า Machine Condition ให้ครบถ้วน");

        try {
            const jobDetailToStart = pendingJobs.find((j: any) => j.job_id === selectedJobId);

            // ✅ 2. อัปเดต Payload ส่งค่า Setup ไปให้ API
            const res = await api.post('/mill/job/start', { 
                extruder_job_id: selectedJobId, 
                mill_line: millLine, 
                box_weight: boxWeight,
                feeder_set: parseFloat(feederSet),
                separator_set: parseFloat(separatorSet),
                rotor_set: parseFloat(rotorSet),
                air_flow_set: parseFloat(airFlowSet)
            });

            const newMillJobId = res.data.job_id;
            if (onJoinJob && newMillJobId) onJoinJob(newMillJobId);

            if (jobDetailToStart) {
                queryClient.setQueryData(['millJobDetail', newMillJobId], {
                    job_id: newMillJobId,
                    extruder_job_id: jobDetailToStart.job_id,
                    extruder_line: jobDetailToStart.extruder_line,
                    po_no: jobDetailToStart.po_no,
                    product_code: jobDetailToStart.product_code,
                    target_kg: jobDetailToStart.target_kg,
                    box_weight: boxWeight,
                    mill_line: millLine,
                    feeder_set: parseFloat(feederSet),
                    separator_set: parseFloat(separatorSet),
                    rotor_set: parseFloat(rotorSet),
                    air_flow_set: parseFloat(airFlowSet),
                    setup_logs: [],
                    production_logs: []
                });
            }

            triggerScreenUpdate(newMillJobId); 
        } catch (err: any) { 
            console.error(err.response?.data); 
            alert("Start Error"); 
        }
    };

    const handleStartManualJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualPo || !manualCode || !manualTarget) return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        if (!feederSet || !separatorSet || !rotorSet || !airFlowSet) return alert("กรุณาระบุค่า Machine Condition ให้ครบถ้วน");

        try {
            // ✅ 3. อัปเดต Payload สำหรับโหมด Manual
            const res = await api.post('/mill/job/start-manual', {
                po_no: manualPo, product_code: manualCode, target_kg: parseFloat(manualTarget),
                mill_line: millLine, box_weight: boxWeight,
                feeder_set: parseFloat(feederSet),
                separator_set: parseFloat(separatorSet),
                rotor_set: parseFloat(rotorSet),
                air_flow_set: parseFloat(airFlowSet)
            });

            const newMillJobId = res.data.job_id;
            if (onJoinJob && newMillJobId) onJoinJob(newMillJobId);

            queryClient.setQueryData(['millJobDetail', newMillJobId], {
                job_id: newMillJobId,
                extruder_job_id: null,
                extruder_line: 0,
                po_no: manualPo.toUpperCase(),
                product_code: manualCode.toUpperCase(),
                target_kg: parseFloat(manualTarget),
                box_weight: boxWeight,
                mill_line: millLine,
                feeder_set: parseFloat(feederSet),
                separator_set: parseFloat(separatorSet),
                rotor_set: parseFloat(rotorSet),
                air_flow_set: parseFloat(airFlowSet),
                setup_logs: [],
                production_logs: []
            });

            triggerScreenUpdate(newMillJobId); 
        } catch (err: any) {
            alert(err.response?.data?.detail || "เกิดข้อผิดพลาดในการสร้างงานใหม่");
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 font-sans">
            <div className="flex justify-between items-center mb-8">
                <button onClick={isManualMode ? () => setIsManualMode(false) : onBack} className="flex items-center text-slate-500 hover:text-purple-600 font-bold transition-colors bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm w-fit">
                    <ArrowLeft size={18} className="mr-2"/> {isManualMode ? "Back to Central Pool" : "Back to Selection"}
                </button>
                
                {!isManualMode && (
                    <button onClick={() => setIsManualMode(true)} className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm border border-purple-200">
                        <PlusCircle size={18}/> New Manual Job
                    </button>
                )}
            </div>

            {isManualMode ? (
                <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-sm animate-in zoom-in-95 duration-200">
                    <h2 className="text-xl font-black text-slate-800 mb-2">Create New Mill Job</h2>
                    <p className="text-xs font-medium text-slate-400 mb-6">สำหรับเปิดงานบดกรณีเครื่องฉีดไม่มีการติดตั้งระบบส่งข้อมูล (No OPC UA)</p>
                    <form onSubmit={handleStartManualJob} className="space-y-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">PO Number</label><input type="text" required value={manualPo} onChange={(e)=>setManualPo(e.target.value)} placeholder="เช่น P3B16220..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-purple-200 outline-none uppercase"/></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Code</label><input type="text" required value={manualCode} onChange={(e)=>setManualCode(e.target.value)} placeholder="เช่น EA03JTH" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-purple-200 outline-none uppercase"/></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Quantity (Kg)</label><input type="number" step="any" required value={manualTarget} onChange={(e)=>setManualTarget(e.target.value)} placeholder="ระบุน้ำหนักเป้าหมายรวม" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-purple-200 outline-none"/></div>
                        
                        {/* ✅ 4. เพิ่มฟอร์มกรอก Machine Condition (โหมด Manual) */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5"><Settings size={14}/> Milling Condition Set</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Feeder Set (rpm)</label><input type="number" step="any" required value={feederSet} onChange={(e)=>setFeederSet(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-purple-200 outline-none"/></div>
                                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Separator Set (rpm)</label><input type="number" step="any" required value={separatorSet} onChange={(e)=>setSeparatorSet(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-purple-200 outline-none"/></div>
                                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rotor Set (rpm)</label><input type="number" step="any" required value={rotorSet} onChange={(e)=>setRotorSet(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-purple-200 outline-none"/></div>
                                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Air Flow Set (m³)</label><input type="number" step="any" required value={airFlowSet} onChange={(e)=>setAirFlowSet(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-purple-200 outline-none"/></div>
                            </div>
                        </div>

                        <div className="py-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">น้ำหนักบรรจุมาตรฐาน</label>
                            <div className="flex gap-2">
                                {[15, 20].map(w => (
                                    <button type="button" key={w} onClick={() => setBoxWeight(w)} className={`flex-1 py-2.5 rounded-xl font-black border transition-all ${boxWeight === w ? 'border-purple-600 bg-purple-50 text-purple-700 font-bold' : 'border-slate-200 text-slate-400'}`}>{w} Kg</button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="w-full mt-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-purple-100 transition-all active:scale-[0.98]">Start Grinding Operation</button>
                    </form>
                </div>
            ) : (
                <div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                        <div><h1 className="text-3xl font-black text-slate-800 tracking-tight">Central Job Pool</h1><p className="text-slate-500 font-medium">Select a job from Extruder to process on Line {millLine}</p></div>
                        <div className="relative w-full md:w-80 group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-600"><Search size={20} /></div>
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search PO or Product Code..." className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 shadow-sm text-slate-700 font-bold transition-all placeholder:font-medium"/>
                        </div>
                    </div>

                    {activeMillPools.length > 0 && (
                        <div className="mb-10 bg-purple-50/50 p-6 rounded-3xl border border-purple-100 animate-in fade-in">
                            <h2 className="text-base font-black text-purple-900 mb-4 flex items-center gap-2"><Users size={18}/> กำลังบดอยู่ตอนนี้ (สามารถเข้าร่วมรุมบดได้)</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {activeMillPools.map((mj: any) => (
                                    <div key={mj.job_id} className="bg-white rounded-lg border border-slate-300 shadow-sm flex flex-col justify-between hover:shadow-md transition-all overflow-hidden p-0">
                                        <div>
                                            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex justify-between items-center"><span className="text-xs font-medium text-slate-500 uppercase tracking-wider">PO: {mj.po_no}</span></div>
                                            <div className="p-4 flex flex-col flex-grow"><h3 className="text-xl font-bold text-slate-800 mb-2 truncate" title={mj.product_code}>{mj.product_code}</h3>
                                            <div className="text-xs font-medium text-slate-500 mb-4 flex items-center gap-1.5"><Users size={14}/> Mill {mj.mill_line}</div>
                                        </div>
                                        <button onClick={() => triggerScreenUpdate(mj.job_id)} className="w-full mt-auto py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-md transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"><Send size={14}/> Join Mill</button></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <h2 className="text-base font-black text-slate-700 mb-4 flex items-center gap-2">คิวงานรอเข้าบดจาก Extruder</h2>
                    {pendingJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                            <div className="bg-slate-50 p-4 rounded-full mb-3"><Package size={40} className="opacity-40"/></div><p className="text-base font-medium">No jobs currently running in Extruder.</p>
                        </div>
                    ) : displayJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                            <Search size={40} className="opacity-40 mb-3"/><p className="text-base font-medium">No matches found for "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-48"> 
                            {displayJobs.map((job: any) => (
                                <div key={job.job_id} onClick={() => setSelectedJobId(job.job_id)} className={`group relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${selectedJobId === job.job_id ? 'border-purple-500 bg-purple-50 shadow-md ring-2 ring-purple-500/20 scale-[1.02]' : 'border-slate-200 bg-white shadow-sm hover:border-purple-200 hover:shadow-md'}`}>
                                    <div>
                                        <div className="flex justify-between items-start mb-3 gap-2">
                                            <div className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-200 truncate">PO: {job.po_no}</div>
                                            {job.status === 'WAITING_MILL' ? <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wider rounded border border-amber-200 whitespace-nowrap"><AlertCircle size={10}/> Ready</div> : <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-wider rounded border border-blue-200 whitespace-nowrap"><Clock size={10}/> Extruding</div>}
                                        </div>
                                        <div className="text-lg font-black text-slate-800 tracking-tight mb-2 truncate" title={job.product_code}>{job.product_code}</div>
                                        <div className="flex items-center gap-1.5 mb-3"><span className="flex items-center justify-center w-5 h-5 rounded bg-slate-800 text-white font-bold text-[10px]">L{job.extruder_line}</span><span className="text-xs font-semibold text-slate-500">Source Extruder</span></div>
                                    </div>
                                    <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                                        <div><div className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Target Output</div><div className="text-base font-black text-slate-800">{job.target_kg} <span className="text-xs text-slate-400 font-medium">Kg</span></div></div>
                                        {selectedJobId === job.job_id && <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center animate-in zoom-in"><CheckCircle size={14} /></div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedJobId && !isManualMode && (
                        <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white/95 backdrop-blur-md border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom-10">
                            <div className="max-w-5xl mx-auto flex flex-col gap-4">
                                
                                {/* ✅ 5. เพิ่มฟอร์มกรอก Machine Condition (โหมด Central Pool) */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-100 pb-4">
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Feeder Set (rpm)</label><input type="number" step="any" required value={feederSet} onChange={(e)=>setFeederSet(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-purple-200 outline-none text-slate-700"/></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Separator Set (rpm)</label><input type="number" step="any" required value={separatorSet} onChange={(e)=>setSeparatorSet(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-purple-200 outline-none text-slate-700"/></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rotor Set (rpm)</label><input type="number" step="any" required value={rotorSet} onChange={(e)=>setRotorSet(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-purple-200 outline-none text-slate-700"/></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Air Flow Set (m³)</label><input type="number" step="any" required value={airFlowSet} onChange={(e)=>setAirFlowSet(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-purple-200 outline-none text-slate-700"/></div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 shrink-0"><Scale size={24}/></div>
                                        <div><h3 className="font-bold text-slate-800 text-sm md:text-base">Packaging Standard</h3><p className="text-slate-500 text-xs md:text-sm">Select box capacity for this job</p></div>
                                    </div>
                                    <div className="flex gap-3 w-full md:w-auto">
                                        {[15, 20].map(w => (<button key={w} onClick={() => setBoxWeight(w)} className={`flex-1 md:w-32 py-3 md:py-4 rounded-2xl font-black text-lg md:text-xl border-2 transition-all duration-200 ${boxWeight === w ? 'border-purple-500 bg-purple-600 text-white shadow-lg scale-105' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-purple-300 hover:text-purple-600'}`}>{w} Kg</button>))}
                                    </div>
                                    <button onClick={handleStartJob} className="w-full md:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-lg md:text-xl shadow-sm transition-all active:scale-95 flex justify-center items-center gap-3 whitespace-nowrap"><Play className="fill-current" size={24}/> Start Job</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}