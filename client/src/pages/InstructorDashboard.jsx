import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';

const InstructorDashboard = () => {
  const navigate = useNavigate();
  const pdfInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [courseViewMode, setCourseViewMode] = useState('list'); 
  const [isPublishing, setIsPublishing] = useState(false);
  const [myCourses, setMyCourses] = useState([]);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
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
  const [loadingCourses, setLoadingCourses] = useState(false);
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');
  const [balance, setBalance] = useState(null);

useEffect(() => {
  if (activeTab === 'payouts') {
    const fetchBalance = async () => {
      try {
        const { data } = await API.get('/payments/instructor-balance');
        // Ensure data exists and is an object before setting state
        if (data) {
          setBalance(data); 
          console.log("Stripe Data Received:", data); // Check your console!
        }
      } catch (err) {
        console.error("Failed to fetch Stripe balance:", err);
      }
    };
    fetchBalance();
  }
}, [activeTab]);
useEffect(() => {
    // 1. Force Scroll to Top on every mount/redirect
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 2. Handle Redirects from Profile
    if (location.state?.activeTab) {
      const target = location.state.activeTab;
      
      if (target === 'manage') {
        setActiveTab('courses');
        setCourseViewMode('list');
      } else if (target === 'create') {
        setActiveTab('courses');
        setCourseViewMode('create');
      } else {
        setActiveTab(target);
      }
    } else {
      // 3. Default to Overview if no state is passed
      setActiveTab('overview');
      setCourseViewMode('list');
    }
  }, [location.state]);
  // --- REAL-TIME DATA FETCHING ---
const fetchDashboardData = async () => {
    if (!token || !user) return;
    setLoadingStats(true);
    
    try {
      // 1. Fetch Instructor Stats 
      // 🔥 FIX: We remove the manual query string and let the auth token handle identity
      const statsRes = await API.get(`/instructor/stats`);
      
      const data = statsRes.data;
      const updatedStats = stats.map(s => ({
        ...s,
        value: s.key === 'totalRevenue' ? `$${data[s.key] || 0}` : (data[s.key] || 0)
      }));
      setStats(updatedStats);

      // 2. Fetch Student Progress
      // 🔥 FIX: Same here, use the protected route
      const progressRes = await API.get(`/instructor/student-progress`);
      setStudentProgress(progressRes.data);
    } catch (err) {
      console.error("Dashboard sync error", err);
      // Optional: toast.error("Stats sync failed");
    } finally {
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
  setLoadingCourses(true); // 🔥 Start loading
  try {
    const res = await API.get(`/courses/all?t=${Date.now()}`);
    
    const currentUserId = user?.id || user?._id;
    const currentUserName = user?.name;

    const filtered = res.data.filter(course => {
      const instructorId = course.instructor?._id || course.instructor;
      const instructorName = course.instructor?.name || course.instructorName;
      return (instructorId && currentUserId && String(instructorId) === String(currentUserId)) || 
             (instructorName && currentUserName && instructorName === currentUserName);
    });

    const sorted = filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    setMyCourses(sorted);
  } catch (err) {
    console.error("Fetch courses error:", err);
    toast.error("Failed to load your courses");
  } finally {
    setLoadingCourses(false); // 🔥 Stop loading
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

// --- IMPROVED UTILITY FUNCTIONS ---

const formatPriceInput = (val) => {
  let v = val.toString().trim();
  if (v === '' || v.toLowerCase() === 'free' || v === '0') return 'Free';
  
  // Remove everything except numbers and a single decimal point
  let numeric = v.replace(/[^0-9.]/g, '');
  
  // Ensure it starts with $
  return numeric ? `$${numeric}` : 'Free';
};

const formatDurationInput = (val) => {
  let v = val.toLowerCase().trim();
  if (!v) return '';

  // Extract all numbers and units
  const hoursMatch = v.match(/(\d+)\s*(h|hour|hr|hrs)/);
  const minsMatch = v.match(/(\d+)\s*(m|min|minute|mins)/);

  // If user typed only a number (e.g., "10"), assume hours
  if (/^\d+$/.test(v)) return `${v}h`;

  let result = "";
  if (hoursMatch) result += `${hoursMatch[1]}h `;
  if (minsMatch) result += `${minsMatch[1]}min`;

  // 🔥 THE FIX: If no valid time pattern was found, return empty string 
  // instead of the original 'fgh'
  return result.trim() || ""; 
};

const isValidUrl = (url) => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (e) {
    return false;
  }
};

const isYouTubeLink = (url) => {
  return isValidUrl(url) && (url.includes('youtube.com') || url.includes('youtu.be'));
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

  // 🔥 Add this function to handle Stripe Onboarding
const handleConnectStripe = async () => {
  setIsConnectingStripe(true);
  try {
    // If the account is already linked, get a Login Link instead of an Onboarding Link
    const endpoint = user?.stripeAccountId 
      ? '/payments/create-login-link' 
      : '/payments/create-onboarding-link';

    const { data } = await API.post(endpoint);
    if (data.url) {
      window.open(data.url, '_blank'); // Open dashboard in a new tab
    }
  } catch (err) {
    toast.error("Stripe access failed.");
  } finally {
    setIsConnectingStripe(false);
  }
};

// 🔥 Add this to fetch your transaction logs
const fetchTransactions = async () => {
  try {
    const res = await API.get('/payments/instructor-transactions'); // Create this route in your backend
    setTransactions(res.data);
  } catch (err) {
    console.error("Failed to fetch transactions");
  }
};

// Update your useEffect to fetch logs when the Payouts tab is clicked
useEffect(() => {
  if (activeTab === 'payouts') fetchTransactions();
}, [activeTab]);

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
  const toastId = toast.loading("Loading curriculum details...");
  
  try {
    // 🔥 FORCE FETCH the full course to ensure modules are present
    const fullCourseRes = await API.get(`/courses/${course._id}`);
    const fullCourse = fullCourseRes.data;

    console.log("Full Course Data Received:", fullCourse); // Check your console!

    // 1. Set ID and Mode
    setEditingCourseId(fullCourse._id);
    
    // 2. Prepare Modules with a fallback
    const modulesToSet = (fullCourse.modules && fullCourse.modules.length > 0) 
      ? JSON.parse(JSON.stringify(fullCourse.modules)) 
      : [{ name: 'Introduction', items: [] }];

    // 3. Update Course Data State
    setCourseData({
      title: fullCourse.title || '',
      price: fullCourse.price || '',
      description: fullCourse.description || '',
      category: fullCourse.category || 'Blockchain',
      duration: fullCourse.duration || '',
      level: fullCourse.level || 'Beginner',
      instructorName: user?.name || '',
      modules: modulesToSet
    });

    // 4. Switch View Mode AFTER data is set
    setCourseViewMode('edit');

    // 5. Fetch Quiz & Sessions
    const [quizRes, sessionsRes] = await Promise.allSettled([
      API.get(`/quizzes/course/${fullCourse._id}`),
      API.get(`/courses/${fullCourse._id}/live-sessions`)
    ]);

    if (quizRes.status === 'fulfilled' && quizRes.value.data) {
      setQuizData({
        title: quizRes.value.data.title || 'Final Graded Quiz',
        passingScore: quizRes.value.data.passingScore || 80,
        questions: JSON.parse(JSON.stringify(quizRes.value.data.questions))
      });
    }

    if (sessionsRes.status === 'fulfilled') {
      setExistingLiveSessions(sessionsRes.value.data);
    }

    toast.success("Ready to edit", { id: toastId });

  } catch (err) {
    console.error("Edit load failed:", err);
    toast.error("Failed to load full course data", { id: toastId });
  }
};
const resetForm = () => {
  // 1. Reset Course Metadata
  setCourseData({
    title: '', price: '', description: '', category: 'Blockchain',
    duration: '', level: 'Beginner', instructorName: user?.name || '',
    modules: [{ name: 'Introduction', items: [{ type: 'video', title: '', contentUrl: '' }] }]
  });

  // 2. 🔥 Clear the Final Quiz
  setQuizData({
    title: 'Final Graded Quiz',
    passingScore: 80,
    questions: [{ questionText: '', options: ['', '', '', ''], correctOptionIndex: 0 }]
  });

  // 3. 🔥 Clear Live Session Form & List
  setNewLiveSession({ title: '', date: '', time: '', meetingLink: '' });
  setExistingLiveSessions([]);
  setEditingSessionId(null);

  // 4. Clear Files and Modes
  setPdfFile(null); 
  setImageFile(null); 
  setEditingCourseId(null); 
  setCourseViewMode('list');
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

  // --- 1. HELPER: URL & PATTERN VALIDATORS ---
  const urlPattern = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
  const ytPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|shorts\/)?([a-zA-Z0-9_-]{11})(\S+)?$/;

  // --- 2. PRE-PROCESS & SANITIZE INPUTS ---
  const sanitizedDuration = formatDurationInput(courseData.duration);
  const sanitizedPrice = formatPriceInput(courseData.price);

  // --- 3. THE VALIDATION CHECKLIST ---
  const errors = [];

  // Basic Info Checks
  if (!courseData.title.trim() || courseData.title.length < 5) errors.push("Title (min 5 chars)");
  if (!courseData.description.trim() || courseData.description.length < 20) errors.push("Description (min 20 chars)");
  if (!sanitizedDuration) errors.push("Duration (Format: '10h', '30min', or '1h 30min')");
  
  // Asset & Quiz Checks (Only Required for New Courses)
  if (courseViewMode === 'create') {
    if (!imageFile) errors.push("Course Thumbnail Image");
    if (!pdfFile) errors.push("Course Syllabus PDF");
    
    // 🔥 FINAL GRADED QUIZ VALIDATION
    const hasQuizText = quizData?.questions?.[0]?.questionText?.trim();
    if (!hasQuizText) {
      errors.push("Final Graded Quiz: At least 1 question is required before publishing");
    }
  }

  // Deep Module & Item Content Checks
  courseData.modules.forEach((mod, mIdx) => {
    if (!mod.name.trim()) errors.push(`Module ${mIdx + 1} Name`);
    if (mod.items.length === 0) errors.push(`Module ${mIdx + 1} must have at least one item`);
    
    mod.items.forEach((item, iIdx) => {
      const itemLoc = `Mod ${mIdx + 1}, Item ${iIdx + 1}`;
      if (!item.title.trim()) errors.push(`${itemLoc}: Missing Title`);
      
if (item.type === 'video') {
    if (!item.contentUrl.trim()) {
      errors.push(`Module ${mIdx + 1}: Missing YouTube Link`);
    } else {
      // Test against the expanded regex
      const isValid = ytPattern.test(item.contentUrl.trim());
      if (!isValid) {
        errors.push(`Module ${mIdx + 1}: The link provided is not a recognized YouTube format`);
      }
    }
  }
      
      if (item.type === 'pdf') {
        if (!item.contentUrl.trim()) errors.push(`${itemLoc}: Missing PDF Link`);
        else if (!urlPattern.test(item.contentUrl)) errors.push(`${itemLoc}: Invalid PDF URL`);
      }

      if (item.type === 'quiz') {
        if (!item.questions || item.questions.length === 0 || !item.questions[0].questionText.trim()) {
          errors.push(`${itemLoc}: Inline Quiz needs at least one question`);
        }
      }
    });
  });

  // --- 4. ERROR DISPLAY ---
  if (errors.length > 0) {
    setIsPublishing(false);
    return toast.error(
      <div className="text-left">
        <b className="text-sm">Save Blocked! Please correct:</b>
        <ul className="list-disc ml-4 text-[10px] mt-2 space-y-1">
          {errors.map((err, idx) => <li key={idx}>{err}</li>)}
        </ul>
      </div>,
      { duration: 3000 }
    );
  }

  // --- 5. EXECUTION ---
  setIsPublishing(true);
  const loadingToast = toast.loading(courseViewMode === 'edit' ? "Saving Changes..." : "Publishing Course...");

  try {
    const data = new FormData();
    data.append('title', courseData.title);
    data.append('description', courseData.description);
    data.append('price', sanitizedPrice); 
    data.append('category', courseData.category);
    data.append('duration', sanitizedDuration); 
    data.append('level', courseData.level);
    data.append('instructorId', user.id || user._id);
    data.append('instructorName', user.name);
    data.append('modules', JSON.stringify(courseData.modules));
    
    if (pdfFile) data.append('pdf', pdfFile);
    if (imageFile) data.append('image', imageFile);

    let savedCourseId = editingCourseId;

    if (courseViewMode === 'edit') {
      // API Update Call
      await API.put(`/courses/${editingCourseId}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } else {
      // API Create Call
      const res = await API.post('/courses/create', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      savedCourseId = res.data._id;

      // Handle Final Quiz Creation ONLY on initial Publish
      if (quizData?.questions?.[0]?.questionText.trim()) {
        await API.post('/quizzes/create', {
          course: savedCourseId,
          title: quizData.title || "Final Quiz",
          questions: quizData.questions,
          passingScore: quizData.passingScore || 80
        });
      }
    }

    toast.success(courseViewMode === 'edit' ? "Changes saved successfully!" : "Course and Quiz published!", { id: loadingToast });
    resetForm();
    await fetchMyCourses(); 
    
  } catch (err) {
    console.error("Publishing Error:", err);
    const serverError = err.response?.data?.error || "Server connection failed.";
    toast.error(`Error: ${serverError}`, { id: loadingToast });
  } finally {
    setIsPublishing(false);
  }
};
const handleAddLiveSession = async (courseId) => {
  // 1. Validations
  if (!newLiveSession.title.trim()) return toast.error("Enter session title");
  if (!isValidUrl(newLiveSession.meetingLink)) return toast.error("Invalid Meeting URL");

  const toastId = "live-session-sync";
  toast.loading(editingSessionId ? "Saving changes..." : "Scheduling session...", { id: toastId });

  try {
    let res;
    if (editingSessionId) {
      // 🔥 THE LIKELY FIX: Change to .put and use singular 'live-session'
      // If this still 404s, check if your backend route uses 'live-sessions' (plural)
      res = await API.put(`/courses/${courseId}/live-session/${editingSessionId}`, newLiveSession, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Live Session Updated!", { id: toastId });
    } else {
      // Create new session
      res = await API.post(`/courses/${courseId}/schedule-live`, newLiveSession, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Live Session Scheduled!", { id: toastId });
    }

    // 2. Reset State
    setNewLiveSession({ title: '', date: '', time: '', meetingLink: '' });
    setEditingSessionId(null);

    // 3. Refresh List (using your confirmed GET route)
    const refreshRes = await API.get(`/courses/${courseId}/live-session`);
    setExistingLiveSessions(refreshRes.data);

  } catch (err) {
    console.error("Live Session Error:", err);
    // 🔥 HELPER: This will tell you exactly what URL failed in the console
    const failedUrl = err.config?.url;
    const failedMethod = err.config?.method;
    
    toast.error(`404: The ${failedMethod.toUpperCase()} route to ${failedUrl} does not exist on your server.`, { id: toastId });
  }
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
      
      {/* 📱 MOBILE HEADER - Hidden when sidebar is open */}
      {!isSidebarOpen && (
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 z-[50] sticky top-0 animate-in fade-in duration-300">
          <Link to="/" className="text-xl font-black text-blue-600 tracking-tighter">NextGen.</Link>
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 text-slate-600 text-2xl cursor-pointer"
          >
            ☰
          </button>
        </div>
      )}

      {/* 🌫️ MOBILE OVERLAY - Handles "Touch Outside to Close" */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] lg:hidden transition-opacity animate-in fade-in duration-300" 
        />
      )}

      {/* 🧭 SIDEBAR - Now at the absolute front (z-[120]) */}
      <div className={`
        fixed inset-y-0 left-0 w-[85%] sm:w-80 bg-white shadow-2xl flex flex-col z-[120] 
        transform transition-transform duration-500 ease-out lg:relative lg:translate-x-0 lg:w-72 lg:shadow-none lg:border-r lg:border-slate-200
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Sidebar Header with Close Button (Front and Center) */}
        <div className="flex items-center justify-between p-8 pb-4">
          <Link to="/" className="text-2xl font-black text-blue-600 tracking-tighter">NextGen.</Link>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-900 transition-colors text-2xl cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-6 pt-4 space-y-2 overflow-y-auto">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: '📊' },
            { id: 'courses', label: 'Course Management', icon: '📚' },
            { id: 'progress', label: 'Student Progress', icon: '📈' },
            { id: 'payouts', label: 'Payouts & Wallet', icon: '💳' }
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => { 
                setActiveTab(item.id); 
                if (activeTab !== 'courses') setCourseViewMode('list'); 
                setIsSidebarOpen(false); 
              }} 
              className={`w-full flex items-center gap-4 p-5 rounded-[1.5rem] font-bold text-sm transition-all cursor-pointer ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom Instructor Card */}
        <div className="p-6 mt-auto">
          <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white shadow-xl">
            <p className="text-[10px] font-black text-blue-400 uppercase mb-1 tracking-widest">Instructor Access</p>
            <p className="text-base font-bold truncate">{user?.name}</p>
            <button 
              onClick={() => { localStorage.clear(); navigate('/login'); }} 
              className="mt-4 w-full py-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-red-500/20"
            >
              Sign Out Securely
            </button>
          </div>
        </div>
      </div>

      {/* 🖥️ MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto bg-slate-50/30 flex flex-col">
        <div className="bg-white/80 backdrop-blur-md px-6 lg:px-10 py-6 border-b border-slate-100 sticky top-0 z-20 flex justify-between items-center">
          <h2 className="text-lg lg:text-xl font-extrabold text-slate-900 capitalize">
            {courseViewMode === 'list' ? activeTab : (courseViewMode === 'edit' ? 'Edit Course' : 'Create Course')}
          </h2>
          {activeTab === 'courses' && courseViewMode === 'list' && (
            <button onClick={() => {
      resetForm(); // 🔥 This clears the old data first
      setCourseViewMode('create'); // Then switches to the create view
    }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg hover:bg-blue-700 transition-all cursor-pointer">+ Create New Course</button>
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
{/* STUDENT PROGRESS TAB - Desktop Optimized & Mobile Responsive */}
{activeTab === 'progress' && (
  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
    
    {/* Header Card */}
<div className="flex flex-col md:flex-row justify-between items-center gap-6">
  <div className="text-center md:text-left">
    <h3 className="font-black text-slate-900 text-xl lg:text-2xl">Learning Analytics</h3>
    {/* 🔥 Subtle auto-refresh indicator */}
    <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
      <p className="text-slate-400 text-xs font-medium">Auto-syncing every 30s</p>
    </div>
  </div>

  <button 
    onClick={() => { fetchDashboardData(); toast.success("Manual Sync Complete"); }} 
    disabled={loadingStats}
    className="group flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all cursor-pointer shadow-sm"
  >
    {loadingStats ? (
      <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
    ) : (
      <svg className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    )}
    Sync Now
  </button>
</div>

    {/* Table Container - Uses min-w-full to expand on desktop */}
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Student Identity</th>
              <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Active Course</th>
              <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Current Progress</th>
              <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {studentProgress.length > 0 ? studentProgress.map((student, idx) => (
              <tr key={idx} className="hover:bg-blue-50/30 transition-all group">
                <td className="px-8 py-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-400 flex items-center justify-center text-white font-black text-sm lg:text-base shadow-md">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm lg:text-base group-hover:text-blue-600 transition-colors">{student.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{student.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-8">
                  <span className="text-xs lg:text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                    {student.courseTitle}
                  </span>
                </td>
                <td className="px-8 py-8">
                  <div className="flex flex-col gap-2 min-w-[150px] lg:min-w-[250px]">
                    <div className="flex justify-between text-[10px] font-black text-blue-600 uppercase">
                      <span>Completion</span>
                      <span>{student.progress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.4)]" 
                        style={{ width: `${student.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-8 text-center">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                    student.progress === 100 
                    ? 'bg-green-50 text-green-600 border-green-100 shadow-sm shadow-green-100' 
                    : 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm shadow-amber-100'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${student.progress === 100 ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></div>
                    {student.progress === 100 ? 'Certified' : 'Learning'}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="px-8 py-32 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl grayscale opacity-30">📂</span>
                    <p className="text-slate-400 font-bold text-sm">No student activity detected yet.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}

{activeTab === 'payouts' && (
  <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
<h2 className="text-4xl font-black italic">
  {balance ? 
    `$${(( (Number(balance.available) || 0) + (Number(balance.pending) || 0) ) / 100).toFixed(2)}` 
    : "$0.00"
  }
  <span className="text-sm ml-2 font-bold not-italic text-slate-500 uppercase">USD</span>
</h2>

    {/* Stripe Connect Card */}
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="text-left">
        <h3 className="text-xl font-black text-slate-900">Stripe Payout Settings</h3>
        <p className="text-slate-400 text-sm mt-1">
          {user?.stripeAccountId 
            ? "Your account is linked. Funds are automatically split 90/10." 
            : "Connect your bank account to start receiving automated payouts."}
        </p>
      </div>
      <button 
        onClick={handleConnectStripe}
        disabled={isConnectingStripe}
        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 cursor-pointer"
      >
        {isConnectingStripe ? "Processing..." : (user?.stripeAccountId ? "View Stripe Dashboard" : "Connect Stripe (Test Mode)")}
      </button>
    </div>

    {/* Transaction Logs Table */}
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden text-left">
      <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30">
        <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest">Transaction History</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Date</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Course</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Paid</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-blue-600">Your Share (90%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {transactions.length > 0 ? transactions.map((tx, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                <td className="px-8 py-6 text-sm text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                <td className="px-8 py-6 font-bold text-slate-900">{tx.courseId?.title || "Course Access"}</td>
                <td className="px-8 py-6 text-sm font-medium text-slate-400">
                   {/* 🔥 Formatted to 2 decimals */}
                   ${tx.amount.toFixed(2)} USD
                </td>
                <td className="px-8 py-6 text-sm font-black text-blue-600">
                   {/* 🔥 Formatted to 2 decimals */}
                   ${tx.instructorNet.toFixed(2)} USD
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="px-8 py-20 text-center text-slate-400 font-bold italic">No payouts processed yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
                        <button 
  onClick={() => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold text-slate-800">
          Are you sure you want to delete <b>"{course.title}"</b>? 
          This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button 
            onClick={() => toast.dismiss(t.id)}
            // 🔥 Added cursor-pointer
            className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const loadingToast = toast.loading("Removing course...");
              try {
                await API.delete(`/courses/${course._id}`);
                toast.success("Course deleted successfully", { id: loadingToast });
                fetchMyCourses();
              } catch (err) {
                toast.error("Delete failed.", { id: loadingToast });
              }
            }}
            // 🔥 Added cursor-pointer
            className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md hover:bg-red-600 active:scale-95 transition-all cursor-pointer"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    ), {
      duration: 6000,
      position: 'top-center',
      style: {
        borderRadius: '20px',
        background: '#fff',
        color: '#333',
        border: '1px solid #fee2e2',
        padding: '20px'
      },
    });
  }} 
  className="px-3 py-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold text-[10px] uppercase cursor-pointer"
>
  Delete
</button>
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
                        <input 
                          type="text" 
                          placeholder="Price (e.g. 49.99)" 
                          value={courseData.price} 
                          onChange={(e) => setCourseData({...courseData, price: e.target.value})} 
                          onBlur={(e) => setCourseData({...courseData, price: formatPriceInput(e.target.value)})}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium focus:border-blue-600 outline-none" 
                        />
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

{/* 🔥 Logic: Only show the Current Schedule list if we are EDITING an existing course */}
{courseViewMode === 'edit' && (
  <div className="mt-10 space-y-3">
    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
      Current Course Schedule
    </p>
    
    {existingLiveSessions.length > 0 ? (
      existingLiveSessions.map((session, idx) => (
        <div 
          key={session._id || idx} 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all gap-4 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div>
            <h4 className="text-sm font-bold text-slate-800">{session.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold uppercase">
                Live
              </span>
              <p className="text-[10px] text-slate-500">
                {new Date(session.date).toLocaleDateString()} at {session.time}
              </p>
            </div>
          </div>
          
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => handleEditLiveSession(session)} 
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer underline underline-offset-4"
            >
              Edit
            </button>
            <button 
              onClick={() => handleDeleteLiveSession(session._id)} 
              className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))
    ) : (
      <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl text-center">
        <p className="text-xs font-medium text-slate-400 italic">
          No live sessions scheduled for this course yet.
        </p>
      </div>
    )}
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