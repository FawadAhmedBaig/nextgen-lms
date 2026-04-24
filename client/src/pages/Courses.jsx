import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';

// --- Reusable Course Card Component ---
const CourseCard = ({ course, isRecommended = false, enrolledCourseIds, onViewDetails }) => {
  const isAlreadyEnrolled = enrolledCourseIds.has(course._id);
  
  return (
    <div 
      onClick={() => onViewDetails(course)}
      className={`group bg-white rounded-[2rem] overflow-hidden border transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-2 cursor-pointer ${isRecommended ? 'border-blue-200 ring-2 ring-blue-50' : 'border-slate-100'}`}
    >
<div className="relative h-48 overflow-hidden bg-slate-100">
  <img 
    // 🔥 Optimization: Resize image to 600px width and auto-format for speed
    src={course.imageUrl?.replace('/upload/', '/upload/w_600,c_fill,g_auto,f_auto,q_auto/')} 
    alt={course.title} 
    // 🔥 Lazy Load: Browser only downloads this when it's close to appearing
    loading="lazy" 
    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
  />
  
  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-blue-600">
    {course.category}
  </div>

  {isRecommended && (
    <div className="absolute top-4 right-4 bg-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white shadow-lg flex items-center gap-1.5">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3V1L8 11h2v8l4-11h-2l3-7h-3z" /></svg>
      AI Recommended
    </div>
  )}
</div>
      
      <div className="p-6 md:p-8">
        <h3 className="text-lg md:text-xl font-extrabold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors mb-4 line-clamp-2">
          {course.title}
        </h3>
        
        <div className="flex items-center gap-2 mb-6 text-slate-400 text-sm font-medium">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {course.duration || '15h'}
          </span>
          <span>•</span>
          <span>{course.level || 'Beginner'}</span>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
          <div className="flex items-center gap-2">
<div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white border border-blue-100 uppercase overflow-hidden">
  {course.instructor?.profilePicture ? (
<img 
  src={course.instructor.profilePicture?.replace('/upload/', '/upload/w_100,c_fill,g_face,f_auto,q_auto/')} 
  alt={course.instructor.name} 
  loading="lazy"
  className="w-full h-full object-cover" 
/>
  ) : (
    (course.instructor?.name || "D").charAt(0)
  )}
</div>
            <span className="text-xs font-bold text-slate-700 truncate max-w-[80px] md:max-w-none">{course.instructor?.name}</span>
          </div>

          {isAlreadyEnrolled ? (
            <span className="flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-green-100">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              Enrolled
            </span>
          ) : (
            <span className="text-lg font-black text-slate-900">
                {course.price === "0" || course.price === "Free" ? "FREE" : course.price}
            </span>
          )}
        </div>
        
        <button 
          className={`w-full mt-6 py-3 rounded-xl font-bold transition-all cursor-pointer ${
            isAlreadyEnrolled 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
            : 'bg-slate-900 text-white hover:bg-blue-600'
          }`}
        >
          {isAlreadyEnrolled ? "Continue Learning" : "View Course Details"}
        </button>
      </div>
    </div>
  );
};

const Courses = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [priceFilter, setPriceFilter] = useState('All'); 
  const [courses, setCourses] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set()); 
  const [completedCourseIds, setCompletedCourseIds] = useState(new Set()); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['All', 'Blockchain', 'Artificial Intelligence', 'Web Development', 'Data Science', 'Cybersecurity'];
  const priceOptions = ['All', 'Free', 'Paid'];
  const [levelFilter, setLevelFilter] = useState('All'); // 👈 New State
  const difficultyLevels = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const [hasReachedThreshold, setHasReachedThreshold] = useState(false);

useEffect(() => {
const fetchData = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = (token && userStr && userStr !== "undefined") ? JSON.parse(userStr) : null;
    const userId = user?._id || user?.id;

    // 🔥 PARALLEL FETCHING: Fetch courses and enrollments at the same time
    const [coursesRes, enrollRes] = await Promise.all([
      API.get('/courses/all'),
      userId ? API.get('/enrollments/my-enrollments').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
    ]);

    // 1. Process Courses with Randomization
    if (coursesRes.data && Array.isArray(coursesRes.data)) {
      let allCourses = [...coursesRes.data];
      
      // 🎲 Fisher-Yates Shuffle for Random Order
      for (let i = allCourses.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allCourses[i], allCourses[j]] = [allCourses[j], allCourses[i]];
      }
      setCourses(allCourses);
    }

    // 2. Process Enrollment Data
    const enrollmentData = enrollRes.data || [];
    setEnrolledCourseIds(new Set(enrollmentData.map(e => e.course?._id).filter(id => id)));
    
    const finishedIds = enrollmentData
      .filter(e => e.isCompleted === true || e.progress === 100)
      .map(e => e.course?._id)
      .filter(id => id);
    setCompletedCourseIds(new Set(finishedIds));

    // 3. Handle Recommendations (Post-processing)
    const meetsThreshold = enrollmentData.some(e => e.progress >= 50);
    setHasReachedThreshold(meetsThreshold);

    if (meetsThreshold && userId) {
      // We do this separately as it depends on enrollment threshold
      const recRes = await API.get(`/courses/recommendations/${userId}`).catch(() => ({ data: [] }));
      setRecommendedCourses(recRes.data || []);
    }

  } catch (err) {
    console.error("❌ Critical Fetch Error:", err);
    toast.error("Failed to load workspace data.");
  } finally {
    setLoading(false);
  }
};

  fetchData();
}, []); // Empty dependency array is correct here

  // 🔥 NAV LOGIC: Unified handler for card/button clicks
  const handleCourseClick = (course) => {
    if (enrolledCourseIds.has(course._id)) {
      // If enrolled, jump straight to the lessons
      navigate(`/course-view/${course._id}`);
    } else {
      // If not enrolled, show the landing page
      navigate(`/course/${course._id}`);
    }
  };

const filteredCourses = courses.filter(course => {
    if (completedCourseIds.has(course._id)) return false;
    
    const matchesCategory = activeCategory === 'All' || course.category === activeCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesPrice = true;
    if (priceFilter === 'Free') matchesPrice = course.price === 'Free' || course.price === "0";
    if (priceFilter === 'Paid') matchesPrice = course.price !== 'Free' && course.price !== "0";

    // 🔥 NEW: Check for Difficulty Level
    const matchesLevel = levelFilter === 'All' || course.level === levelFilter;

    return matchesCategory && matchesSearch && matchesPrice && matchesLevel;
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-8 md:pt-12 pb-12 md:pb-20 font-['Plus_Jakarta_Sans']">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-3">Explore Courses</h1>
            <p className="text-slate-500 font-medium text-sm md:text-base">Join a course and earn blockchain-verified credentials.</p>
          </div>
          <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md mx-auto md:mx-0">
            <input 
              type="text" 
              placeholder="Search skills..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full px-4 py-2 outline-none text-slate-600 text-sm" 
            />
          </div>
        </div>

{/* --- RECOMMENDED SECTION --- */}
{/* 🔥 Updated condition: Only show if user has at least one enrollment */}
{hasReachedThreshold && recommendedCourses.length > 0 && (
  <div className="mb-16">
    <h2 className="text-2xl font-black mb-8 flex items-center gap-2">
      <span className="bg-blue-600 text-white p-2 rounded-lg text-sm">AI</span> 
      Tailored For Your Progress
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {(() => {
        let list = [...recommendedCourses];
        
        // If the AI finds less than 3, backfill with same-category top courses
        if (list.length < 3) {
            const categoriesToLookFor = [...new Set(recommendedCourses.map(c => c.category))];
            const extra = courses.filter(c => 
                !enrolledCourseIds.has(c._id) && 
                categoriesToLookFor.includes(c.category) &&
                !list.find(l => l._id === c._id)
            );
            list = [...list, ...extra].slice(0, 3);
        }

        return list.map(course => (
          <CourseCard 
            key={course._id} 
            course={course} 
            isRecommended={true} 
            enrolledCourseIds={enrolledCourseIds} 
            onViewDetails={handleCourseClick}
          />
        ));
      })()}
    </div>
  </div>
)}

{/* Filters Section */}
<div className="flex flex-col gap-6 mb-8 md:mb-10">
  {/* Category Filter */}
  <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
    {categories.map((cat) => (
      <button 
        key={cat} 
        onClick={() => setActiveCategory(cat)} 
        className={`whitespace-nowrap px-5 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition-all border cursor-pointer ${activeCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}
      >
        {cat}
      </button>
    ))}
  </div>

  <div className="flex flex-wrap items-center gap-6">
    {/* Price Filter */}
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Price:</span>
      {priceOptions.map((opt) => (
        <button 
          key={opt} 
          onClick={() => setPriceFilter(opt)} 
          className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${priceFilter === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
        >
          {opt}
        </button>
      ))}
    </div>

    {/* 🔥 NEW: Difficulty Filter */}
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Difficulty:</span>
      {difficultyLevels.map((level) => (
        <button 
          key={level} 
          onClick={() => setLevelFilter(level)} 
          className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${levelFilter === level ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
        >
          {level}
        </button>
      ))}
    </div>
  </div>
</div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {filteredCourses.map((course) => (
                  <CourseCard 
                    key={course._id} 
                    course={course} 
                    enrolledCourseIds={enrolledCourseIds}
                    onViewDetails={handleCourseClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">No courses found matching your filters.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Courses;