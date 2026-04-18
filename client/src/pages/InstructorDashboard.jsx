import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast, { Toaster } from 'react-hot-toast';

const InstructorDashboard = () => {
  const navigate = useNavigate();
  const pdfInputRef = useRef(null);
  const imageInputRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [courseViewMode, setCourseViewMode] = useState('list'); 
  const [isPublishing, setIsPublishing] = useState(false);
  const [myCourses, setMyCourses] = useState([]);
  const [editingCourseId, setEditingCourseId] = useState(null);
  
  // Real-time Data States
  const [stats, setStats] = useState([
    { label: "Total Students", value: "0", icon: "👥", key: 'totalStudents' },
    { label: "Revenue", value: "$0", icon: "💰", key: 'totalRevenue' },
    { label: "Blockchain Certs", value: "0", icon: "⛓️", key: 'totalCerts' },
    { label: "AI Queries", value: "0", icon: "🤖", key: 'totalAiQueries' },
  ]);
  const [studentProgress, setStudentProgress] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Live Session States
  const [newLiveSession, setNewLiveSession] = useState({ title: '', date: '', time: '', meetingLink: '' });
  const [existingLiveSessions, setExistingLiveSessions] = useState([]);
  const [editingSessionId, setEditingSessionId] = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  // --- REAL-TIME DATA FETCHING ---
const fetchDashboardData = async () => {
    if (!token || !user) return;
    setLoadingStats(true);
    
    // Get the unique ID
    const instructorId = user.id || user._id;

try {
      // 1. Fetch Instructor Stats
      const statsRes = await API.get(`/instructor/stats?instructorId=${instructorId}`);
      
      const data = statsRes.data;
      const updatedStats = stats.map(s => ({
        ...s,
        value: s.key === 'totalRevenue' ? `$${data[s.key] || 0}` : (data[s.key] || 0)
      }));
      setStats(updatedStats);

      // 2. Fetch Student Progress
      const progressRes = await API.get(`/instructor/student-progress?instructorId=${instructorId}`);
      setStudentProgress(progressRes.data);
    } catch (err) {
      console.error("Dashboard sync error", err);
    }finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'courses') fetchMyCourses();
  }, [activeTab]);

const fetchMyCourses = async () => {
try {
    const res = await API.get(`/courses/all?t=${Date.now()}`);
    
    const currentUserId = user?.id || user?._id;
    const currentUserName = user?.name;

    const filtered = res.data.filter(course => {
      const instructorId = course.instructor?._id || course.instructor;
      const instructorName = course.instructor?.name || course.instructorName;

      const isIdMatch = instructorId && currentUserId && (String(instructorId) === String(currentUserId));
      const isNameMatch = instructorName && currentUserName && (instructorName === currentUserName);

      return isIdMatch || isNameMatch;
    });

    setMyCourses(filtered.reverse());
  } catch (err) {
    console.error("Fetch courses error:", err);
    toast.error("Failed to load your courses");
  }
};

  // --- UTILITY FUNCTIONS ---
  const extractLink = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : text; 
  };

  const [pdfFile, setPdfFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [courseData, setCourseData] = useState({
    title: '', price: '', description: '', category: 'Blockchain',
    duration: '', level: 'Beginner', instructorName: user?.name || '', 
    modules: [{ name: 'Introduction', items: [{ type: 'video', title: '', contentUrl: '', questions: [] }] }]
  });

  const [quizData, setQuizData] = useState({
    title: 'Final Graded Quiz',
    passingScore: 80,
    questions: [{ questionText: '', options: ['', '', '', ''], correctOptionIndex: 0 }]
  });

  const formatPriceInput = (val) => {
    const v = val.toString().toLowerCase().trim();
    if (v === '0' || v === 'free' || v === '') return 'Free';
    const numeric = v.replace(/[^\d.]/g, '');
    return numeric ? `$${parseFloat(numeric).toFixed(2)}` : 'Free';
  };

  const formatDurationInput = (val) => {
    let v = val.toLowerCase().replace(/\s+/g, '');
    if (!v) return '';
    if (/^\d+$/.test(v)) return `${v}h`;
    const hourMatch = v.match(/(\d+)h/);
    const minMatch = v.match(/(\d+)m/);
    let result = "";
    if (hourMatch) result += `${hourMatch[1]}h`;
    if (minMatch) result += ` ${minMatch[1]}min`;
    return result.trim() || val;
  };

  const addModule = () => {
    setCourseData({ ...courseData, modules: [...courseData.modules, { name: '', items: [] }] });
  };

  const addModuleItem = (modIndex, type) => {
    const updatedModules = [...courseData.modules];
    const newItem = { type, title: '', contentUrl: '' };
    if (type === 'quiz') {
      newItem.questions = [{ questionText: '', options: ['', '', '', ''], correctOptionIndex: 0 }];
    }
    updatedModules[modIndex].items.push(newItem);
    setCourseData({ ...courseData, modules: updatedModules });
  };

  const updateModuleItem = (modIndex, itemIndex, field, value) => {
    const updatedModules = [...courseData.modules];
    updatedModules[modIndex].items[itemIndex][field] = value;
    setCourseData({ ...courseData, modules: updatedModules });
  };

  const handleModuleQuizChange = (modIndex, itemIndex, qIndex, field, value, optIndex = null) => {
    const updatedModules = [...courseData.modules];
    const item = updatedModules[modIndex].items[itemIndex];
    if (field === 'option') {
      item.questions[qIndex].options[optIndex] = value;
    } else {
      item.questions[qIndex][field] = value;
    }
    setCourseData({ ...courseData, modules: updatedModules });
  };

  const handleEditClick = async (course) => {
    setCourseData({
      title: course.title, price: course.price, description: course.description,
      category: course.category, duration: course.duration, level: course.level,
      instructorName: user.name,
      modules: (course.modules && course.modules.length > 0) ? course.modules 
        : [{ name: 'Module 1', items: course.lessons ? course.lessons.map(l => ({ type: 'video', title: l.title, contentUrl: l.videoUrl })) : [] }]
    });
    setEditingCourseId(course._id);
    setCourseViewMode('edit');
    try {
      const res = await API.get(`/courses/${course._id}/live-sessions`);
      setExistingLiveSessions(res.data);
    } catch (e) { console.log("No live sessions found."); }
  };

  const resetForm = () => {
    setCourseData({
      title: '', price: '', description: '', category: 'Blockchain',
      duration: '', level: 'Beginner', instructorName: user.name,
      modules: [{ name: 'Introduction', items: [{ type: 'video', title: '', contentUrl: '' }] }]
    });
    setPdfFile(null); setImageFile(null); setEditingCourseId(null); setCourseViewMode('list');
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === 'pdf') {
      if (file.type === "application/pdf") { setPdfFile(file); toast.success("PDF Attached"); }
      else toast.error("PDF required");
    } else {
      if (file.type.startsWith("image/")) { setImageFile(file); toast.success("Image Attached"); }
      else toast.error("Image required");
    }
  };

  const handleQuizChange = (qIndex, field, value, optIndex = null) => {
    const updatedQuestions = [...quizData.questions];
    if (field === 'option') { updatedQuestions[qIndex].options[optIndex] = value; }
    else { updatedQuestions[qIndex][field] = value; }
    setQuizData({ ...quizData, questions: updatedQuestions });
  };

  const handlePublishCourse = async () => {
    if (isPublishing) return;
    if (courseViewMode === 'create' && (!pdfFile || !imageFile)) {
      return toast.error("Thumbnail and PDF are required for new courses.");
    }
    setIsPublishing(true);
    const loadingToast = toast.loading(courseViewMode === 'edit' ? "Updating..." : "Publishing...");
    try {
      const data = new FormData();
      data.append('title', courseData.title || "");
      data.append('description', courseData.description || "");
      data.append('price', formatPriceInput(courseData.price));
      data.append('category', courseData.category || "Blockchain");
      data.append('duration', formatDurationInput(courseData.duration));
      data.append('level', courseData.level || "Beginner");
      data.append('instructorId', user.id || user._id);
      data.append('instructorName', user.name);
      data.append('modules', JSON.stringify(courseData.modules || []));
      if (pdfFile) data.append('pdf', pdfFile);
      if (imageFile) data.append('image', imageFile);
      
      let courseId = editingCourseId;
      if (courseViewMode === 'edit') {
        await API.put(`/courses/${editingCourseId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        const res = await API.post('/courses/create', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        courseId = res.data._id;
      }
      
      if (quizData && quizData.questions) {
          await API.post('/quizzes/create', {
            course: courseId, title: quizData.title || "Final Quiz",
            questions: quizData.questions, passingScore: quizData.passingScore || 80
          });
      }
      toast.success("Successfully updated!", { id: loadingToast });
      resetForm();
      await fetchMyCourses(); 
    } catch (err) {
      toast.error("Save failed.", { id: loadingToast });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAddLiveSession = async (courseId) => {
    if (!newLiveSession.title || !newLiveSession.meetingLink) return toast.error("Fill all session details");
    const isDuplicate = existingLiveSessions.some(s => s.meetingLink === newLiveSession.meetingLink && s._id !== editingSessionId);
    if (isDuplicate) return toast.error("This meeting link is already scheduled.");
    try {
      let res;
      if (editingSessionId) {
        res = await API.post(`/courses/${courseId}/live-session/${editingSessionId}`, newLiveSession, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Live Session Updated!");
      } else {
        res = await API.post(`/courses/${courseId}/schedule-live`, newLiveSession, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Live Session Scheduled!");
      }
      setNewLiveSession({ title: '', date: '', time: '', meetingLink: '' });
      setEditingSessionId(null);
      setExistingLiveSessions(res.data.sessions);
    } catch (err) { toast.error("Operation failed"); }
  };

  const handleEditLiveSession = (session) => {
    const formattedDate = new Date(session.date).toISOString().split('T')[0];
    setNewLiveSession({ title: session.title, meetingLink: session.meetingLink, date: formattedDate, time: session.time });
    setEditingSessionId(session._id);
    document.getElementById('live-session-form').scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteLiveSession = async (sessionId) => {
    if (!window.confirm("Remove this live session?")) return;
    try {
      await API.delete(`/courses/${editingCourseId}/live-session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExistingLiveSessions(existingLiveSessions.filter(s => s._id !== sessionId));
      toast.success("Session removed");
    } catch (err) { toast.error("Delete failed"); }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans'] overflow-hidden text-slate-900">
      <Toaster position="top-center" />
      
      {/* MOBILE HEADER */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 z-[100]">
        <Link to="/" className="text-xl font-black text-blue-600 tracking-tighter cursor-pointer">NextGen.</Link>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 text-2xl cursor-pointer">{isSidebarOpen ? '✕' : '☰'}</button>
      </div>

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col p-8 z-40 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link to="/" className="hidden lg:block text-2xl font-black text-blue-600 mb-12 tracking-tighter cursor-pointer">NextGen.</Link>
        <nav className="space-y-3 flex-1">
          {['overview', 'courses', 'progress'].map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setCourseViewMode('list'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-sm transition-all capitalize cursor-pointer ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
              {tab === 'overview' ? 'Dashboard Overview' : tab === 'courses' ? 'Course Management' : 'Student Progress'}
            </button>
          ))}
        </nav>
        <div className="p-5 bg-slate-900 rounded-[2rem] text-white mt-auto">
          <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Instructor</p>
          <p className="text-sm font-bold truncate">{user?.name}</p>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="mt-2 text-[10px] text-slate-400 hover:text-red-400 font-bold uppercase tracking-wider cursor-pointer">Sign Out</button>
        </div>
      </div>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[80] lg:hidden cursor-pointer" />
      )}

      <div className="flex-1 overflow-y-auto bg-slate-50/30">
        <div className="bg-white/80 backdrop-blur-md px-6 lg:px-10 py-6 border-b border-slate-100 sticky top-0 z-20 flex justify-between items-center">
          <h2 className="text-lg lg:text-xl font-extrabold text-slate-900 capitalize">
            {courseViewMode === 'list' ? activeTab : (courseViewMode === 'edit' ? 'Edit Course' : 'Create Course')}
          </h2>
          {activeTab === 'courses' && courseViewMode === 'list' && (
            <button onClick={() => setCourseViewMode('create')} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg hover:bg-blue-700 transition-all cursor-pointer">+ Create New Course</button>
          )}
        </div>

        <div className="p-4 lg:p-10 max-w-7xl mx-auto">
          {/* DASHBOARD OVERVIEW */}
          {activeTab === 'overview' && (
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10">
                {stats.map((stat, i) => (
                <div key={i} className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in duration-500">
                    <span className="text-xl mb-2 lg:mb-4 block">{stat.icon}</span>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{stat.label}</p>
                    <p className="text-xl lg:text-3xl font-black text-slate-900">{loadingStats ? "..." : stat.value}</p>
                </div>
                ))}
            </div>
          )}

          {/* STUDENT PROGRESS TAB */}
          {activeTab === 'progress' && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500 relative">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center relative z-[30]">
                <h3 className="font-black text-slate-900 text-lg">Student Performance Tracking</h3>
                <button 
                  onClick={() => { fetchDashboardData(); toast.success("Refreshed"); }} 
                  className="bg-blue-50 text-blue-600 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all cursor-pointer z-[40]"
                >
                  {loadingStats ? "Syncing..." : "Refresh Data"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <th className="px-8 py-4">Student</th>
                      <th className="px-8 py-4">Course</th>
                      <th className="px-8 py-4">Progress</th>
                      <th className="px-8 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {studentProgress.length > 0 ? studentProgress.map((student, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <p className="font-bold text-slate-900 text-sm">{student.name}</p>
                          <p className="text-[10px] text-slate-400">{student.email}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold text-slate-600">{student.courseTitle}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full w-24">
                              <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${student.progress}%` }}></div>
                            </div>
                            <span className="text-[10px] font-black text-slate-900">{student.progress}%</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${student.progress === 100 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                            {student.progress === 100 ? 'Completed' : 'In Progress'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="px-8 py-20 text-center text-slate-400 font-medium">No student data available yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <>
              {courseViewMode === 'list' ? (
                <div className="grid gap-4 lg:gap-6 animate-in slide-in-from-bottom-4 duration-500">
                  {myCourses.map(course => (
                    <div key={course._id} className="bg-white p-5 lg:p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between group hover:shadow-md transition-all gap-4">
                      <div className="flex items-center gap-4 lg:gap-6">
                        <img src={course.imageUrl} className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl object-cover shadow-inner" alt="" />
                        <div>
                          <h3 className="text base lg:text-lg font-bold text-slate-900 leading-tight">{course.title}</h3>
                          <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-black uppercase tracking-wider">
                            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{course.category}</span>
                            <span className="text-slate-400 py-0.5">{course.level}</span>
                            <span className="text-slate-900 py-0.5 font-bold">Price: {course.price}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex grid grid-cols-3 md:flex gap-2 w-full md:w-auto">
                        <button onClick={() => navigate(`/course-view/${course._id}`)} className="px-3 py-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all font-bold text-[10px] uppercase cursor-pointer">View</button>
                        <button onClick={() => handleEditClick(course)} className="px-3 py-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all font-bold text-[10px] uppercase cursor-pointer">Edit</button>
                        <button onClick={() => { if(window.confirm("Permanently delete?")) API.delete(`/courses/${course._id}`).then(() => fetchMyCourses())}} className="px-3 py-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold text-[10px] uppercase cursor-pointer">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-sm text-left">
                      <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-slate-900">Basic Information</h3>
                        <button onClick={resetForm} className="text-xs font-bold text-slate-400 hover:text-red-500 underline cursor-pointer">Discard & Back</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mb-6">
                        <input type="text" placeholder="Course Title" value={courseData.title} onChange={(e) => setCourseData({...courseData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium focus:border-blue-600 outline-none" />
                        <input type="text" placeholder="Price" value={courseData.price} onChange={(e) => setCourseData({...courseData, price: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium focus:border-blue-600 outline-none" />
                        <select value={courseData.category} onChange={(e) => setCourseData({...courseData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium outline-none cursor-pointer">
                          <option>Blockchain</option>
                          <option>Artificial Intelligence</option>
                          <option>Web Development</option>
                          <option>Data Science</option>
                        </select>
                        <input type="text" placeholder="Duration" value={courseData.duration} onChange={(e) => setCourseData({...courseData, duration: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium outline-none" />
                        <select value={courseData.level} onChange={(e) => setCourseData({...courseData, level: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium outline-none cursor-pointer">
                          <option>Beginner</option>
                          <option>Intermediate</option>
                          <option>Advanced</option>
                        </select>
                        <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-500 cursor-not-allowed">{user.name}</div>
                      </div>
                      <textarea placeholder="Description" rows="4" value={courseData.description} onChange={(e) => setCourseData({...courseData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium focus:border-blue-600 outline-none"></textarea>
                    </div>

                    <div className="space-y-6 text-left">
                      {courseData.modules.map((module, modIdx) => (
                        <div key={modIdx} className="bg-white p-6 lg:p-10 rounded-[2rem] border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                             <span className="bg-blue-600 text-white px-2 lg:px-3 py-1 rounded-lg text-[10px] lg:text-xs font-black">Module {modIdx + 1}</span>
                             <input type="text" placeholder="Module Name" value={module.name} onChange={(e) => {
                                 const updated = [...courseData.modules];
                                 updated[modIdx].name = e.target.value;
                                 setCourseData({...courseData, modules: updated});
                               }} className="flex-1 text-base lg:text-lg font-bold text-slate-900 bg-transparent outline-none" />
                             <button onClick={() => {
                               if(courseData.modules.length > 1) {
                                 const updated = courseData.modules.filter((_, i) => i !== modIdx);
                                 setCourseData({...courseData, modules: updated});
                               }
                             }} className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                          <div className="space-y-4">
                            {module.items.map((item, iIdx) => (
                              <div key={iIdx} className="p-4 lg:p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${item.type === 'video' ? 'bg-amber-100 text-amber-600' : item.type === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{item.type}</span>
                                  <button onClick={() => {
                                    const updated = [...courseData.modules];
                                    updated[modIdx].items.splice(iIdx, 1);
                                    setCourseData({...courseData, modules: updated});
                                  }} className="text-red-400 font-bold text-[9px] uppercase cursor-pointer">Remove</button>
                                </div>
                                <input type="text" placeholder="Item Title" value={item.title} onChange={(e) => updateModuleItem(modIdx, iIdx, 'title', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold mb-3 outline-none" />
                                {item.type === 'quiz' ? (
                                  <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                                    {item.questions.map((q, qIdx) => (
                                      <div key={qIdx} className="bg-white p-4 rounded-xl border border-slate-200">
                                        <input type="text" placeholder="Question Text" value={q.questionText} onChange={(e) => handleModuleQuizChange(modIdx, iIdx, qIdx, 'questionText', e.target.value)} className="w-full mb-3 text-xs font-bold border-b pb-1 outline-none" />
                                        <div className="grid grid-cols-2 gap-2">
                                          {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-2">
                                              <input type="radio" checked={q.correctOptionIndex === oIdx} onChange={() => handleModuleQuizChange(modIdx, iIdx, qIdx, 'correctOptionIndex', oIdx)} className="cursor-pointer"/>
                                              <input type="text" placeholder={`Option ${oIdx+1}`} value={opt} onChange={(e) => handleModuleQuizChange(modIdx, iIdx, qIdx, 'option', e.target.value, oIdx)} className="flex-1 text-[10px] border-none outline-none" />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                    <button onClick={() => {
                                      const updated = [...courseData.modules];
                                      updated[modIdx].items[iIdx].questions.push({ questionText: '', options: ['', '', '', ''], correctOptionIndex: 0 });
                                      setCourseData({...courseData, modules: updated});
                                    }} className="text-[10px] font-bold text-blue-600 cursor-pointer">+ Add Question</button>
                                  </div>
                                ) : (
                                  <input type="text" placeholder={item.type === 'video' ? "YouTube Link" : "PDF Link"} value={item.contentUrl} onChange={(e) => updateModuleItem(modIdx, iIdx, 'contentUrl', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-blue-500 font-medium outline-none" />
                                )}
                              </div>
                            ))}
                            <div className="flex flex-wrap gap-2 lg:gap-4">
                                <button onClick={() => addModuleItem(modIdx, 'video')} className="flex-1 min-w-[80px] py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-white hover:border-blue-600 transition-all cursor-pointer">+ Video</button>
                                <button onClick={() => addModuleItem(modIdx, 'pdf')} className="flex-1 min-w-[80px] py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-white hover:border-blue-600 transition-all cursor-pointer">+ PDF</button>
                                <button onClick={() => addModuleItem(modIdx, 'quiz')} className="flex-1 min-w-[80px] py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-white hover:border-blue-600 transition-all cursor-pointer">+ Quiz</button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button onClick={addModule} className="w-full py-4 bg-slate-900 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl cursor-pointer hover:bg-blue-600 transition-all">+ Add New Module</button>
                    </div>

                    <div className="bg-white p-6 lg:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm text-left">
                      <h3 className="text-lg font-bold text-slate-900 mb-8">Final Graded Quiz (80% to Pass)</h3>
                      {quizData.questions.map((q, qIdx) => (
                        <div key={qIdx} className="mb-6 p-4 lg:p-6 bg-slate-50 rounded-2xl border border-slate-100">
                          <input type="text" placeholder="Question Text" value={q.questionText} onChange={(e) => handleQuizChange(qIdx, 'questionText', e.target.value)} className="w-full mb-4 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <input type="radio" name={`final-correct-${qIdx}`} checked={q.correctOptionIndex === oIdx} onChange={() => handleQuizChange(qIdx, 'correctOptionIndex', oIdx)} className="cursor-pointer"/>
                                <input type="text" placeholder={`Option ${oIdx+1}`} value={opt} onChange={(e) => handleQuizChange(qIdx, 'option', e.target.value, oIdx)} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button onClick={() => setQuizData({...quizData, questions: [...quizData.questions, { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0 }]})} className="text-blue-600 font-bold text-sm cursor-pointer">+ Add Question to Final Exam</button>
                    </div>

                    <div id="live-session-form" className="bg-white p-6 lg:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm mt-6 text-left">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900">{editingSessionId ? "Edit Live Session" : "Schedule Live Session"}</h3>
                        {editingSessionId && <button onClick={() => {setEditingSessionId(null); setNewLiveSession({title:'', date:'', time:'', meetingLink:''})}} className="text-xs font-bold text-slate-400 hover:text-blue-600 cursor-pointer underline">Cancel Edit</button>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <input type="text" placeholder="Session Title" className="bg-slate-50 p-4 rounded-xl text-sm outline-none" value={newLiveSession.title} onChange={e => setNewLiveSession({...newLiveSession, title: e.target.value})} />
                        <input type="text" placeholder="Meeting Link" className="bg-slate-50 p-4 rounded-xl text-sm outline-none text-blue-600" value={newLiveSession.meetingLink} onChange={e => setNewLiveSession({...newLiveSession, meetingLink: extractLink(e.target.value)})} />
                        <input type="date" className="bg-slate-50 p-4 rounded-xl text-sm outline-none cursor-pointer" value={newLiveSession.date} onChange={e => setNewLiveSession({...newLiveSession, date: e.target.value})} />
                        <input type="time" className="bg-slate-50 p-4 rounded-xl text-sm outline-none cursor-pointer" value={newLiveSession.time} onChange={e => setNewLiveSession({...newLiveSession, time: e.target.value})} />
                      </div>
                      <button onClick={() => handleAddLiveSession(editingCourseId)} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest cursor-pointer shadow-lg hover:bg-blue-700 transition-all">
                        {editingSessionId ? "Update Session" : "Post Live Schedule"}
                      </button>

                      {existingLiveSessions.length > 0 && (
                        <div className="mt-10 space-y-3">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Current Schedule</p>
                          {existingLiveSessions.map((session, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all gap-4">
                              <div>
                                <h4 className="text-sm font-bold text-slate-800">{session.title}</h4>
                                <p className="text-[10px] text-slate-500">{new Date(session.date).toLocaleDateString()} at {session.time}</p>
                              </div>
                              <div className="flex gap-4">
                                <button onClick={() => handleEditLiveSession(session)} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">Edit</button>
                                <button onClick={() => handleDeleteLiveSession(session._id)} className="text-xs font-bold text-red-400 hover:underline cursor-pointer">Delete</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 text-white lg:sticky lg:top-32 shadow-2xl text-left">
                      <h3 className="text-base lg:text-lg font-bold mb-6 text-blue-400 uppercase tracking-widest">Assets</h3>
                      <div className="space-y-6 mb-8">
                        <div className="text-left">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Thumbnail</p>
                          <input type="file" ref={imageInputRef} onChange={(e) => handleFileUpload(e, 'image')} className="hidden" />
                          <div onClick={() => imageInputRef.current.click()} className="border-2 border-dashed border-slate-700 rounded-3xl p-6 text-center cursor-pointer hover:border-blue-500 transition-all">
                              <p className="text-[10px] font-bold text-slate-500 truncate">{imageFile ? imageFile.name : "Upload Thumbnail"}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Course PDF</p>
                          <input type="file" ref={pdfInputRef} onChange={(e) => handleFileUpload(e, 'pdf')} className="hidden" />
                          <div onClick={() => pdfInputRef.current.click()} className="border-2 border-dashed border-slate-700 rounded-3xl p-6 text-center cursor-pointer hover:border-blue-500 transition-all">
                              <p className="text-[10px] font-bold text-slate-500 truncate">{pdfFile ? pdfFile.name : "Upload Course PDF"}</p>
                          </div>
                        </div>
                      </div>
                      <button onClick={handlePublishCourse} disabled={isPublishing} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase cursor-pointer hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                        {isPublishing ? "Processing..." : (courseViewMode === 'edit' ? "Save Course" : "Confirm & Publish")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;