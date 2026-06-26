// app/dashboard/extruder/components/ExtruderWorkspace.tsx
import { useState, useEffect } from 'react';
import { useKepwareWebSocket } from '@/lib/hooks/useKepwareWebSocket';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { 
  Thermometer, Settings, Factory, RefreshCw, Activity, 
  Clock, Square, Zap, Cpu, Droplets, LogOut, Plus, FileText, CheckCircle, Loader2
} from 'lucide-react';
import { AUTO_FLOW_MACHINES, calcDurationMin, parseNum } from '../utils';
import HistoryItem from './HistoryItem';

// --- UI Helpers ---
const ParamRow = ({ label, unit, actValue, icon: Icon, register, name }: any) => (
  <div className="grid grid-cols-12 gap-4 items-center py-3 border-b border-slate-200 text-sm last:border-0 hover:bg-slate-50 px-4">
      <div className="col-span-4 font-bold text-slate-800 flex items-center gap-3">
          {Icon && <div className="p-1.5 bg-slate-200 rounded-lg text-slate-600"><Icon size={16}/></div>}
          <span>{label}</span>
      </div>
      <div className="col-span-4">
          <input 
              type="number" 
              step="any"
              placeholder="Std" 
              {...register(name)} 
              className="w-full py-1.5 px-3 border border-slate-300 rounded-lg text-center text-blue-700 font-bold bg-white focus:ring-2 focus:ring-blue-200 outline-none text-sm placeholder:text-slate-400"
          />
      </div>
      <div className="col-span-3 text-center">
          <span className={`inline-block min-w-[3.5rem] py-1 px-2 rounded-md font-mono font-bold text-sm ${actValue !== null && actValue !== undefined && actValue !== '' ? 'bg-slate-100 text-slate-800 border border-slate-300' : 'text-slate-400'}`}>
              {actValue || '-'}
          </span>
      </div>
      <div className="col-span-1 text-xs text-slate-500 font-bold text-right">{unit}</div>
  </div>
);

const RemarksSection = ({ register }: any) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <textarea {...register('rem_q')} placeholder="หมายเหตุคุณภาพ (Quality)..." className="border border-slate-300 p-3 rounded-xl text-sm h-20 w-full resize-none focus:ring-2 outline-none bg-slate-50 placeholder:text-slate-500 text-slate-800 font-medium"/>
        <textarea {...register('rem_m')} placeholder="หมายเหตุเครื่องจักร (Machine)..." className="border border-slate-300 p-3 rounded-xl text-sm h-20 w-full resize-none focus:ring-2 outline-none bg-slate-50 placeholder:text-slate-500 text-slate-800 font-medium"/>
        <textarea {...register('rem_o')} placeholder="หมายเหตุอื่นๆ (Other)..." className="border border-slate-300 p-3 rounded-xl text-sm h-20 w-full resize-none focus:ring-2 outline-none bg-slate-50 placeholder:text-slate-500 text-slate-800 font-medium"/>
    </div>
);

const QcCheckbox = ({ label, checked, onChange }: any) => (
    <label className={`flex items-center space-x-2 cursor-pointer select-none border px-3 py-2 rounded-lg transition-all ${checked ? 'bg-green-50 border-green-300 shadow-sm' : 'bg-white border-slate-300 hover:bg-slate-50'}`}>
        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${checked ? 'bg-green-600 border-green-600' : 'bg-white border-slate-400'}`}>{checked && <CheckCircle size={14} className="text-white"/>}</div>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="hidden"/>
        <span className={`text-sm font-bold ${checked ? 'text-green-800' : 'text-slate-700'}`}>{label}</span>
    </label>
);

// --- Main Component ---
export default function ExtruderWorkspace({ activeJob, selectedLine, logs, setLogs }: any) {
  useKepwareWebSocket('extruder', selectedLine);
  const { data: liveData } = useQuery({
    queryKey: ['kepwareLive', 'extruder', selectedLine],
    initialData: null as any,
    queryFn: () => null,
    staleTime: Infinity
  });


  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'WARMUP' | 'SETUP' | 'PRODUCTION'>('WARMUP');
  const [loading, setLoading] = useState(false); 
  const [isSaving, setIsSaving] = useState(false);

  const defaultWarmup = { start: '', stop: '', remark: '', ht1: '', ht2: '', ht3: '', ht4: '', ht5: '' };
  
  // ✅ สร้าง Default แยกกัน เพื่อไม่ให้ข้อมูลกวนกัน
  const defaultSetup = { bin: '', kg: '', start: '', stop: '', screw: '', torque: '', side: '', outlet: '', flow: '', w_temp: '', ht1: '', ht2: '', ht3: '', ht4: '', ht5: '', act_screw: '', act_torque: '', act_side: '', act_ht1: '', act_ht2: '', act_ht3: '', act_ht4: '', act_ht5: '', first: '', purge: '', qc_color: true, qc_shade: true, qc_disp: true, rem_q: '', rem_m: '', rem_o: '' };
  const defaultProd = { bin: '', pots: '', start: '', stop: '', screw: '', torque: '', side: '', outlet: '', flow: '', w_temp: '', ht1: '', ht2: '', ht3: '', ht4: '', ht5: '', act_screw: '', act_torque: '', act_side: '', act_ht1: '', act_ht2: '', act_ht3: '', act_ht4: '', act_ht5: '', first: '', purge: '', qc_color: true, qc_shade: true, qc_disp: true, rem_q: '', rem_m: '', rem_o: '' };

  const formWarmup = useForm({ defaultValues: defaultWarmup });
  const formSetup = useForm({ defaultValues: defaultSetup });
  const formProd = useForm({ defaultValues: defaultProd });


  // ดึง watch มาใช้ตาม Tab
  const fSetup = formSetup.watch();
  const fProd = formProd.watch();
  const activeFormWatch = activeTab === 'SETUP' ? fSetup : fProd;

  // เลือกว่าจะใช้ register ของฟอร์มไหน
  const reg = (activeTab === 'SETUP' ? formSetup.register : activeTab === 'PRODUCTION' ? formProd.register : formWarmup.register) as any;
  const setVal = (activeTab === 'SETUP' ? formSetup.setValue : activeTab === 'PRODUCTION' ? formProd.setValue : formWarmup.setValue) as any;


  const handleReadMachine = () => {
    setLoading(true);
    // Grab latest WS payload from React Query Cache directly
    const cachedData = queryClient.getQueryData(['kepwareLive', 'extruder', selectedLine]) as any;

    if (cachedData) {
      const fmt = (v: any) => (v !== undefined && v !== null) ? Number(v).toFixed(2) : '';

      if (activeTab === 'WARMUP') {
        formWarmup.setValue('ht1', fmt(cachedData.actual_ht1));
        formWarmup.setValue('ht2', fmt(cachedData.actual_ht2));
        formWarmup.setValue('ht3', fmt(cachedData.actual_ht3));
        formWarmup.setValue('ht4', fmt(cachedData.actual_ht4));
        formWarmup.setValue('ht5', fmt(cachedData.actual_ht5));
      } else {
        const setVal = activeTab === 'SETUP' ? (k: any, v: any) => formSetup.setValue(k, v) : (k: any, v: any) => formProd.setValue(k, v);
        setVal('act_screw', fmt(cachedData.actual_screw_rpm));
        setVal('act_torque', fmt(cachedData.actual_torque_pct));
        setVal('act_side', fmt(cachedData.actual_side_feed_pct));
        setVal('act_ht1', fmt(cachedData.actual_ht1));
        setVal('act_ht2', fmt(cachedData.actual_ht2));
        setVal('act_ht3', fmt(cachedData.actual_ht3));
        setVal('act_ht4', fmt(cachedData.actual_ht4));
        setVal('act_ht5', fmt(cachedData.actual_ht5));
        setVal('w_temp', fmt(cachedData.barrel_water_temp));
        if (AUTO_FLOW_MACHINES.includes(selectedLine)) setVal('flow', fmt(cachedData.barrel_water_flow));

        // Auto-fill standard values if empty
        const p = activeTab === 'SETUP' ? formSetup.getValues() : formProd.getValues();
        if (!p.screw) setVal('screw', fmt(cachedData.std_screw_rpm));
        if (!p.side) setVal('side', fmt(cachedData.std_side_feed_pct));
        if (!p.ht1) setVal('ht1', fmt(cachedData.std_ht1));
        if (!p.ht2) setVal('ht2', fmt(cachedData.std_ht2));
        if (!p.ht3) setVal('ht3', fmt(cachedData.std_ht3));
        if (!p.ht4) setVal('ht4', fmt(cachedData.std_ht4));
        if (!p.ht5) setVal('ht5', fmt(cachedData.std_ht5));
      }
    }
    setTimeout(() => setLoading(false), 500); // UI feedback
  };

  const handleSetNow = (field: 'start' | 'stop') => {
    const now = new Date();
    const dt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setVal(field, dt);
  };


  const onSubmit = async (data: any) => {
    if (activeTab === 'WARMUP' && (!data.start || !data.stop)) return alert("Please enter time.");
    if (activeTab === 'SETUP' && (!data.kg || !data.start || !data.stop)) return alert("Enter Setup kg & Time");
    if (activeTab === 'PRODUCTION' && (!data.bin || !data.pots || !data.start || !data.stop)) return alert("Enter Bin, Pots & Time");

    let payload: any = { 
        job_id: activeJob.job_id,
        extruder_line: selectedLine, 
        start_time: data.start, 
        stop_time: data.stop, 
        duration_min: calcDurationMin(data.start, data.stop) 
    };
    
    let endpoint = '';

    if (activeTab === 'WARMUP') {
        payload = { ...payload, remark: data.remark, act_ht1: parseNum(data.ht1), act_ht2: parseNum(data.ht2), act_ht3: parseNum(data.ht3), act_ht4: parseNum(data.ht4), act_ht5: parseNum(data.ht5) };
        endpoint = '/process/log/warmup';
    } else {
        payload = { ...payload, std_screw_rpm: parseNum(data.screw), act_screw_rpm: parseNum(data.act_screw), std_torque_pct: parseNum(data.torque), act_torque_pct: parseNum(data.act_torque), std_side_feed_pct: parseNum(data.side), act_side_feed_pct: parseNum(data.act_side), act_outlet_temp: parseNum(data.outlet), std_ht1: parseNum(data.ht1), act_ht1: parseNum(data.act_ht1), std_ht2: parseNum(data.ht2), act_ht2: parseNum(data.act_ht2), std_ht3: parseNum(data.ht3), act_ht3: parseNum(data.act_ht3), std_ht4: parseNum(data.ht4), act_ht4: parseNum(data.act_ht4), std_ht5: parseNum(data.ht5), act_ht5: parseNum(data.act_ht5), barrel_water_flow: parseNum(data.flow), barrel_water_temp: parseNum(data.w_temp), first_lot_kg: parseNum(data.first), purge_resin_kg: parseNum(data.purge), is_color_ok: data.qc_color, is_shade_ok: data.qc_shade, is_dispersion_ok: data.qc_disp, remark_quality: data.rem_q, remark_machine: data.rem_m, remark_other: data.rem_o };
        
        if (activeTab === 'SETUP') {
            payload = { ...payload, setup_bin: data.bin, setup_kg: parseNum(data.kg) };
            endpoint = '/process/log/setup';
        } else {
            payload = { ...payload, granule_bin_no: data.bin, pot_qty: parseNum(data.pots) };
            endpoint = '/process/log/production';
        }
    }

    setIsSaving(true);
    try {
        await api.post(endpoint, payload);
        await setLogs(); 

        // ✅ ล้างฟอร์มให้สะอาด! (เหลือไว้แค่ Bin)
        if (activeTab === 'WARMUP') {
            formWarmup.reset();
        } else if (activeTab === 'SETUP') {
            formSetup.reset({ ...defaultSetup, bin: data.bin });
        } else {
            formProd.reset({ ...defaultProd, bin: data.bin });
        }

    } catch (error: any) { alert(`Save Error: ${error.message}`); } 
    finally { setIsSaving(false); }
  };

  const handleDeleteLog = async (logId: any, type: string) => {
      if (!confirm("⚠️ Are you sure you want to DELETE this record?")) return;
      try {
          const endpoint = type === 'WARMUP' ? `/process/log/warmup/delete/${logId}` : type === 'SETUP' ? `/process/log/setup/delete/${logId}` : `/process/log/production/delete/${logId}`;
          await api.delete(endpoint);
          await setLogs();
      } catch(err) { alert("Delete failed."); }
  };

  const currentLogs = activeTab === 'WARMUP' ? logs.warmups : activeTab === 'SETUP' ? logs.setups : logs.prods;
  const totalProdPots = logs.prods.reduce((acc: any, cur: any) => acc + (cur.pot_qty || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-xl">{activeJob.extruder_line}</div>
                    <div>
                        <div className="text-sm font-bold text-slate-500 uppercase">Processing Job</div>
                        <div className="text-3xl font-bold text-slate-800 tracking-tight">{activeJob.product_code}</div>
                        <div className="text-base font-bold text-slate-600 mt-0.5">PO: {activeJob.po_no}</div>
                    </div>
                </div>
                <div className="flex items-center gap-8 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200">
                    <div className="text-right"><div className="text-xs font-bold text-slate-500 uppercase">Target</div><div className="font-bold text-slate-800 text-xl">{activeJob.target_pots} <span className="text-sm font-bold text-slate-500">Pots</span></div></div>
                    <div className="h-10 w-px bg-slate-300"></div>
                    <div className="text-right"><div className="text-xs font-bold text-slate-500 uppercase">Produced</div><div className="font-bold text-green-600 text-3xl">{totalProdPots} <span className="text-base font-bold text-green-600/70">Pots</span></div></div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
                <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-300 flex gap-1">
                    <button onClick={() => setActiveTab('WARMUP')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${activeTab === 'WARMUP' ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' : 'text-slate-600 hover:bg-slate-100'}`}><Thermometer size={18} /> Warm Up</button>
                    <button onClick={() => setActiveTab('SETUP')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${activeTab === 'SETUP' ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-300' : 'text-slate-600 hover:bg-slate-100'}`}><Settings size={18} /> Setup</button>
                    <button onClick={() => setActiveTab('PRODUCTION')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${activeTab === 'PRODUCTION' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' : 'text-slate-600 hover:bg-slate-100'}`}><Factory size={18} /> Production</button>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xl">
                            {activeTab === 'WARMUP' ? <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600"><Thermometer size={24}/></div> : activeTab === 'SETUP' ? <div className="p-1.5 bg-purple-100 rounded-lg text-purple-600"><Settings size={24}/></div> : <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><Factory size={24}/></div>}
                            {activeTab === 'WARMUP' ? 'Warm Up Data' : activeTab === 'SETUP' ? 'Setup Parameters' : 'Production Log'}
                        </h3>
                        <button type="button" onClick={handleReadMachine} disabled={loading || !liveData} className="text-sm font-bold bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2.5 rounded-xl flex items-center hover:bg-blue-100 active:scale-95 transition-all"><div className={`w-2.5 h-2.5 rounded-full mr-2 ${liveData ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></div>{loading ? <RefreshCw className="animate-spin w-4 h-4 mr-2"/> : <Activity className="w-4 h-4 mr-2"/>} Fetch Data</button>
                    </div>

                    {/* ✅ เลือกว่าจะใช้ handleSubmit ของฟอร์มไหน */}
                    <form onSubmit={activeTab === 'WARMUP' ? formWarmup.handleSubmit(onSubmit) : activeTab === 'SETUP' ? formSetup.handleSubmit(onSubmit) : formProd.handleSubmit(onSubmit)}>
                        {activeTab === 'WARMUP' ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50/50 rounded-2xl border border-orange-200">
                                    <div><label className="text-sm font-bold text-orange-900 block mb-1">วันและเวลาที่เริ่ม (Start Date/Time)</label><div className="flex gap-2"><input type="datetime-local" {...reg('start')} className="w-full p-2.5 border border-orange-300 rounded-lg text-slate-800 font-bold"/><button type="button" onClick={() => handleSetNow('start')} className="bg-orange-200 p-2.5 rounded-lg text-orange-800 hover:bg-orange-300"><Clock size={20}/></button></div></div>
                                    <div><label className="text-sm font-bold text-orange-900 block mb-1">วันและเวลาที่หยุด (Stop Date/Time)</label><div className="flex gap-2"><input type="datetime-local" {...reg('stop')} className="w-full p-2.5 border border-orange-300 rounded-lg text-slate-800 font-bold"/><button type="button" onClick={() => handleSetNow('stop')} className="bg-orange-200 p-2.5 rounded-lg text-orange-800 hover:bg-orange-300"><Square size={20}/></button></div></div>
                                </div>
                                <div className="grid grid-cols-5 gap-3">
                                    {[1,2,3,4,5].map(i => <div key={i}><label className="text-xs font-bold text-slate-500 block mb-1 text-center">HT{i}</label><input type="number" step="any" {...reg(`ht${i}`)} className="w-full p-2.5 border border-slate-300 rounded-lg text-center font-bold text-slate-800" /></div>)}
                                </div>
                                <textarea {...reg('remark')} placeholder="Remarks..." className="w-full p-4 border border-slate-300 rounded-xl h-24 text-slate-800 font-medium placeholder:text-slate-500" />
                                <button type="submit" disabled={isSaving} className="w-full flex justify-center items-center bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-70 disabled:cursor-not-allowed">
                                    {isSaving ? <><Loader2 className="animate-spin w-5 h-5 mr-2" /> Saving...</> : "Save Warm Up"}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className={`grid grid-cols-2 gap-4 p-4 rounded-2xl border border-slate-200 ${activeTab === 'SETUP' ? 'bg-purple-50/50' : 'bg-blue-50/50'}`}>
                                    <div><label className="text-sm font-bold block mb-1 text-slate-800">เลขถังกรานูล (Granule Bin No.)</label><input type="text" {...reg('bin')} className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 font-bold"/></div>
                                    <div><label className="text-sm font-bold block mb-1 text-slate-800">{activeTab==='SETUP'?'ปริมาณกรานูลเซ็ทอัพ (Setup Mass (kg))':'ปริมาณกรานูลที่เหลือ (Pot Quantity)'}</label><input type="number" step="any" {...reg(activeTab === 'SETUP' ? 'kg' : 'pots')} className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 font-bold"/></div>
                                    <div><label className="text-sm font-bold block mb-1 text-slate-800">วันและเวลาที่เริ่ม (Start Date/Time)</label><div className="flex gap-2"><input type="datetime-local" {...reg('start')} className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 font-bold"/><button type="button" onClick={() => handleSetNow('start')} className="bg-white border border-slate-300 p-2.5 rounded-lg text-slate-700 hover:bg-slate-100"><Clock size={20}/></button></div></div>
                                    <div><label className="text-sm font-bold block mb-1 text-slate-800">วันและเวลาที่หยุด (Stop Date/Time)</label><div className="flex gap-2"><input type="datetime-local" {...reg('stop')} className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 font-bold"/><button type="button" onClick={() => handleSetNow('stop')} className="bg-white border border-slate-300 p-2.5 rounded-lg text-slate-700 hover:bg-slate-100"><Square size={20}/></button></div></div>
                                </div>

                                <div className="bg-white border border-slate-300 rounded-xl overflow-hidden">
                                    <ParamRow icon={Activity} label="Screw Speed" unit="RPM" register={reg} name="screw" actValue={activeFormWatch.act_screw}/>
                                    <ParamRow icon={Zap} label="Torque" unit="%" register={reg} name="torque" actValue={activeFormWatch.act_torque}/>
                                    <ParamRow icon={Cpu} label="Side Feed" unit="%" register={reg} name="side" actValue={activeFormWatch.act_side}/>
                                    <div className="h-px bg-slate-200 my-0"></div>
                                    {[1,2,3,4,5].map(i => <ParamRow key={i} icon={Thermometer} label={`Zone HT${i}`} unit="°C" register={reg} name={`ht${i}`} actValue={(activeFormWatch as any)[`act_ht${i}`]}/>)}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200"><h4 className="text-sm font-bold text-blue-700 mb-3">Cooling System</h4>
                                        <div className="space-y-3">
                                            <div><label className="text-xs font-bold text-slate-600">Outlet Temp (°C)</label><input type="number" step="any" {...reg('outlet')} className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 font-bold"/></div>
                                            <div><label className="text-xs font-bold text-slate-600">Water Flow (%)</label><input type="number" step="any" {...reg('flow')} className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 font-bold" disabled={AUTO_FLOW_MACHINES.includes(selectedLine)}/></div>
                                            <div><label className="text-xs font-bold text-slate-600">Water Temp (°C)</label><div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-bold text-sm">{activeFormWatch.w_temp || '-'}</div></div>
                                        </div>
                                    </div>
                                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-200"><h4 className="text-sm font-bold text-red-700 mb-3">Output</h4>
                                        <div className="space-y-3">
                                            <div><label className="text-xs font-bold text-slate-600">ปริมาณเก็บสีช่วงแรก (Init Paint (kg))</label><input type="number" step="any" {...reg('first')} className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 font-bold"/></div>
                                            <div><label className="text-xs font-bold text-slate-600">ปริมาณเรซิ่นหยุดเครื่อง (Shutdown Resin (kg))</label><input type="number" step="any" {...reg('purge')} className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 font-bold"/></div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex gap-4 mb-4">
                                        <QcCheckbox label="สีขาดช่วง (Paint Interruption OK)" checked={activeFormWatch.qc_color} onChange={(v:any) => setVal('qc_color', v)}/>
                                        <QcCheckbox label="การเทียบเฉด (Color Matching OK)" checked={activeFormWatch.qc_shade} onChange={(v:any) => setVal('qc_shade', v)}/>
                                        <QcCheckbox label="กระจายผสม (Reworking OK)" checked={activeFormWatch.qc_disp} onChange={(v:any) => setVal('qc_disp', v)}/>
                                    </div>
                                    <RemarksSection register={reg} />
                                    <button type="submit" disabled={isSaving} className={`mt-6 w-full text-white py-4 rounded-xl font-bold text-lg flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed ${activeTab === 'SETUP' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                        {isSaving ? <><Loader2 className="animate-spin w-5 h-5 mr-2"/> Saving...</> : <><Plus className="w-5 h-5 mr-2 inline"/> Save Record</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* History Section */}
            <div className="lg:col-span-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-300 sticky top-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 text-lg"><FileText className="inline text-slate-500 mr-1" size={22}/> History Log</h3>
                        <span className="bg-slate-200 text-slate-700 text-xs px-2 py-1 rounded-md font-bold">{currentLogs.length} Records</span>
                    </div>
                    <div className="space-y-3 max-h-[800px] overflow-y-auto">
                        {currentLogs.slice().reverse().map((l:any, idx:number) => <HistoryItem key={`${l.id}-${idx}`} data={l} type={activeTab} onDelete={handleDeleteLog} />)}
                        {currentLogs.length === 0 && <div className="text-center py-10 text-slate-500 font-medium text-sm">No records yet.</div>}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}