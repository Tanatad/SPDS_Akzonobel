from pydantic import BaseModel
from typing import Optional
import datetime

# --- 1. Form สำหรับ Extruder (เอา Batch ออก) ---
class ExtruderInput(BaseModel):
    po_no: str
    product_code: str
    extruder_line: int
    mill_line: int # (Plan)

# --- 2. Form สำหรับ Mill (เหมือนเดิม) ---
class MillInput(BaseModel):
    log_id: int
    actual_mill_line: int 

# --- 3. Model สำหรับแสดงผล ---
class ProductionLog(BaseModel):
    log_id: int
    created_at: datetime.datetime
    status: str
    po_no: str
    product_code: str
    extruder_line: int
    
    timestamp_extruder: Optional[datetime.datetime]
    actual_screw_rpm: Optional[float]
    actual_ht1: Optional[float]
    
    timestamp_mill: Optional[datetime.datetime]
    actual_mill_line: Optional[int]
    
    class Config:
        from_attributes = True