// app/dashboard/history/utils.ts

export const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';

export const fmtDateTime = (d: any) => {
    if (!d) return '-';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '');
    } catch { return '-'; }
};

export const fmtNum = (n: any) => (n !== null && n !== undefined && n !== '') ? Number(n).toFixed(2) : '-';

export const calcTimeDiff = (start: any, stop: any) => {
    if (!start || !stop) return 0;
    const d1 = new Date(start).getTime();
    const d2 = new Date(stop).getTime();
    if (isNaN(d1) || isNaN(d2)) return 0;
    const diff = (d2 - d1) / 60000; 
    return diff > 0 ? Math.round(diff) : 0;
};

export const calcThroughput = (qty: number, durationMin: number) => {
    if (!qty || !durationMin || durationMin <= 0) return 0;
    return (qty / (durationMin / 60)).toFixed(1);
};

export const getJobDuration = (job: any) => {
    const extTotal = [...(job.warmups || []), ...(job.setups || []), ...(job.productions || [])].reduce((acc, item) => acc + (Number(item.duration_min || calcTimeDiff(item.start_time, item.stop_time)) || 0), 0);
    const extProd = (job.productions || []).reduce((acc: number, item: any) => acc + (Number(item.duration_min || calcTimeDiff(item.start_time, item.stop_time)) || 0), 0);
    const millTotal = (job.mill_logs || []).reduce((acc: number, item: any) => acc + (Number(item.duration_min || calcTimeDiff(item.start_time, item.stop_time)) || 0), 0);
    const millProd = (job.mill_logs || []).filter((l:any) => l.box_start !== undefined && l.box_start !== null).reduce((acc: number, item: any) => acc + (Number(item.duration_min || calcTimeDiff(item.start_time, item.stop_time)) || 0), 0);

    return { extTotal, extProd, millTotal, millProd, total: extTotal + millTotal };
};

export const getRange = (logs: any[], key: string) => {
    const values = logs.map(l => Number(l[key])).filter(v => !isNaN(v) && v > 0);
    if (values.length === 0) return '-';
    if (values.length === 1) return fmtNum(values[0]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max ? fmtNum(min) : `${fmtNum(min)} - ${fmtNum(max)}`;
};

export const getRemarks = (logs: any[]) => {
    const allRemarks = logs.flatMap(l => [l.remark_quality, l.remark_machine, l.remark_other]).filter(r => r && r.trim() !== '');
    if (allRemarks.length === 0) return '-';
    return Array.from(new Set(allRemarks)).join(' | ');
};

export const getSortedExtruderCols = (job: any) => {
    if (!job) return [];
    const setups = (job.setups || []).slice().sort((a:any, b:any) => a.id - b.id); 
    const prods = (job.productions || []).slice().sort((a:any, b:any) => a.id - b.id); 
    return [...setups.map((s:any)=>({...s, type:'SETUP'})), ...prods.map((p:any)=>({...p, type:'PROD'}))];
};

export const getSortedMillCols = (job: any) => {
    if (!job || !job.mill_logs) return [];
    const setups = job.mill_logs.filter((l:any) => l.setup_kg !== undefined).sort((a:any, b:any) => a.id - b.id);
    const prods = job.mill_logs.filter((l:any) => l.box_start !== undefined).sort((a:any, b:any) => a.box_start - b.box_start);
    return [...setups, ...prods];
};