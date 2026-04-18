import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Footer() {
  const navigate = useNavigate();
  
  // Get current user session
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  // Helper to handle clicks on restricted links
  const handleProtectedNavigation = (path, allowedRoles = []) => {
    if (!user) {
      toast.error("Please login to access this area");
      navigate('/login');
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role?.toLowerCase())) {
      toast.error(`Access restricted to ${allowedRoles.join(' or ')}s only.`);
      return;
    }

    navigate(path);
  };

  return (
    <footer className="bg-white border-t border-slate-100 pt-16 pb-8 font-['Plus_Jakarta_Sans']">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-2 mb-6 justify-center sm:justify-start group cursor-default">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                <span className="text-white font-black text-lg">N</span>
              </div>
              <span className="font-black text-2xl tracking-tighter text-slate-900">NextGen.</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto sm:mx-0 font-medium">
              An advanced E-Learning ecosystem integrating <strong>RAG AI</strong> tutoring and 
              <strong> Polygon Blockchain</strong> verification.
            </p>
          </div>

          {/* Core Navigation - Publicly visible but gated */}
          <div className="text-center sm:text-left">
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 mb-6">Curriculum</h4>
            <ul className="space-y-4 text-slate-500 text-sm font-semibold">
              <li>
                <button onClick={() => handleProtectedNavigation('/courses')} className="hover:text-blue-600 transition-colors cursor-pointer">
                  Browse Courses
                </button>
              </li>
              <li>
                <button onClick={() => handleProtectedNavigation('/my-courses', ['student'])} className="hover:text-blue-600 transition-colors cursor-pointer text-left">
                  Student Dashboard
                </button>
              </li>
              <li><Link to="/verify" className="hover:text-blue-600 transition-colors cursor-pointer">Certificate Verification</Link></li>
            </ul>
          </div>

          {/* Technical Stack (Informational) */}
          <div className="text-center sm:text-left">
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 mb-6">Technical Stack</h4>
            <ul className="space-y-4 text-slate-400 text-sm font-semibold cursor-default">
              <li>MongoDB Vector Search</li>
              <li>Express & Node.js</li>
              <li>React & Tailwind</li>
              <li>Polygon Smart Contracts</li>
            </ul>
          </div>

          {/* Access Control Section */}
          <div className="text-center sm:text-left">
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 mb-6">Portal</h4>
            <ul className="space-y-4 text-slate-500 text-sm font-semibold">
              <li>
                <button onClick={() => handleProtectedNavigation('/instructor-dashboard', ['instructor'])} className="hover:text-blue-600 transition-colors cursor-pointer">
                  Instructor Studio
                </button>
              </li>
              <li>
                <button onClick={() => handleProtectedNavigation('/admin', ['admin'])} className="hover:text-blue-600 transition-colors cursor-pointer">
                  Admin Panel
                </button>
              </li>
              <li>
                 {!user ? (
                   <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign In to Platform</Link>
                 ) : (
                   <Link to="/profile" className="hover:text-blue-600 transition-colors">Manage Profile</Link>
                 )}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">
          <p className="text-center md:text-left">© 2026 NextGen LMS • KFUEIT Final Year Project.</p>
          <div className="flex gap-8">
            <span className="text-blue-600 font-black">MERN + WEB3 + AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}