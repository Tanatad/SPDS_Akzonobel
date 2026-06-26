from sqlalchemy.orm import Session
from app.db import models
from app.models import schemas

# --- ไฟล์นี้เคยมีโค้ด Recipe เก่าอยู่ ทำให้เกิด Error ---
# --- ตอนนี้เราย้าย Logic การบันทึกไปไว้ใน router/production.py แล้ว ---
# --- ดังนั้นไฟล์นี้สามารถปล่อยโล่งๆ หรือเก็บ Helper function ได้ครับ ---

def get_log_by_id(db: Session, log_id: int):
    """ฟังก์ชันช่วยค้นหา Log ตาม ID (เผื่อได้ใช้)"""
    return db.query(models.ProductionLog).filter(models.ProductionLog.log_id == log_id).first()

def get_pending_jobs(db: Session):
    """ฟังก์ชันดึงงานที่รอ Mill (เผื่อได้ใช้)"""
    return db.query(models.ProductionLog).filter(models.ProductionLog.status == 'WAITING_MILL').all()