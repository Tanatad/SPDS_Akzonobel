// app/dashboard/mill/page.tsx
'use client';

import { useState } from 'react'; // ❌ ลบ useEffect ออกไปเลยครับ ไม่ใช้แล้ว
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';
import MachineSelection from './components/MachineSelection';
import StartJobForm from './components/StartJobForm';
import MillWorkspace from './components/MillWorkspace';

const MILL_LIST = [2, 3, 4, 9, 10, 12, 13];

export default function MillPage() {
    const [millLine, setMillLine] = useState<number | null>(null);
    const [workingJobId, setWorkingJobId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    // 1. เช็คว่าเครื่องเราเป็น "เจ้าของ" งานไหนอยู่ไหม
    const { data: myOwnedJob, isLoading: isCheckingOwner } = useQuery({
        queryKey: ['myOwnedMillJob', millLine],
        queryFn: async () => {
            if (!millLine) return null;
            try {
                const res = await api.get(`/mill/job/active/${millLine}`);
                return res.data || null;
            } catch { return null; }
        },
        enabled: !!millLine, // ✅ แก้ตรงนี้ให้เช็คได้อิสระขึ้น
        staleTime: 0, 
    });

    // 🚀 THE ENTERPRISE FIX: สร้างตัวแปรบอกสถานะ "งานปัจจุบัน" แบบตรงไปตรงมา
    // ถ้ารับเชิญมาร่วมบด (workingJobId) ให้ใช้อันนั้น ถ้าไม่มี ให้ไปดูว่าเป็นเจ้าของเครื่อง (myOwnedJob) ไหม
    // วิธีนี้ React จะรู้คำตอบทันที ไม่ต้องรอ useEffect เรนเดอร์ 2 รอบ
    const currentJobId = workingJobId || myOwnedJob?.job_id;

    // 2. ดึงข้อมูลงานที่กำลังเปิดดูอยู่ (Live Sync ยอดบด)
    const { data: activeJob, refetch: refetchActiveJob } = useQuery({
        queryKey: ['millJobDetail', currentJobId], // ✅ เปลี่ยนมาใช้ currentJobId
        queryFn: async () => {
            if (!currentJobId) return null;
            try {
                const res = await api.get(`/mill/job/detail/${currentJobId}`);
                return res.data || null;
            } catch { return null; }
        },
        enabled: !!currentJobId, // ✅ เปลี่ยนมาใช้ currentJobId
        refetchInterval: 5000,
        staleTime: 0,
    });

    // 3. ดึงคิวงานรอเข้าบด
    const { data: pendingJobs = [], refetch: refetchPending } = useQuery({
        queryKey: ['millPendingJobs', millLine],
        queryFn: async () => {
            if (!millLine) return [];
            try {
                const res = await api.get(`/mill/pending-jobs/${millLine}`);
                return res.data || [];
            } catch { return []; }
        },
        // ✅ เปลี่ยนเงื่อนไขให้ไม่ดึงคิวงาน ถ้าเรากำลังอยู่ในงานบดแล้ว
        enabled: !!millLine && !currentJobId && !isCheckingOwner, 
        refetchInterval: 10000,
    });

    const isOwner = activeJob?.mill_line === millLine;

    const handleFinishJob = async () => {
        if(!confirm("⚠️ ยืนยันการปิดจบงาน (Finish Job)?\nข้อมูลจะถูกบันทึกและปิด PO นี้ ทุกคนที่ช่วยบดจะหลุดออกจากงาน")) return;
        try {
            await api.post(`/mill/job/finish/${activeJob.job_id}`);
            
            setWorkingJobId(null);
            
            await queryClient.invalidateQueries({ queryKey: ['millActiveJob'] });
            await queryClient.invalidateQueries({ queryKey: ['myOwnedMillJob'] });
            await queryClient.invalidateQueries({ queryKey: ['activeMillPools'] });
            await queryClient.invalidateQueries({ queryKey: ['millPendingJobs'] });
            await queryClient.invalidateQueries({ queryKey: ['millJobDetail'] });
        } catch (err: any) { alert("เกิดข้อผิดพลาดในการจบงาน โปรดลองใหม่อีกครั้ง"); }
    };

    if (!millLine) return <MachineSelection millList={MILL_LIST} onSelectLine={setMillLine} />;

    // ✅ Guard ดักโหลดที่นิ่งและเสถียรที่สุด
    if (isCheckingOwner || (currentJobId && !activeJob)) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 mt-6 rounded-3xl border border-slate-200">
                <Loader2 className="animate-spin text-purple-600 mb-4" size={48} />
                <div className="text-slate-600 font-black animate-pulse text-xl tracking-tight">Syncing Workspace...</div>
                <div className="text-slate-400 font-medium text-sm mt-2">กำลังโหลดข้อมูลการผลิต โปรดรอสักครู่</div>
            </div>
        );
    }

    // ✅ ถ้าไม่มีอะไรต้องทำแล้วจริงๆ ค่อยโชว์หน้าคิวงาน
    if (!activeJob && !currentJobId) {
        return (
            <StartJobForm 
                millLine={millLine} 
                pendingJobs={pendingJobs} 
                onBack={() => setMillLine(null)} 
                refetchPending={refetchPending}
                onJoinJob={async (id: number) => {
                    await queryClient.invalidateQueries({ queryKey: ['myOwnedMillJob'] });
                    await queryClient.invalidateQueries({ queryKey: ['millPendingJobs'] });
                    await queryClient.invalidateQueries({ queryKey: ['activeMillPools'] });
                    setWorkingJobId(id); 
                }} 
            />
        );
    }

    return (
        <MillWorkspace 
            activeJob={activeJob} 
            millLine={millLine} 
            isOwner={isOwner} 
            onFinish={handleFinishJob} 
            onLeave={async () => {
                if(confirm("🚪 ยืนยันการออกจากการช่วยบด?\nคุณจะกลับหน้าเลือกงาน โดยที่ PO นี้จะยังคงรันต่อไปที่เครื่องหลัก")) {
                    setWorkingJobId(null);
                    await queryClient.invalidateQueries({ queryKey: ['millJobDetail'] });
                }
            }}
            onSwitchLine={async () => {
                setMillLine(null);
                setWorkingJobId(null);
                await queryClient.invalidateQueries({ queryKey: ['millJobDetail'] });
                await queryClient.invalidateQueries({ queryKey: ['myOwnedMillJob'] });
            }}
            refetchActiveJob={refetchActiveJob} 
        />
    );
}