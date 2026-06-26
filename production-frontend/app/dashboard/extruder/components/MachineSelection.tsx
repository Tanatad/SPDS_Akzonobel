import { Flame, Loader2 } from 'lucide-react';
import { EXTRUDER_LIST } from '../utils';

interface Props {
  onSelectMachine: (line: number) => void;
  machineStatuses: Record<number, boolean>;
}

export default function MachineSelection({ onSelectMachine, machineStatuses }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-center mb-12 animate-in slide-in-from-bottom-5 duration-700">
          <div className="inline-flex items-center justify-center p-5 bg-white rounded-3xl shadow-lg shadow-orange-100 mb-6 ring-1 ring-slate-100">
              <Flame size={48} className="text-orange-500 fill-orange-500" />
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-3 tracking-tight">Extruder Station</h1>
          <p className="text-slate-500 font-medium text-lg">Select your machine line to begin operation</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl w-full px-4">
          {EXTRUDER_LIST.map((line) => (
              <button key={line} onClick={() => onSelectMachine(line)} className="group relative bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl border border-slate-200 transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-200 overflow-hidden flex flex-col items-center justify-center min-h-[200px]">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-red-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10 flex flex-col items-center">
                      <span className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase mb-3 group-hover:text-orange-400">Extruder</span>
                      <span className="text-7xl font-bold text-slate-800 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-red-500">{line}</span>
                      <div className="mt-6 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 group-hover:bg-white group-hover:shadow-sm">
                          {machineStatuses[line] === undefined ? (
                              <><Loader2 size={12} className="text-slate-400 animate-spin" /><span className="text-xs font-bold text-slate-500">Checking...</span></>
                          ) : machineStatuses[line] ? (
                              <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span><span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">Online</span></>
                          ) : (
                              <><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-xs font-bold text-red-500 group-hover:text-red-600">Offline</span></>
                          )}
                      </div>
                  </div>
              </button>
          ))}
      </div>
      <div className="mt-12 text-slate-400 text-sm font-medium">© 2025 AkzoNobel Production System</div>
    </div>
  );
}