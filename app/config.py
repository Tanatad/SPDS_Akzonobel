from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # นี่คือ "พิมพ์เขียว" ของค่า setting ของเรา
    # มันจะมองหาตัวแปรชื่อ DATABASE_URL
    DATABASE_URL: str
    VMIS_USERNAME: str
    VMIS_PASSWORD: str
    # นี่คือ "เวทมนตร์" ที่บอก Pydantic ให้อ่านค่าจากไฟล์ .env
    model_config = SettingsConfigDict(env_file=".env")

# สร้าง instance ของ settings 
# เพื่อให้ไฟล์อื่นในโปรเจกต์ของเรามา import ไปใช้ได้
settings = Settings()

# (ทดสอบ) ลองพิมพ์ค่าที่อ่านได้ออกมาดู
print(f"--- Loading settings ---")
print(f"Database URL loaded: {settings.DATABASE_URL[:30]}...") # โชว์แค่ 30 ตัวแรก