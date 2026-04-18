import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';

export default function FeaturedCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

useEffect(() => {
  const fetchPopularCourses = async () => {
try {
      // Use the API instance with the relative path
      const { data } = await API.get('/api/courses/popular');
      setCourses(data);
    } catch (err) {
      console.error("Failed to fetch popular courses", err);
    } finally {
      setLoading(false);
    }
  };
  fetchPopularCourses();
}, []);

  // Loading state with your Plus Jakarta Sans aesthetic
  if (loading) {
    return (
      <div className="py-20 text-center font-black text-slate-200 animate-pulse uppercase tracking-widest">
        Loading Featured Content...
      </div>
    );
  }

  // Safety: Don't show the section if the DB is empty
  if (courses.length === 0) return null;

  return (
    <section className="py-12 md:py-20 bg-white font-['Plus_Jakarta_Sans']">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 mb-10 md:mb-12 text-center sm:text-left">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Popular Courses</h2>
            <p className="text-slate-500 text-sm md:text-base font-medium">Top-rated curriculum verified by Blockchain.</p>
          </div>
          <Link to="/courses" className="text-blue-600 font-bold text-sm md:text-base hover:underline transition-all active:scale-95 cursor-pointer">
            View All Catalog →
          </Link>
        </div>

        {/* Dynamic Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {courses.map(course => (
            <div 
              key={course._id} 
              /* 🔥 NAVIGATES TO PUBLIC DETAIL PAGE FIRST */
              onClick={() => navigate(`/course/${course._id}`)}
              className="group bg-white rounded-[2rem] border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer"
            >
              
              {/* Image Container */}
              <div className="relative h-44 md:h-48 overflow-hidden bg-slate-100">
                <img 
                  src={course.imageUrl || 'https://via.placeholder.com/400x200?text=NextGen+LMS'} 
                  alt={course.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest text-slate-900 shadow-sm border border-white/20">
                  {course.price === "Free" || course.price === "0" ? "FREE" : course.price}
                </div>
              </div>

              {/* Content Container */}
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-start mb-2">
                   <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
                     {course.category || 'General'}
                   </span>
                </div>
                <h3 className="font-bold text-lg md:text-xl mb-2 text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {course.title}
                </h3>
                <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-wider mb-6">
                  by {course.instructor?.name || "Expert Mentor"}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {course.duration || 'Self-paced'}
                    </span>
                  </div>
                  <button className="text-blue-600 font-black text-[10px] md:text-xs uppercase tracking-widest hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1">
                    Details <span>→</span>
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}