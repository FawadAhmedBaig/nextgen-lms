import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const MyCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
const fetchMyCourses = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          toast.error("Please login to see your courses");
          return navigate('/login');
        }

        // The API instance handles the Base URL (DuckDNS) and Auth header
        const res = await API.get('/api/users/my-courses');

        setCourses(res.data);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load your courses");
      } finally {
        setLoading(false);
      }
    };

    fetchMyCourses();
  }, [navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    // Adjusted pt-24/32 to account for sticky navbar and added responsive px
    <div className="min-h-screen bg-[#F8FAFC] pt-8 md:pt-12 pb-12 md:pb-20 font-['Plus_Jakarta_Sans']">
      <Toaster />
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Header: Centered on mobile */}
        <div className="mb-8 md:mb-10 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">My Learning</h1>
          <p className="text-slate-500 font-medium text-sm md:text-base">Continue where you left off.</p>
        </div>

        {courses.length > 0 ? (
          // Grid: 1 col on mobile, 2 on tablet, 3 on desktop
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {courses.map((course) => (
              <div 
                key={course._id} 
                className="bg-white rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => navigate(`/course-view/${course._id}`)}
              >
                <div className="relative h-44 md:h-48 overflow-hidden bg-slate-100">
                  <img 
                    src={course.imageUrl} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    alt={course.title} 
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest text-blue-600">
                      {course.category}
                    </span>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {course.title}
                  </h3>
                  
                  {/* Progress Section */}
                  <div className="w-full bg-slate-100 h-2 rounded-full mb-4">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${course.progress || 0}%` }} 
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {course.progress || 0}% Complete
                    </span>
                    <button className="text-xs md:text-sm font-black text-blue-600 group-hover:underline cursor-pointer flex items-center gap-1">
                      Continue <span className="hidden xs:inline">Lesson</span> →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State: Scaled for smaller screens */
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-10 md:p-20 text-center border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">📚</div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-4">No courses yet</h2>
            <p className="text-slate-400 text-sm md:text-base mb-8 max-w-sm mx-auto">You haven't enrolled in any courses. Ready to start something new?</p>
            <button 
              onClick={() => navigate('/courses')}
              className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 cursor-pointer transition-all active:scale-95"
            >
              Explore Catalog
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;