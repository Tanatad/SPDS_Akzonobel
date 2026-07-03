// app/dashboard/mill/components/MillWorkspace.tsx
import React, { useState, useEffect } from 'react';
import { useKepwareWebSocket } from '@/lib/hooks/useKepwareWebSocket';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { Factory, LogOut, Settings, Package, RefreshCw, Beaker, Trash2, Save, Loader2, Clock, CheckCircle, FileText, Send, UserMinus } from 'lucide-react';
import HistoryItem from './HistoryItem';

const InputRow = ({ label, register, name, unit, disabled = false, type="number" }: any) => (
    <div className="flex items-center justify-between mb-3 text-sm">
        <span className="text-slate-600 font-semibold w-1/3 text-xs uppercase tracking-wide">{label}</span>
        <div className="flex items-center w-2/3 relative">
            <input type={type} step={type === "number" ? "any" : undefined} {...register(name)} disabled={disabled} className={`w-full p-2.5 pl-3 pr-12 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 transition-all font-bold text-slate-700 text-right ${disabled ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}/>
            {unit && <span className="absolute right-3 text-slate-400 text-xs font-bold pointer-events-none bg-transparent select-none">{unit}</span>}
        </div>
    </div>
);

const MachineParam = ({ label, val, unit }: any) => (
    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col items-center justify-center gap-1 hover:border-blue-200 transition-colors">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
        <span className="text-lg font-mono font-bold text-slate-800">{val || '-'}</span>
        <span className="text-[10px] text-slate-400">{unit}</span>
    </div>
);

const ToggleCheck = ({ label, checked, onChange }: any) => (
    <div onClick={() => onChange(!checked)} className={`cursor-pointer flex items-center justify-between p-3 rounded-xl border transition-all ${checked ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
        <span className={`font-bold text-sm ${checked ? 'text-green-700' : 'text-slate-500'}`}>{label}</span>
        {checked ? <CheckCircle size={20} className="text-green-500"/> : <div className="w-5 h-5 rounded-full border-2 border-slate-300"></div>}
    </div>
);

const SectionTitle = ({ icon, title, color = "text-slate-700" }: any) => (
    <div className={`flex items-center gap-2 font-bold text-sm uppercase tracking-wide mb-4 border-b pb-2 ${color}`}>{icon} <span>{title}</span></div>
);

export default function MillWorkspace({ activeJob, millLine, isOwner, onFinish, onLeave, onSwitchLine, refetchActiveJob }: any) {
  const { isConnected } = useKepwareWebSocket('mill', millLine);
  const { data: liveData } = useQuery({
    queryKey: ['kepwareLive', 'mill', millLine],
    initialData: null as any,
    queryFn: () => null,
    staleTime: Infinity
  });




  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'SETUP' | 'PRODUCTION'>('SETUP');
  const [isOtherCode, setIsOtherCode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMachineReading, setIsMachineReading] = useState(false);
  const ADDITIVE_OPTIONS = ['131219', '150367'];

  const initialSetupForm = { setup_bin: '', setup_kg: '', start: '', stop: '', feeder: '', sep: '', rotor: '', air: '', inlet: '', outlet: '', fg_temp: '', sieve_size: '', chk_sieve: true, chk_ovs: true, ovs: '', waste: '', dust: '', ovs_mix: '', dust_mix: '', add_code: '131219', add_kg: '', add_a: '', add_b: '', feed_rate: '', rem_q: '', rem_m: '', rem_o: '' };
  const initialProdForm = { granule_bin_no: '', box_start: '', box_end: '', start: '', stop: '', feeder: '', sep: '', rotor: '', air: '', inlet: '', outlet: '', fg_temp: '', sieve_size: '', chk_sieve: true, chk_ovs: true, ovs: '', waste: '', dust: '', ovs_mix: '', dust_mix: '', add_code: '131219', add_kg: '', add_a: '', add_b: '', feed_rate: '', rem_q: '', rem_m: '', rem_o: '' };

  const formSetup = useForm({ defaultValues: initialSetupForm });
  const formProd = useForm({ defaultValues: initialProdForm });


  const fs = formSetup.watch();
  const fp = formProd.watch();
  const currentFormWatch = activeTab === 'SETUP' ? fs : fp;
  const reg = (activeTab === 'SETUP' ? formSetup.register : formProd.register) as any;
  const setVal = (activeTab === 'SETUP' ? formSetup.setValue : formProd.setValue) as any;

  useEffect(() => {
      if (activeJob) {
          if(activeJob.production_logs && activeJob.production_logs.length > 0) {
              const lastLog = activeJob.production_logs[0];
              formProd.reset({ ...initialProdForm, box_start: (lastLog.box_end + 1).toString(), sieve_size: lastLog.sieve_size, add_code: lastLog.additive_code || '131219' });
          } else if (activeJob.setup_logs && activeJob.setup_logs.length > 0) {
              const lastLog = activeJob.setup_logs[0];
              formProd.reset({ ...initialProdForm, box_start: '1', sieve_size: lastLog.sieve_size, add_code: lastLog.additive_code || '131219' });
          } else {
              formProd.reset({ ...initialProdForm, box_start: '1' });
          }
      }
  }, [activeJob, formProd]);

  const parseNum = (v: any) => parseFloat(v) || 0;
  

  const handleReadMachine = () => {
    setIsMachineReading(true);
    // Grab latest WS payload from React Query Cache directly
    const cachedData = queryClient.getQueryData(['kepwareLive', 'mill', millLine]) as any;

    if (cachedData) {
      const fmt = (v: any) => (v !== undefined && v !== null) ? Number(v).toFixed(2) : '';
      const setVal = activeTab === 'SETUP' ? (k: any, v: any) => formSetup.setValue(k, v) : (k: any, v: any) => formProd.setValue(k, v);

      setVal('feeder', fmt(cachedData.actual_mill_dosing));
      setVal('sep', fmt(cachedData.actual_mill_sep));
      setVal('rotor', fmt(cachedData.actual_mill_rotor));
      setVal('air', fmt(cachedData.actual_mill_air_flow));
      setVal('inlet', fmt(cachedData.actual_mill_temp_in));
      setVal('outlet', fmt(cachedData.actual_mill_temp_out));
    }
    setTimeout(() => setIsMachineReading(false), 500); // UI feedback
  };

  const setNow = (field: 'start' | 'stop') => {
      const now = new Date();
      const dt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setVal(field, dt);
  };


  const onSubmit = async (data: any) => {
      if (activeTab === 'PRODUCTION') {
          if (!data.granule_bin_no) return alert("โปรดระบุ ถังที่ / เลขถังบด");
          if (!data.box_start || !data.box_end) return alert("Please enter Box range");
          if (!data.start || !data.stop) return alert("Please enter Time");
      } else {
          if (!data.setup_bin) return alert("โปรดระบุ เลขถังเซ็ทอัพ");
          if (!data.setup_kg) return alert("Please enter Setup kg");
          if (!data.start || !data.stop) return alert("Please enter Time");
      }
      
      const basePayload = {
          job_id: activeJob.job_id,
          mill_line: millLine, 
          start_time: data.start, stop_time: data.stop,
          feeder_rpm: parseNum(data.feeder), separator_rpm: parseNum(data.sep), rotor_rpm: parseNum(data.rotor),
          air_flow: parseNum(data.air), inlet_temp: parseNum(data.inlet), outlet_temp: parseNum(data.outlet), fg_temp: parseNum(data.fg_temp),
          sieve_size: data.sieve_size, is_sieve_ok: data.chk_sieve, is_ovs_ok: data.chk_ovs,
          ovs_kg: parseNum(data.ovs), waste_kg: parseNum(data.waste), dust_kg: parseNum(data.dust),
          ovs_mix_kg: parseNum(data.ovs_mix), dust_mix_kg: parseNum(data.dust_mix),
          additive_code: data.add_code, additive_weight_kg: parseNum(data.add_kg),
          add_before_grind_a: parseNum(data.add_a), add_after_grind_b: parseNum(data.add_b),
          feed_rate_kg_h: parseNum(data.feed_rate),
          remarks: { quality: data.rem_q, machine: data.rem_m, other: data.rem_o }
      };

      let payload: any; let endpoint = '';
      if (activeTab === 'SETUP') {
          payload = { ...basePayload, setup_bin: data.setup_bin, setup_kg: parseNum(data.setup_kg) };
          endpoint = '/mill/log/setup';
      } else {
          payload = { ...basePayload, granule_bin_no: data.granule_bin_no, box_start: parseNum(data.box_start), box_end: parseNum(data.box_end) };
          endpoint = '/mill/log/production';
      }

      setIsSaving(true);
      try {
          await api.post(endpoint, payload);
          await refetchActiveJob(); 
          if (activeTab === 'SETUP') {
              formSetup.reset(initialSetupForm); 
          } else {
              const currData = formProd.getValues();
              formProd.reset({ 
                  ...initialProdForm, 
                  granule_bin_no: currData.granule_bin_no, 
                  box_start: (parseNum(data.box_end) + 1).toString(), 
                  sieve_size: currData.sieve_size, 
                  add_code: currData.add_code 
              }); 
          }
          setIsOtherCode(false);
      } catch (err: any) { alert("Save Failed."); }
      finally { setIsSaving(false); }
  };

  const handleDeleteLog = async (logId: any, type: string) => {
      if(!confirm("⚠️ Are you sure?")) return;
      try {
          await api.delete(type === 'SETUP' ? `/mill/log/setup/delete/${logId}` : `/mill/log/production/delete/${logId}`);
          await refetchActiveJob();
      } catch(err) { alert("Delete failed"); }
  }

  const boxCount = activeTab === 'PRODUCTION' ? (parseNum(fp.box_end) - parseNum(fp.box_start)) + 1 : 0;
  const currentWeight = boxCount > 0 ? boxCount * (activeJob?.box_weight || 20) : 0;
  const addDiff = parseNum(currentFormWatch.add_a) - parseNum(currentFormWatch.add_b);
  const currentHistory = activeJob ? (activeTab === 'SETUP' ? activeJob.setup_logs : activeJob.production_logs) || [] : [];
  const totalProduced = activeJob?.production_logs?.reduce((acc: any, cur: any) => acc + (cur.total_weight_kg || ((cur.box_end - cur.box_start + 1) * (activeJob?.box_weight || 20))), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 pb-20 bg-slate-50 min-h-screen animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200"><Factory className="text-purple-600" size={28} /></div>
              <div>
                  <h1 className="text-2xl font-bold text-slate-800">Mill Line {millLine}</h1>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span> 
                      {isOwner ? 'Main Line (Owner)' : 'Assisting Line (Joiner)'} • Box: <b>{activeJob.box_weight} kg</b>
                  </div>
              </div>
          </div>
          
          {/* ✅ 2. เพิ่ม print:hidden เพื่อไม่ให้ปุ่มไปโผล่ในกระดาษตอนปริ้นท์ */}
          <div className="flex gap-3 w-full md:w-auto print:hidden">
              
              {/* ✅ 3. ปุ่มกดเรียกคำสั่ง Print เบราว์เซอร์ */}

              <button 
                  onClick={isOwner ? onFinish : onLeave} 
                  className={`flex-1 md:flex-none text-white px-5 py-3 rounded-xl font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${isOwner ? 'bg-slate-800 hover:bg-slate-900' : 'bg-red-500 hover:bg-red-600'}`}
              >
                  {isOwner ? <><Send size={18}/> Finish PO</> : <><UserMinus size={18}/> Leave Job</>}
              </button>
              <button 
                  onClick={onSwitchLine} 
                  className="flex-1 md:flex-none bg-white text-slate-700 px-5 py-3 rounded-xl font-bold border border-slate-300 hover:bg-slate-100 shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                  <LogOut size={18}/> Switch Line
              </button>
          </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden mb-6 print:hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-4">
              <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-slate-200 text-2xl">
                      {activeJob.extruder_line === 0 ? 'M' : (activeJob.extruder_line || '-')}
                  </div>
                  <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Processing Job</div>
                      <div className="text-4xl font-black text-slate-800 tracking-tight">{activeJob.product_code}</div>
                      <div className="text-sm font-medium text-slate-500 mt-1">PO: {activeJob.po_no}</div>
                  </div>
              </div>
              <div className="flex items-center gap-8 bg-slate-50 px-8 py-4 rounded-2xl border border-slate-100">
                  <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target</div>
                      <div className="font-bold text-slate-700 text-xl">{activeJob.target_kg} <span className="text-sm font-medium text-slate-400">Kg</span></div>
                  </div>
                  <div className="h-10 w-px bg-slate-200"></div>
                  <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produced</div>
                      <div className="font-bold text-green-600 text-3xl">{totalProduced.toFixed(2)} <span className="text-lg font-medium text-green-600/70">Kg</span></div>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
          <div className="lg:col-span-8 space-y-6">
              <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex gap-1">
                  <button onClick={() => setActiveTab('SETUP')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'SETUP' ? 'bg-purple-50 text-purple-600 ring-1 ring-purple-200 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}><Settings size={18} /> Setup Log</button>
                  <button onClick={() => setActiveTab('PRODUCTION')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'PRODUCTION' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}><Package size={18} /> Production Log</button>
              </div>

              <form onSubmit={activeTab === 'SETUP' ? formSetup.handleSubmit(onSubmit) : formProd.handleSubmit(onSubmit)}>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <SectionTitle icon={activeTab === 'SETUP' ? <Settings size={20}/> : <Package size={20}/>} title={activeTab === 'SETUP' ? "Setup Record" : "Production Record"} />
                    
                    <div className="grid grid-cols-2 gap-6 mb-4">
                        {activeTab === 'SETUP' ? (
                             <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 flex flex-col justify-center space-y-4">
                                  <div><label className="text-xs font-bold text-purple-600 block mb-2 uppercase tracking-wider">เลขถังเซ็ทอัพ (Setup Bin)</label><input type="text" placeholder="เช่น 1/1" {...formSetup.register('setup_bin')} className="w-full p-3 text-center font-bold text-lg rounded-xl border border-purple-200 focus:ring-4 focus:ring-purple-100 outline-none bg-white text-slate-800"/></div>
                                  <div><label className="text-xs font-bold text-purple-600 block mb-2 uppercase tracking-wider">Setup Weight Input (Kg)</label><input type="number" step="any" placeholder="Setup Kg" {...formSetup.register('setup_kg')} className="w-full p-3 text-center font-bold text-xl rounded-xl border border-purple-200 focus:ring-4 focus:ring-purple-100 outline-none bg-white text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/></div>
                             </div>
                        ) : (
                             <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
                                  <div><label className="text-xs font-bold text-blue-600 block mb-2 uppercase tracking-wider">เลขถังบด / ถังที่ (Granule Bin No.)</label><input type="text" placeholder="เช่น ถังที่ 1" {...formProd.register('granule_bin_no')} className="w-full p-3 text-center font-bold text-lg rounded-xl border border-blue-200 focus:ring-4 focus:ring-blue-100 outline-none bg-white text-slate-800"/></div>
                                  <div>
                                      <label className="text-xs font-bold text-blue-600 block mb-2 uppercase tracking-wider">Box Range Input</label>
                                      <div className="flex items-center gap-3">
                                          <input type="number" step="any" placeholder="Start" {...formProd.register('box_start')} className="w-full p-3 text-center font-bold text-xl rounded-xl border border-blue-200 focus:ring-4 focus:ring-blue-100 outline-none bg-white text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/>
                                          <span className="text-blue-300 font-bold text-xl">-</span>
                                          <input type="number" step="any" placeholder="End" {...formProd.register('box_end')} className="w-full p-3 text-center font-bold text-xl rounded-xl border border-blue-200 focus:ring-4 focus:ring-blue-100 outline-none bg-white text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/>
                                      </div>
                                      <div className="text-center mt-3 text-sm text-blue-700 font-bold bg-white/50 py-2 rounded-xl border border-blue-100">Total: {boxCount > 0 ? boxCount : 0} Boxes = <span className="text-lg">{currentWeight}</span> kg</div>
                                  </div>
                             </div>
                        )}

                          <div className="space-y-4 py-2">
                              <div>
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">วันและเวลาที่เริ่ม (Start Date/Time)</span> 
                                  <div className="flex gap-2"><input type="datetime-local" {...reg('start')} className="w-full border rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-100"/><button type="button" onClick={()=>setNow('start')} className="bg-green-100 text-green-600 p-3 rounded-xl hover:bg-green-200 transition-colors"><Clock size={18}/></button></div>
                              </div>
                              <div>
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">วันและเวลาที่หยุด (Stop Date/Time)</span> 
                                  <div className="flex gap-2"><input type="datetime-local" {...reg('stop')} className="w-full border rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-100"/><button type="button" onClick={()=>setNow('stop')} className="bg-red-100 text-red-600 p-3 rounded-xl hover:bg-red-200 transition-colors"><Clock size={18}/></button></div>
                              </div>
                          </div>
                      </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
                    <div className="flex justify-between items-center mb-6">
                        <SectionTitle icon={<Settings size={20}/>} title="Machine & Quality" />
                        <button type="button" onClick={handleReadMachine} disabled={isMachineReading || !isConnected} className="text-xs font-bold bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl flex items-center transition-all active:scale-95 text-blue-700 border border-blue-200"><div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></div>{isMachineReading ? <RefreshCw className="animate-spin w-3.5 h-3.5 mr-2"/> : <RefreshCw className="w-3.5 h-3.5 mr-2"/>} Fetch Data</button>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
                        <MachineParam label="Feeder" val={currentFormWatch.feeder} unit="rpm"/>
                        <MachineParam label="Sep" val={currentFormWatch.sep} unit="rpm"/>
                        <MachineParam label="Rotor" val={currentFormWatch.rotor} unit="rpm"/>
                        <MachineParam label="Air" val={currentFormWatch.air} unit="m3"/>
                        <MachineParam label="Inlet" val={currentFormWatch.inlet} unit="°C"/>
                        <MachineParam label="Outlet" val={currentFormWatch.outlet} unit="°C"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3"><InputRow label="FG Temp" register={reg} name="fg_temp" unit="°C"/><InputRow label="Sieve/Mesh" register={reg} name="sieve_size" type="text"/></div>
                        <div className="flex flex-col gap-3 justify-center"><ToggleCheck label="ตะแกรงร่อน (Sieve Check OK)" checked={currentFormWatch.chk_sieve} onChange={(v:any)=>setVal('chk_sieve', v)} /><ToggleCheck label="OVS Check OK" checked={currentFormWatch.chk_ovs} onChange={(v:any)=>setVal('chk_ovs', v)} /></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100">
                            <SectionTitle icon={<Beaker size={18}/>} title="Flowing Additive" color="text-blue-600"/>
                            <div className="space-y-2 pt-2">
                                <div className="flex items-center justify-between mb-3 text-sm">
                                    <span className="text-slate-600 font-semibold w-1/3 text-xs uppercase tracking-wide">Code</span>
                                    <div className="w-2/3"><select value={isOtherCode ? 'Other' : (ADDITIVE_OPTIONS.includes(currentFormWatch.add_code) ? currentFormWatch.add_code : 'Other')} onChange={(e) => { const val = e.target.value; if (val === 'Other') { setIsOtherCode(true); setVal('add_code', ''); } else { setIsOtherCode(false); setVal('add_code', val); } }} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 font-bold text-slate-700 bg-white">{ADDITIVE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}<option value="Other">Other (Specify...)</option></select></div>
                                </div>
                                {isOtherCode && (<div className="animate-in fade-in slide-in-from-top-1 mb-3"><InputRow label="Custom Code" register={reg} name="add_code" type="text"/></div>)}
                                <InputRow label="Weight" register={reg} name="add_kg" unit="kg"/>
                                <div className="my-4 border-t border-blue-200/50 border-dashed"></div>
                                <InputRow label="Additive ก่อนบด Before (A)" register={reg} name="add_a" unit="kg"/>
                                <InputRow label="Additive หลังบด After (B)" register={reg} name="add_b" unit="kg"/>
                                <div className="flex justify-between text-sm font-bold text-blue-700 bg-blue-100/50 px-4 py-3 rounded-xl mb-4 mt-2"><span>Used (A-B)</span> <span>{addDiff.toFixed(2)} kg</span></div>
                                <InputRow label="อัตราการป้อน (Feed Rate)" register={reg} name="feed_rate" unit="kg/h"/>
                            </div>
                        </div>

                        <div className="bg-red-50/30 p-6 rounded-2xl border border-red-100">
                            <SectionTitle icon={<Trash2 size={18}/>} title="Waste & Loss" color="text-red-600"/>
                            <div className="space-y-2 pt-2">
                                <InputRow label="OVS" register={reg} name="ovs" unit="kg"/>
                                <InputRow label="Waste" register={reg} name="waste" unit="kg"/>
                                <InputRow label="Dust" register={reg} name="dust" unit="kg"/>
                                <div className="my-4 border-t border-red-200/50 border-dashed"></div>
                                <div className="text-xs font-bold text-red-400 mb-3 uppercase tracking-wide">Mixed Loss</div>
                                <InputRow label="Mix OVS" register={reg} name="ovs_mix" unit="kg"/>
                                <InputRow label="Mix Dust" register={reg} name="dust_mix" unit="kg"/>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <textarea placeholder="Quality Remark..." {...reg('rem_q')} className="border border-slate-200 p-4 rounded-xl text-sm h-24 w-full resize-none outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50/30 text-slate-800 placeholder:text-slate-400"/>
                        <textarea placeholder="Machine Remark..." {...reg('rem_m')} className="border border-slate-200 p-4 rounded-xl text-sm h-24 w-full resize-none outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50/30 text-slate-800 placeholder:text-slate-400"/>
                        <textarea placeholder="Other Remark..." {...reg('rem_o')} className="border border-slate-200 p-4 rounded-xl text-sm h-24 w-full resize-none outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50/30 text-slate-800 placeholder:text-slate-400"/>
                    </div>
                    <button type="submit" disabled={isSaving} className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2 ${activeTab === 'SETUP' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-200' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200'}`}>
                        {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="mr-1"/>} 
                        {isSaving ? 'Saving...' : `Save ${activeTab === 'SETUP' ? 'Setup' : 'Production'} Record`}
                    </button>
                </div>
              </form>
          </div>

          <div className="lg:col-span-4 print:hidden">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit sticky top-6">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2"><FileText className="text-slate-400" size={20}/> History Log</h3>
                      <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-md font-bold">{currentHistory.length} Records</span>
                  </div>
                  <div className="space-y-3 max-h-[800px] overflow-y-auto pr-1 custom-scrollbar">
                      {currentHistory.length === 0 ? (
                          <div className="text-center py-12">
                              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"><FileText className="text-slate-300" size={32}/></div>
                              <p className="text-slate-400 font-medium">No records yet.</p>
                          </div>
                      ) : (
                          <div>
                              {currentHistory.map((log: any, idx: number) => (
                                  <HistoryItem key={log.id || idx} log={log} jobWeight={activeJob.box_weight} onDelete={handleDeleteLog} type={activeTab} />
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
      <div className="text-center text-xs text-slate-400 mt-12 pb-8 font-medium tracking-wide print:hidden">AkzoNobel Production System v1.2</div>
      
      {/* ✅ 4. นำคอมโพเนนต์ฟอร์มไปแฝงไว้ท้ายสุดของหน้าจอ (จะโชว์เฉพาะตอน Print เท่านั้น) */}
    </div>
  );
}