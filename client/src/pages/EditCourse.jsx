import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast, { Toaster } from 'react-hot-toast';

const EditCourse = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);

  useEffect(() => {
const fetchCourse = async () => {
      try {
        // Fetches from http://152.67.7.123:5000/api/courses/all in production
        const res = await API.get('/courses/all');
        const course = res.data.find(c => c._id === id);
        setFormData(course);
      } catch (err) {
        toast.error("Failed to fetch course data");
      }
    };
    fetchCourse();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      // API instance handles the Auth header so only the instructor can update
      await API.put(`/courses/${id}`, formData);
      toast.success("Course updated successfully!");
      setTimeout(() => navigate('/instructor-dashboard'), 1500);
    } catch (err) {
      toast.error("Update failed");
    }
  };

  if (!formData) return <div className="p-20 text-center font-bold text-slate-400 animate-pulse">Loading course data...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-24 lg:pt-32 font-['Plus_Jakarta_Sans']">
      <Toaster />
      <div className="max-w-3xl mx-auto bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-slate-100">
        <h1 className="text-xl md:text-2xl font-black mb-8 text-slate-900">
          Edit Course: <span className="text-blue-600">{formData.title}</span>
        </h1>
        
        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Responsive Grid: Stacks on mobile (1 col), split on tablet/desktop (2 cols) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Course Title</label>
              <input 
                type="text" 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all text-sm md:text-base"
                placeholder="Enter course title"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Category</label>
              <input 
                type="text" 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all text-sm md:text-base"
                placeholder="e.g. Blockchain"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Description</label>
            <textarea 
              rows="5"
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all text-sm md:text-base resize-none"
              placeholder="Describe what students will learn..."
            ></textarea>
          </div>

          {/* Action Buttons: Stacked on mobile, row on larger screens */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              type="submit" 
              className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-600 transition-all cursor-pointer order-1 sm:order-1"
            >
              Save Changes
            </button>
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all cursor-pointer order-2 sm:order-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCourse;