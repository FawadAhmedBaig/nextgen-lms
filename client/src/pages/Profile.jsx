import React, { useState, useRef, useEffect } from 'react';
import API from '../utils/api';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Edit States
  const [tempName, setTempName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  
  const [tempBio, setTempBio] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);
  
  const [imagePreview, setImagePreview] = useState(null);

  // --- FETCH USER DATA FROM DB ---
  const fetchUserData = async () => {
try {
      // API instance handles Base URL and Bearer token automatically
      const res = await API.get('/auth/me');
      
      setUser(res.data);
      setTempName(res.data.name);
      setTempBio(res.data.bio || "");
      setImagePreview(res.data.profilePicture);
      
      // Sync local storage
      localStorage.setItem('user', JSON.stringify(res.data));
    } catch (err) {
      toast.error("Could not load profile data");
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Auto-focus name input when edit mode is activated
  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus();
  }, [isEditingName]);

  // --- UNIVERSAL UPDATE LOGIC ---
  const handleUpdate = async (updatedName, updatedBio, newFile) => {
    setIsUpdating(true);
    const loadingToast = toast.loading("Syncing with database...");

try {
      const formData = new FormData();
      
      formData.append('name', updatedName || tempName);
      formData.append('bio', updatedBio !== null ? updatedBio : tempBio);
      if (newFile) formData.append('image', newFile);

      // Using the API instance for the PUT request
      const res = await API.put(`/auth/update-profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update State & Local Storage
      setUser(res.data.user);
      setTempName(res.data.user.name);
      setTempBio(res.data.user.bio || "");
      setImagePreview(res.data.user.profilePicture);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Trigger Navbar refresh
      window.dispatchEvent(new Event('userLogin'));

      toast.success("Profile updated!", { id: loadingToast });
      setIsEditingName(false);
      setIsEditingBio(false);
    } catch (err) {
      toast.error("Update failed", { id: loadingToast });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      handleUpdate(tempName, tempBio, file);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-8 md:pt-12 pb-12 md:pb-20 font-['Plus_Jakarta_Sans']">
      <Toaster position="top-center" />
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        
        {/* Header Section */}
        <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/50 mb-8 md:mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-blue-50 rounded-full -mr-24 -mt-24 md:-mr-32 md:-mt-32 blur-3xl opacity-50"></div>

          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10 relative z-10">
            {/* Avatar Section */}
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl transition-all group-hover:scale-[1.02]">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-4xl md:text-5xl font-black">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] md:rounded-[2.5rem]">
                   <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-blue-600 text-white p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-xl border-4 border-white">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
            
            <div className="text-center md:text-left flex-1 w-full">
              <div className="flex flex-col gap-1">
                <p className="text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] md:ml-1">Verified User</p>
                
                <div className="flex items-center justify-center md:justify-start gap-3">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 w-full">
                        <input 
                            ref={nameInputRef}
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onBlur={() => handleUpdate(tempName, tempBio, null)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tempName, tempBio, null)}
                            className="text-2xl md:text-4xl font-black text-slate-900 bg-slate-50 rounded-xl px-2 border-none focus:ring-2 focus:ring-blue-100 outline-none w-full max-w-lg text-center md:text-left"
                        />
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">
                        {user.name}
                      </h1>
                      <button 
                        onClick={() => setIsEditingName(true)}
                        className="p-1.5 md:p-2 text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                    </>
                  )}
                </div>
                <p className="text-slate-400 font-bold text-xs md:text-sm mt-1">{user.email}</p>
              </div>

              <div className="flex justify-center md:justify-start gap-3 md:gap-4 mt-6">
                <div className="bg-slate-50 px-4 md:px-6 py-3 md:py-4 rounded-2xl border border-slate-100 flex flex-col items-center min-w-[100px] md:min-w-[120px]">
                    <span className="text-xl md:text-2xl font-black text-slate-900">0</span>
                    <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Enrollments</span>
                </div>
                <div className="bg-blue-600 px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-lg shadow-blue-100 flex flex-col items-center min-w-[100px] md:min-w-[120px] text-white">
                    <span className="text-xl md:text-2xl font-black">0</span>
                    <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80">Certificates</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white w-full md:w-auto hidden sm:block">
                <p className="text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 md:mb-4">Account Status</p>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <p className="text-xs md:text-sm font-bold uppercase tracking-tighter capitalize">{user.role}</p>
                </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
          <div className="space-y-8 md:space-y-10">
            {/* Bio Section */}
            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-sm relative group">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base md:text-lg font-black text-slate-900">Quick Bio</h3>
                <button 
                  onClick={() => setIsEditingBio(!isEditingBio)}
                  className="text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
                >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
              </div>
              
              {isEditingBio ? (
                <textarea 
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value)}
                  onBlur={() => handleUpdate(tempName, tempBio, null)}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-blue-100 resize-none h-32 transition-all"
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
                  {user.bio || "No bio added yet. Click the pencil icon to tell us about your journey!"}
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 border border-slate-100 shadow-sm text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2">No Certificates Yet</h3>
                <p className="text-xs md:text-sm text-slate-400 font-medium mb-8">Complete courses to earn blockchain verified credentials.</p>
                <button onClick={() => navigate('/courses')} className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all cursor-pointer">Browse Courses</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;