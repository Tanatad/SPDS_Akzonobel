// app/dashboard/extruder/components/HistoryItem.tsx
import React, { useState } from 'react';
import { Flame, Settings, Package, Loader2, Clock, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { calcDurationMin } from '../utils';

interface Props {
  data: any;
  type: string;
  onDelete: (id: any, type: string) => void;
}

const HistoryItem = ({ data, type, onDelete }: Props) => {
  const [open, setOpen] = useState(false);

  const formatTime = (iso: string) => {
      if (!iso) return '-';
      if (iso.includes('-') && iso.includes('T')) {
          try {
              const d = new Date(iso);
              if (!isNaN(d.getTime())) return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          } catch { }
      }
      return iso.includes('T') ? iso.split('T')[1].substring(0, 5) : iso.substring(0, 5);
  };
  
  const formatNum = (v: any) => (v === null || v === undefined || v === '') ? '-' : (isNaN(Number(v)) ? '-' : Number(v).toFixed(2));
  
  const duration = data.duration_min !== undefined ? data.duration_min : calcDurationMin(data.start_time, data.stop_time);
  const isSaving = typeof data.id === 'string' && data.id.startsWith('temp-');

  const { label, icon, themeClass } = type === 'WARMUP' 
    ? { label: 'Warm Up Record', icon: <Flame size={18}/>, themeClass: "bg-orange-100 text-orange-700 border-orange-300" }
    : type === 'SETUP'
    ? { label: `Setup (${data.setup_bin ?? '-'}): ${formatNum(data.setup_kg)} kg`, icon: <Settings size={18}/>, themeClass: "bg-purple-100 text-purple-700 border-purple-300" }
    : { label: `Bin: ${data.granule_bin_no ?? '-'} (${data.pot_qty ?? 0} pots)`, icon: <Package size={18}/>, themeClass: "bg-blue-100 text-blue-700 border-blue-300" };

  return (
      <div className={`border border-slate-300 rounded-xl bg-white overflow-hidden mb-2 shadow-sm transition-all group ${isSaving ? 'opacity-70' : 'hover:shadow-md'}`}>
          <div onClick={() => setOpen(!open)} className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50 select-none">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${themeClass}`}>{icon}</div>
                  <div>
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          {label} 
                          {/* ✅ เพิ่มป้ายบอกเบอร์เครื่องตรงนี้ */}
                          <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-[10px] font-black tracking-wider">
                              L{data.extruder_line || '-'}
                          </span>
                          {isSaving && <span className="text-xs text-blue-600 flex items-center bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200"><Loader2 size={12} className="animate-spin mr-1"/> Saving...</span>}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 font-bold">
                         <Clock size={12}/> {formatTime(data.start_time)} - {formatTime(data.stop_time)} 
                         <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 ml-1">{duration} min</span>
                      </div>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  {!isSaving && <button onClick={(e) => { e.stopPropagation(); onDelete(data.id, type); }} className="text-slate-500 hover:text-red-600 p-1.5 rounded opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>}
                  {open ? <ChevronUp size={18} className="text-slate-500"/> : <ChevronDown size={18} className="text-slate-400"/>}
              </div>
          </div>
          
          {open && (
              <div className="px-3 pb-3 border-t border-slate-200 bg-slate-50/50 text-sm animate-in slide-in-from-top-1">
                  <div className="pt-3 space-y-3">
                    {type === 'WARMUP' ? (
                        <div className="grid grid-cols-5 gap-2 text-center">
                            {[1,2,3,4,5].map(i => <div key={i} className="bg-white border border-slate-300 p-1.5 rounded-lg shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase">HT{i}</div><b className="text-slate-800 text-base">{formatNum(data[`act_ht${i}`])}</b></div>)}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase">Screw</div><b className="text-slate-800">{formatNum(data.act_screw_rpm)}</b></div>
                                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase">Torque</div><b className="text-slate-800">{formatNum(data.act_torque_pct)}</b></div>
                                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase">Side Feed</div><b className="text-slate-800">{formatNum(data.act_side_feed_pct)}</b></div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase">Outlet</div><b className="text-slate-800">{formatNum(data.act_outlet_temp)}</b> <span className="text-xs font-bold text-slate-400">°C</span></div>
                                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase">Water Flow</div><b className="text-slate-800">{formatNum(data.barrel_water_flow)}</b> <span className="text-xs font-bold text-slate-400">%</span></div>
                                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase">Water Temp</div><b className="text-slate-800">{formatNum(data.barrel_water_temp)}</b> <span className="text-xs font-bold text-slate-400">°C</span></div>
                            </div>
                            <div className="flex justify-between bg-white p-2 rounded border border-slate-300 shadow-sm">
                                {[1,2,3,4,5].map(i => (
                                    <div key={i} className="text-center w-full border-r last:border-0 border-slate-200">
                                        <div className="text-[10px] font-bold text-slate-500">HT{i}</div>
                                        <div className="font-bold text-slate-800">{formatNum(data[`act_ht${i}`])}</div>
                                    </div>
                                ))}
                            </div>
                            {(data.first_lot_kg > 0 || data.purge_resin_kg > 0) && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex justify-between text-xs font-bold">
                                    <span className="text-red-700">Init Paint: <b className="text-red-900">{formatNum(data.first_lot_kg)}</b></span>
                                    <span className="text-red-700">Shutdown Resin: <b className="text-red-900">{formatNum(data.purge_resin_kg)}</b></span>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <span className={`flex-1 text-center py-1.5 rounded text-xs font-bold border ${data.is_color_ok ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>Interrupt: {data.is_color_ok ? 'OK' : 'NG'}</span>
                                <span className={`flex-1 text-center py-1.5 rounded text-xs font-bold border ${data.is_shade_ok ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>Match: {data.is_shade_ok ? 'OK' : 'NG'}</span>
                                <span className={`flex-1 text-center py-1.5 rounded text-xs font-bold border ${data.is_dispersion_ok ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>Reworking: {data.is_dispersion_ok ? 'OK' : 'NG'}</span>
                            </div>
                        </>
                    )}
                    {(data.remark || data.remark_quality || data.remark_machine || data.remark_other) && (
                        <div className="text-slate-600 italic bg-slate-100 p-3 rounded-lg border border-slate-300 text-xs font-medium">
                            {data.remark && <div><span className="font-bold not-italic text-slate-700">Gen:</span> {data.remark}</div>}
                            {data.remark_quality && <div><span className="font-bold not-italic text-blue-700">Q:</span> {data.remark_quality}</div>}
                            {data.remark_machine && <div><span className="font-bold not-italic text-orange-700">M:</span> {data.remark_machine}</div>}
                            {data.remark_other && <div><span className="font-bold not-italic text-purple-700">O:</span> {data.remark_other}</div>}
                        </div>
                    )}
                  </div>
              </div>
          )}
      </div>
  );
};

export default React.memo(HistoryItem, (prevProps, nextProps) => {
  return prevProps.data.id === nextProps.data.id && prevProps.type === nextProps.type;
});