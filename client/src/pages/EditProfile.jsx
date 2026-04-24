import React, { useState, useRef } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const EditProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [isUpdating, setIsUpdating] = useState(false);
  const [imagePreview, setImagePreview] = useState(user.profilePicture || null);
  const [imageFile, setImageFile] = useState(null);
  const [name, setName] = useState(user.name || '');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      toast.success("New photo selected!");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name cannot be empty");

    setIsUpdating(true);
    const loadingToast = toast.loading("Updating profile...");

try {
      const formData = new FormData();
      formData.append('name', name);
      if (imageFile) formData.append('image', imageFile);

      // Using the API instance with the relative path
      const res = await API.put(`/auth/update-profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const updatedUser = { 
        ...user, 
        name: res.data.user.name, 
        profilePicture: res.data.user.profilePicture 
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Dispatch a custom event to update the Navbar in real-time
      window.dispatchEvent(new Event('userLogin'));

      toast.success("Profile updated successfully!", { id: loadingToast });
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed", { id: loadingToast });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans'] pt-24 md:pt-28 pb-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
        
        {/* Header Background */}
        <div className="h-24 md:h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
            <button 
                onClick={() => navigate(-1)} 
                className="absolute top-4 md:top-6 left-4 md:left-6 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white p-2 rounded-xl transition-all cursor-pointer"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
        </div>

        <div className="px-6 md:px-8 pb-10">
          <form onSubmit={handleUpdateProfile} className="relative -mt-12 md:-mt-16">
            
            {/* Profile Image Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-slate-100 shadow-lg overflow-hidden flex items-center justify-center text-blue-600 text-3xl md:text-4xl font-bold">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="absolute bottom-0 right-0 md:bottom-1 md:right-1 bg-blue-600 text-white p-2 md:p-2.5 rounded-full border-2 md:border-4 border-white hover:scale-110 transition-all cursor-pointer shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              </div>
              <h2 className="mt-4 text-xl md:text-2xl font-black text-slate-900">{user.name}</h2>
              <p className="text-slate-400 font-bold text-[9px] md:text-[10px] uppercase tracking-widest">{user.role}</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 md:px-6 py-3 md:py-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50/50 transition-all" 
                />
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address (Read Only)</label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 md:px-6 py-3 md:py-4 text-sm font-bold text-slate-400 cursor-not-allowed truncate">
                  {user.email}
                </div>
              </div>

              {/* Action Buttons: Stack on mobile, row on tablet/desktop */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3 md:gap-4">
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="w-full sm:flex-1 bg-blue-600 text-white py-3 md:py-4 rounded-2xl font-black text-xs md:text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all cursor-pointer active:scale-95 disabled:bg-slate-300"
                >
                  {isUpdating ? "Updating..." : "Save Changes"}
                </button>
                <button 
                  type="button" 
                  onClick={() => navigate('/')}
                  className="w-full sm:px-8 py-3 md:py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs md:text-sm hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;