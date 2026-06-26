from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
import pyotp

from app.db import database, models

router = APIRouter()

# --- ⚙️ CONFIGURATION ---
SECRET_KEY = "AKZO_SUPER_SECRET_KEY_CHANGE_THIS_IN_PROD" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 
COMPANY_INVITE_CODE = "AKZO2025"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# --- 📦 SCHEMAS ---
class UserCreate(BaseModel):
    username: str
    password: str
    invite_code: str

class UserLogin(BaseModel):
    username: str
    password: str
    mfa_code: Optional[str] = None 

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str

# --- 🛠️ HELPER FUNCTIONS ---
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# --- 📝 REGISTER API ---
@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(database.get_db)):
    # 1. Validate Invite Code
    if user.invite_code != COMPANY_INVITE_CODE:
        raise HTTPException(status_code=403, detail="Invalid Company Invite Code!")

    # 2. Validate Email Domain
    required_domain = "@akzonobel.com"
    clean_username = user.username.lower().strip()
    
    if not clean_username.endswith(required_domain):
        raise HTTPException(status_code=400, detail=f"Registration restricted to {required_domain} only.")

    # 3. Check Duplicate
    if db.query(models.User).filter(models.User.username == clean_username).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 4. Create User (Wait for Approval)
    hashed_pwd = get_password_hash(user.password)
    mfa_secret = pyotp.random_base32() # สร้างกุญแจลับเตรียมไว้เลย

    new_user = models.User(
        username=clean_username, 
        password_hash=hashed_pwd, 
        role="operator",
        mfa_secret=mfa_secret, 
        mfa_enabled=False,
        is_active=False  # 🔒 ปิดการใช้งานไว้ก่อน จนกว่า Admin จะอนุมัติ
    )
    
    db.add(new_user)
    db.commit()
    
    return {"message": "Account created. Please wait for manager approval."}

# --- 🔐 LOGIN API (Secure Flow) ---
@router.post("/auth/login")
def login(user: UserLogin, db: Session = Depends(database.get_db)):
    clean_username = user.username.lower().strip()
    db_user = db.query(models.User).filter(models.User.username == clean_username).first()

    # 1. Basic Check (User/Pass)
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    # 🛑 2. APPROVAL CHECK: ถ้ายังไม่อนุมัติ ดีดออกทันที
    if not db_user.is_active:
        raise HTTPException(
            status_code=403, 
            detail="Account pending approval. Please contact Admin."
        )

    # 3. Handle Legacy Users (ถ้าไม่มี Secret ให้สร้างใหม่)
    if not db_user.mfa_secret:
        db_user.mfa_secret = pyotp.random_base32()
        db_user.mfa_enabled = False # บังคับ Setup ใหม่
        db.commit()
        db.refresh(db_user)

    totp = pyotp.TOTP(db_user.mfa_secret)

    # 4. MFA Logic
    if not db_user.mfa_enabled:
        # --- กรณี: เพิ่งเข้าครั้งแรก (ต้อง Setup) ---
        if user.mfa_code:
            # User สแกนแล้วส่ง Code มายืนยัน
            if totp.verify(user.mfa_code):
                db_user.mfa_enabled = True
                db.commit()
                # ผ่านไปรับ Token ด้านล่าง
            else:
                raise HTTPException(status_code=400, detail="Invalid Activation Code")
        else:
            # ยังไม่ส่ง Code -> ส่ง QR Link ให้ไปสแกน (ห้ามให้ Token)
            uri = totp.provisioning_uri(name=db_user.username, issuer_name="AkzoNobel App")
            return JSONResponse(
                status_code=403, 
                content={
                    "detail": "MFA_SETUP_REQUIRED", 
                    "otpauth_url": uri 
                }
            )

    else:
        # --- กรณี: เคย Setup แล้ว (ต้อง Verify) ---
        if not user.mfa_code:
            raise HTTPException(status_code=403, detail="MFA_REQUIRED")
        
        if not totp.verify(user.mfa_code):
            raise HTTPException(status_code=400, detail="Invalid 2FA Code")

    # 5. Generate Token (เมื่อผ่านทุกด่าน)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.username, "role": db_user.role}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": db_user.username,
        "role": db_user.role
    }

# --- 🛡️ Check Auth Status ---
@router.get("/auth/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "role": current_user.role,
        "mfa_enabled": current_user.mfa_enabled
    }