import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast, { Toaster } from 'react-hot-toast';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");

    setLoading(true);
try {
      // API instance handles the Base URL (http://nextgen-lms-fawad.duckdns.org)
      await API.post('/api/auth/reset-password', { token, newPassword });
      toast.success("Password updated! Redirecting...");
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired token");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Added responsive padding: p-4 for small mobile, p-6 for tablet+
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-['Plus_Jakarta_Sans'] p-4 md:p-6">
      <Toaster />
      
      {/* Container: Full width on small screens, capped at max-md on desktop */}
      <div className="w-full max-w-md bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-slate-100">
        
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 mb-2 tracking-tight">Set New Password</h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">
            Choose a strong, unique password to secure your account.
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-4 md:space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">New Password</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-5 py-3.5 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all text-sm font-medium"
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Confirm Password</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-5 py-3.5 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all text-sm font-medium"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Updating...
              </>
            ) : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;