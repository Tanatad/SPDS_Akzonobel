'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Factory, Lock, User, KeyRound, CheckCircle2, AlertCircle, ShieldCheck, ArrowLeft, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// ✅ Component InputField
const InputField = ({ icon: Icon, type, placeholder, value, onChange, required = true, maxLength, autoFocus }: any) => (
  <div className="relative group">
    <div className="absolute left-4 top-3.5 text-slate-400 pointer-events-none group-focus-within:text-blue-600 transition-colors duration-300">
      <Icon className="w-5 h-5" />
    </div>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-slate-700 font-medium placeholder-slate-400"
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      autoFocus={autoFocus}
      autoComplete="off"
    />
  </div>
);

export default function AuthPage() {
  const router = useRouter();
  const [isLoginTab, setIsLoginTab] = useState(true);
  
  // State MFA
  const [showMFA, setShowMFA] = useState(false);      // Verify OTP
  const [showSetup, setShowSetup] = useState(false);  // Setup QR
  const [setupURI, setSetupURI] = useState('');       

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form States
  const [lUser, setLUser] = useState('');
  const [lPass, setLPass] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const [rUser, setRUser] = useState('');
  const [rPass, setRPass] = useState('');
  const [rConfirm, setRConfirm] = useState('');
  const [rCode, setRCode] = useState('');

  useEffect(() => {
    setLUser(''); setLPass(''); setMfaCode('');
    setRUser(''); setRPass(''); setRConfirm(''); setRCode('');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');

    try {
      const payload = { 
          username: lUser, 
          password: lPass, 
          mfa_code: mfaCode || null 
      };
      
      const res = await api.post('/auth/login', payload);

      if (res.status === 200) {
        localStorage.setItem('token', res.data.access_token);
        localStorage.setItem('user', JSON.stringify({ username: res.data.username, role: res.data.role }));
        router.push('/dashboard/extruder');
      }

    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const content = err.response?.data;

      if (detail === 'MFA_REQUIRED') {
          setShowMFA(true);
          setError('');
      } else if (detail === 'MFA_SETUP_REQUIRED') {
          setSetupURI(content.otpauth_url);
          setShowSetup(true);
          setError('');
      } else {
          // รวมกรณี Account Pending Approval ด้วย
          setError(detail || 'Login failed');
          setMfaCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!rUser || !rPass || !rCode) { setError('Please fill all fields'); return; }
    if (rPass !== rConfirm) { setError('Passwords mismatch'); return; }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', { 
        username: rUser, 
        password: rPass, 
        invite_code: rCode 
      });

      if (res.status === 201) {
        setSuccess('📝 Account created! Please wait for Manager Approval.');
        setRUser(''); setRPass(''); setRConfirm(''); setRCode('');
        setTimeout(() => {
            setIsLoginTab(true);
            setSuccess('');
        }, 3000);
      }
    } catch (err: any) {
        if (err.response?.status === 403) {
            setError('❌ Invalid Company Invite Code!');
        } else {
            setError(err.response?.data?.detail || 'Registration failed');
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f172a]">
      
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]"></div>
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ 
                 backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', 
                 backgroundSize: '50px 50px' 
             }}>
        </div>
        <motion.div 
            animate={{ opacity: [0.4, 0.6, 0.4], scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"
        />
      </div>

      <div className="absolute top-8 right-8 z-20 opacity-80">
         <h2 className="text-white font-bold tracking-wider text-xl">AkzoNobel</h2>
      </div>

      {/* Main Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-[440px] relative z-10 mx-4 border border-slate-100 overflow-hidden"
      >
        
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-blue-50 rounded-2xl mb-4">
             <div className="bg-blue-600 w-14 h-14 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Factory className="text-white w-7 h-7" />
             </div>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Production Logger</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Smart Manufacturing System</p>
        </div>

        {/* Tab Switcher */}
        {!showMFA && !showSetup && (
            <div className="flex p-1.5 bg-slate-100 rounded-xl mb-8">
                <button 
                    onClick={() => { setIsLoginTab(true); setError(''); setSuccess(''); }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${isLoginTab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Sign In
                </button>
                <button 
                    onClick={() => { setIsLoginTab(false); setError(''); setSuccess(''); }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${!isLoginTab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Sign Up
                </button>
            </div>
        )}

        <AnimatePresence mode='wait'>
            {error && (
                <motion.div key="err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center font-medium">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0"/>{error}
                </motion.div>
            )}
            {success && (
                <motion.div key="succ" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm flex items-center font-medium">
                    <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0"/>{success}
                </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence mode='wait'>
            
            {/* 1. Setup MFA (QR Code) */}
            {showSetup ? (
                <motion.div 
                    key="setup"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="text-center"
                >
                    <div className="mb-4">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
                            <QrCode className="text-blue-600"/> Setup Security
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Scan this QR Code with <b>Google Authenticator</b></p>
                    </div>
                    
                    <div className="bg-white p-3 rounded-xl border-2 border-slate-100 inline-block mb-6 shadow-sm">
                        {setupURI && <QRCodeSVG value={setupURI} size={160} />}
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="text-left">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1">Enter 6-digit Code to Activate</label>
                            <input
                                type="text"
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                                className="w-full text-center text-2xl font-mono tracking-widest py-3 rounded-xl border-2 border-blue-100 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white transition-all text-slate-700 font-bold"
                                placeholder="000 000"
                                autoFocus
                                maxLength={6}
                            />
                        </div>
                        <button
                            type="submit" disabled={loading || mfaCode.length < 6}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Activate & Login'}
                        </button>
                    </form>
                </motion.div>

            /* 2. Verify MFA (OTP) */
            ) : showMFA ? (
                <motion.div 
                    key="mfa"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                >
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <ShieldCheck className="w-8 h-8 text-blue-600"/>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Two-Factor Authentication</h3>
                        <p className="text-xs text-slate-500 mt-1 px-4">Enter code from Authenticator App</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <input
                            type="text"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                            className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 rounded-xl border-2 border-blue-100 focus:border-blue-500 outline-none text-slate-700 font-bold bg-slate-50 focus:bg-white transition-all"
                            placeholder="000000"
                            autoFocus
                            maxLength={6}
                        />
                        <button
                            type="submit" disabled={loading || mfaCode.length < 6}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-4 flex items-center justify-center"
                        >
                            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Verify & Login'}
                        </button>
                        <button type="button" onClick={()=>{setShowMFA(false); setError(''); setMfaCode('');}} className="w-full text-xs text-slate-400 font-bold hover:text-slate-600 mt-4 flex items-center justify-center gap-1">
                            <ArrowLeft size={12}/> Back to Login
                        </button>
                    </form>
                </motion.div>

            /* 3. Login Form */
            ) : isLoginTab ? (
                <motion.form 
                    key="login"
                    onSubmit={handleLogin} 
                    className="space-y-5" 
                    autoComplete="off"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                >
                    <InputField icon={User} type="text" placeholder="Employee ID / Email" value={lUser} onChange={setLUser} />
                    <InputField icon={Lock} type="password" placeholder="Password" value={lPass} onChange={setLPass} />
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-70 mt-4 flex items-center justify-center">
                        {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span> : 'Access System'}
                    </button>
                </motion.form>

            /* 4. Register Form */
            ) : (
                <motion.form 
                    key="register"
                    onSubmit={handleRegister} 
                    className="space-y-5" 
                    autoComplete="off"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                >
                    <InputField icon={User} type="email" placeholder="name.surname@akzonobel.com" value={rUser} onChange={setRUser} />
                    <div className="grid grid-cols-2 gap-4">
                        <InputField icon={Lock} type="password" placeholder="Password" value={rPass} onChange={setRPass} />
                        <InputField icon={Lock} type="password" placeholder="Confirm" value={rConfirm} onChange={setRConfirm} required={false} />
                    </div>
                    <div className="pt-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 tracking-wider">Verification</label>
                        <InputField icon={KeyRound} type="password" placeholder="Company Invite Code" value={rCode} onChange={setRCode} />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-70 mt-6 flex items-center justify-center">
                        {loading ? 'Creating...' : 'Create Account'}
                    </button>
                </motion.form>
            )}
        </AnimatePresence>

      </motion.div>
      <p className="absolute bottom-8 text-slate-500/30 text-[10px] z-10 font-mono tracking-widest">
        SECURE PRODUCTION ENVIRONMENT • v1.2.0 (MFA)
      </p>
    </div>
  );
}