import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';
import toast, { Toaster } from 'react-hot-toast';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        // Using the API instance with a relative path
        const { data } = await API.get(`/api/courses/${id}`);
        setCourse(data);
      } catch (err) {
        console.error("Fetch Error:", err);
        toast.error("Course details not found");
        navigate('/courses');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
    window.scrollTo(0, 0);
  }, [id, navigate]);

  const handleEnrollment = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      toast.error("Please login to enroll");
      return navigate('/login');
    }

    const isFree = course.price === "0" || course.price === "Free" || !course.price;

    if (isFree) {
      setEnrolling(true);
      const loadingToast = toast.loading("Processing your enrollment...");
      try {
        // No need to manually pass headers or full URL
        await API.post(`/api/users/enroll/${course._id}`, {});

        toast.success("Enrolled Successfully!", { id: loadingToast });
        
        navigate('/order-complete', { 
          state: { 
            course: course,
            orderId: `FREE-${Math.random().toString(36).substr(2, 9).toUpperCase()}` 
          } 
        });
      } catch (err) {
        toast.error(err.response?.data?.message || "Enrollment failed", { id: loadingToast });
      } finally {
        setEnrolling(false);
      }
    } else {
      navigate('/checkout', { state: { courseId: course._id } });
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-widest bg-white">
      Initializing Curriculum...
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-['Plus_Jakarta_Sans'] pb-20">
      <Toaster position="top-right" />
      
      {/* --- HERO SECTION --- */}
      <section className="bg-slate-900 pt-14 pb-16 md:pt-18 md:pb-28 relative overflow-hidden min-h-[600px] flex items-center">
        <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            <div className="text-center lg:text-left">
              <span className="bg-blue-600/20 text-blue-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-600/30">
                {course.category || "Technology"}
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white mt-6 mb-6 leading-tight tracking-tight">
                {course.title}
              </h1>
              <p className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                {course.description}
              </p>
              
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 mt-10 text-slate-300 text-sm font-bold uppercase tracking-wider">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm border-2 border-slate-700 shadow-xl overflow-hidden">
                     {course.instructor?.name?.charAt(0)}
                   </div>
                   <span className="text-white">{course.instructor?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-blue-500 text-lg">⏱</span> {course.duration || 'Self-paced'}
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-blue-500 text-lg">📊</span> {course.level || 'Intermediate'}
                </div>
              </div>
            </div>

            {/* Right: Action Card */}
            <div className="w-full max-w-md mx-auto lg:ml-auto lg:mr-0 self-center transition-all duration-500 hover:scale-[1.01]">
               <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 relative z-20">
                 
                 {/* 🔥 Popularity Badge */}
                 <div className="absolute -top-4 -right-4 bg-blue-600 text-white px-5 py-2 rounded-2xl shadow-xl z-30 flex items-center gap-2 border-4 border-white">
                    <span className="text-lg">🔥</span>
                    <span className="text-xs font-black uppercase tracking-tighter">
                        {course.enrolledCount?.toLocaleString() || 0} Students Joined
                    </span>
                 </div>

                 <div className="aspect-video rounded-[1.5rem] overflow-hidden mb-6 shadow-inner bg-slate-50 border border-slate-100">
                    <img 
                        src={course.imageUrl || "https://via.placeholder.com/800x450"} 
                        alt="Thumbnail" 
                        className="w-full h-full object-cover" 
                    />
                 </div>
                 
                 <div className="flex justify-between items-end mb-8">
                    <div>
                       <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">One-time Investment</p>
                       <h2 className="text-4xl font-black text-slate-900">
                           {course.price === "0" || course.price === "Free" ? "FREE" : course.price}
                       </h2>
                    </div>
                    <span className="text-blue-600 font-bold text-[9px] bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-tighter border border-blue-100">
                        Blockchain Verified
                    </span>
                 </div>

                 <button 
                   disabled={enrolling}
                   onClick={handleEnrollment}
                   className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer disabled:bg-slate-400"
                 >
                   {enrolling ? "Enrolling..." : "Enroll in Course"}
                 </button>

                 <p className="text-center text-slate-400 text-[10px] mt-6 font-bold uppercase tracking-widest">
                   Instant access after verification
                 </p>
               </div>
            </div>

          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-600/5 to-transparent pointer-events-none" />
      </section>

      {/* --- CONTENT & CURRICULUM SECTION --- */}
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-20 lg:pr-[30rem]">
         <div className="mb-12">
            <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tighter">Course Curriculum</h2>
            <div className="flex gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
               <span>{course.modules?.length || 0} Modules</span>
               <span className="text-blue-200">•</span>
               <span>{course.modules?.reduce((acc, m) => acc + (m.items?.length || 0), 0)} Lessons</span>
            </div>
         </div>

         <div className="space-y-4">
            {course.modules?.map((module, mIdx) => (
              <div key={mIdx} className="border border-slate-100 rounded-3xl overflow-hidden bg-white shadow-sm hover:border-slate-200 transition-colors">
                <div className="bg-slate-50/50 px-8 py-5 flex justify-between items-center border-b border-slate-100">
                   <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase mb-1 tracking-tighter">Phase {mIdx + 1}</p>
                      <h3 className="font-bold text-slate-800 uppercase text-sm">{module.name}</h3>
                   </div>
                </div>
                <div className="divide-y divide-slate-50">
                   {module.items?.map((item, iIdx) => (
                     <div key={iIdx} className="px-8 py-4 flex items-center justify-between text-sm group opacity-70">
                        <div className="flex items-center gap-3">
                           <span className="text-slate-300 group-hover:text-blue-500 transition-colors">
                             {item.type === 'video' ? '▶' : '📄'}
                           </span>
                           <span className="text-slate-600 font-medium">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.type}</span>
                            <span className="text-slate-300">🔒</span>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            ))}
         </div>

         <div className="mt-20 p-8 md:p-12 bg-slate-50 rounded-[3rem] border border-slate-100 relative overflow-hidden">
            <h3 className="text-xl font-black text-slate-900 mb-8 uppercase tracking-widest relative z-10">Lead Expert</h3>
            <div className="flex flex-col md:flex-row gap-10 items-center md:items-start relative z-10">
               <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-2xl border-4 border-white shrink-0">
                 {course.instructor?.name?.charAt(0)}
               </div>
               <div className="text-center md:text-left">
                  <h4 className="text-2xl font-bold text-slate-900">{course.instructor?.name}</h4>
                  <p className="text-blue-600 font-bold text-[10px] uppercase tracking-[0.2em] mb-4">Curriculum Developer @ NextGen</p>
                  <p className="text-slate-500 leading-relaxed font-medium">
                    This curriculum is verified by {course.instructor?.name}. 
                    As part of the NextGen E-Learning ecosystem, this course ensures high-quality content 
                    delivery optimized for KFUEIT academic excellence.
                  </p>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}