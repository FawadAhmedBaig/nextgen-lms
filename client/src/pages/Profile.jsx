import React, { useState, useRef, useEffect } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [stats, setStats] = useState({ count: 0, certificates: [] });

  const [tempName, setTempName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const fetchUserData = async () => {
    try {
      const res = await API.get('/auth/me');
      const userData = res.data;

      setUser(userData);
      setTempName(userData.name);
      setTempBio(userData.bio || "");
      setImagePreview(userData.profilePicture);
      localStorage.setItem('user', JSON.stringify(userData));

      if (userData.role === 'student') {
        const [enrollRes, certRes] = await Promise.all([
          API.get('/enrollments/my-enrollments').catch(() => ({ data: [] })),
          API.get('/certificate/my-certificates').catch(() => ({ data: [] }))
        ]);
        setStats({
          count: enrollRes.data.length,
          certificates: certRes.data
        });
} else if (userData.role === 'instructor') {
        try {
          // 🔥 Add a check to ensure we have a token before calling
          const token = localStorage.getItem('token');
          if (!token) throw new Error("No token found");

          const courseRes = await API.get('/courses/instructor-courses');
          setStats({
            count: courseRes.data.length || 0,
            certificates: []
          });
        } catch (instErr) {
          console.error("Instructor specific fetch failed", instErr);
          // Set to 0 so the UI doesn't show "Loading..." forever
          setStats({ count: 0, certificates: [] }); 
        }
      }
    } catch (err) {
      console.error("Profile data fetch failed", err);
      toast.error("Could not load full profile data");
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus();
  }, [isEditingName]);

const handleUpdate = async (updatedName, updatedBio, newFile) => {
  // Prevent double-clicking
  if (isUpdating) return;

  setIsUpdating(true);
  const loadingToast = toast.loading("Uploading and syncing profile...");

  try {
    const formData = new FormData();
    
    /** * 🔥 SANITIZATION:
     * We only append name/bio if they are actually changed.
     * If they are empty, we send the existing state (tempName/tempBio)
     * to ensure Zod validation doesn't see "undefined".
     */
    const finalName = updatedName || tempName;
    const finalBio = updatedBio !== null ? updatedBio : tempBio;

    formData.append('name', finalName || "");
    formData.append('bio', finalBio || "");
    
    // Use 'profilePicture' to match the backend key
    if (newFile) {
      formData.append('profilePicture', newFile);
    }

    // API Call with extended timeout for file uploads
    const res = await API.put(`/auth/update-profile`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      // Give the server 30 seconds to process the image upload
      timeout: 30000 
    });

    // Update everything globally
    const updatedUser = res.data.user;
    setUser(updatedUser);
    setTempName(updatedUser.name);
    setTempBio(updatedUser.bio || "");
    setImagePreview(updatedUser.profilePicture);
    
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Sync UI components like Navbar/Header
    window.dispatchEvent(new Event('userLogin'));

    toast.success("Profile updated successfully!", { id: loadingToast });
    setIsEditingName(false);
    setIsEditingBio(false);
    
  } catch (err) {
    console.error("❌ Profile Update Error:", err);
    
    let errorMsg = "Update failed.";

    if (err.code === 'ECONNABORTED') {
      errorMsg = "Upload timed out. Try a smaller image.";
    } else if (err.response?.status === 400) {
      errorMsg = err.response?.data?.error || "Validation failed. Check name length.";
    } else {
      errorMsg = "Connection lost. Request aborted.";
    }

    toast.error(errorMsg, { id: loadingToast });
    
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

  const viewCertificate = async (courseId, courseName) => {
    const toastId = "view-cert-toast";
    toast.loading(`Opening ${courseName} Certificate...`, { id: toastId });
    try {
      const response = await API.post('/certificate/generate', {
        userId: user._id,
        userName: user.name,
        courseTitle: courseName,
        courseId: courseId,
        date: new Date().toLocaleDateString()
      }, { responseType: 'blob' });

      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
      toast.success("Certificate Loaded!", { id: toastId });
    } catch (error) {
      toast.error("Could not generate PDF.", { id: toastId });
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-8 md:pt-12 pb-12 md:pb-20 font-['Plus_Jakarta_Sans']">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        
        {/* Header Section */}
        <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/50 mb-8 md:mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-blue-50 rounded-full -mr-24 -mt-24 md:-mr-32 md:-mt-32 blur-3xl opacity-50"></div>

          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10 relative z-10">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl transition-all group-hover:scale-[1.02]">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-4xl md:text-5xl font-black">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] md:rounded-[2.5rem] cursor-pointer">
                   <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
            
            <div className="text-center md:text-left flex-1 w-full">
              <div className="flex flex-col gap-1">
                <p className="text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{user.role} Account</p>
                
                <div className="flex items-center justify-center md:justify-start gap-3">
                  {isEditingName ? (
                    <input 
                      ref={nameInputRef}
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onBlur={() => handleUpdate(tempName, tempBio, null)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tempName, tempBio, null)}
                      className="text-2xl md:text-4xl font-black text-slate-900 bg-slate-50 rounded-xl px-2 outline-none w-full max-w-lg"
                    />
                  ) : (
                    <>
                      <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">{user.name}</h1>
                      <button onClick={() => setIsEditingName(true)} className="text-slate-300 hover:text-blue-600 transition-colors cursor-pointer focus:outline-none">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                    </>
                  )}
                </div>
                <p className="text-slate-400 font-bold text-xs md:text-sm">{user.email}</p>
              </div>

              <div className="flex justify-center md:justify-start gap-3 md:gap-4 mt-6">
                <div className="bg-slate-50 px-4 md:px-6 py-3 md:py-4 rounded-2xl border border-slate-100 flex flex-col items-center min-w-[120px]">
                    <span className="text-xl md:text-2xl font-black text-slate-900">{stats.count}</span>
                    <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {user.role === 'instructor' ? 'Courses Authored' : 'Enrollments'}
                    </span>
                </div>
                {user.role === 'student' && (
                  <div className="bg-blue-600 px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-lg shadow-blue-100 flex flex-col items-center min-w-[120px] text-white">
                      <span className="text-xl md:text-2xl font-black">{stats.certificates.length}</span>
                      <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80">Certificates</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white hidden sm:block">
                <p className="text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Status</p>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <p className="text-xs md:text-sm font-bold uppercase tracking-tighter capitalize">{user.role}</p>
                </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
          <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-slate-900">Quick Bio</h3>
              <button onClick={() => setIsEditingBio(!isEditingBio)} className="text-slate-300 hover:text-blue-600 transition-colors cursor-pointer focus:outline-none">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              </button>
            </div>
            {isEditingBio ? (
              <textarea 
                value={tempBio} 
                onChange={(e) => setTempBio(e.target.value)} 
                onBlur={() => handleUpdate(tempName, tempBio, null)} 
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm text-slate-600 outline-none h-32 resize-none" 
                placeholder="Tell us about yourself..." 
              />
            ) : (
              <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">{user.bio || "No bio added yet."}</p>
            )}
          </div>

<div className="lg:col-span-2">
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 border border-slate-100 shadow-sm min-h-[300px] flex flex-col">
              
              {user.role === 'student' ? (
                <>
                  {/* --- STUDENT ONLY: HEADER --- */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="text-left">
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Verified Credentials</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Immutable Blockchain Achievements</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  </div>

                  {stats.certificates.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
                      {stats.certificates.map(cert => (
                        <div 
                          key={cert._id} 
                          className="p-5 border border-slate-100 rounded-[1.5rem] bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50 transition-all cursor-pointer group relative overflow-hidden"
                          onClick={() => viewCertificate(cert.courseId, cert.courseName)}
                        >
                          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-600/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
                          <div className="flex justify-between items-start relative z-10">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-black text-[8px] uppercase tracking-wider">Polygon Verified</span>
                            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-sm mt-3 mb-4 group-hover:text-blue-600 transition-colors leading-snug cursor-pointer">
                            {cert.courseName}
                          </h4>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://amoy.polygonscan.com/tx/${cert.transactionHash}`, '_blank');
                            }} 
                            className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[9px] text-slate-500 font-bold hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
                          >
                            View On-Chain Receipt ↗
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-10">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                         <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mb-2">No Credentials Issued</h3>
                      <p className="text-xs text-slate-400 font-medium mb-8 max-w-[250px] mx-auto leading-relaxed">Complete your active courses and pass the final exam to unlock your certificates.</p>
                      <button onClick={() => navigate('/courses')} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 cursor-pointer">Explore Catalog</button>
                    </div>
                  )}
                </>
              ) : (
                /* --- INSTRUCTOR STUDIO VIEW (NO REDUNDANT HEADER) --- */
                <div className="flex-1 flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center mb-6 relative">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg border-2 border-white">
                      <span className="text-lg font-bold">+</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Instructor Studio</h3>
                  <p className="text-xs text-slate-400 font-bold mb-8 max-w-[280px] mx-auto leading-relaxed uppercase tracking-widest text-center">
                    Author new curriculum and manage your {stats.count} active courses.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md px-6">
                    <button 
                      onClick={() => navigate('/instructor-dashboard', { state: { activeTab: 'manage' } })} 
                      className="flex-1 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95 cursor-pointer focus:outline-none"
                    >
                      Manage Courses
                    </button>
                    <button 
                      onClick={() => navigate('/instructor-dashboard', { state: { activeTab: 'create' } })} 
                      className="flex-1 bg-white border-2 border-slate-100 text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 transition-all active:scale-95 cursor-pointer focus:outline-none"
                    >
                      New Course
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;