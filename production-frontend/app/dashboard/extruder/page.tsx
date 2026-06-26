// app/dashboard/extruder/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query'; 
import api from '@/lib/api';
import { Flame, Send, LogOut, Loader2, Hash, Users, PlusCircle, UserMinus } from 'lucide-react';
import { EXTRUDER_LIST } from './utils';
import MachineSelection from './components/MachineSelection';
import StartJobForm from './components/StartJobForm';
import ExtruderWorkspace from './components/ExtruderWorkspace';

const GlobalStyles = () => (
  <style jsx global>{`
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
    input[type="datetime-local"]::-webkit-calendar-picker-indicator { cursor: pointer; }
  `}</style>
);

export default function ExtruderPage() {
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false); 
  
  // ✅ ใช้ workingJobId เพื่อจำว่าเรากำลังรุมทำ PO ไหนอยู่ (ไม่สนว่าใครสร้าง)
  const [workingJobId, setWorkingJobId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: machineStatuses = {} } = useQuery({
    queryKey: ['machineStatuses'],
    queryFn: async () => {
      const statuses: Record<number, boolean> = {};
      await Promise.all(EXTRUDER_LIST.map(async (line) => {
        try {
          const res = await api.get(`/preview/extruder/${line}`, { timeout: 3000 });
          statuses[line] = !!res.data;
        } catch { statuses[line] = false; }
      }));
      return statuses;
    },
    refetchInterval: 30000, 
    enabled: selectedLine === null, 
  });


  // ✅ Fetch Job Detail: Either by explicitly joined ID, or by checking if our line has an active job.
  const { data: activeJob, refetch: refetchActiveJob, isLoading: isJobLoading } = useQuery({
      queryKey: ['jobDetail', workingJobId || selectedLine],
      queryFn: async () => {
          if (workingJobId) {
             const res = await api.get(`/process/job/detail/${workingJobId}`);
             return res.data || null;
          } else if (selectedLine) {
             const res = await api.get(`/process/job/active/${selectedLine}`);
             return res.data || null;
          }
          return null;
      },
      enabled: !!selectedLine,
      refetchInterval: 5000, 
  });

  // ดึงงานทั้งหมดเข้า Central Pool
  const { data: allActiveJobs = [], refetch: refetchAllActiveJobs, isLoading: isAllJobsLoading } = useQuery({
    queryKey: ['allActiveJobs'],
    queryFn: async () => {
      if (!selectedLine) return [];
      const res = await api.get(`/process/jobs/active/all`);
      return res.data || [];
    },
    enabled: !!selectedLine && !workingJobId, 
    refetchInterval: 10000 
  });

  const logs = {
    warmups: activeJob?.warmups || [],
    setups: activeJob?.setups || [],
    prods: activeJob?.productions || []
  };

  // ✅ เช็คว่าเราเป็น "เจ้าของ PO" หรือแค่ "คนมาช่วย (Joiner)"
  const isOwner = activeJob?.extruder_line === selectedLine;

  const handleFinishOrLeaveJob = async () => {
      if (isOwner) {
          if(confirm("⚠️ ยืนยันการ 'ปิดงาน (Finish PO)' ?\nงานจะถูกส่งต่อไปยัง Mill และทุกเครื่องจะถูกตัดออกจากงานนี้")) { 
              try {
                  await api.post(`/process/job/finish/${activeJob.job_id}`); 
                  
                  // 🔥 สั่งกวาดล้าง Cache ทิ้งทั้งหมด ป้องกันปัญหา Ghost Data เวลาสลับ Line
                  await queryClient.invalidateQueries({ queryKey: ['myOwnedJob'] });
                  await queryClient.invalidateQueries({ queryKey: ['jobDetail'] });
                  await queryClient.invalidateQueries({ queryKey: ['allActiveJobs'] });

                  setWorkingJobId(null);
                  
                  setSelectedLine(null);
              } catch(err) { alert("Error finishing job"); }
          }
      } else {
          if(confirm("🚪 ยืนยันการ 'ออกจากการช่วยงาน (Leave Job)' ?\nคุณจะกลับไปที่หน้าเลือกงาน โดยที่ PO นี้จะยังคงรันอยู่")) {
              setWorkingJobId(null);
              // ล้าง Cache เฉพาะตัวที่เรา Join อยู่
              queryClient.invalidateQueries({ queryKey: ['jobDetail'] });
          }
      }
  };

  if (!selectedLine) {
    return (
      <>
        <GlobalStyles/>
        <MachineSelection onSelectMachine={(l: number) => { setSelectedLine(l); setShowCreateForm(false); setWorkingJobId(null); }} machineStatuses={machineStatuses} />
      </>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 pb-20 bg-slate-50 min-h-screen animate-in fade-in duration-300">
      <GlobalStyles/>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200"><Flame className="text-orange-500" size={28} /></div>
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Extruder Line {selectedLine}</h1>
                <div className="text-sm font-medium text-slate-500 mt-1 flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${machineStatuses[selectedLine] ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {machineStatuses[selectedLine] ? 'Machine Online' : 'Machine Offline'}
                </div>
            </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            {activeJob && (
                <button 
                    onClick={handleFinishOrLeaveJob} 
                    className={`flex-1 md:flex-none text-white px-5 py-3 rounded-xl font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${isOwner ? 'bg-slate-800 hover:bg-slate-900' : 'bg-red-500 hover:bg-red-600'}`}
                >
                    {isOwner ? <><Send size={18}/> Finish PO</> : <><UserMinus size={18}/> Leave Job</>}
                </button>
            )}
            <button onClick={() => { setSelectedLine(null); setWorkingJobId(null); }} className="flex-1 md:flex-none bg-white text-slate-700 px-5 py-3 rounded-xl font-bold border border-slate-300 hover:bg-slate-100 shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2">
                <LogOut size={18}/> Switch Line
            </button>
        </div>
      </div>

      {isJobLoading ? (
          <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-orange-500 mb-4"/> Loading Workspace...</div>
      ) : activeJob ? (
        // ✅ โหมด 1: ทำงานอยู่ (Workspace)
        <ExtruderWorkspace activeJob={activeJob} selectedLine={selectedLine} logs={logs} setLogs={refetchActiveJob} />
      ) : showCreateForm ? (
        // ✅ โหมด 2: กำลังสร้างงานใหม่
        <div>
            <button onClick={() => setShowCreateForm(false)} className="mb-6 text-slate-500 font-bold hover:text-orange-600 transition-colors">← Back to Job Pool</button>
            <StartJobForm selectedLine={selectedLine} fetchActiveJob={() => { queryClient.invalidateQueries({ queryKey: ['jobDetail'] }); setShowCreateForm(false); }} />
        </div>
      ) : (
        // ✅ โหมด 3: หน้า Central Pool (เลือกว่าจะ Join หรืองานใหม่)
        <div className="animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-end mb-6">
                <div><h2 className="text-xl font-black text-slate-800">Active Production Pool</h2><p className="text-sm text-slate-500 font-medium">Join an existing job or start a new one</p></div>
                <button onClick={() => setShowCreateForm(true)} className="bg-orange-100 text-orange-700 hover:bg-orange-200 hover:text-orange-800 px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2"><PlusCircle size={18}/> New Job</button>
            </div>

            {isAllJobsLoading ? (
                <div className="py-20 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-orange-400"/> Loading active jobs...</div>
            ) : allActiveJobs.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-500">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"><Hash size={32} className="text-slate-300"/></div>
                    <p className="text-lg font-bold">No active jobs in the factory.</p>
                    <p className="text-sm mt-1 mb-6">Click "New Job" to start production.</p>
                    <button onClick={() => setShowCreateForm(true)} className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-orange-600 transition-all">Start New Job</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allActiveJobs.map((job: any) => (
                        <div key={job.job_id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border border-slate-200">PO: {job.po_no}</span>
                                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-200"><Flame size={12}/> Active</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-1">{job.product_code}</h3>
                            <div className="text-sm font-medium text-slate-500 flex items-center gap-2 mb-6"><Users size={14}/> Started by Line {job.extruder_line}</div>
                            <div className="flex items-end justify-between pt-4 border-t border-slate-100">
                                <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target</div><div className="font-black text-lg text-slate-700">{job.target_pots} <span className="text-xs text-slate-400 font-bold">Pots</span></div></div>
                                <button onClick={() => setWorkingJobId(job.job_id)} className="bg-blue-50 text-blue-700 font-bold px-4 py-2 rounded-xl text-sm border border-blue-100 hover:bg-blue-600 hover:text-white transition-all">
                                    Join Job
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}
    </div>
  );
}