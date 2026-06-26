import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # ✅ 1. เพิ่ม import นี้
from app.routers import process, auth, mill, history, ws
from app.db import database, models
import asyncio
from app.services.kepware_connector import kepware_client
from app.services.kepware_task import update_kepware_cache

# Async table creation
async def init_models():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

# สร้างแอปหลัก
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_models()
    await kepware_client.connect()

    # Start background task
    kepware_task = asyncio.create_task(update_kepware_cache())

    yield
    # Shutdown
    kepware_task.cancel()
    await kepware_client.disconnect()
app = FastAPI(title="AkzoNobel Production API", lifespan=lifespan)

# ✅ 2. เพิ่มส่วนตั้งค่า CORS (สำคัญมากสำหรับการเชื่อมต่อกับ Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # อนุญาตให้ทุกเว็บเรียกใช้ได้ (หรือระบุ ["http://localhost:3000"])
    allow_credentials=True,
    allow_methods=["*"], # อนุญาตทุก Method (GET, POST, PUT, DELETE)
    allow_headers=["*"], # อนุญาตทุก Header
)

# ✅ 3. เชื่อมต่อ Router (จัดระเบียบใหม่ ไม่ให้ซ้ำ)
app.include_router(auth.router, prefix="/api/v1") 
app.include_router(process.router, prefix="/api/v1")
app.include_router(mill.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(ws.router, prefix="/api/v1")

# (Optional) เช็คสถานะ API ง่ายๆ
@app.get("/")
def read_root():
    return {"message": "AkzoNobel API is running with CORS enabled!"}

if __name__ == "__main__":
    print("--- Starting Uvicorn server ---")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)