// app/dashboard/mill/components/MachineSelection.tsx
import { Factory } from 'lucide-react';

export default function MachineSelection({ millList, onSelectLine }: any) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="text-center mb-12 animate-in slide-in-from-bottom-5 duration-700">
                <div className="inline-flex items-center justify-center p-5 bg-white rounded-3xl shadow-lg shadow-purple-100 mb-6 ring-1 ring-slate-100">
                    <Factory size={48} className="text-purple-600 fill-purple-600" />
                </div>
                <h1 className="text-4xl font-bold text-slate-800 mb-3 tracking-tight">Mill Station</h1>
                <p className="text-slate-500 font-medium text-lg">Select your machine line to begin operation</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl w-full px-4">
                {millList.map((m: number) => (
                    <button key={m} onClick={() => onSelectLine(m)} className="group relative bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl border border-slate-200 hover:border-purple-200 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden flex flex-col items-center justify-center min-h-[200px]">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase mb-3 group-hover:text-purple-400 transition-colors">Station</span>
                            <span className="text-7xl font-bold text-slate-800 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-500 group-hover:to-blue-500 transition-all tracking-tighter">{m}</span>
                        </div>
                    </button>
                ))}
            </div>
            <div className="mt-12 text-slate-400 text-sm font-medium">© 2025 AkzoNobel Production System</div>
        </div>
    );
}