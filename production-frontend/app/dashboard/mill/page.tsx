// app/dashboard/mill/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';
import MachineSelection from './components/MachineSelection';
import StartJobForm from './components/StartJobForm';
import MillWorkspace from './components/MillWorkspace';

const MILL_LIST = [2, 3, 4, 9, 10, 12, 13, 14];

export default function MillPage() {
    const [millLine, setMillLine] = useState<number | null>(null);
    const [workingJobId, setWorkingJobId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    // ✅ 1. แก้ไข Query Key เปลี่ยนจากการใช้ตัวเลขเดี่ยวๆ เป็นการระบุประเภทให้ชัดเจน ป้องกัน Cache ชนกัน
    const { data: activeJob, refetch: refetchActiveJob, isLoading: isJobLoading } = useQuery({
        queryKey: ['millJobDetail', workingJobId ? `job-${workingJobId}` : `line-${millLine}`],
        queryFn: async () => {
            try {
                if (workingJobId) {
                    const res = await api.get(`/mill/job/detail/${workingJobId}`);
                    return res.data || null;
                } else if (millLine) {
                    const res = await api.get(`/mill/job/active/${millLine}`);
                    return res.data || null;
                }
                return null;
            } catch { return null; }
        },
        enabled: !!millLine,
        refetchInterval: 5000,
        staleTime: 0,
    });

    const currentJobId = activeJob?.job_id;

    // ดึงคิวงานรอเข้าบด
    const { data: pendingJobs = [], refetch: refetchPending } = useQuery({
        queryKey: ['millPendingJobs', millLine],
        queryFn: async () => {
            if (!millLine) return [];
            try {
                const res = await api.get(`/mill/pending-jobs/${millLine}`);
                return res.data || [];
            } catch { return []; }
        },
        enabled: !!millLine && !currentJobId,
        refetchInterval: 10000,
    });

    const isOwner = Number(activeJob?.mill_line) === Number(millLine);

    const handleFinishJob = async () => {
        if(!confirm("⚠️ ยืนยันการปิดจบงาน (Finish Job)?\nข้อมูลจะถูกบันทึกและปิด PO นี้ ทุกคนที่ช่วยบดจะหลุดออกจากงาน")) return;
        try {
            await api.post(`/mill/job/finish/${activeJob.job_id}`);
            
            // ✅ 2. เอา setMillLine(null) ออก เพื่อให้จบงานแล้วเด้งกลับมารอรับงานใหม่ที่เครื่องเดิมทันที
            setWorkingJobId(null);
            
            // ✅ 3. สั่งทำลายความจำเก่าทิ้งให้หมด 
            queryClient.removeQueries({ queryKey: ['millJobDetail'] }); 
            await queryClient.invalidateQueries({ queryKey: ['activeMillPools'] });
            await queryClient.invalidateQueries({ queryKey: ['millPendingJobs'] });
        } catch (err: any) { alert("เกิดข้อผิดพลาดในการจบงาน โปรดลองใหม่อีกครั้ง"); }
    };

    const handleLeaveJob = async () => {
        if(!confirm("🚪 ยืนยันการออกจากการช่วยบด?\nคุณจะกลับไปหน้าคิวงาน โดยที่ PO นี้จะยังคงรันต่อไปที่เครื่องหลัก")) return;
        
        try {
            if (activeJob?.job_id) {
                await api.post(`/mill/job/leave/${activeJob.job_id}`);
            }

            // ✅ 4. เอา setMillLine(null) ออกเช่นกัน กดออกปุ๊บ รอช่วยงานอื่นต่อได้เลย
            setWorkingJobId(null);
            
            // ✅ 5. ล้าง Cache ตัวปัญหาทิ้งทันทีที่ก้าวเท้าออกจากงาน
            queryClient.removeQueries({ queryKey: ['millJobDetail'] }); 
            await queryClient.invalidateQueries({ queryKey: ['activeMillPools'] });
        } catch (err: any) {
            alert("เกิดข้อผิดพลาดในการออกจากงาน: " + (err.response?.data?.detail || err.message));
        }
    };

    if (!millLine) return <MachineSelection millList={MILL_LIST} onSelectLine={setMillLine} />;

    if (isJobLoading || (currentJobId && !activeJob)) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 mt-6 rounded-3xl border border-slate-200">
                <Loader2 className="animate-spin text-purple-600 mb-4" size={48} />
                <div className="text-slate-600 font-black animate-pulse text-xl tracking-tight">Syncing Workspace...</div>
                <div className="text-slate-400 font-medium text-sm mt-2">กำลังโหลดข้อมูลการผลิต โปรดรอสักครู่</div>
            </div>
        );
    }

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
            onLeave={handleLeaveJob}
            onSwitchLine={async () => {
                // ✅ 6. ปุ่มนี้มีไว้สำหรับคนที่อยากเปลี่ยนเครื่องจริงๆ
                setMillLine(null);
                setWorkingJobId(null);
                queryClient.removeQueries({ queryKey: ['millJobDetail'] });
            }}
            refetchActiveJob={refetchActiveJob} 
        />
    );
}