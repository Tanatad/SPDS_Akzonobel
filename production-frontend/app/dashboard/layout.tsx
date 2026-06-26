'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Factory, Wind, History, LayoutDashboard } from 'lucide-react';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // กำหนดรายการเมนู
  const navItems = [
    { name: 'Extruder', href: '/dashboard/extruder', icon: Factory },
    { name: 'Mill Station', href: '/dashboard/mill', icon: Wind },
    { name: 'History', href: '/dashboard/history', icon: History },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* 🧭 Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo / Title */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl text-white">
                <LayoutDashboard size={20} />
              </div>
              <span className="font-bold text-slate-800 text-lg hidden md:block">
                SPDS Portal
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 md:gap-4 h-full">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href); // เช็คว่ากำลังอยู่หน้านี้ไหม
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 h-16 text-sm font-bold transition-all border-b-2 ${
                      isActive 
                        ? 'text-blue-600 border-blue-600 bg-blue-50/50' 
                        : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="hidden sm:block">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Profile / System Name */}
            <div className="flex items-center">
              <div className="text-right mr-3 hidden sm:block">
                <div className="text-xs font-bold text-slate-400 uppercase">System</div>
                <div className="text-xs font-bold text-slate-700">AkzoNobel v1.2</div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* 📄 Main Content Area (เอาเนื้อหาหน้าเพจมาใส่ตรงนี้) */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  );
}