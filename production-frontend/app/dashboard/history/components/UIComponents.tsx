// app/dashboard/history/components/UIComponents.tsx
import { Check, X as XIcon } from 'lucide-react';
import { fmtNum } from '../utils';

export const StatusBadge = ({ status }: { status: string }) => {
    let color = 'bg-gray-100 text-gray-600 border-gray-200';
    if (status === 'COMPLETED') color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    else if (status === 'IN_PROGRESS') color = 'bg-amber-50 text-amber-700 border-amber-200';
    else if (status === 'WAITING_MILL' || status === 'IN_PROCESS_MILL') color = 'bg-blue-50 text-blue-700 border-blue-200';
    return <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${color}`}>{status.replace(/_/g, ' ')}</span>;
};

export const QCCircle = ({ ok, label }: any) => (
    <div className="flex flex-col items-center gap-1" title={label}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${ok ? 'bg-emerald-500 border-emerald-600 shadow-sm' : 'bg-rose-500 border-rose-600 shadow-sm'}`}>
            {ok ? <Check size={12} className="text-white"/> : <XIcon size={12} className="text-white"/>}
        </div>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{label}</span>
    </div>
);

export const ValCell = ({ std, act, bold = false, showStd = true }: any) => (
    <div className="flex flex-col justify-center items-center h-full min-w-[60px]">
        <span className={`text-xs tabular-nums ${bold ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{fmtNum(act)}</span>
        {showStd && std && <span className="text-[9px] text-slate-400 mt-0.5 tabular-nums opacity-80">/ {fmtNum(std)}</span>}
    </div>
);