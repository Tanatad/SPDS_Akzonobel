// app/dashboard/extruder/utils.ts

export const EXTRUDER_LIST = [1, 2, 3, 7, 8]; 
export const MILL_LIST = [2, 3, 4, 9, 10, 12, 13];
export const AUTO_FLOW_MACHINES = [1, 3, 7];
export const PAIRING_MAP: Record<number, number> = { 1: 2, 2: 3, 3: 4, 7: 10, 8: 13 };

export const calcDurationMin = (start: string, stop: string) => {
    if (!start || !stop) return 0;
    try {
        if (!start.includes('-') && start.includes(':')) {
            const [h1, m1] = start.split(':').map(Number);
            const [h2, m2] = stop.split(':').map(Number);
            let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diff < 0) diff += 1440; 
            return diff;
        }
        const d1 = new Date(start), d2 = new Date(stop);
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
        return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 60000));
    } catch { return 0; }
};

export const parseNum = (val: any) => { 
    if (val === '' || val === null || val === undefined) return 0;
    const n = parseFloat(val); 
    return isNaN(n) ? 0 : n; 
};

export const setNow = (setter: any, field: string) => {
    const now = new Date();
    const dt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setter((prev: any) => ({ ...prev, [field]: dt }));
};