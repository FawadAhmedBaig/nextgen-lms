import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import API from '../utils/api'; // Ensure this is imported
import toast from 'react-hot-toast';

const OrderComplete = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get the Stripe Session ID from the URL
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const finalizeOrder = async () => {
      try {
        if (!sessionId) {
          // If no session ID, they shouldn't be here
          navigate('/courses');
          return;
        }

        // 1. Resolve the session to get the courseId (Uses your public-resolve or a payment endpoint)
        // You can create a small backend route to return course details for a session
        const { data } = await API.get(`/payments/session-status/${sessionId}`);
        
        if (data.course) {
          setCourseData(data.course);
          
          // 2. Sync Database with Local Storage
          // This ensures the "Start Learning" button works immediately
          const profileRes = await API.get('/users/profile');
          localStorage.setItem('user', JSON.stringify(profileRes.data));
          console.log("✅ Enrollment status synchronized!");
        }
      } catch (err) {
        console.error("❌ Finalization Error:", err);
        toast.error("Could not verify enrollment.");
      } finally {
        setLoading(false);
      }
    };

    finalizeOrder();
  }, [sessionId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      <Navbar />
      
      <div className="flex items-center justify-center pt-24 md:pt-32 pb-12">
        <div className="max-w-md w-full text-center px-4 md:px-6">
          
          <div className="w-20 h-20 md:w-24 md:h-24 bg-green-100 text-green-600 rounded-[1.8rem] md:rounded-[2rem] flex items-center justify-center mx-auto mb-6 md:mb-8 animate-bounce shadow-lg shadow-green-100">
            <svg className="w-10 h-10 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">You're Enrolled!</h1>
          
          <div className="bg-slate-50 p-5 md:p-6 rounded-[2rem] md:rounded-3xl mb-8 md:mb-10 border border-slate-100 mx-auto">
            <p className="text-sm md:text-base text-slate-600 font-medium leading-relaxed">
              Your enrollment for <span className="text-blue-600 font-bold">"{courseData?.title || 'the course'}"</span> has been processed successfully. 
            </p>
            <div className="h-px bg-slate-200 my-4 w-1/2 mx-auto"></div>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Your certificate will be secured on the 
              <span className="text-indigo-600 font-bold block sm:inline"> Polygon Blockchain</span> upon completion.
            </p>
          </div>

          <div className="space-y-3 md:space-y-4">
            <Link 
              to={`/course-view/${courseData?._id}`} 
              className="block w-full bg-slate-900 text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 text-center text-sm md:text-base"
            >
              Start Learning Now
            </Link>
            <Link 
              to="/my-courses" 
              className="block w-full bg-white border border-slate-200 text-slate-600 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold hover:bg-slate-50 transition-all text-center text-sm md:text-base"
            >
              View My Courses
            </Link>
          </div>

          <div className="mt-8 md:mt-12 p-3 md:p-4 bg-slate-50 rounded-xl inline-block">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">
              Transaction ID
            </p>
            <p className="text-[10px] md:text-[11px] font-mono text-slate-500 mt-1">
              {sessionId?.substring(0, 20)}...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderComplete;