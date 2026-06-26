from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
import datetime

# -------------------------------------------------------------------
# 🏭 EXTRUDER STATION MODELS
# -------------------------------------------------------------------

class ExtruderJob(Base):
    __tablename__ = "extruder_jobs"
    job_id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.now)
    po_no = Column(String, index=True); product_code = Column(String); operator_name = Column(String)
    extruder_line = Column(Integer); planned_mill_line = Column(Integer)
    target_pots = Column(Float, default=0.0); target_kg = Column(Float, default=0.0)
    status = Column(String, default='IN_PROGRESS')
    
    warmups = relationship("WarmupLog", back_populates="job")
    setups = relationship("SetupLog", back_populates="job")
    productions = relationship("ProductionLog", back_populates="job")

class WarmupLog(Base):
    __tablename__ = "warmup_logs"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("extruder_jobs.job_id"))
    extruder_line = Column(Integer) 
    
    job = relationship("ExtruderJob", back_populates="warmups")
    created_at = Column(DateTime, default=datetime.datetime.now)
    start_time = Column(DateTime, nullable=True); stop_time = Column(DateTime, nullable=True); duration_min = Column(Integer, default=0)
    act_ht1 = Column(Float); act_ht2 = Column(Float); act_ht3 = Column(Float); act_ht4 = Column(Float); act_ht5 = Column(Float)
    remark = Column(String, nullable=True)

class SetupLog(Base):
    __tablename__ = "setup_logs"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("extruder_jobs.job_id"))
    extruder_line = Column(Integer) 
    
    job = relationship("ExtruderJob", back_populates="setups")
    created_at = Column(DateTime, default=datetime.datetime.now)
    setup_bin = Column(String); setup_kg = Column(Float, default=0.0)
    start_time = Column(DateTime); stop_time = Column(DateTime); duration_min = Column(Integer, default=0)
    std_screw_rpm = Column(Float); act_screw_rpm = Column(Float); std_torque_pct = Column(Float); act_torque_pct = Column(Float); std_side_feed_pct = Column(Float); act_side_feed_pct = Column(Float)
    act_outlet_temp = Column(Float); barrel_water_flow = Column(Float); barrel_water_temp = Column(Float)
    std_ht1 = Column(Float); act_ht1 = Column(Float); std_ht2 = Column(Float); act_ht2 = Column(Float); std_ht3 = Column(Float); act_ht3 = Column(Float); std_ht4 = Column(Float); act_ht4 = Column(Float); std_ht5 = Column(Float); act_ht5 = Column(Float)
    first_lot_kg = Column(Float, default=0.0); purge_resin_kg = Column(Float, default=0.0)
    is_color_ok = Column(Boolean, default=True); is_shade_ok = Column(Boolean, default=True); is_dispersion_ok = Column(Boolean, default=True)
    remark_quality = Column(String, nullable=True); remark_machine = Column(String, nullable=True); remark_other = Column(String, nullable=True)

class ProductionLog(Base):
    __tablename__ = "production_logs"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("extruder_jobs.job_id"))
    extruder_line = Column(Integer) 
    
    job = relationship("ExtruderJob", back_populates="productions")
    created_at = Column(DateTime, default=datetime.datetime.now)
    granule_bin_no = Column(String); pot_qty = Column(Float, default=0.0)
    start_time = Column(DateTime); stop_time = Column(DateTime); duration_min = Column(Integer, default=0)
    std_screw_rpm = Column(Float); act_screw_rpm = Column(Float); std_torque_pct = Column(Float); act_torque_pct = Column(Float); std_side_feed_pct = Column(Float); act_side_feed_pct = Column(Float)
    act_outlet_temp = Column(Float); barrel_water_flow = Column(Float); barrel_water_temp = Column(Float)
    std_ht1 = Column(Float); act_ht1 = Column(Float); std_ht2 = Column(Float); act_ht2 = Column(Float); std_ht3 = Column(Float); act_ht3 = Column(Float); std_ht4 = Column(Float); act_ht4 = Column(Float); std_ht5 = Column(Float); act_ht5 = Column(Float)
    first_lot_kg = Column(Float, default=0.0); purge_resin_kg = Column(Float, default=0.0)
    is_color_ok = Column(Boolean, default=True); is_shade_ok = Column(Boolean, default=True); is_dispersion_ok = Column(Boolean, default=True)
    remark_quality = Column(String, nullable=True); remark_machine = Column(String, nullable=True); remark_other = Column(String, nullable=True)

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True); password_hash = Column(String); role = Column(String, default="operator")
    created_at = Column(DateTime, default=datetime.datetime.now)
    mfa_secret = Column(String, nullable=True) 
    mfa_enabled = Column(Boolean, default=False) 
    is_active = Column(Boolean, default=False)
 
# -------------------------------------------------------------------
# 🏭 MILL STATION MODELS
# -------------------------------------------------------------------

class MillJob(Base):
    __tablename__ = "mill_jobs"
    job_id = Column(Integer, primary_key=True, index=True)
    extruder_job_id = Column(Integer, ForeignKey("extruder_jobs.job_id"))
    mill_line = Column(Integer)
    box_weight = Column(Integer) 
    status = Column(String, default='IN_PROGRESS') 
    created_at = Column(DateTime, default=datetime.datetime.now)
    
    # ✅ เพิ่มคอลัมน์ Set up สำหรับใบ Print
    feeder_set = Column(Float, nullable=True)
    separator_set = Column(Float, nullable=True)
    rotor_set = Column(Float, nullable=True)
    air_flow_set = Column(Float, nullable=True)
    
    setups = relationship("MillSetupLog", back_populates="job")
    productions = relationship("MillProductionLog", back_populates="job")

class MillSetupLog(Base):
    __tablename__ = "mill_setup_logs"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("mill_jobs.job_id"))
    mill_line = Column(Integer) 
    
    job = relationship("MillJob", back_populates="setups")
    created_at = Column(DateTime, default=datetime.datetime.now)
    
    setup_bin = Column(String) # ✅ เพิ่มคอลัมน์ เลขถังเซ็ทอัพ
    setup_kg = Column(Float, default=0.0)
    
    start_time = Column(DateTime); stop_time = Column(DateTime); duration_min = Column(Integer, default=0)
    feeder_rpm = Column(Float); separator_rpm = Column(Float); rotor_rpm = Column(Float)
    air_flow = Column(Float); inlet_temp = Column(Float); outlet_temp = Column(Float)
    fg_temp = Column(Float) 
    sieve_size = Column(String) 
    is_sieve_ok = Column(Boolean, default=True); is_ovs_ok = Column(Boolean, default=True) 
    ovs_kg = Column(Float, default=0.0); waste_kg = Column(Float, default=0.0); dust_kg = Column(Float, default=0.0)
    ovs_mix_kg = Column(Float, default=0.0); dust_mix_kg = Column(Float, default=0.0) 
    additive_code = Column(String, default="131219"); additive_weight_kg = Column(Float, default=0.0) 
    add_before_grind_a = Column(Float, default=0.0); add_after_grind_b = Column(Float, default=0.0); add_used_diff = Column(Float, default=0.0) 
    feed_rate_kg_h = Column(Float, default=0.0) 
    remark_quality = Column(String, nullable=True); remark_machine = Column(String, nullable=True); remark_other = Column(String, nullable=True)

class MillProductionLog(Base):
    __tablename__ = "mill_production_logs"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("mill_jobs.job_id"))
    mill_line = Column(Integer) 
    
    job = relationship("MillJob", back_populates="productions")
    created_at = Column(DateTime, default=datetime.datetime.now)
    
    granule_bin_no = Column(String) # ✅ เพิ่มคอลัมน์ เลขถังบด (ถังที่)
    box_start = Column(Integer); box_end = Column(Integer); box_count = Column(Integer); total_weight_kg = Column(Float) 
    
    start_time = Column(DateTime); stop_time = Column(DateTime); duration_min = Column(Integer, default=0)
    feeder_rpm = Column(Float); separator_rpm = Column(Float); rotor_rpm = Column(Float)
    air_flow = Column(Float); inlet_temp = Column(Float); outlet_temp = Column(Float)
    fg_temp = Column(Float) 
    sieve_size = Column(String) 
    is_sieve_ok = Column(Boolean, default=True); is_ovs_ok = Column(Boolean, default=True) 
    ovs_kg = Column(Float, default=0.0); waste_kg = Column(Float, default=0.0); dust_kg = Column(Float, default=0.0)
    ovs_mix_kg = Column(Float, default=0.0); dust_mix_kg = Column(Float, default=0.0) 
    additive_code = Column(String, default="131219"); additive_weight_kg = Column(Float, default=0.0) 
    add_before_grind_a = Column(Float, default=0.0); add_after_grind_b = Column(Float, default=0.0); add_used_diff = Column(Float, default=0.0) 
    feed_rate_kg_h = Column(Float, default=0.0) 
    remark_quality = Column(String, nullable=True); remark_machine = Column(String, nullable=True); remark_other = Column(String, nullable=True)