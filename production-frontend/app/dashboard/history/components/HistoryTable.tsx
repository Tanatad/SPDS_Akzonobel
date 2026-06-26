// app/dashboard/history/components/HistoryTable.tsx
import { Loader2, Timer, Zap, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { fmtDate, fmtNum, calcThroughput, getJobDuration } from '../utils';
import { StatusBadge } from './UIComponents';

export default function HistoryTable({ data, isLoading, isFetching, page, setPage, totalPages, setSelectedJob }: any) {
    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200 tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Date</th><th className="px-6 py-4">Job Details</th><th className="px-6 py-4">Extruder Out (Kg)</th>
                            <th className="px-6 py-4">Mill Out (Kg)</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100 relative">
                        {isLoading ? (<tr><td colSpan={6} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500"/></td></tr>) : 
                        data.length === 0 ? (<tr><td colSpan={6} className="p-16 text-center text-slate-400">No records found.</td></tr>) :
                        data.map((job: any) => {
                            const extPots = job.productions?.reduce((s:number,p:any)=>s+(p.pot_qty||0),0) || 0;
                            const extKg = extPots * 100;
                            const millKg = job.mill_logs?.filter((l:any) => l.box_start).reduce((s:number,l:any)=>s+(l.total_weight_kg||0),0) || 0;
                            const duration = getJobDuration(job);
                            const extTp = calcThroughput(extKg, duration.extProd);
                            const millTp = calcThroughput(millKg, duration.millProd);

                            return (
                                <tr key={job.job_id} className={`hover:bg-slate-50/80 transition-colors group ${isFetching && 'opacity-60'}`}>
                                    <td className="px-6 py-4 text-slate-500 text-xs font-medium">{fmtDate(job.created_at)}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 text-base mb-0.5">{job.product_code}</div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border">PO: {job.po_no}</div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-1" title="Total Duration"><Timer size={12}/> {duration.total} min</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-[10px] font-bold border">L{job.extruder_line}</span>
                                                <span className="font-bold text-slate-700">{fmtNum(extKg)} <span className="text-[10px] font-normal">Kg</span></span>
                                                <span className="text-[10px] text-slate-400">({extPots} pts)</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-orange-600 bg-orange-50 w-fit px-1.5 py-0.5 rounded border flex items-center gap-1"><Zap size={10} className="fill-orange-600"/> {extTp} kg/hr</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {job.mill_data ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-[10px] font-bold border">M{job.mill_data.mill_line}</span>
                                                    <span className="font-bold text-slate-700">{fmtNum(millKg)} <span className="text-[10px] font-normal">Kg</span></span>
                                                </div>
                                                <div className="text-[10px] font-bold text-purple-600 bg-purple-50 w-fit px-1.5 py-0.5 rounded border flex items-center gap-1"><Zap size={10} className="fill-purple-600"/> {millTp} kg/hr</div>
                                            </div>
                                        ) : <span className="text-slate-300 italic text-xs pl-2">No Data</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center"><StatusBadge status={job.status}/></td>
                                    <td className="px-6 py-4 text-center"><button onClick={() => setSelectedJob(job)} className="px-3 py-1.5 bg-white text-slate-600 rounded-lg hover:text-blue-600 border flex items-center gap-2 mx-auto"><Eye size={14}/> View</button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                <button onClick={() => setPage((p:number) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center px-4 py-2 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={14} className="mr-1"/> Prev</button>
                <span className="text-xs font-medium text-slate-500">Page <span className="font-bold text-slate-800">{page}</span> of <span className="font-bold text-slate-800">{totalPages}</span></span>
                <button onClick={() => setPage((p:number) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center px-4 py-2 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-50">Next <ChevronRight size={14} className="ml-1"/></button>
            </div>
        </>
    );
}