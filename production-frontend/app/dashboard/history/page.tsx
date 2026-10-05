// app/dashboard/history/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
// ✅ Import useQueryClient
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import * as XLSX from 'xlsx';
// ✅ เพิ่ม UploadCloud
import { FileText, Search, Calendar, Flame, Settings, RotateCcw, Loader2, Download, UploadCloud } from 'lucide-react';

import { fmtDateTime, calcThroughput, getJobDuration, getSortedExtruderCols, getSortedMillCols, getRange, getRemarks } from './utils';
import HistoryTable from './components/HistoryTable';
import JobDetailModal from './components/JobDetailModal';

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function HistoryPage() {
  const [selectedJob, setSelectedJob] = useState<any>(null);
  
  const [page, setPage] = useState(1);
  const LIMIT = 20;
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 600); 
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selExtLine, setSelExtLine] = useState(''); 
  const [selMillLine, setSelMillLine] = useState('');
  
  // ✅ เพิ่ม state และ QueryClient
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
      setPage(1);
  }, [debouncedSearch, startDate, endDate, selExtLine, selMillLine]);

  const { data: queryData, isLoading, isFetching } = useQuery({
      queryKey: ['historyList', page, debouncedSearch, startDate, endDate, selExtLine, selMillLine],
      queryFn: async () => {
          const queryParams: Record<string, string> = { page: page.toString(), limit: LIMIT.toString() };
          if (debouncedSearch) queryParams.search = debouncedSearch;
          if (startDate) queryParams.start_date = startDate;
          if (endDate) queryParams.end_date = endDate;
          if (selExtLine) queryParams.extruder_line = selExtLine;
          if (selMillLine) queryParams.mill_line = selMillLine;
          
          const res = await api.get(`/history/query?${new URLSearchParams(queryParams).toString()}`);
          return res.data;
      },
      placeholderData: keepPreviousData,
  });

  const data = queryData?.items || [];
  const totalPages = queryData?.total_pages || 1;

  // ✅ ฟังก์ชันส่งไฟล์ Excel ให้ Backend ช่วย Map
  const handleUploadQAPD = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      setIsUploading(true);
      try {
          const res = await api.post('/history/qapd/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          alert(res.data?.message || "อัปเดตข้อมูล QAPD สำเร็จ!");
          // รีเฟรชตารางใหม่เพื่อให้ป้ายแสดง
          queryClient.invalidateQueries({ queryKey: ['historyList'] });
      } catch (err: any) {
          console.error(err);
          alert(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${err.response?.data?.detail || "System Error"}`);
      } finally {
          setIsUploading(false);
          e.target.value = ''; // รีเซ็ต Input
      }
  };

  const handleExportExcel = () => {
      if (data.length === 0) return alert("No data to export!");

      const exportData = data.map((job: any) => {
          const duration = getJobDuration(job);
          const extLogs = getSortedExtruderCols(job);
          const millLogs = getSortedMillCols(job);

          const extOutPots = job.productions?.reduce((s:number,p:any)=>s+(p.pot_qty||0),0) || 0;
          const extOutKg = extOutPots * 100;
          const millOutKg = job.mill_logs?.filter((l:any) => l.box_start).reduce((s:number,l:any)=>s+(l.total_weight_kg||0),0) || 0; 

          return {
              "Date": fmtDateTime(job.created_at),
              "PO Number": job.po_no,
              "Product Code": job.product_code,
              "Operator": job.operator_name || '-',
              "Status": job.status,
              "QA Status": job.qapd_status || 'Pending', // ✅ ส่งออก Excel
              "QA Remark": job.qapd_remark || '-',
              "Target (Kg)": job.target_kg,
              
              "Ext Line": job.extruder_line,
              "Ext Total Time (Min)": duration.extTotal,
              "Ext Prod Time (Min)": duration.extProd, 
              "Ext Out (Pots)": extOutPots,
              "Ext Out (Kg)": extOutKg,
              "Ext Throughput (Kg/Hr)": Number(calcThroughput(extOutKg, duration.extProd)),
              "Ext Remarks": getRemarks(extLogs),
              "Ext Screw (RPM)": getRange(extLogs, 'act_screw_rpm'),
              "Ext Torque (%)": getRange(extLogs, 'act_torque_pct'),
              "Ext Side Feed (%)": getRange(extLogs, 'act_side_feed_pct'),
              "Ext Outlet Temp (°C)": getRange(extLogs, 'act_outlet_temp'),
              "Ext HT1 (°C)": getRange(extLogs, 'act_ht1'),
              "Ext HT2 (°C)": getRange(extLogs, 'act_ht2'),
              "Ext HT3 (°C)": getRange(extLogs, 'act_ht3'),
              "Ext HT4 (°C)": getRange(extLogs, 'act_ht4'),
              "Ext HT5 (°C)": getRange(extLogs, 'act_ht5'),

              "Mill Line": job.mill_data?.mill_line || '-',
              "Mill Total Time (Min)": duration.millTotal,
              "Mill Prod Time (Min)": duration.millProd,
              "Mill Out (Kg)": millOutKg,
              "Mill Throughput (Kg/Hr)": Number(calcThroughput(millOutKg, duration.millProd)),
              "Mill Remarks": getRemarks(millLogs),
              "Mill Feeder (RPM)": getRange(millLogs, 'feeder_rpm'),
              "Mill Separator (RPM)": getRange(millLogs, 'separator_rpm'),
              "Mill Rotor (RPM)": getRange(millLogs, 'rotor_rpm'),
              "Mill Air Flow": getRange(millLogs, 'air_flow'),
              "Mill Inlet Temp (°C)": getRange(millLogs, 'inlet_temp'),
              "Mill Outlet Temp (°C)": getRange(millLogs, 'outlet_temp'),
              "Mill FG Temp (°C)": getRange(millLogs, 'fg_temp'),
          };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Production History");
      XLSX.writeFile(workbook, `Production_History_${search || 'Export'}.xlsx`);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 pb-20 font-sans text-slate-800 animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                  <FileText size={28}/>
              </div>
              <div>
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Production History</h1>
                  <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                      Archive of all manufacturing jobs & logs
                      {isFetching && !isLoading && (
                          <span title="Updating Data...">
                              <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                          </span>
                      )}
                  </p>
              </div>
          </div>
          {/* ✅ เพิ่มปุ่ม Sync QAPD ขนาบข้าง Export Excel */}
          <div className="flex items-center gap-3">
              <label className={`bg-blue-50 hover:bg-blue-100 text-blue-700 px-5 py-2.5 rounded-xl font-bold border border-blue-200 shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                  {isUploading ? "Syncing..." : "Sync QAPD"}
                  <input type="file" accept=".xlsx" className="hidden" onChange={handleUploadQAPD} disabled={isUploading} />
              </label>
              
              <button onClick={handleExportExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm shadow-emerald-200 transition-all flex items-center gap-2 active:scale-95">
                  <Download size={18} /> Export
              </button>
          </div>
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col xl:flex-row gap-2 xl:items-center justify-between sticky top-4 z-30">
          <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto p-2">
              <div className="relative w-full md:w-64 group">
                  <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18}/>
                  <input type="text" placeholder="Search PO, Product Code..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none text-sm transition-all font-medium"/>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-fit">
                  <div className="flex items-center px-2 text-slate-400 text-xs font-bold uppercase tracking-wide"><Calendar size={14} className="mr-1.5"/> Date</div>
                  <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium outline-none text-slate-600 focus:border-blue-400 w-32 cursor-pointer hover:bg-slate-50"/>
                  <span className="text-slate-300 text-xs">to</span>
                  <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium outline-none text-slate-600 focus:border-blue-400 w-32 cursor-pointer hover:bg-slate-50"/>
              </div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto items-center p-2 border-t md:border-t-0 border-slate-100 pt-3 md:pt-2">
              <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="flex items-center gap-2 px-3 py-2 bg-orange-50/80 border border-orange-100 rounded-xl text-xs text-orange-700 font-bold whitespace-nowrap"><Flame size={14}/> Extruder</div>
                  <select value={selExtLine} onChange={e => setSelExtLine(e.target.value)} className="w-full md:w-24 p-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-600 focus:ring-2 focus:ring-orange-100 outline-none cursor-pointer hover:border-orange-300 transition-colors"><option value="">All</option>{[1,2,3,7,8,11].map(l => <option key={l} value={l}>Line {l}</option>)}</select>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="flex items-center gap-2 px-3 py-2 bg-purple-50/80 border border-purple-100 rounded-xl text-xs text-purple-700 font-bold whitespace-nowrap"><Settings size={14}/> Mill</div>
                  <select value={selMillLine} onChange={e => setSelMillLine(e.target.value)} className="w-full md:w-24 p-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-600 focus:ring-2 focus:ring-purple-100 outline-none cursor-pointer hover:border-purple-300 transition-colors"><option value="">All</option>{[2,3,4,9,10,12,13,14].map(m => <option key={m} value={m}>Line {m}</option>)}</select>
              </div>
              <button onClick={() => {setSearch(''); setStartDate(''); setEndDate(''); setSelExtLine(''); setSelMillLine('');}} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-auto md:ml-0 border border-transparent hover:border-red-100"><RotateCcw size={16}/></button>
          </div>
      </div>

      <HistoryTable 
          data={data} 
          isLoading={isLoading} 
          isFetching={isFetching} 
          page={page} 
          setPage={setPage} 
          totalPages={totalPages} 
          setSelectedJob={setSelectedJob} 
      />

      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />

    </div>
  );
}