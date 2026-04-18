import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast, { Toaster } from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

const Signup = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'student' 
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
try {
      // API instance points to http://nextgen-lms-fawad.duckdns.org
      await API.post('/auth/signup', {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        role: formData.role 
      });
      toast.success("Account created successfully!");
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || "Signup failed");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
try {
      const googleData = jwtDecode(credentialResponse.credential);

      // Unified Google login/signup endpoint
      const res = await API.post('/auth/google-login', {
        email: googleData.email,
        name: googleData.name,
        avatar: googleData.picture,
        role: formData.role 
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      // Update global UI state
      window.dispatchEvent(new Event('userLogin'));

      const userRole = res.data.user.role.toLowerCase();
      if (userRole === 'admin') navigate('/admin');
      else if (userRole === 'instructor') navigate('/instructor-dashboard');
      else navigate('/courses');

      toast.success("Login Successful!");

    } catch (err) {
      if (err.response && err.response.status === 403) {
        toast.error(err.response.data.message, {
          duration: 6000,
          style: { border: '1px solid #E2E8F0', padding: '16px', color: '#1E293B' }
        });
      } else {
        console.error("Login Error:", err);
        toast.error("Google Login Failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 font-['Plus_Jakarta_Sans']">
      <Toaster position="top-center" />
      
{/* LEFT BRANDING PANEL: Hidden on mobile/tablet */}
<div className="hidden lg:flex bg-slate-900 flex-col justify-center p-12 lg:p-16 text-white relative overflow-hidden">
  
  {/* --- 🖼️ Male Student Background Image with Overlay --- */}
  <div className="absolute inset-0 z-0">
    <img 
      // Source image: Male student portrait
      src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop" 
      alt="Student"
      className="w-full h-full object-cover opacity-30 grayscale"
    />
    {/* Dark Gradient Overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-slate-900/30"></div>
  </div>

  {/* --- ⚡ Content Layer (z-10) --- */}
  <div className="relative z-10">
    {/* Large Branding Logo */}
    
    <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-8 tracking-tight">
      Start your career with AI & Blockchain.
    </h2>
    
    <ul className="space-y-6">
      {['Personalized AI Learning Paths', 'Blockchain-Verified Certificates', '24/7 Intelligent Tutor Support'].map((item, idx) => (
        <li key={idx} className="flex items-center gap-3 font-semibold text-lg text-slate-100">
          <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          {item}
        </li>
      ))}
    </ul>
  </div>
</div>

      {/* RIGHT FORM PANEL: Full width on mobile */}
      <div className="flex items-center justify-center p-6 md:p-12 lg:p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center lg:text-left mb-8">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Create Account</h1>
            <p className="text-slate-500 text-sm font-medium">Join NextGen LMS to start your journey.</p>
          </div>

          {/* Role Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6 shadow-inner">
            <button 
              type="button" 
              onClick={() => setFormData({...formData, role: 'student'})} 
              className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg cursor-pointer transition-all ${formData.role === 'student' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Student
            </button>
            <button 
              type="button" 
              onClick={() => setFormData({...formData, role: 'instructor'})} 
              className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg cursor-pointer transition-all ${formData.role === 'instructor' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Instructor
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Grid stacks on very small mobile devices, stays 2-col on larger mobile/tablet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="First Name" 
                required 
                onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all text-sm" 
              />
              <input 
                type="text" 
                placeholder="Last Name" 
                required 
                onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all text-sm" 
              />
            </div>
            
            <input 
              type="email" 
              placeholder="Email" 
              required 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all text-sm" 
            />
            
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                required 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all text-sm" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer p-1"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.06m0 0L6 10.125M3.375 3.375l17.25 17.25" />
                  </svg>
                )}
              </button>
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold cursor-pointer hover:bg-blue-600 transition-all active:scale-95 text-sm"
            >
              Sign up as {formData.role}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
            <span className="relative bg-white px-4">Or continue with Google as {formData.role}</span>
          </div>

          {/* Google Button */}
          <div className="flex justify-center w-full">
            <GoogleLogin 
              onSuccess={handleGoogleSuccess} 
              onError={() => toast.error("Google Login Failed")}
              theme="outline" 
              shape="pill" 
              size="large"
              width="100%"
            />
          </div>

          <p className="mt-8 text-center text-slate-500 font-medium text-sm">
            Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline cursor-pointer ml-1">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;