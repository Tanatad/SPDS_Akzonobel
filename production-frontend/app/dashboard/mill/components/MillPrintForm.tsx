// app/dashboard/mill/components/MillPrintForm.tsx
import React from 'react';

export default function MillPrintForm({ jobData }: any) {
    if (!jobData) return null;

    // 1. ดึงข้อมูล Setup และ Production มา
    const rawSetupLogs = jobData.setup_logs || [];
    const rawProdLogs = jobData.mill_production_logs || jobData.production_logs || [];

    // 2. รวมข้อมูลเข้าด้วยกัน ตั้งค่าตัวแปร `display_bin` และจัดกลุ่มประเภท
    const combinedLogs = [
        ...rawSetupLogs.map((l: any) => ({ ...l, _type: 'SETUP', display_bin: l.setup_bin })),
        ...rawProdLogs.map((l: any) => ({ ...l, _type: 'PRODUCTION', display_bin: l.granule_bin_no }))
    ];

    // 3. เรียงลำดับจากเก่าไปใหม่ (ตามเวลา Start Time)
    combinedLogs.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const logs = combinedLogs;
    const maxColumns = 10; 
    
    const logChunks: any[][] = [];
    if (logs.length === 0) {
        logChunks.push(Array.from({ length: maxColumns }, () => null));
    } else {
        for (let i = 0; i < logs.length; i += maxColumns) {
            const chunk = logs.slice(i, i + maxColumns);
            while (chunk.length < maxColumns) {
                chunk.push(null);
            }
            logChunks.push(chunk);
        }
    }

    const formatTime = (dateTimeStr: string) => {
        if (!dateTimeStr) return '';
        const d = new Date(dateTimeStr);
        return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatDate = (dateTimeStr: string) => {
        if (!dateTimeStr) return '';
        const d = new Date(dateTimeStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    const getSetupValue = (mainField: string, logField: string) => {
        if (jobData[mainField] !== undefined && jobData[mainField] !== null) {
            return jobData[mainField];
        }
        if (jobData.setup_logs && jobData.setup_logs.length > 0) {
            const val = jobData.setup_logs[0][logField];
            if (val !== undefined && val !== null) return val;
        }
        return '-';
    };

    return (
        <div id="mill-print-section" className="hidden print:block w-full bg-white text-black font-sans text-[14px] leading-tight">
            
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { size: A4 portrait; margin: 5mm; }
                    
                    body { visibility: hidden; background: white !important; }
                    body *:not(:has(#mill-print-section)):not(#mill-print-section):not(#mill-print-section *) {
                        display: none !important;
                        height: 0 !important;
                    }
                    html, body { height: auto !important; min-height: 100vh; }
                    
                    #mill-print-section, #mill-print-section * { 
                        visibility: visible; 
                        font-family: "Cordia New", "CordiaUPC", sans-serif !important;
                    }
                    
                    #mill-print-section {
                        position: relative;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                    }
                    .print-table { border-collapse: collapse; width: 100%; }
                    /* ปรับ Padding ให้อยู่ระดับกลางๆ ไม่เล็กไปไม่ใหญ่ไป */
                    .print-table th, .print-table td { border: 0.5px solid black !important; padding: 3px 4px !important; }
                    .writing-vertical { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; }
                    .no-border { border: none !important; }
                    .page-break-container { page-break-after: always; display: block; width: 100%; }
                    .page-break-container:last-child { page-break-after: auto; }
                }
            `}} />

            {logChunks.map((columns, pageIndex) => {
                const pageTotalBoxes = columns.reduce((acc: number, cur: any) => acc + (cur && cur._type === 'PRODUCTION' ? ((cur.box_end - cur.box_start) + 1) : 0), 0);
                const pageTotalDuration = columns.reduce((acc: number, cur: any) => acc + (cur?.duration_min || 0), 0);
                const pageTotalOvs = columns.reduce((acc: number, cur: any) => acc + (cur?.ovs_kg || 0), 0);
                const pageTotalAdditive = columns.reduce((acc: number, cur: any) => acc + (cur?.add_used_diff || 0), 0);

                return (
                    <div key={pageIndex} className="page-break-container">
                        
                        <div className="flex justify-end mb-1">
                            <div className="flex flex-col items-start w-[170px]">
                                <div className="flex gap-5 text-[14px] mb-1.5 font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 border-[0.5px] border-black flex items-center justify-center"></div> EOL
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 border-[0.5px] border-black flex items-center justify-center">
                                            {jobData.extruder_job_id === null ? '✓' : ''}
                                        </div> Manual
                                    </div>
                                </div>
                                <table className="border-collapse border-[0.5px] border-black text-[14px] w-full">
                                    <tbody>
                                        <tr>
                                            <td className="border-[0.5px] border-black px-2 py-0.5 text-center">PO No. :</td>
                                            <td className="border-[0.5px] border-black px-2 py-0.5 text-center font-bold">{jobData.po_no}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="text-center text-2xl font-bold mb-2 tracking-wide mt-[-20px]">
                            ใบบันทึกการบดสี
                        </div>

                        {/* ขนาดฟอนต์ตารางที่ 13px จะพอดีสวยสำหรับ 16 คอลัมน์ในกระดาษ A4 */}
                        <table className="w-full border-collapse print-table text-center text-[13px]">
                            <colgroup>
                                <col className="w-[3%]" />
                                <col className="w-[10.5%]" />
                                <col className="w-[6.5%]" />
                                <col className="w-[4%]" />
                                <col className="w-[5%]" />
                                <col className="w-[6.4%]" />
                                <col className="w-[6.4%]" />
                                <col className="w-[6.4%]" />
                                <col className="w-[6.4%]" />
                                <col className="w-[6.4%]" />
                                <col className="w-[6.4%]" />
                                <col className="w-[6.4%]" />
                                <col className="w-[6.4%]" />
                                <col className="w-[6.4%]" />
                                <col className="w-[6.4%]" />
                                <col className="w-[7%]" />
                            </colgroup>

                            <tbody className="font-normal text-black">
                                <tr>
                                    <td rowSpan={2} colSpan={2} className="py-[3px] text-center">Mill no.</td>
                                    <td rowSpan={2} className="text-[16px] font-bold text-center">{jobData.mill_data?.mill_line || jobData.mill_line || '-'}</td>
                                    <td rowSpan={2} className="text-center pr-1 leading-tight align-middle">รหัสสี :</td>
                                    <td rowSpan={2} className="text-[15px] leading-tight font-bold align-middle text-center">{jobData.product_code}</td>
                                    <td colSpan={2} className="text-center">Batch No. :</td>
                                    <td colSpan={3} className="font-bold text-center">-</td>
                                    <td colSpan={3} className="text-center">จำนวนการผลิต :</td>
                                    <td colSpan={2} className="font-bold text-center">{jobData.target_pots || '-'} ถัง</td>
                                    <td className="font-bold text-center">{jobData.target_kg?.toLocaleString()} Kg.</td>
                                </tr>
                                
                                <tr>
                                    <td colSpan={11} className="py-[3px] text-center">ถังที่ (Granule bin / Setup bin)</td>
                                </tr>

                                <tr>
                                    <td colSpan={3} className="text-center">ขนาดบรรจุ : {jobData.box_weight || 20} kg/box (± 0.1)</td>
                                    <td className="font-bold text-center">Control</td>
                                    <td className="font-bold text-center">Start</td>
                                    {columns.map((log, i) => (
                                        <td key={i} className="font-bold text-center text-[14px]">
                                            {log?.display_bin ? log.display_bin : ((pageIndex * 10) + i + 1)}
                                        </td>
                                    ))}
                                    <td className="font-bold text-center">รวม</td>
                                </tr>

                                <tr>
                                    <td colSpan={3} className="text-center">จำนวนกล่อง</td>
                                    <td className="text-center">-</td>
                                    <td className="text-center">-</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log ? (log._type === 'PRODUCTION' ? ((log.box_end - log.box_start) + 1) : '-') : ''}</td>)}
                                    <td className="text-center">{pageTotalBoxes > 0 ? pageTotalBoxes : ''}</td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="text-center">เลขที่กล่อง (Box no.)</td>
                                    <td className="text-center">-</td>
                                    <td className="text-center">-</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log ? (log._type === 'PRODUCTION' ? `${log.box_start}/${log.box_end}` : '-') : ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                
                                <tr>
                                    <td rowSpan={4} className="writing-vertical text-center px-1">เวลาบดสี</td>
                                    <td colSpan={2} className="text-center">วันที่</td>
                                    <td className="text-center">-</td>
                                    <td className="text-center">-</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log ? formatDate(log.start_time) : ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td colSpan={2} className="text-center">เวลาเริ่ม</td>
                                    <td className="text-center">-</td>
                                    <td className="text-center">-</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log ? formatTime(log.start_time) : ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td colSpan={2} className="text-center">เวลาเสร็จ</td>
                                    <td className="text-center">-</td>
                                    <td className="text-center">-</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log ? formatTime(log.stop_time) : ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td colSpan={2} className="text-center">เวลาบดสี (นาที)</td>
                                    <td className="text-center">-</td>
                                    <td className="text-center">-</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.duration_min ?? ''}</td>)}
                                    <td className="text-center">{pageTotalDuration > 0 ? pageTotalDuration : ''}</td>
                                </tr>
                                
                                <tr>
                                    <td rowSpan={7} className="writing-vertical text-center px-1">Milling condition</td>
                                    <td className="text-center">Feeder</td>
                                    <td className="text-center">rpm</td>
                                    <td className="text-center">-200,+200</td>
                                    <td className="font-bold text-center">{getSetupValue('feeder_set', 'feeder_rpm')}</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.feeder_rpm ?? ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td className="text-center">Sep.</td>
                                    <td className="text-center">rpm</td>
                                    <td className="text-center">-200,+200</td>
                                    <td className="font-bold text-center">{getSetupValue('separator_set', 'separator_rpm')}</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.separator_rpm ?? ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td className="text-center">Rotor</td>
                                    <td className="text-center">rpm</td>
                                    <td className="text-center">-200,+200</td>
                                    <td className="font-bold text-center">{getSetupValue('rotor_set', 'rotor_rpm')}</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.rotor_rpm ?? ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td className="text-center">Air flow</td>
                                    <td className="text-center">m3/min</td>
                                    <td className="text-center">-5,+5</td>
                                    <td className="font-bold text-center">{getSetupValue('air_flow_set', 'air_flow')}</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.air_flow ?? ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td className="text-center">Inlet temp.</td>
                                    <td className="text-center">°C</td>
                                    <td className="text-center">&lt;= 15</td>
                                    <td className="text-center">-</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.inlet_temp ?? ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td className="text-center">Outlet temp.</td>
                                    <td className="text-center">°C</td>
                                    <td className="text-center">&lt;= 32</td>
                                    <td className="text-center">-</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.outlet_temp ?? ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td className="text-center">FG temp.</td>
                                    <td className="text-center">°C</td>
                                    <td className="text-center">&lt; 32</td>
                                    <td className="text-center">-</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.fg_temp ?? ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                
                                <tr>
                                    <td colSpan={2} className="text-center border-r-0">Sieve no. _________</td>
                                    <td colSpan={2} className="text-center border-l-0 border-r-0">Mesh size (μm)</td>
                                    <td className="border-l-0 text-center">140</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.sieve_size ?? ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="text-center">ตะแกรงร่อน ( / : ปกติ, X : ไม่ปกติ)</td>
                                    <td colSpan={2} className="text-center">ทุก 5 ถัง</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log ? (log.is_sieve_ok ? '/' : 'X') : ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="text-center">OVS ( / : ปกติ, X : ไม่ปกติ)</td>
                                    <td colSpan={2} className="text-center">ทุกถัง</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log ? (log.is_ovs_ok ? '/' : 'X') : ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="text-center">ปริมาณ OVS (kg.)</td>
                                    <td colSpan={2} className="text-center">ทุกถัง</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.ovs_kg ?? ''}</td>)}
                                    <td className="text-center">{pageTotalOvs > 0 ? pageTotalOvs.toFixed(2) : ''}</td>
                                </tr>

                                <tr>
                                    <td rowSpan={5} className="writing-vertical text-center px-1">Flowing additive</td>
                                    <td colSpan={2} className="text-center leading-tight">131219</td>
                                    <td colSpan={2} className="text-center">0.25 ± 0.05 %</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.additive_code ? '✓' : ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="text-center">น้ำหนัก Additive ก่อนบด (A)</td>
                                    <td className="text-center">Kg.</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.add_before_grind_a ?? ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="text-center">น้ำหนัก Additive หลังบด (B)</td>
                                    <td className="text-center">Kg.</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.add_after_grind_b ?? ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="text-center">น้ำหนัก Additive ที่ใช้ (A - B)</td>
                                    <td className="text-center">Kg.</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.add_used_diff ?? ''}</td>)}
                                    <td className="text-center">{pageTotalAdditive > 0 ? pageTotalAdditive.toFixed(2) : ''}</td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="text-center">อัตราการป้อน</td>
                                    <td className="text-center">kg/h</td>
                                    {columns.map((log, i) => <td key={i} className="text-center">{log?.feed_rate_kg_h ?? ''}</td>)}
                                    <td className="!border-none !bg-transparent text-transparent"></td>
                                </tr>

                                <tr>
                                    <td rowSpan={3} className="writing-vertical text-center px-1">Rework</td>
                                    <td colSpan={3} className="text-center">OVS กระจายบด</td>
                                    <td className="text-center">&lt;= 5 %</td>
                                    {columns.map((_, i) => <td key={i}></td>)}
                                    <td></td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="text-center">OVS การกระจายผสม</td>
                                    <td className="text-center">Kg.</td>
                                    {columns.map((_, i) => <td key={i}></td>)}
                                    <td></td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="text-center">Dust การกระจายผสม</td>
                                    <td className="text-center">Kg.</td>
                                    {columns.map((_, i) => <td key={i}></td>)}
                                    <td></td>
                                </tr>

                                <tr>
                                    <td colSpan={5} className="text-center py-1.5 font-medium text-[13px]">พนักงานบดสี</td>
                                    {columns.map((log, i) => <td key={i} className="italic text-slate-700 text-[12px] leading-tight text-center">{log ? jobData.operator_name || '' : ''}</td>)}
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="mt-2 flex justify-between text-[13px] mb-2 font-medium">
                            <div>เศษ: ______________ kg</div>
                            <div>Dust: ______________ kg</div>
                            <div>Over sieve: ______________ kg</div>
                            <div>รวม OVS กระจายผสม: ______________ kg</div>
                            <div>รวม Dust กระจายผสม: ______________ kg</div>
                        </div>

                        {/* ปรับ Row Height ลงมาให้กำลังดี ไม่ล้นกระดาษ */}
                        <table className="w-full mt-1 text-[13px] leading-tight border-collapse border-0">
                            <tbody>
                                <tr className="h-[22px]">
                                    <td colSpan={2} className="align-bottom border-0 pb-0.5 pr-3">
                                        <div className="flex items-end w-full">
                                            <span className="whitespace-nowrap font-bold">หมายเหตุ (คุณภาพ):</span>
                                            <span className="flex-1 border-b-[0.5px] border-black ml-1 text-slate-800 px-2 pb-0.5">{logs[0]?.remark_quality || ''}</span>
                                        </div>
                                    </td>
                                    <td rowSpan={9} className="w-[30%] border-[0.5px] border-black align-top p-2 relative bg-slate-50/20">
                                        <div className="text-center w-full mb-1 font-bold text-[14px]">ตรวจสอบเอกสาร</div>
                                        <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center">
                                            <div className="border-b-[0.5px] border-black w-4/5 mb-1.5 h-6"></div>
                                            <div className="font-medium">( หัวหน้างานผลิต )</div>
                                        </div>
                                    </td>
                                </tr>
                                <tr className="h-[18px]"><td colSpan={2} className="border-b-[0.5px] border-black border-x-0 border-t-0 border-r-transparent"></td></tr>
                                <tr className="h-[18px]"><td colSpan={2} className="border-b-[0.5px] border-black border-x-0 border-t-0 border-r-transparent"></td></tr>
                                
                                <tr className="h-[22px]">
                                    <td colSpan={2} className="align-bottom border-0 pb-0.5 pt-1 pr-3">
                                        <div className="flex items-end w-full">
                                            <span className="whitespace-nowrap font-bold">หมายเหตุ (เครื่องจักร):</span>
                                            <span className="flex-1 border-b-[0.5px] border-black ml-1 text-slate-800 px-2 pb-0.5">{logs[0]?.remark_machine || ''}</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr className="h-[18px]"><td colSpan={2} className="border-b-[0.5px] border-black border-x-0 border-t-0 border-r-transparent"></td></tr>
                                <tr className="h-[18px]"><td colSpan={2} className="border-b-[0.5px] border-black border-x-0 border-t-0 border-r-transparent"></td></tr>
                                
                                <tr className="h-[22px]">
                                    <td colSpan={2} className="align-bottom border-0 pb-0.5 pt-1 pr-3">
                                        <div className="flex items-end w-full">
                                            <span className="whitespace-nowrap font-bold">หมายเหตุ (อื่นๆ):</span>
                                            <span className="flex-1 border-b-[0.5px] border-black ml-1 text-slate-800 px-2 pb-0.5">{logs[0]?.remark_other || ''}</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr className="h-[18px]"><td colSpan={2} className="border-b-[0.5px] border-black border-x-0 border-t-0 border-r-transparent"></td></tr>
                                <tr className="h-[18px]"><td colSpan={2} className="border-b-[0.5px] border-black border-x-0 border-t-0 border-r-transparent"></td></tr>
                            </tbody>
                        </table>
                        
                        <div className="flex justify-between items-end mt-2 text-[12px]">
                            <div className="space-y-0.5">
                                <div className="font-bold underline">Remark :</div>
                                <div>1. ในระหว่างการผลิต หัวหน้างานสามารถแก้ไขเปลี่ยนแปลง Condition การบดได้ เพื่อแก้ไขปัญหาคุณภาพ</div>
                                <div>2. เมื่อผลิตจบให้เอาสติ๊กเกอร์ที่เหลือส่งคืนที่ออฟฟิศฝ่ายผลิตพร้อมกับเอกสารการบดสี</div>
                            </div>
                            <div className="text-[13px] font-bold pr-2">
                                FM-PP-03 Rev.20 แผ่นที่ {pageIndex + 1}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}