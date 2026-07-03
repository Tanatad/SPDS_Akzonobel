from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select
from sqlalchemy import desc, or_, func
from typing import Optional
import math
from collections import defaultdict
from app.db import database, models

router = APIRouter()

# ✅ API หลักสำหรับ History Page (รองรับ Pagination & Search และแก้บั๊ก 500 แล้ว)
@router.get("/history/query")
async def query_history(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    extruder_line: Optional[str] = None,
    mill_line: Optional[str] = None,
    db: AsyncSession = Depends(database.get_db)
):
    # 1. Base Query
    query_stmt = select(models.ExtruderJob)
    
    # Join MillJob for filtering ONLY (ไม่ต้อง load ข้อมูลตรงนี้)
    query_stmt = query_stmt.outerjoin(models.MillJob, models.ExtruderJob.job_id == models.MillJob.extruder_job_id)

    # 2. Filters
    if search:
        search_term = f"%{search}%"
        query_stmt = query_stmt.filter(
            or_(
                models.ExtruderJob.po_no.ilike(search_term),
                models.ExtruderJob.product_code.ilike(search_term),
                models.ExtruderJob.operator_name.ilike(search_term)
            )
        )
    if start_date:
        query_stmt = query_stmt.filter(models.ExtruderJob.created_at >= start_date)
    if end_date:
        query_stmt = query_stmt.filter(models.ExtruderJob.created_at <= f"{end_date} 23:59:59")
    if extruder_line and extruder_line.isdigit():
        query_stmt = query_stmt.filter(models.ExtruderJob.extruder_line == int(extruder_line))
    if mill_line and mill_line.isdigit():
        query_stmt = query_stmt.filter(models.MillJob.mill_line == int(mill_line))

    # 3. Pagination (✅ แก้บั๊กสำหรับ SQLite)
    total_count = (await db.execute(select(func.count(func.distinct(models.ExtruderJob.job_id))).select_from(query_stmt.subquery()))).scalar()
    total_pages = math.ceil(total_count / limit) if limit > 0 else 1

    # 4. Fetch Extruder Data (🚀 เปลี่ยนเป็น selectinload)
    # selectinload จะยิง Query แยก 1 ครั้งเพื่อดึงลูกๆ ทั้งหมด (เร็วกว่า joinedload ที่ join ตารางใหญ่ๆ)
    jobs = (await db.execute(query_stmt.options(
        selectinload(models.ExtruderJob.warmups),
        selectinload(models.ExtruderJob.setups),
        selectinload(models.ExtruderJob.productions)
    ).order_by(desc(models.ExtruderJob.created_at)) \
     .offset((page - 1) * limit) \
     .limit(limit) \
     )).unique().scalars().all()

# 5. 🚀 Fetch Mill Data (คืนค่าโครงสร้างดั้งเดิม เพื่อไม่ให้หน้า History หลักพัง)
    mill_map = {}
    if jobs:
        job_ids = [job.job_id for job in jobs]
        
        # ดึง Mill Job ทั้งหมดที่เกี่ยวข้องใน "ครั้งเดียว"
        mill_jobs = (await db.execute(select(models.MillJob).filter(models.MillJob.extruder_job_id.in_(job_ids)))).scalars().all()
        
        if mill_jobs:
            mill_job_ids = [m.job_id for m in mill_jobs]
            
            # ดึง Logs ทั้ง 2 แบบของ Mill
            mill_setups = (await db.execute(select(models.MillSetupLog).filter(models.MillSetupLog.job_id.in_(mill_job_ids)))).scalars().all()
            mill_prods = (await db.execute(select(models.MillProductionLog).filter(models.MillProductionLog.job_id.in_(mill_job_ids)))).scalars().all()
            
            # จับมัดรวมกันตาม ID ของ Mill เหมือนเวอร์ชันแรกสุดเป๊ะๆ
            logs_map = defaultdict(list)
            for s in mill_setups: logs_map[s.job_id].append(s)
            for p in mill_prods: logs_map[p.job_id].append(p)
            
            # Mapping เข้า Map หลัก
            for m in mill_jobs:
                mill_map[m.extruder_job_id] = {
                    "data": m,
                    "logs": logs_map[m.job_id] # กลับมาใช้คีย์ "logs" รวมร่างเหมือนเดิม
                }

    # 6. Format Result (จับคู่ใน Memory + เพิ่มฟิลด์ใหม่แบบไม่ทำลายของเดิม)
    results = []
    for job in jobs:
        # แปลงเป็น dict
        job_dict = {c.name: getattr(job, c.name) for c in job.__table__.columns}
        
        # ใส่ข้อมูลลูกๆ ของ Extruder กลับเข้าไป
        job_dict['warmups'] = job.warmups
        job_dict['setups'] = job.setups
        job_dict['productions'] = job.productions

        # ดึง Mill Data จาก Map
        mill_info = mill_map.get(job.job_id)
        
        if mill_info:
            job_dict['mill_data'] = mill_info["data"]
            job_dict['mill_logs'] = mill_info["logs"] # ✅ คืนค่านี้กลับไป! หน้าจอประวัติหลักจะกลับมาโชว์ข้อมูลทันที
            
            # ✅ ส่งค่า Condition ตั้งต้นออกมาที่ Root Level เพื่อให้ใบ Print ดึงไปใช้ในช่อง Start ได้
            job_dict['feeder_set'] = mill_info["data"].feeder_set
            job_dict['separator_set'] = mill_info["data"].separator_set
            job_dict['rotor_set'] = mill_info["data"].rotor_set
            job_dict['air_flow_set'] = mill_info["data"].air_flow_set
            
            # ✅ แยกประเภทเผื่อไว้ให้ฟังก์ชันช่วยเหลือ (getSetupValue) ในใบปริ้นท์เลือกส่องดูข้อมูล
            job_dict['setup_logs'] = [l for l in mill_info["logs"] if isinstance(l, models.MillSetupLog)]
            job_dict['production_logs'] = [l for l in mill_info["logs"] if isinstance(l, models.MillProductionLog)]
            job_dict['mill_production_logs'] = job_dict['production_logs'] # ป้องกันการสับสนชื่อตัวแปรในหน้าปริ้นท์
        else:
            job_dict['mill_data'] = None
            job_dict['mill_logs'] = []
            job_dict['feeder_set'] = None
            job_dict['separator_set'] = None
            job_dict['rotor_set'] = None
            job_dict['air_flow_set'] = None
            job_dict['setup_logs'] = []
            job_dict['production_logs'] = []
            job_dict['mill_production_logs'] = []
            
        results.append(job_dict)

    return {
        "items": results,
        "total_count": total_count,
        "total_pages": total_pages,
        "current_page": page
    }

# --- (Optional) เก็บอันเก่าไว้เผื่อใช้อ้างอิง แต่ Frontend ไม่ได้เรียกใช้แล้ว ---

@router.get("/history/extruder")
async def get_extruder_history(limit: int = 50, db: AsyncSession = Depends(database.get_db)):
    jobs = (await db.execute(select(models.ExtruderJob).options(
        joinedload(models.ExtruderJob.warmups),
        joinedload(models.ExtruderJob.setups),
        joinedload(models.ExtruderJob.productions)
    ).order_by(desc(models.ExtruderJob.created_at)).limit(limit))).unique().scalars().all()
    return jobs

@router.get("/history/mill")
async def get_mill_history(limit: int = 50, db: AsyncSession = Depends(database.get_db)):
    jobs = (await db.execute(select(
        models.MillJob, 
        models.ExtruderJob.po_no, 
        models.ExtruderJob.product_code
    ).join(
        models.ExtruderJob, models.MillJob.extruder_job_id == models.ExtruderJob.job_id
    ).order_by(desc(models.MillJob.created_at)).limit(limit))).all()

    results = []
    for mill_job, po, code in jobs:
        job_dict = mill_job.__dict__.copy()
        job_dict.pop('_sa_instance_state', None) # ป้องกัน error จาก SQLAlchemy state
        job_dict['po_no'] = po
        job_dict['product_code'] = code
        results.append(job_dict)
        
    return results

@router.get("/history/all")
async def get_all_history(limit: int = 100, db: AsyncSession = Depends(database.get_db)):
    jobs = (await db.execute(select(models.ExtruderJob).options(
        joinedload(models.ExtruderJob.warmups),
        joinedload(models.ExtruderJob.setups),
        joinedload(models.ExtruderJob.productions),
    ).order_by(desc(models.ExtruderJob.created_at)).limit(limit))).unique().scalars().all()

    results = []
    for job in jobs:
        mill_job = (await db.execute(select(models.MillJob).filter(models.MillJob.extruder_job_id == job.job_id))).scalars().first()
        job_dict = job.__dict__.copy()
        job_dict.pop('_sa_instance_state', None)
        if mill_job:
            job_dict['mill_data'] = mill_job
            job_dict['mill_logs'] = []
        else:
            job_dict['mill_data'] = None
            job_dict['mill_logs'] = []
        results.append(job_dict)

    return results