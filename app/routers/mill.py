from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import asyncio  
from app.db import database, models
from app.services import kepware_connector as kepware  

router = APIRouter()

# --- Schemas ---
class MillStartRequest(BaseModel):
    extruder_job_id: int
    mill_line: int
    box_weight: int
    feeder_set: float
    separator_set: float
    rotor_set: float
    air_flow_set: float

class TransferJobRequest(BaseModel):
    new_mill_line: int

class MillManualStartRequest(BaseModel):
    po_no: str
    product_code: str
    target_kg: float
    mill_line: int
    box_weight: int
    feeder_set: float
    separator_set: float
    rotor_set: float
    air_flow_set: float

class MillSetupLogRequest(BaseModel):
    job_id: int
    mill_line: int 
    setup_bin: str 
    setup_kg: float
    start_time: str; stop_time: str
    feeder_rpm: float; separator_rpm: float; rotor_rpm: float
    air_flow: float; inlet_temp: float; outlet_temp: float; fg_temp: float
    sieve_size: str; is_sieve_ok: bool; is_ovs_ok: bool
    ovs_kg: float; waste_kg: float; dust_kg: float
    ovs_mix_kg: float; dust_mix_kg: float
    additive_weight_kg: float
    add_before_grind_a: float; add_after_grind_b: float; feed_rate_kg_h: float
    remarks: dict
    additive_code: Optional[str] = None 

class MillProductionLogRequest(BaseModel):
    job_id: int
    mill_line: int 
    granule_bin_no: str 
    box_start: int; box_end: int
    start_time: str; stop_time: str
    feeder_rpm: float; separator_rpm: float; rotor_rpm: float
    air_flow: float; inlet_temp: float; outlet_temp: float; fg_temp: float
    sieve_size: str; is_sieve_ok: bool; is_ovs_ok: bool
    ovs_kg: float; waste_kg: float; dust_kg: float
    ovs_mix_kg: float; dust_mix_kg: float
    additive_weight_kg: float
    add_before_grind_a: float; add_after_grind_b: float; feed_rate_kg_h: float
    remarks: dict
    additive_code: Optional[str] = None 

# --- Helpers ---
def parse_time(time_str):
    if not time_str: return None
    try: return datetime.strptime(time_str[:16], "%Y-%m-%dT%H:%M")
    except: return None

def calc_duration(start_str, stop_str):
    try:
        t1 = parse_time(start_str)
        t2 = parse_time(stop_str)
        if t1 and t2: return int((t2 - t1).total_seconds() / 60)
        return 0
    except: return 0

# --- Endpoints ---

@router.get("/preview/mill/{line_no}")
async def preview_mill_data(line_no: int):
    try:
        data = await asyncio.wait_for(kepware.read_mill_only(str(line_no)), timeout=10.0)
        return data
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Kepware Timeout")
    except Exception as e:
        return {"actual_mill_sep": 0.0, "actual_mill_rotor": 0.0, "actual_mill_dosing": 0.0, "actual_mill_air_flow": 0.0, "actual_mill_temp_in": 0.0, "actual_mill_temp_out": 0.0}

@router.get("/mill/pending-jobs/{mill_line}") 
async def get_pending_jobs(mill_line: int, db: AsyncSession = Depends(database.get_db)):
    return (await db.execute(select(models.ExtruderJob).filter(
        models.ExtruderJob.status.in_(['IN_PROGRESS', 'WAITING_MILL'])
    ).order_by(models.ExtruderJob.created_at.desc()))).scalars().all()

@router.post("/mill/job/start")
async def start_mill_job(req: MillStartRequest, db: AsyncSession = Depends(database.get_db)):
    try:
        new_job = models.MillJob(
            extruder_job_id=req.extruder_job_id,
            mill_line=req.mill_line,
            box_weight=req.box_weight,
            feeder_set=req.feeder_set,
            separator_set=req.separator_set,
            rotor_set=req.rotor_set,
            air_flow_set=req.air_flow_set,
            status='IN_PROGRESS'
        )
        db.add(new_job)
        
        ex_job = (await db.execute(select(models.ExtruderJob).filter(models.ExtruderJob.job_id == req.extruder_job_id))).scalars().first()
        if ex_job: ex_job.status = 'IN_PROCESS_MILL' 
            
        await db.commit()
        await db.refresh(new_job)
        return {"job_id": new_job.job_id} # ✅ ส่งแค่ job_id กลับไป ป้องกัน Error จาก Pydantic
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="ระบบขัดข้อง ไม่สามารถดึงงานได้")

# ✅ API สำหรับสร้างงานด้วยมือ (อัปเกรดระบบ Rollback ถ้าเซฟพังให้ยกเลิกทั้งหมด)
@router.post("/mill/job/start-manual")
async def start_manual_mill_job(req: MillManualStartRequest, db: AsyncSession = Depends(database.get_db)):
    po_formatted = req.po_no.strip().upper()
    
    # 1. เช็คความซ้ำซ้อน
    existing_job = (await db.execute(select(models.ExtruderJob).filter(
        models.ExtruderJob.po_no == po_formatted,
        models.ExtruderJob.status.in_(['IN_PROGRESS', 'WAITING_MILL', 'IN_PROCESS_MILL'])
    ))).scalars().first()
    
    if existing_job:
        raise HTTPException(status_code=400, detail=f"PO {po_formatted} นี้กำลังรันอยู่ในระบบแล้ว กรุณาค้นหาในบ่อรุมงาน")

    try:
        # 2. สร้างหัวบิลจำลอง (ใช้ flush เพื่อไม่ให้เซฟจริงจนกว่าจะสำเร็จครบทุกขั้นตอน)
        mock_extruder_job = models.ExtruderJob(
            po_no=po_formatted,
            product_code=req.product_code.strip().upper(),
            operator_name="Manual Entry (Mill)",
            extruder_line=0,
            planned_mill_line=req.mill_line,
            target_pots=0,
            target_kg=req.target_kg,
            status='IN_PROCESS_MILL'
        )
        db.add(mock_extruder_job)
        await db.flush() # ดันข้อมูลเข้าชั่วคราวเพื่อให้ได้ mock_extruder_job.job_id มาใช้ต่อ

        # 3. สร้าง Mill Job โดยผูกกับหัวบิลตะกี้
        new_mill_job = models.MillJob(
            extruder_job_id=mock_extruder_job.job_id,
            mill_line=req.mill_line,
            box_weight=req.box_weight,
            feeder_set=req.feeder_set,
            separator_set=req.separator_set,
            rotor_set=req.rotor_set,
            air_flow_set=req.air_flow_set,
            status='IN_PROGRESS'
        )
        db.add(new_mill_job)
        
        # 4. คอมมิทพร้อมกัน 2 ตารางรวดเดียว! สำเร็จคือผ่านทั้งคู่ พังคือยกเลิกทั้งคู่
        await db.commit()
        await db.refresh(new_mill_job)
        
        return {"job_id": new_mill_job.job_id} # ✅ ส่งแค่ job_id กลับไปเพื่อให้หน้าจอรับไปเปิด Workspace
        
    except Exception as e:
        await db.rollback() # ❌ ถ้าระหว่างบรรทัด 2-3 มีอะไรพัง ระบบจะเตะข้อมูลทิ้งหมด ไม่มี Ghost Data!
        print(f"Manual Job Creation Error: {e}")
        raise HTTPException(status_code=500, detail="ระบบหลังบ้านขัดข้อง ไม่สามารถเปิดงานใหม่ได้")

@router.get("/mill/job/active/{mill_line}")
async def get_active_mill_job(mill_line: int, db: AsyncSession = Depends(database.get_db)):
    active_job = (await db.execute(select(models.MillJob).filter(models.MillJob.mill_line == mill_line, models.MillJob.status == 'IN_PROGRESS'))).scalars().first()
    if not active_job: return None

    ex_job = (await db.execute(select(models.ExtruderJob).filter(models.ExtruderJob.job_id == active_job.extruder_job_id))).scalars().first()
    setup_logs = (await db.execute(select(models.MillSetupLog).filter(models.MillSetupLog.job_id == active_job.job_id).order_by(models.MillSetupLog.id.desc()))).scalars().all()
    prod_logs = (await db.execute(select(models.MillProductionLog).filter(models.MillProductionLog.job_id == active_job.job_id).order_by(models.MillProductionLog.id.desc()))).scalars().all()

    return {
        "job_id": active_job.job_id, 
        "extruder_job_id": ex_job.job_id,
        "extruder_line": ex_job.extruder_line, 
        "po_no": ex_job.po_no,
        "product_code": ex_job.product_code,
        "target_kg": ex_job.target_kg,
        "box_weight": active_job.box_weight,
        "feeder_set": active_job.feeder_set,
        "separator_set": active_job.separator_set,
        "rotor_set": active_job.rotor_set,
        "air_flow_set": active_job.air_flow_set,
        "setup_logs": setup_logs,
        "production_logs": prod_logs
    }

@router.get("/mill/jobs/active/all")
async def get_all_active_mill_jobs(db: AsyncSession = Depends(database.get_db)):
    active_jobs = (await db.execute(select(models.MillJob).filter(models.MillJob.status == 'IN_PROGRESS'))).scalars().all()
    res = []
    seen_pos = set()
    for aj in active_jobs:
        ex = (await db.execute(select(models.ExtruderJob).filter(models.ExtruderJob.job_id == aj.extruder_job_id))).scalars().first()
        if ex and ex.po_no not in seen_pos:
            seen_pos.add(ex.po_no)
            res.append({
                "job_id": aj.job_id, 
                "extruder_job_id": ex.job_id, # 🔥 เพิ่มบรรทัดนี้เข้ามาสำคัญมาก!
                "po_no": ex.po_no, 
                "product_code": ex.product_code,
                "mill_line": aj.mill_line, 
                "target_kg": ex.target_kg
            })
    return res

@router.get("/mill/job/detail/{job_id}")
async def get_mill_job_detail(job_id: int, db: AsyncSession = Depends(database.get_db)):
    aj = (await db.execute(select(models.MillJob).filter(models.MillJob.job_id == job_id))).scalars().first()
    if not aj: raise HTTPException(404, "Job not found")
    
    ex = (await db.execute(select(models.ExtruderJob).filter(models.ExtruderJob.job_id == aj.extruder_job_id))).scalars().first()
    setup_logs = (await db.execute(select(models.MillSetupLog).filter(models.MillSetupLog.job_id == job_id).order_by(models.MillSetupLog.id.desc()))).scalars().all()
    prod_logs = (await db.execute(select(models.MillProductionLog).filter(models.MillProductionLog.job_id == job_id).order_by(models.MillProductionLog.id.desc()))).scalars().all()
    
    return {
        "job_id": aj.job_id, "extruder_job_id": ex.job_id, "extruder_line": ex.extruder_line,
        "po_no": ex.po_no, "product_code": ex.product_code, "target_kg": ex.target_kg, 
        "box_weight": aj.box_weight, "mill_line": aj.mill_line, 
        "feeder_set": aj.feeder_set,
        "separator_set": aj.separator_set,
        "rotor_set": aj.rotor_set,
        "air_flow_set": aj.air_flow_set,
        "setup_logs": setup_logs, "production_logs": prod_logs
    }

@router.post("/mill/log/setup")
async def add_mill_setup_log(req: MillSetupLogRequest, db: AsyncSession = Depends(database.get_db)):
    diff = req.add_before_grind_a - req.add_after_grind_b
    log = models.MillSetupLog(
        job_id=req.job_id, mill_line=req.mill_line, setup_bin=req.setup_bin, setup_kg=req.setup_kg,
        start_time=parse_time(req.start_time), stop_time=parse_time(req.stop_time), duration_min=calc_duration(req.start_time, req.stop_time),
        feeder_rpm=req.feeder_rpm, separator_rpm=req.separator_rpm, rotor_rpm=req.rotor_rpm,
        air_flow=req.air_flow, inlet_temp=req.inlet_temp, outlet_temp=req.outlet_temp, fg_temp=req.fg_temp,
        sieve_size=req.sieve_size, is_sieve_ok=req.is_sieve_ok, is_ovs_ok=req.is_ovs_ok,
        ovs_kg=req.ovs_kg, waste_kg=req.waste_kg, dust_kg=req.dust_kg,
        ovs_mix_kg=req.ovs_mix_kg, dust_mix_kg=req.dust_mix_kg,
        additive_code=req.additive_code, additive_weight_kg=req.additive_weight_kg,
        add_before_grind_a=req.add_before_grind_a, add_after_grind_b=req.add_after_grind_b, add_used_diff=diff,
        feed_rate_kg_h=req.feed_rate_kg_h,
        remark_quality=req.remarks.get('quality'), remark_machine=req.remarks.get('machine'), remark_other=req.remarks.get('other')
    )
    db.add(log); await db.commit(); await db.refresh(log)
    return log

@router.post("/mill/log/production")
async def add_mill_production_log(req: MillProductionLogRequest, db: AsyncSession = Depends(database.get_db)):
    diff = req.add_before_grind_a - req.add_after_grind_b
    box_count = (req.box_end - req.box_start) + 1
    job = (await db.execute(select(models.MillJob).filter(models.MillJob.job_id == req.job_id))).scalars().first()
    total_weight = box_count * (job.box_weight if job else 20)

    log = models.MillProductionLog(
        job_id=req.job_id, mill_line=req.mill_line, granule_bin_no=req.granule_bin_no,
        box_start=req.box_start, box_end=req.box_end, box_count=box_count, total_weight_kg=total_weight,
        start_time=parse_time(req.start_time), stop_time=parse_time(req.stop_time), duration_min=calc_duration(req.start_time, req.stop_time),
        feeder_rpm=req.feeder_rpm, separator_rpm=req.separator_rpm, rotor_rpm=req.rotor_rpm,
        air_flow=req.air_flow, inlet_temp=req.inlet_temp, outlet_temp=req.outlet_temp, fg_temp=req.fg_temp,
        sieve_size=req.sieve_size, is_sieve_ok=req.is_sieve_ok, is_ovs_ok=req.is_ovs_ok,
        ovs_kg=req.ovs_kg, waste_kg=req.waste_kg, dust_kg=req.dust_kg,
        ovs_mix_kg=req.ovs_mix_kg, dust_mix_kg=req.dust_mix_kg,
        additive_code=req.additive_code, additive_weight_kg=req.additive_weight_kg,
        add_before_grind_a=req.add_before_grind_a, add_after_grind_b=req.add_after_grind_b, add_used_diff=diff,
        feed_rate_kg_h=req.feed_rate_kg_h,
        remark_quality=req.remarks.get('quality'), remark_machine=req.remarks.get('machine'), remark_other=req.remarks.get('other')
    )
    db.add(log); await db.commit(); await db.refresh(log)
    return log

@router.delete("/mill/log/setup/delete/{log_id}")
async def delete_mill_setup_log(log_id: int, db: AsyncSession = Depends(database.get_db)):
    log = (await db.execute(select(models.MillSetupLog).filter(models.MillSetupLog.id == log_id))).scalars().first()
    if not log: raise HTTPException(404, "Log not found")
    await db.delete(log); await db.commit()
    return {"msg": "Deleted"}

@router.delete("/mill/log/production/delete/{log_id}")
async def delete_mill_production_log(log_id: int, db: AsyncSession = Depends(database.get_db)):
    log = (await db.execute(select(models.MillProductionLog).filter(models.MillProductionLog.id == log_id))).scalars().first()
    if not log: raise HTTPException(404, "Log not found")
    await db.delete(log); await db.commit()
    return {"msg": "Deleted"}

@router.post("/mill/job/finish/{job_id}")
async def finish_mill_job(job_id: int, db: AsyncSession = Depends(database.get_db)):
    mill_job = (await db.execute(select(models.MillJob).filter(models.MillJob.job_id == job_id))).scalars().first()
    if not mill_job: raise HTTPException(404, "Job not found")
    mill_job.status = 'COMPLETED'
    ex_job = (await db.execute(select(models.ExtruderJob).filter(models.ExtruderJob.job_id == mill_job.extruder_job_id))).scalars().first()
    if ex_job: ex_job.status = 'COMPLETED'
    await db.commit()
    return {"msg": "Job Finished"}