// app/dashboard/mill/components/HistoryItem.tsx
import React from 'react';
import { Settings, Package, Trash2, Clock, Thermometer, Beaker, AlertTriangle, Loader2 } from 'lucide-react';

const formatTime = (iso: string) => {
    if (!iso) return '-';
    if (iso.includes('T')) return iso.split('T')[1].substring(0, 5); 
    return iso.substring(0, 5);
};

const HistoryCardComponent = ({ log, jobWeight, onDelete, type }: any) => {
    const isSetup = type === 'SETUP';
    const totalWeight = isSetup ? log.setup_kg : (log.total_weight_kg || ((log.box_end - log.box_start + 1) * jobWeight));
    const hasAdditive = log.additive_weight_kg > 0;
    const hasWaste = log.ovs_kg > 0 || log.waste_kg > 0 || log.dust_kg > 0;
    const isSaving = typeof log.id === 'string' && log.id.startsWith('temp-');

    return (
        <div className={`border border-slate-200 rounded-xl bg-white shadow-sm transition-all overflow-hidden mb-3 group ${isSaving ? 'opacity-80' : 'hover:shadow-md'}`}>
            <div className={`p-3 border-b border-slate-100 flex justify-between items-center ${isSetup ? 'bg-purple-50/50' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2 font-bold text-slate-700">
                     {isSetup ? <Settings size={16} className="text-purple-600"/> : <Package size={16} className="text-blue-600"/>}
                     <span className="text-sm">
                         {/* ✅ แสดงเลขถังเซ็ทอัพ และ เลขถังรายกล่อง */}
                         {isSetup ? `Setup (Bin: ${log.setup_bin || '-'})` : `Box ${log.box_start}-${log.box_end} (Bin: ${log.granule_bin_no || '-'})`}
                     </span>
                     {/* ✅ แปะ Badge ตัวโตๆ บอกว่าเครื่องบดเบอร์ไหนทำบรรทัดนี้ */}
                     <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-[10px] font-black tracking-wider shadow-sm">
                         M{log.mill_line || '-'}
                     </span>
                </div>
                <div className="flex items-center gap-2">
                    {isSaving ? (
                        <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-full"><Loader2 size={10} className="animate-spin"/> Saving...</span>
                    ) : (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${isSetup ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{totalWeight} kg</span>
                    )}
                    {!isSaving && (
                        <button onClick={() => onDelete(log.id, type)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors opacity-0 group-hover:opacity-100" title="Delete Record"><Trash2 size={16}/></button>
                    )}
                </div>
            </div>

            <div className="p-3 text-xs space-y-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-500 font-medium"><Clock size={12}/> {formatTime(log.start_time)} - {formatTime(log.stop_time)}</div>
                    <div className="flex gap-1">
                        {log.is_sieve_ok && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold">Sieve OK</span>}
                        {log.is_ovs_ok && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold">OVS OK</span>}
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-1 text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100 text-center">
                    <div><div className="text-[9px] text-slate-400 uppercase">Feeder</div><div className="font-bold">{log.feeder_rpm}</div></div>
                    <div><div className="text-[9px] text-slate-400 uppercase">Sep</div><div className="font-bold">{log.separator_rpm}</div></div>
                    <div><div className="text-[9px] text-slate-400 uppercase">Rotor</div><div className="font-bold">{log.rotor_rpm}</div></div>
                    <div><div className="text-[9px] text-slate-400 uppercase">Air</div><div className="font-bold">{log.air_flow}</div></div>
                </div>

                <div className="flex justify-between text-slate-500 border-t border-dashed pt-2 px-1">
                    <span title="Inlet Temp"><Thermometer size={10} className="inline mr-1 text-blue-400"/>In: <b className="text-slate-700">{log.inlet_temp}</b></span>
                    <span title="Outlet Temp"><Thermometer size={10} className="inline mr-1 text-orange-400"/>Out: <b className="text-slate-700">{log.outlet_temp}</b></span>
                    <span title="FG Temp"><Thermometer size={10} className="inline mr-1 text-green-400"/>FG: <b className="text-slate-700">{log.fg_temp}</b></span>
                </div>

                {hasAdditive && (
                     <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 text-blue-800">
                        <div className="font-bold flex items-center gap-1 mb-1 text-[10px] uppercase tracking-wider"><Beaker size={10}/> Additive ({log.additive_code || '-'})</div>
                        <div className="flex justify-between font-mono text-xs"><span>Used: <b>{log.additive_weight_kg}</b> kg</span><span>Rate: {log.feed_rate_kg_h}</span></div>
                     </div>
                )}

                {hasWaste && (
                    <div className="bg-red-50 p-2 rounded-lg border border-red-100 text-red-800">
                        <div className="font-bold flex items-center gap-1 mb-1 text-[10px] uppercase tracking-wider"><AlertTriangle size={10}/> Waste / Loss</div>
                         <div className="grid grid-cols-3 gap-1 text-[10px] opacity-90">
                            {log.ovs_kg > 0 && <div>OVS: <b>{log.ovs_kg}</b></div>}
                            {log.waste_kg > 0 && <div>Waste: <b>{log.waste_kg}</b></div>}
                            {log.dust_kg > 0 && <div>Dust: <b>{log.dust_kg}</b></div>}
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(HistoryCardComponent, (prev, next) => {
    return prev.log.id === next.log.id && prev.type === next.type;
});