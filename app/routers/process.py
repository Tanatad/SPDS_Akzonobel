from sqlalchemy import select
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import asyncio
from app.db import database, models
from app.services import kepware_connector as kepware

router = APIRouter()

# --- Helpers ---
def calculate_duration_min(start_dt: datetime, stop_dt: datetime):
    try:
        diff = stop_dt - start_dt
        return max(0, int(diff.total_seconds() / 60))
    except: 
        return 0

# --- Schemas ---
class JobStartRequest(BaseModel):
    # ✅ ลบ planned_mill_line ออก เพราะเราใช้ Central Pool แล้ว
    po_no: str; product_code: str; operator_name: str; extruder_line: int
    target_pots: float; target_kg: float

class WarmupLogRequest(BaseModel):
    job_id: int; extruder_line: int # ✅ เพิ่ม extruder_line
    start_time: datetime; stop_time: datetime; remark: Optional[str] = None
    act_ht1: float; act_ht2: float; act_ht3: float; act_ht4: float; act_ht5: float

class SetupLogRequest(BaseModel):
    job_id: int; extruder_line: int # ✅ เพิ่ม extruder_line
    setup_bin: str; setup_kg: float; start_time: datetime; stop_time: datetime
    std_screw_rpm: float; act_screw_rpm: float; std_torque_pct: float; act_torque_pct: float
    std_side_feed_pct: float; act_side_feed_pct: float; act_outlet_temp: float
    std_ht1: float; act_ht1: float; std_ht2: float; act_ht2: float; std_ht3: float; act_ht3: float; std_ht4: float; act_ht4: float; std_ht5: float; act_ht5: float
    barrel_water_flow: float; barrel_water_temp: float
    first_lot_kg: float; purge_resin_kg: float
    is_color_ok: bool; is_shade_ok: bool; is_dispersion_ok: bool
    remark_quality: Optional[str] = None; remark_machine: Optional[str] = None; remark_other: Optional[str] = None

class ProductionLogRequest(BaseModel):
    job_id: int; extruder_line: int # ✅ เพิ่ม extruder_line
    granule_bin_no: str; pot_qty: float; start_time: datetime; stop_time: datetime
    std_screw_rpm: float; act_screw_rpm: float; std_torque_pct: float; act_torque_pct: float
    std_side_feed_pct: float; act_side_feed_pct: float; act_outlet_temp: float
    std_ht1: float; act_ht1: float; std_ht2: float; act_ht2: float; std_ht3: float; act_ht3: float; std_ht4: float; act_ht4: float; std_ht5: float; act_ht5: float
    barrel_water_flow: float; barrel_water_temp: float
    first_lot_kg: float; purge_resin_kg: float
    is_color_ok: bool; is_shade_ok: bool; is_dispersion_ok: bool
    remark_quality: Optional[str] = None; remark_machine: Optional[str] = None; remark_other: Optional[str] = None

# --- Endpoints ---
@router.get("/preview/extruder/{line_no}")
async def preview_extruder_data(line_no: int):
    try:
        return await asyncio.wait_for(kepware.read_extruder_only(line_no), timeout=10.0)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Kepware Timeout")
    except Exception as e:
        print(f"Kepware Error: {e}")
        return {
            "actual_screw_rpm": 0, "actual_torque_pct": 0, "actual_side_feed_pct": 0,
            "actual_ht1": 0, "actual_ht2": 0, "actual_ht3": 0, "actual_ht4": 0, "actual_ht5": 0,
            "std_screw_rpm": 0, "std_side_feed_pct": 0,
            "std_ht1": 0, "std_ht2": 0, "std_ht3": 0, "std_ht4": 0, "std_ht5": 0,
            "barrel_water_temp": 0, "barrel_water_flow": 0
        }

@router.post("/process/job/start", status_code=status.HTTP_201_CREATED)
async def start_job(req: JobStartRequest, db: AsyncSession = Depends(database.get_db)):
    # ✅ เช็คว่ามี PO นี้กำลังรันอยู่ (IN_PROGRESS) ในระบบหรือไม่ ป้องกันการสร้างซ้ำ!
    po_formatted = req.po_no.strip().upper()
    existing_job = (await db.execute(select(models.ExtruderJob).filter(
        models.ExtruderJob.po_no == po_formatted,
        models.ExtruderJob.status == 'IN_PROGRESS'
    ))).scalars().first()

    if existing_job:
        raise HTTPException(
            status_code=400, 
            detail=f"PO: {po_formatted} กำลังรันอยู่ที่เครื่อง Extruder {existing_job.extruder_line} กรุณากด Join แทนการ Start ใหม่!"
        )

    # ถ้าไม่มีค่อยสร้างงานใหม่
    new_job = models.ExtruderJob(
        po_no=po_formatted, 
        product_code=req.product_code.strip().upper(), 
        operator_name=req.operator_name,
        extruder_line=req.extruder_line, 
        planned_mill_line=0, # ใส่ 0 ไปเป็นค่า Default (ไม่ได้ใช้แล้ว)
        target_pots=req.target_pots, 
        target_kg=req.target_kg, 
        status='IN_PROGRESS'
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)
    return new_job

# ✅ [API ที่เติมกลับมาให้] ดึงงาน Active ของเครื่องตัวเอง
@router.get("/process/job/active/{extruder_line}")
async def get_active_job(extruder_line: int, db: AsyncSession = Depends(database.get_db)):
    return (await db.execute(select(models.ExtruderJob).options(
        joinedload(models.ExtruderJob.warmups), 
        joinedload(models.ExtruderJob.setups), 
        joinedload(models.ExtruderJob.productions)
    ).filter(
        models.ExtruderJob.extruder_line == extruder_line, 
        models.ExtruderJob.status == 'IN_PROGRESS'
    ))).unique().scalars().first()

# ✅ ดึงงาน IN_PROGRESS "ทั้งหมด" ให้หน้าจอนำไปแสดงผลให้คนเลือก Join
@router.get("/process/jobs/active/all")
async def get_all_active_jobs(db: AsyncSession = Depends(database.get_db)):
    return (await db.execute(select(models.ExtruderJob).filter(models.ExtruderJob.status == 'IN_PROGRESS').order_by(models.ExtruderJob.created_at.desc()))).scalars().all()

# ดึงรายละเอียดงานที่ต้องการ (พร้อม Logs)
@router.get("/process/job/detail/{job_id}")
async def get_job_detail(job_id: int, db: AsyncSession = Depends(database.get_db)):
    return (await db.execute(select(models.ExtruderJob).options(
        joinedload(models.ExtruderJob.warmups), joinedload(models.ExtruderJob.setups), joinedload(models.ExtruderJob.productions)
    ).filter(models.ExtruderJob.job_id == job_id))).unique().scalars().first()

@router.post("/process/log/warmup")
async def add_warmup(req: WarmupLogRequest, db: AsyncSession = Depends(database.get_db)):
    new_log = models.WarmupLog(
        job_id=req.job_id,
        extruder_line=req.extruder_line, # ✅ เซฟเบอร์เครื่อง
        start_time=req.start_time, 
        stop_time=req.stop_time,   
        duration_min=calculate_duration_min(req.start_time, req.stop_time),
        act_ht1=req.act_ht1, act_ht2=req.act_ht2, act_ht3=req.act_ht3, act_ht4=req.act_ht4, act_ht5=req.act_ht5,
        remark=req.remark
    )
    db.add(new_log)
    await db.commit()
    await db.refresh(new_log)
    return new_log      

@router.post("/process/log/setup")
async def add_setup(req: SetupLogRequest, db: AsyncSession = Depends(database.get_db)):
    new_log = models.SetupLog(
        job_id=req.job_id,
        extruder_line=req.extruder_line, # ✅ เซฟเบอร์เครื่อง
        setup_bin=req.setup_bin, setup_kg=req.setup_kg,
        start_time=req.start_time, stop_time=req.stop_time,
        duration_min=calculate_duration_min(req.start_time, req.stop_time),
        std_screw_rpm=req.std_screw_rpm, act_screw_rpm=req.act_screw_rpm,
        std_torque_pct=req.std_torque_pct, act_torque_pct=req.act_torque_pct,
        std_side_feed_pct=req.std_side_feed_pct, act_side_feed_pct=req.act_side_feed_pct,
        act_outlet_temp=req.act_outlet_temp,
        std_ht1=req.std_ht1, act_ht1=req.act_ht1, std_ht2=req.std_ht2, act_ht2=req.act_ht2,
        std_ht3=req.std_ht3, act_ht3=req.act_ht3, std_ht4=req.std_ht4, act_ht4=req.act_ht4,
        std_ht5=req.std_ht5, act_ht5=req.act_ht5,
        barrel_water_flow=req.barrel_water_flow, barrel_water_temp=req.barrel_water_temp,
        first_lot_kg=req.first_lot_kg, purge_resin_kg=req.purge_resin_kg, 
        is_color_ok=req.is_color_ok, is_shade_ok=req.is_shade_ok, is_dispersion_ok=req.is_dispersion_ok,
        remark_quality=req.remark_quality, remark_machine=req.remark_machine, remark_other=req.remark_other
    )
    db.add(new_log)
    await db.commit()
    await db.refresh(new_log)
    return new_log      

@router.post("/process/log/production")
async def add_production(req: ProductionLogRequest, db: AsyncSession = Depends(database.get_db)):
    new_log = models.ProductionLog(
        job_id=req.job_id,
        extruder_line=req.extruder_line, # ✅ เซฟเบอร์เครื่อง
        granule_bin_no=req.granule_bin_no, pot_qty=req.pot_qty,
        start_time=req.start_time, stop_time=req.stop_time,
        duration_min=calculate_duration_min(req.start_time, req.stop_time),
        std_screw_rpm=req.std_screw_rpm, act_screw_rpm=req.act_screw_rpm,
        std_torque_pct=req.std_torque_pct, act_torque_pct=req.act_torque_pct,
        std_side_feed_pct=req.std_side_feed_pct, act_side_feed_pct=req.act_side_feed_pct,
        act_outlet_temp=req.act_outlet_temp,
        std_ht1=req.std_ht1, act_ht1=req.act_ht1, std_ht2=req.std_ht2, act_ht2=req.act_ht2,
        std_ht3=req.std_ht3, act_ht3=req.act_ht3, std_ht4=req.std_ht4, act_ht4=req.act_ht4,
        std_ht5=req.std_ht5, act_ht5=req.act_ht5,
        barrel_water_flow=req.barrel_water_flow, barrel_water_temp=req.barrel_water_temp,
        first_lot_kg=req.first_lot_kg, purge_resin_kg=req.purge_resin_kg, 
        is_color_ok=req.is_color_ok, is_shade_ok=req.is_shade_ok, is_dispersion_ok=req.is_dispersion_ok,
        remark_quality=req.remark_quality, remark_machine=req.remark_machine, remark_other=req.remark_other
    )
    db.add(new_log)
    await db.commit()
    await db.refresh(new_log)
    return new_log      

@router.post("/process/job/finish/{job_id}")
async def finish_job(job_id: int, db: AsyncSession = Depends(database.get_db)):
    job = (await db.execute(select(models.ExtruderJob).filter(models.ExtruderJob.job_id == job_id))).scalars().first()
    if job: job.status = 'WAITING_MILL'; await db.commit()
    return {"msg": "Finished"}

@router.delete("/process/log/warmup/delete/{log_id}")
async def delete_warmup_log(log_id: int, db: AsyncSession = Depends(database.get_db)):
    log = (await db.execute(select(models.WarmupLog).filter(models.WarmupLog.id == log_id))).scalars().first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    await db.delete(log)
    await db.commit()
    return {"msg": "Warmup log deleted successfully"}

@router.delete("/process/log/setup/delete/{log_id}")
async def delete_setup_log(log_id: int, db: AsyncSession = Depends(database.get_db)):
    log = (await db.execute(select(models.SetupLog).filter(models.SetupLog.id == log_id))).scalars().first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    await db.delete(log)
    await db.commit()
    return {"msg": "Setup log deleted successfully"}

@router.delete("/process/log/production/delete/{log_id}")
async def delete_production_log(log_id: int, db: AsyncSession = Depends(database.get_db)):
    log = (await db.execute(select(models.ProductionLog).filter(models.ProductionLog.id == log_id))).scalars().first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    await db.delete(log)
    await db.commit()
    return {"msg": "Production log deleted successfully"}