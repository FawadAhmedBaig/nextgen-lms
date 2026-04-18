import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';
import toast, { Toaster } from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Use the API instance with the relative path
      const res = await API.post('/auth/forgot-password', { email });
      toast.success(res.data.message || "Reset link sent to your email!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Added responsive padding and background
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-['Plus_Jakarta_Sans'] p-4 md:p-6">
      <Toaster />
      
      {/* Container: Full width on mobile, max-md on desktop */}
      <div className="w-full max-w-md bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
        
        <div className="text-center mb-8">
          {/* Responsive icon size */}
          <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 mb-2">Forgot Password?</h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium">No worries, we'll send you reset instructions.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Email Address</label>
            <input 
              type="email" 
              required 
              placeholder="Enter your registered email"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3.5 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all text-sm font-medium"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold shadow-lg hover:bg-blue-600 transition-all cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Sending...
              </>
            ) : "Reset Password"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-xs md:text-sm font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-2 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;