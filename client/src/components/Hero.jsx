import { Link } from 'react-router-dom';

export default function Hero() {
  // Retrieve user from localStorage to check role
  const user = JSON.parse(localStorage.getItem('user'));
  const isInstructor = user?.role === 'instructor';
  const isAdmin = user?.role === 'admin';

  return (
    <section className="pt-8 md:pt-12 pb-16 md:pb-24 px-4 font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      <div className="max-w-7xl mx-auto text-center">
        
        {/* Animated Badge */}
        <div className="inline-block px-4 py-1.5 mb-6 text-[9px] md:text-[10px] font-black tracking-widest text-blue-600 uppercase bg-blue-50 rounded-full border border-blue-100 animate-fade-in">
          AI-Powered & Blockchain Verified
        </div>
        
        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight text-slate-900 leading-[1.1]">
          Master Tech with <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Intelligent Guidance.
          </span>
        </h1>
        
        {/* Subtext */}
        <p className="max-w-lg md:max-w-2xl mx-auto text-sm md:text-lg text-slate-500 mb-10 leading-relaxed font-medium px-2 md:px-0">
          The next generation of LMS. Personalized AI tutoring meets 
          immutable blockchain credentials to accelerate your career in 
          Computer Science.
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link 
            to={isAdmin ? "/admin" : (isInstructor ? "/instructor-dashboard" : "/courses")} 
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all hover:-translate-y-1 flex items-center justify-center text-sm md:text-base"
          >
            {isAdmin ? "Admin Panel" : (isInstructor ? "Instructor Studio" : "Explore Courses")}
          </Link>
          
          <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all text-sm md:text-base active:scale-95">
            Watch Demo
          </button>
        </div>

        {/* Floating Stats */}
        <div className="mt-12 md:mt-16 flex justify-center items-center gap-4 md:gap-8 grayscale opacity-60">
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-black text-slate-900">100%</span>
              <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">Verified</span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-black text-slate-900">24/7</span>
              <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">AI Support</span>
            </div>
            <div className="hidden xs:block w-px h-8 bg-slate-200"></div>
            <div className="hidden xs:flex flex-col">
              <span className="text-xl md:text-2xl font-black text-slate-900">Secure</span>
              <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">Polygon</span>
            </div>
        </div>
      </div>
    </section>
  );
}