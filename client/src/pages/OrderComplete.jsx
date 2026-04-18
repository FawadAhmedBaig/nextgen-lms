import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const OrderComplete = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { course, orderId } = location.state || {};

  useEffect(() => {
    if (!course && !orderId) {
      const timer = setTimeout(() => {
        navigate('/courses');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [course, orderId, navigate]);

  return (
    <div className="min-h-screen bg-white font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      <Navbar />
      
      {/* Adjusted padding: pt-24 for mobile, pt-32 for desktop to clear sticky navbar */}
      <div className="flex items-center justify-center pt-24 md:pt-32 pb-12">
        <div className="max-w-md w-full text-center px-4 md:px-6">
          
          {/* Success Animation: Scaled for mobile */}
          <div className="w-20 h-20 md:w-24 md:h-24 bg-green-100 text-green-600 rounded-[1.8rem] md:rounded-[2rem] flex items-center justify-center mx-auto mb-6 md:mb-8 animate-bounce shadow-lg shadow-green-100">
            <svg className="w-10 h-10 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">You're Enrolled!</h1>
          
          <div className="bg-slate-50 p-5 md:p-6 rounded-[2rem] md:rounded-3xl mb-8 md:mb-10 border border-slate-100 mx-auto">
            <p className="text-sm md:text-base text-slate-600 font-medium leading-relaxed">
              Your enrollment for <span className="text-blue-600 font-bold">"{course?.title || 'the course'}"</span> has been processed successfully. 
            </p>
            <div className="h-px bg-slate-200 my-4 w-1/2 mx-auto"></div>
            <p className="text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Verification Status
            </p>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Your certificate will be secured on the 
              <span className="text-indigo-600 font-bold block sm:inline"> Polygon Blockchain</span> upon completion.
            </p>
          </div>

          <div className="space-y-3 md:space-y-4">
            <Link 
              to={course?._id ? `/course-view/${course._id}` : '/courses'} 
              className="block w-full bg-slate-900 text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 text-center active:scale-95 text-sm md:text-base"
            >
              Start Learning Now
            </Link>
            <Link 
              to="/my-courses" 
              className="block w-full bg-white border border-slate-200 text-slate-600 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold hover:bg-slate-50 transition-all text-center active:scale-95 text-sm md:text-base"
            >
              View My Courses
            </Link>
          </div>

          <div className="mt-8 md:mt-12 p-3 md:p-4 bg-slate-50 rounded-xl inline-block max-w-full">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">
              Transaction Receipt
            </p>
            <p className="text-[10px] md:text-[11px] font-mono text-slate-500 break-all mt-1">
              {orderId || `TXN-${course?._id?.substring(0, 8).toUpperCase() || 'NEXTGEN'}-SUCCESS`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderComplete;