import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast, { Toaster } from 'react-hot-toast';

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyCourses();
  }, []);

const fetchMyCourses = async () => {
    try {
      // API instance handles the Base URL (Oracle IP) automatically
      const res = await API.get('/api/courses/all');
      const myCourses = res.data.filter(c => c.instructor.name === user.name);
      setCourses(myCourses);
    } catch (err) {
      toast.error("Failed to load courses");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        // Relative path used; API instance injects the Auth header
        await API.delete(`/api/courses/${id}`);
        toast.success("Course deleted");
        fetchMyCourses();
      } catch (err) {
        toast.error("Delete failed");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] p-4 md:p-8 pt-24 lg:pt-32">
      <Toaster />
      <div className="max-w-6xl mx-auto">
        {/* Header Section: Adjusted for mobile centering */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">Instructor Studio</h1>
            <p className="text-slate-500 font-medium text-sm md:text-base">Manage your curriculum and students.</p>
          </div>
          <Link to="/instructor-dashboard" className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all flex justify-center items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Create New Course
          </Link>
        </div>

        {/* Course Grid/List */}
        <div className="grid gap-6">
          {courses.map(course => (
            <div key={course._id} className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between group hover:shadow-md transition-all gap-6">
              
              {/* Left Side: Info */}
              <div className="flex items-center gap-4 md:gap-6">
                <img src={course.imageUrl} className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover" alt="" />
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-900 leading-tight">{course.title}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[9px] md:text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider">{course.category}</span>
                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider">{course.level}</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Actions (Now full width on mobile) */}
              <div className="flex grid grid-cols-3 md:flex gap-2 md:gap-3 border-t md:border-t-0 pt-4 md:pt-0">
                <button 
                  onClick={() => navigate(`/course-view/${course._id}`)} 
                  className="flex justify-center items-center p-3 text-xs md:text-sm bg-slate-50 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer font-bold"
                >
                  View
                </button>
                <button 
                  onClick={() => navigate(`/edit-course/${course._id}`)} 
                  className="flex justify-center items-center p-3 text-xs md:text-sm bg-slate-50 text-slate-600 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-all cursor-pointer font-bold"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(course._id)} 
                  className="flex justify-center items-center p-3 text-xs md:text-sm bg-slate-50 text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {courses.length === 0 && (
            <div className="text-center py-16 md:py-20 bg-white rounded-[2.5rem] md:rounded-[3rem] border-2 border-dashed border-slate-200 px-6">
              <p className="text-slate-400 font-bold">No courses published yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseManagement;