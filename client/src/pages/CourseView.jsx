import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import AiTutor from '../components/AiTutor';
import { useSearchParams } from 'react-router-dom';

// --- SUB-COMPONENT FOR VIDEO TO PREVENT DOM CONFLICTS ---
// --- SUB-COMPONENT FOR VIDEO WITH AUTO-PLAY ---
const VideoPlayer = ({ videoUrl, onComplete }) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    let videoId = "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = videoUrl.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      videoId = videoUrl; 
    }

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
playerRef.current = new window.YT.Player(containerRef.current, {
  height: '100%',
  width: '100%',
  videoId: videoId,
  playerVars: { 
      autoplay: 1,
      controls: 1,          // Show basic controls (play/pause, volume, etc.)
      rel: 0,               // Don't show related videos from other channels
      modestbranding: 1,    // Hides the YouTube logo in the control bar
      iv_load_policy: 3,    // Hide video annotations
      disablekb: 1,         // Optional: Disable keyboard shortcuts
      showinfo: 0           // Deprecated, but some older players still respect it
  },
        events: {
          'onReady': (event) => {
            // 🔥 This is the secret sauce: Force play when the API is ready
            event.target.playVideo();
          },
          'onStateChange': (event) => {
            if (event.data === window.YT.PlayerState.ENDED) onComplete();
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy();
    };
  }, [videoUrl]);

  return <div className="w-full h-full aspect-video"><div ref={containerRef}></div></div>;
};

const CourseView = () => {
  // 1. Extract params and hooks
  const { id } = useParams(); 
  const navigate = useNavigate();


  const [course, setCourse] = useState(null);
  const [activeLesson, setActiveLesson] = useState(0); 
  const [activeTab, setActiveTab] = useState('description'); // Single instance
  const [loading, setLoading] = useState(true);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [user, setUser] = useState(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [expandedModules, setExpandedModules] = useState({ 0: true });
  const [moduleQuizAnswers, setModuleQuizAnswers] = useState({});
  const [moduleQuizResult, setModuleQuizResult] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const tabSectionRef = useRef(null); // Add this ref for scrolling

  // Logic to handle notification redirect
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'certificates') {
      setActiveTab('certificate');
      // Delay scroll slightly to allow the page to render
      setTimeout(() => {
        tabSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, [searchParams]);
  
  const getAllItems = () => {
    if (!course || !course.modules) return [];
    return course.modules.flatMap(m => m.items);
  };

// --- REPLACE getEmbedLink with this ---
const getEmbedLink = (url) => {
  if (!url) return "";

  // 1. YouTube Handling (Standardize to embed format for iframe)
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const ytMatch = url.match(ytRegExp);
  if (ytMatch && ytMatch[2].length === 11) {
    return `https://www.youtube.com/embed/${ytMatch[2]}?rel=0&modestbranding=1`;
  }

  // 2. Google Drive Links
  if (url.includes("drive.google.com")) {
    return url.replace(/\/view.*|\/edit.*|\/usp=sharing/g, "/preview");
  }

  // 3. standard PDFs
  if (url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?')) {
    return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  }

  return url;
};

  const toggleModule = (mIdx) => {
    setExpandedModules(prev => ({ ...prev, [mIdx]: !prev[mIdx] }));
  };

  const getItemIcon = (type) => {
    switch (type) {
      case 'video': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'pdf': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
      case 'quiz': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
      default: return '📄';
    }
  };

  const handleItemClick = (index, isLocked) => {
    if (isLocked) {
      toast.error("Locked: Complete previous lessons!", { icon: '🔒' });
      return;
    }
    setActiveLesson(index);
    setModuleQuizResult(null);
    setModuleQuizAnswers({});
    const allItems = getAllItems();
    setIsQuizOpen(allItems[index]?.type === 'quiz');
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  useEffect(() => {
const fetchData = async () => {
  setLoading(true); // Ensure loading starts as true
  try {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    // 1. Basic Auth Check
    if (!userStr || userStr === "undefined" || !token) {
      toast.error("Session missing. Please login.");
      return navigate('/login');
    }

    const storedUser = JSON.parse(userStr);
    setUser(storedUser);

    console.log(`📡 Fetching Workspace for Course ID: ${id}`);

    // 2. Fetch Course Data
    // We fetch the course and user progress in parallel to save time
    const [courseRes, progressRes] = await Promise.allSettled([
      API.get(`/courses/${id}`),
      API.get(`/users/course-progress/${id}`)
    ]);

    // 3. Handle Course Result
    if (courseRes.status === 'fulfilled') {
      setCourse(courseRes.value.data);
    } else {
      // If course fetch fails, we MUST stop the loading hang
      console.error("❌ Course Fetch Failed:", courseRes.reason);
      const status = courseRes.reason.response?.status;
      
      if (status === 401) {
        toast.error("Session expired. Please re-login.");
        localStorage.clear();
        return navigate('/login');
      } else if (status === 404) {
        toast.error("Course not found.");
        return navigate('/courses');
      } else {
        throw new Error(courseRes.reason.response?.data?.error || "Network Error");
      }
    }

    // 4. Handle Progress Result
    if (progressRes.status === 'fulfilled' && progressRes.value.data) {
      setCompletedLessons(progressRes.value.data.completedLessons || []);
      if (progressRes.value.data.isCompleted) {
        setQuizResult({ score: 100, passed: true });
      }
    }

    // 5. Fetch Final Quiz
    try {
      const quizRes = await API.get(`/quizzes/course/${id}`);
      setQuiz(quizRes.data);
    } catch (qErr) {
      console.warn("⚠️ Final Quiz not found for this course.");
    }

  } catch (err) {
    console.error("🔥 CRITICAL WORKSPACE ERROR:", err);
    toast.error(err.message || "Failed to initialize workspace.");
    // If we can't get the course, we can't stay here
    setTimeout(() => navigate('/courses'), 3000);
  } finally {
    setLoading(false);
  }
};
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    fetchData();
  }, [id, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const mainframe = document.querySelector('.flex-1.overflow-y-auto');
    if (mainframe) mainframe.scrollTop = 0;
  }, [id, activeLesson]);

  useEffect(() => {
    const allItems = getAllItems();
    const currentItem = allItems[activeLesson];
    setIsQuizOpen(currentItem?.type === 'quiz' || (activeTab === 'certificate' && quizStarted));
  }, [activeLesson, activeTab, quizStarted, course]);

const moveToNext = () => {
  const allItems = getAllItems();
  
  // 1. Check if there is actually a next item in the entire course
  if (activeLesson < allItems.length - 1) {
    const nextIndex = activeLesson + 1;
    
    // 2. Move the active lesson forward
    setActiveLesson(nextIndex);
    
    // 3. Reset states for the new item
    setModuleQuizResult(null);
    setModuleQuizAnswers({});
    
    // 4. 🔥 SMART EXPAND: Find which module this next item belongs to and open it
    let cumulativeCount = 0;
    course.modules.forEach((mod, modIdx) => {
      const moduleItemsCount = mod.items.length;
      // If the nextIndex falls within this module's range
      if (nextIndex >= cumulativeCount && nextIndex < cumulativeCount + moduleItemsCount) {
        setExpandedModules(prev => ({
          ...prev,
          [modIdx]: true // Open the module containing the next item
        }));
      }
      cumulativeCount += moduleItemsCount;
    });

} else {
    setActiveTab('certificate');
    toast.success("Curriculum Finished! Complete the Final Exam.", { icon: '🏁' });
    // This ensures the user sees the exam immediately
    setTimeout(() => {
      tabSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);
}
};

  const handleAutoProgress = async () => {
    if (!completedLessons.includes(activeLesson)) {
      const updatedLessons = [...completedLessons, activeLesson];
      setCompletedLessons(updatedLessons);
      toast.success("Progress Saved!", { icon: '👏' });
      const allItems = getAllItems();
      const rawProgress = (updatedLessons.length / allItems.length) * 100;
      const newProgress = Math.min(Math.round(rawProgress), 100);
      try {
        await API.patch(`/users/update-progress/${id}`, { completedLessons: updatedLessons, progress: newProgress });
      } catch (err) { console.error("Sync error"); }
      setTimeout(() => { moveToNext(); }, 1500);
    }
  };

const submitFinalQuiz = async () => {
  if (!quiz || !quiz.questions) return;
  
  const toastId = "quiz-submission"; // 🔥 Unique ID
  
  // Validation: Check if all questions are answered
  if (Object.keys(selectedAnswers).length < quiz.questions.length) {
    return toast.error("Please answer all questions before submitting.", { id: toastId });
  }

  let correctCount = 0;
  quiz.questions.forEach((q, index) => { 
    if (selectedAnswers[index] === q.correctOptionIndex) correctCount++; 
  });
  
  const score = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = score >= 80;
  
  setQuizResult({ score, passed });

  if (passed) {
    toast.success(`Exam Passed with ${score}%!`, { id: toastId });
    await API.patch(`/users/update-progress/${id}`, { isCompleted: true, progress: 100 });
  } else {
    toast.error(`Scored ${score}%. Need 80% to pass.`, { id: toastId });
  }
};

const downloadCertificate = async () => {
  const toastId = "cert-action"; 
  
  // 1. Initial State: Establishing Network Handshake
  toast.loading("Initiating Blockchain Verification...", { id: toastId });
  
  try {
    const currentUserId = user?._id || user?.id;
    if (!currentUserId) {
      return toast.error("Authentication expired. Please re-login.", { id: toastId });
    }

    // 🔥 PHASE 2: Mid-request update (Visual progress for the user)
    // We update the same toast to show we are now interacting with the Smart Contract
    toast.loading("Minting Credentials on Polygon Proof-of-Stake...", { id: toastId });

    const response = await API.post('/certificate/generate', {
      userId: currentUserId, 
      userName: user.name, 
      courseTitle: course.title,
      courseId: course._id, 
      date: new Date().toLocaleDateString()
    }, {
      responseType: 'blob', 
      timeout: 120000 // 2-minute timeout for blockchain reliability
    });

    // Handle the File Download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Verified_Certificate_${user.name.replace(/\s+/g, '_')}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    // 🔥 FINAL PHASE: Success with specific Polygon confirmation
    toast.success("Transaction Mined! Certificate Downloaded 🎓", { 
      id: toastId,
      duration: 6000 // Give them a bit longer to read the success
    });
    
  } catch (error) {
    console.error("Certificate Error:", error);
    
    // Check if it was a timeout or a real error
    const isTimeout = error.code === 'ECONNABORTED';
    const message = isTimeout 
      ? "Blockchain is congested. Please try again in a moment." 
      : "Verification failed. Check your connection.";

    toast.error(message, { id: toastId });
  }
};

  const allItems = getAllItems();
  const currentItem = allItems[activeLesson];
  const progressPercentage = allItems.length > 0 ? Math.min(Math.round((completedLessons.length / allItems.length) * 100), 100) : 0;
  const isCourseComplete = progressPercentage === 100;

  if (loading || !course) return <div className="h-screen flex items-center justify-center font-black text-slate-300 animate-pulse">Initializing Workspace...</div>;
  
  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white font-['Plus_Jakarta_Sans'] overflow-hidden text-slate-900">
      
      {/* MOBILE HEADER */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-100 z-50 bg-white sticky top-0">
        <Link to="/" className="text-xl font-black text-blue-600 cursor-pointer">N</Link>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-slate-50 rounded-xl text-slate-600 font-bold text-xs uppercase tracking-widest cursor-pointer">
          {isSidebarOpen ? '✕ Close' : '☰ Curriculum'}
        </button>
      </div>

      {/* LEFT NAVIGATION (DESKTOP) */}
      <div className="hidden lg:flex w-20 bg-white border-r border-slate-100 flex-col items-center py-8 gap-10 z-30">
        <Link to="/" className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg cursor-pointer">N</Link>
        <div className="flex flex-col gap-8 text-slate-400">
          <Link to="/courses" className="p-2 hover:text-blue-600 transition-colors cursor-pointer"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></Link>
          <Link to="/profile" className="p-2 hover:text-blue-600 transition-colors cursor-pointer"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></Link>
        </div>
      </div>

      {/* CURRICULUM SIDEBAR */}
      <div className={`fixed inset-0 lg:relative lg:translate-x-0 transform transition-transform duration-300 z-[45] bg-white ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} w-full sm:w-80 lg:w-80 border-r border-slate-100 flex flex-col shadow-sm`}>
        <div className="p-6 border-b border-slate-50 mt-14 lg:mt-0">
          <h2 className="text-xl font-extrabold text-slate-900 leading-tight mb-4">{course.title}</h2>
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
            <span>Progress</span>
            <span className="text-blue-600">{progressPercentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {course.modules?.map((module, mIdx) => (
            <div key={mIdx} className="border-b border-slate-50">
              <button onClick={() => toggleModule(mIdx)} className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/40 hover:bg-slate-50 transition-all group text-left cursor-pointer">
                <div>
                   <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Module {mIdx + 1}</p>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-blue-600 transition-colors">{module.name}</span>
                </div>
                <span className={`text-slate-300 transition-transform duration-500 ${expandedModules[mIdx] ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {expandedModules[mIdx] && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  {module.items.map((item, iIdx) => {
                    const globalIndex = course.modules.slice(0, mIdx).reduce((acc, m) => acc + m.items.length, 0) + iIdx;
                    const isLocked = globalIndex > 0 && !completedLessons.includes(globalIndex - 1);
                    const isActive = activeLesson === globalIndex;
                    const isDone = completedLessons.includes(globalIndex);
                    return (
                      <div key={globalIndex} onClick={() => handleItemClick(globalIndex, isLocked)} className={`px-6 py-4 flex items-center justify-between transition-all border-l-4 ${isActive ? 'bg-blue-50 border-blue-600' : 'border-transparent'} ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                           <span className={`shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{isLocked ? '🔒' : getItemIcon(item.type)}</span>
                           <div className="min-w-0 flex-1">
                              <h4 className={`text-xs font-bold truncate ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>{item.title}</h4>
                              <span className="text-[8px] font-black uppercase text-slate-400">{item.type}</span>
                           </div>
                        </div>
                        {isDone && <span className="text-green-500 font-bold text-[10px] shrink-0 ml-2">✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          <div className={`mt-6 mx-4 p-5 rounded-[2rem] border transition-all mb-10 ${isCourseComplete ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCourseComplete ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${isCourseComplete ? 'text-green-700' : 'text-slate-400'}`}>
                {isCourseComplete ? 'Reward Unlocked' : 'Reward Locked'}
              </span>
            </div>
            {isCourseComplete ? (
              <button onClick={() => { setActiveTab('certificate'); setIsSidebarOpen(false); document.getElementById('content-tabs')?.scrollIntoView({ behavior: 'smooth' }); }} className="w-full bg-green-600 text-white text-[10px] font-black py-3 rounded-xl uppercase shadow-md cursor-pointer">View Certificate</button>
            ) : (
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed">Complete curriculum to claim certificate.</p>
            )}
          </div>
        </div>
      </div>

      {/* MAINFRAME */}
{/* MAINFRAME */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 flex flex-col relative z-10">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-4 sm:px-10 py-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
             <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase shrink-0">{currentItem?.type || 'Lesson'}</span>
             <h3 className="font-bold text-slate-800 text-sm truncate max-w-[150px] sm:max-w-none">{currentItem?.title}</h3>
          </div>
          <div className="flex gap-2 sm:gap-3 ml-auto">
            {completedLessons.includes(activeLesson) && (
              <button onClick={moveToNext} className="px-3 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black bg-blue-600 text-white shadow-lg cursor-pointer">Next →</button>
            )}
            <button 
              onClick={handleAutoProgress} 
              disabled={currentItem?.type === 'quiz'} 
              className={`px-3 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-bold shadow-lg transition-all cursor-pointer ${completedLessons.includes(activeLesson) ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}
            >
              {completedLessons.includes(activeLesson) ? "✓ Done" : currentItem?.type === 'quiz' ? "Assessment Mode" : "Mark as Done"}
            </button>
          </div>
        </div>

<div className="p-2 sm:p-8 max-w-5xl mx-auto w-full flex-1 flex flex-col">
          <div className="w-full relative bg-black rounded-2xl lg:rounded-[2.5rem] shadow-2xl overflow-hidden mb-6 sm:mb-10 border-2 sm:border-8 border-white flex flex-col min-h-[450px] lg:min-h-[550px]">
            {/* 🔥 UPDATED CONTENT RENDERER */}
            {currentItem?.type === 'video' ? (
              <VideoPlayer 
                key={currentItem.contentUrl} 
                videoUrl={currentItem.contentUrl} 
                onComplete={handleAutoProgress} 
              />
            ) : currentItem?.type === 'pdf' ? (
               <iframe 
                 key={currentItem.contentUrl} 
                 src={getEmbedLink(currentItem.contentUrl)} 
                 className="w-full flex-1 min-h-[500px] lg:min-h-[600px] border-none bg-white" 
                 allowFullScreen
                 title="pdf-viewer" 
               />
            ) : currentItem?.type === 'quiz' ? (
  <div className="w-full flex-1 bg-[#0F172A] p-4 sm:p-10 overflow-y-auto text-white flex flex-col text-left">
    <h3 className="text-lg sm:text-xl font-black mb-6 text-blue-400">Module Assessment</h3>
    
    {completedLessons.includes(activeLesson) ? (
      <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-4xl mb-6 border border-green-500/30">✓</div>
        <h4 className="text-2xl font-black mb-2">Assessment Completed</h4>
        <p className="text-slate-400 max-w-xs mx-auto mb-8">You have already passed this assessment.</p>
        <button onClick={moveToNext} className="bg-blue-600 px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all cursor-pointer">Continue to Next Lesson</button>
      </div>
    ) : (
      <div className="flex-1 space-y-4 sm:space-y-8 pb-10">
        {currentItem.questions?.map((q, qIdx) => (
          <div key={qIdx} className="bg-white/5 p-4 sm:p-6 rounded-2xl border border-white/10">
            <p className="font-bold mb-4 text-sm sm:text-base">{qIdx + 1}. {q.questionText}</p>
            <div className="grid grid-cols-1 gap-3">
              {q.options.map((opt, oIdx) => (
                <button 
                  key={oIdx} 
                  onClick={() => setModuleQuizAnswers({...moduleQuizAnswers, [qIdx]: oIdx})}
                  className={`p-3 sm:p-4 rounded-xl border text-xs sm:text-sm text-left transition-all font-bold cursor-pointer ${moduleQuizAnswers[qIdx] === oIdx ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white/10 border-white/10 hover:bg-white/20'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button onClick={() => {
          if (Object.keys(moduleQuizAnswers).length < currentItem.questions.length) return toast.error("Please answer all questions.");
          let correct = 0;
          currentItem.questions.forEach((q, idx) => { if(moduleQuizAnswers[idx] === q.correctOptionIndex) correct++; });
          const score = Math.round((correct / currentItem.questions.length) * 100);
          if(score >= 80) handleAutoProgress();
          else toast.error(`Score: ${score}%. Need 80% to pass.`);
        }} className="w-full bg-blue-600 py-4 rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-700 active:scale-95 transition-all sticky bottom-0 z-10">
          Submit Assessment
        </button>
      </div>
    )}
  </div>
) : null}
          </div>

          {/* TABS CONTAINER */}
          <div ref={tabSectionRef} id="content-tabs" className="bg-white rounded-3xl lg:rounded-[2.5rem] p-5 sm:p-8 border border-slate-100 shadow-sm mb-20 lg:mb-10">
            <div className="flex gap-4 sm:gap-8 border-b border-slate-100 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
              {['description', 'instructor', 'live', 'certificate'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 text-[10px] sm:text-xs font-black uppercase tracking-widest relative transition-all cursor-pointer ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  {tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                </button>
              ))}
            </div>
            
            <div className="min-h-[150px]">
              {activeTab === 'description' && <p className="text-slate-500 leading-relaxed text-sm font-medium text-left">{course.description}</p>}
{activeTab === 'instructor' && (
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 animate-in fade-in text-left">
    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-md overflow-hidden">
      {course.instructor?.profilePicture ? (
        <img src={course.instructor.profilePicture} className="w-full h-full object-cover" />
      ) : (
        course.instructor?.name?.charAt(0)
      )}
    </div>
    <div>
      <h4 className="text-base sm:text-lg font-bold text-slate-900">{course.instructor?.name}</h4>
      <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Lead Instructor</p>
    </div>
  </div>
)}
{activeTab === 'live' && (
  <div className="space-y-4 text-left">
    <h3 className="text-base sm:text-xl font-extrabold text-slate-900">Live Classes</h3>
    {course.liveSessions?.length > 0 ? (
      course.liveSessions.map((session, idx) => {
        // 🔥 Format the date for humans (e.g., April 24, 2026)
        const dateObj = new Date(session.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });

        // 🔥 Compare correctly with Today's date
        const isToday = new Date().toLocaleDateString() === dateObj.toLocaleDateString();
        
        return (
          <div key={idx} className={`p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${isToday ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100'}`}>
            <div>
              <p className={`text-[8px] sm:text-[10px] font-black uppercase mb-1 ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                {isToday ? "🔴 Live Now" : "Upcoming Session"}
              </p>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">{session.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500">{formattedDate}</span>
                <span className="text-slate-300">|</span>
                <span className="text-[10px] sm:text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{session.time}</span>
              </div>
            </div>
            <a 
              href={session.meetingLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-[10px] uppercase text-center transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg cursor-pointer hover:bg-blue-700' : 'bg-slate-100 text-slate-400 pointer-events-none'}`}
            >
              {isToday ? "Join Live Now" : "Waiting for Host"}
            </a>
          </div>
        );
      })
    ) : <p className="text-slate-400 text-sm py-10 text-center">No sessions scheduled.</p>}
  </div>
)}
              {activeTab === 'certificate' && (
                <div className="text-center py-6">
                  {!isCourseComplete ? (
                    <p className="text-slate-400 font-bold">Complete all content to unlock exam.</p>
                  ) : !quizResult?.passed ? (
                    <div className="bg-slate-50 p-6 sm:p-10 rounded-3xl border border-slate-200 text-left">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-6">Final Exam</h3>
                      {!quizStarted ? (
                        <button onClick={() => {setQuizStarted(true); setIsQuizOpen(true);}} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold cursor-pointer hover:bg-blue-700 transition-all shadow-md">Start Final Exam</button>
                      ) : (
                        <div className="space-y-8">
                          {quiz?.questions.map((q, qIdx) => (
                            <div key={qIdx}>
                              <p className="font-bold mb-4">{qIdx + 1}. {q.questionText}</p>
                              <div className="grid gap-3">
                                {q.options.map((opt, oIdx) => (
                                  <button key={oIdx} onClick={() => setSelectedAnswers({...selectedAnswers, [qIdx]: oIdx})} className={`p-4 rounded-xl border text-left font-bold text-sm cursor-pointer transition-all ${selectedAnswers[qIdx] === oIdx ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300'}`}>{opt}</button>
                                ))}
                              </div>
                            </div>
                          ))}
                          <button onClick={submitFinalQuiz} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black cursor-pointer hover:bg-black transition-all shadow-lg active:scale-95">Submit Exam</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-blue-600 rounded-3xl p-6 sm:p-10 text-white shadow-2xl animate-in zoom-in-95">
                      <h3 className="text-2xl sm:text-3xl font-black mb-4">You Passed!</h3>
                      <button onClick={downloadCertificate} className="bg-white text-blue-600 px-10 py-4 rounded-2xl font-black text-sm cursor-pointer hover:bg-slate-50 shadow-xl transition-all active:scale-95">Download Verified Certificate</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <AiTutor 
        courseId={id} 
        isQuizActive={isQuizOpen} 
      />
    </div>
  );
};

export default CourseView;