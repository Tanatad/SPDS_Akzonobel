// app/dashboard/history/components/JobDetailModal.tsx
import { X, Clock, LayoutGrid, Zap, Flame, Settings, Printer } from 'lucide-react';
import { fmtDateTime, fmtNum, calcThroughput, getJobDuration, getSortedExtruderCols, getSortedMillCols, calcTimeDiff } from '../utils';
import { StatusBadge, QCCircle, ValCell } from './UIComponents';
import MillPrintForm from '../../mill/components/MillPrintForm';

export default function JobDetailModal({ job, onClose }: any) {
    if (!job) return null;

    const duration = getJobDuration(job);
    const extCols = getSortedExtruderCols(job);
    const millCols = getSortedMillCols(job);

    return (
        // 🚀 THE FIX: ใช้ print:!block และ print:!static เพื่อยกเลิก flex และ fixed ตอนปริ้นท์ ทำให้กระดาษ A4 กางได้เต็ม 100%
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200 print:!block print:!static print:!bg-transparent print:!p-0 print:!backdrop-blur-none">
            
            {/* ซ่อน UI ของ Modal นี้ไม่ให้ติดไปในกระดาษ */}
            <div className="bg-white rounded-2xl w-full max-w-[95%] h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200 print:hidden">
                <div className="px-6 py-4 border-b bg-white flex justify-between items-center shadow-sm z-20">
                    <div className="flex items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-1"><h2 className="text-2xl font-bold text-slate-800">{job.product_code}</h2><StatusBadge status={job.status}/></div>
                            <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                                <span className="bg-slate-100 px-2 py-0.5 rounded border">PO: {job.po_no}</span>
                                <span className="flex items-center gap-1"><Clock size={12}/> {fmtDateTime(job.created_at)}</span>
                                <span className="flex items-center gap-1"><LayoutGrid size={12}/> Op: {job.operator_name}</span>
                            </div>
                        </div>
                        <div className="hidden lg:flex gap-6 px-6 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                            <div className="text-center"><div className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Target Kg</div><div className="text-lg font-bold text-slate-700">{fmtNum(job.target_kg)}</div></div>
                            <div className="w-px bg-slate-200"></div>
                            <div className="text-center">
                                <div className="text-[9px] text-orange-500 font-bold uppercase mb-0.5">Ext Throughput</div>
                                <div className="text-lg font-black text-orange-600 flex items-center justify-center gap-1"><Zap size={14} className="fill-orange-600"/> {calcThroughput(job.productions?.reduce((s:number,p:any)=>s+(p.pot_qty||0),0)*100 || 0, duration.extProd)}<span className="text-[10px] font-bold text-orange-400">kg/h</span></div>
                            </div>
                            <div className="w-px bg-slate-200"></div>
                            <div className="text-center">
                                <div className="text-[9px] text-purple-500 font-bold uppercase mb-0.5">Mill Throughput</div>
                                <div className="text-lg font-black text-purple-600 flex items-center justify-center gap-1"><Zap size={14} className="fill-purple-600"/> {calcThroughput(job.mill_logs?.filter((l:any) => l.box_start).reduce((s:number,l:any)=>s+(l.total_weight_kg||0),0)||0, duration.millProd)}<span className="text-[10px] font-bold text-purple-400">kg/h</span></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {job.mill_logs?.length > 0 && (
                            <button 
                                onClick={() => window.print()} 
                                className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm active:scale-95"
                            >
                                <Printer size={18}/> Print Mill Form
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 scrollbar-hide">
                    {/* Extruder Matrix */}
                    <section className="mb-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 border-b flex items-center justify-between bg-orange-50/30">
                            <div className="flex items-center gap-2"><div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><Flame size={16}/></div><h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Extruder Matrix <span className="text-orange-600 ml-1">(Line {job.extruder_line})</span></h3></div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr><th className="p-3 text-left w-64 sticky left-0 bg-white border-b border-r z-10 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Parameter Checkpoint</th>{extCols.map((col:any, i:number) => (<th key={i} className={`p-2 text-center min-w-[120px] border-b border-r last:border-r-0 ${col.type==='SETUP'?'bg-purple-50/50':'bg-blue-50/50'}`}><div className="flex flex-col items-center py-1"><span className={`text-[10px] font-black px-2 py-0.5 rounded-full mb-1 ${col.type==='SETUP'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>{col.type}</span><span className="text-[10px] text-slate-500 font-mono">Bin: {col.type==='SETUP' ? col.setup_bin : col.granule_bin_no}</span></div></th>))}</tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="bg-slate-50/30"><td colSpan={100} className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky left-0">Output & Timing</td></tr>
                                    <tr><td className="p-3 font-medium text-slate-600 border-r bg-white sticky left-0">Time Range</td>{extCols.map((d:any, i:number) => <td key={i} className="p-2 text-center border-r text-[10px] text-slate-500 tabular-nums">{fmtDateTime(d.start_time).split(' ')[1]} {fmtDateTime(d.start_time).split(' ')[2]} - {fmtDateTime(d.stop_time).split(' ')[1]} {fmtDateTime(d.stop_time).split(' ')[2]}</td>)}</tr>
                                    <tr><td className="p-3 font-medium text-slate-600 border-r bg-white sticky left-0">Duration</td>{extCols.map((d:any, i:number) => <td key={i} className="p-2 text-center border-r font-bold text-slate-700 tabular-nums text-xs">{d.duration_min || calcTimeDiff(d.start_time, d.stop_time)} min</td>)}</tr>
                                    <tr><td className="p-3 font-medium text-slate-600 border-r bg-white sticky left-0">Output Qty</td>{extCols.map((d:any, i:number) => <td key={i} className="p-2 text-center border-r font-bold text-slate-700 tabular-nums text-sm">{d.setup_kg ? <>{fmtNum(d.setup_kg)} <span className="text-[9px] font-normal text-slate-400">kg</span></> : <>{fmtNum(d.pot_qty*100)} <span className="text-[9px] font-normal text-slate-400">kg</span> <span className="text-[9px] text-slate-400 font-normal">({d.pot_qty} pts)</span></>}</td>)}</tr>
                                    <tr className="bg-slate-50/30"><td colSpan={100} className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky left-0">Machine Parameters</td></tr>
                                    {[{ label: 'Screw Speed (rpm)', std: 'std_screw_rpm', act: 'act_screw_rpm' }, { label: 'Torque (%)', std: 'std_torque_pct', act: 'act_torque_pct' }, { label: 'Side Feed (%)', std: 'std_side_feed_pct', act: 'act_side_feed_pct' }, { label: 'Outlet Temp (°C)', act: 'act_outlet_temp', bold: true }, { label: 'Water Flow (%)', act: 'barrel_water_flow' }, { label: 'Water Temp (°C)', act: 'barrel_water_temp' },].map((row, idx) => (<tr key={idx} className="hover:bg-slate-50/50"><td className="p-3 font-medium text-slate-600 border-r bg-white sticky left-0 text-xs">{row.label}</td>{extCols.map((d:any, i:number) => <td key={i} className="p-2 text-center border-r"><ValCell std={d[row.std as string]} act={d[row.act as string]} bold={row.bold} showStd={true}/></td>)}</tr>))}
                                    <tr className="bg-slate-50/30"><td colSpan={100} className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky left-0">Heating Zones (°C)</td></tr>
                                    {[1,2,3,4,5].map((z) => (<tr key={z} className="hover:bg-slate-50/50"><td className="p-3 font-medium text-slate-600 border-r bg-white sticky left-0 text-xs">Zone {z}</td>{extCols.map((d:any, i:number) => <td key={i} className="p-2 text-center border-r"><ValCell std={d[`std_ht${z}`]} act={d[`act_ht${z}`]} showStd={true}/></td>)}</tr>))}
                                    <tr className="bg-slate-50/30"><td colSpan={100} className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky left-0">Logs & Remarks</td></tr>
                                    <tr>
                                        <td className="p-3 font-medium text-slate-600 border-r bg-white sticky left-0">Remarks</td>
                                        {extCols.map((d:any, i:number) => {
                                            const rems = [d.remark_quality, d.remark_machine, d.remark_other].filter(Boolean);
                                            return <td key={i} className={`p-2 text-left border-r text-[9px] min-w-[150px] leading-tight ${rems.length > 0 ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-400 italic'}`}>{rems.length > 0 ? rems.join(' | ') : '-'}</td>;
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Mill Matrix */}
                    {job.mill_logs?.length > 0 && (
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-3 border-b flex items-center justify-between bg-purple-50/30">
                                <div className="flex items-center gap-2"><div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><Settings size={16}/></div><h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Mill Matrix <span className="text-purple-600 ml-1">(Line {job.mill_data?.mill_line || job.mill_line})</span></h3></div>
                            </div>
                            <div className="overflow-x-auto pb-2">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr><th className="p-3 text-left w-64 sticky left-0 bg-white border-b border-r z-10 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Parameter Checkpoint</th>{millCols.map((l:any, i:number) => <th key={i} className="p-2 text-center min-w-[100px] border-b border-r bg-purple-50/30 text-purple-800"><span className="font-bold text-xs">{l.box_start ? `Box ${l.box_start}-${l.box_end}` : 'SETUP'}</span></th>)}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="bg-slate-50/30"><td colSpan={100} className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky left-0">Output & Timing</td></tr>
                                        <tr><td className="p-3 font-medium text-slate-600 border-r bg-white sticky left-0">Total Weight</td>{millCols.map((l:any, i:number) => <td key={i} className="p-2 text-center border-r font-bold text-slate-800 text-sm tabular-nums">{fmtNum(l.total_weight_kg || l.setup_kg)} <span className="text-[9px] text-slate-400 font-normal">kg</span></td>)}</tr>
                                        <tr><td className="p-3 font-medium text-slate-600 border-r bg-white sticky left-0">Duration</td>{millCols.map((l:any, i:number) => <td key={i} className="p-2 text-center border-r font-bold text-slate-700 tabular-nums text-xs">{calcTimeDiff(l.start_time, l.stop_time)} min</td>)}</tr>
                                        <tr className="bg-slate-50/30"><td colSpan={100} className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky left-0">Machine Parameters</td></tr>
                                        {[{ label: 'Feeder (rpm)', key: 'feeder_rpm' }, { label: 'Separator (rpm)', key: 'separator_rpm' }, { label: 'Rotor (rpm)', key: 'rotor_rpm' }, { label: 'Air Flow (m3)', key: 'air_flow' }, { label: 'Inlet Temp (°C)', key: 'inlet_temp' }, { label: 'Outlet Temp (°C)', key: 'outlet_temp' }, { label: 'FG Temp (°C)', key: 'fg_temp', bold: true, color: 'text-orange-600' }].map((row, idx) => (<tr key={idx} className="hover:bg-slate-50/50"><td className="p-3 font-medium text-slate-600 border-r bg-white sticky left-0 text-xs">{row.label}</td>{millCols.map((l:any, i:number) => <td key={i} className={`p-2 text-center border-r tabular-nums text-xs ${row.bold ? 'font-bold' : ''} ${row.color || 'text-slate-600'}`}>{fmtNum(l[row.key])}</td>)}</tr>))}
                                        <tr className="bg-slate-50/30"><td colSpan={100} className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky left-0">Logs & Remarks</td></tr>
                                        <tr>
                                            <td className="p-3 font-medium text-slate-600 border-r bg-white sticky left-0">Remarks</td>
                                            {millCols.map((l:any, i:number) => {
                                                const rems = [l.remark_quality, l.remark_machine, l.remark_other].filter(Boolean);
                                                return <td key={i} className={`p-2 text-left border-r text-[9px] min-w-[150px] leading-tight ${rems.length > 0 ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-400 italic'}`}>{rems.length > 0 ? rems.join(' | ') : '-'}</td>;
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* ✅ ตัวฟอร์มพิมพ์ซ่อนอยู่ด้านหลังสุด (ทำงานร่วมกับ CSS ใหม่อย่างสมบูรณ์แบบ) */}
            {job.mill_logs?.length > 0 && (
                <MillPrintForm jobData={{...job, production_logs: job.mill_logs, mill_line: job.mill_data?.mill_line || job.mill_line}} />
            )}
            
        </div>
    );
}