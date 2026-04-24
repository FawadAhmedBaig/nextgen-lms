import React, { useState } from 'react';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast'; // Kept Toaster here locally
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

const Login = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr && userStr !== "undefined") {
      try {
        const user = JSON.parse(userStr);
        // Redirect based on role
        const lowerRole = user.role?.toLowerCase();
        if (lowerRole === 'admin') navigate('/admin');
        else if (lowerRole === 'instructor') navigate('/instructor-dashboard');
        else navigate('/'); // Students go to home
      } catch (err) {
        console.error("Auth guard error:", err);
      }
    }
  }, [navigate]);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');

  const handleLogin = async (e) => {
    e.preventDefault();
    // Dismiss any previous toasts before starting new flow
    toast.dismiss();
    const loadingToast = toast.loading("Verifying credentials...");
    
try {
      // Hits http://152.67.7.123:5000/api/auth/login in production
      const response = await API.post('/auth/login', { email, password });
      
      if (response.data.user) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        window.dispatchEvent(new Event('userLogin'));

        const { role: userRole, name } = response.data.user;
        
        toast.success(`Welcome back, ${name}!`, { 
          id: loadingToast,
          duration: 4000 
        });

        const lowerRole = userRole.toLowerCase(); 
        setTimeout(() => {
          if (lowerRole === 'admin') navigate('/admin'); 
          else if (lowerRole === 'instructor') navigate('/instructor-dashboard');
          else navigate('/'); 
        }, 1200);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid credentials", { id: loadingToast });
    }
  };

 const handleGoogleSuccess = async (credentialResponse) => {
  toast.dismiss();
  const loadingToast = toast.loading("Syncing Google Account...");

  try {
    const googleData = jwtDecode(credentialResponse.credential);
    
    // Hits the Google sync endpoint on your Oracle server
    const res = await API.post('/auth/google-login', {
      email: googleData.email,
      name: googleData.name,
      avatar: googleData.picture,
      role: role // Ensure 'role' is defined in your component state
    });

    // --- SUCCESS PATH ---
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    
    window.dispatchEvent(new Event('userLogin'));

    toast.success(`Welcome back, ${res.data.user.name}!`, { 
      id: loadingToast,
      duration: 4000 
    });

    const userRole = res.data.user.role;
    const lowerRole = userRole.toLowerCase();

    // Small delay to let the success toast be seen
    setTimeout(() => {
      if (lowerRole === 'admin') navigate('/admin');
      else if (lowerRole === 'instructor') navigate('/instructor-dashboard');
      else navigate('/');
    }, 1000);

  } catch (err) {
    console.error("❌ Google Login Error:", err.response);

    // 🔥 THE FIX: Capture specific backend messages (like Pending Approval)
    const serverMessage = err.response?.data?.message || err.response?.data?.error;
    
    if (err.response?.status === 403 && serverMessage) {
      // This will show: "Your instructor account is pending admin approval..."
      toast.error(serverMessage, { 
        id: loadingToast,
        duration: 6000 
      });
    } else {
      // General fallback for 400, 500, or network errors
      toast.error(serverMessage || "Google Login Failed. Please try again.", { 
        id: loadingToast 
      });
    }
  }
};

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 font-['Plus_Jakarta_Sans']">
      
      {/* LEFT SIDEBAR */}
      <div className="hidden lg:flex bg-slate-900 flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="z-10">
          {/* <div className="flex items-center gap-2 mb-12">
            <Link to="/" className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center cursor-pointer">
              <span className="text-white font-bold text-xl">N</span>
            </Link>
            <span className="font-bold text-2xl tracking-tight">NextGen LMS</span>
          </div> */}
          <h2 className="text-4xl font-bold leading-tight max-w-md">
            Resume your journey toward <span className="text-blue-500">Mastery.</span>
          </h2>
        </div>
        
{/* z-10 bg-slate-800/50 ... */}
<div className="z-10 bg-slate-800/50 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
  <p className="text-slate-300 text-sm mb-4 italic leading-relaxed">
    "The AI tutor helped me understand complex data structures in minutes. Highly recommended!"
  </p>
  <div className="flex items-center gap-3">
    {/* --- 🖼️ Male Student Profile Picture --- */}
    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center border-2 border-slate-700 shadow-xl overflow-hidden">
      <img 
        src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=128&h=128&auto=format&fit=crop" 
        alt="Shahbaz Ahmed" 
        className="w-full h-full object-cover" 
      />
    </div>
    {/* ----------------------------------------- */}
    <div>
      <p className="font-bold text-sm text-white">Shahbaz Ahmed</p>
      <p className="text-xs text-slate-400 font-medium">CS Student @ KFUEIT</p>
    </div>
  </div>
</div>
        
        <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      {/* RIGHT SIDE: LOGIN FORM */}
      <div className="flex items-center justify-center p-6 md:p-12 lg:p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Welcome Back</h1>
            <p className="text-slate-500 text-sm md:text-base font-medium">Please enter your details to sign in.</p>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-xl mb-6 shadow-inner">
            <button 
              type="button" 
              onClick={() => setRole('student')} 
              className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all cursor-pointer ${role === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Student
            </button>
            <button 
              type="button" 
              onClick={() => setRole('instructor')} 
              className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all cursor-pointer ${role === 'instructor' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Instructor
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="fawad@example.com" 
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all text-sm" 
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <Link to="/forgot-password" size="xs" className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">Forgot?</Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all text-sm" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors text-xs font-bold cursor-pointer"
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer text-sm"
            >
              Sign In
            </button>
          </form>

          <div className="relative my-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
            <span className="relative bg-white px-4">Or continue with Google</span>
          </div>

          <div className="flex justify-center w-full">
            <GoogleLogin 
              onSuccess={handleGoogleSuccess} 
              onError={() => toast.error("Google Login Failed", { id: 'google-err' })} 
              theme="outline" 
              shape="pill" 
              size="large"
              width="100%"
            />
          </div>

          <p className="mt-8 text-center text-slate-500 text-sm font-medium">
            Don't have an account? <Link to="/signup" className="text-blue-600 font-bold hover:underline ml-1 cursor-pointer">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;