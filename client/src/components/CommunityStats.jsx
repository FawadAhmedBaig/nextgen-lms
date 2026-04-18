import React, { useState, useEffect } from 'react';
import API from '../utils/api';

export default function CommunityStats() {
  const [counts, setCounts] = useState({
    students: '...',
    mentors: '...',
    courses: '...',
    successRate: '94%'
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // We now use the relative path. API instance handles the rest.
        const { data } = await API.get('/courses/public-stats');
        
        setCounts({
          students: data.students > 0 ? data.students : "1,200+", 
          mentors: data.mentors > 0 ? data.mentors : "25+",
          courses: data.courses || "0",
          successRate: `${data.successRate}%`
        });
      } catch (err) {
        console.error("Stats fetch failed, using fallback.");
        // Stay with hardcoded defaults if backend is unreachable
        setCounts({
          students: '50K+',
          mentors: '1.2K+',
          courses: '450+',
          successRate: '94%'
        });
      }
    };
    fetchStats();
  }, []);

  const stats = [
    { label: 'Active Students', value: counts.students, color: 'text-indigo-600' },
    { label: 'Expert Mentors', value: counts.mentors, color: 'text-purple-600' },
    { label: 'Courses Published', value: counts.courses, color: 'text-pink-600' },
    { label: 'Success Rate', value: counts.successRate, color: 'text-emerald-600' },
  ];

  return (
    <section className="py-12 md:py-20 bg-gray-50 font-['Plus_Jakarta_Sans']">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-16 shadow-xl shadow-gray-200/40 border border-gray-100">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-4 md:gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-1 md:space-y-3 group cursor-default">
                <p className={`text-4xl md:text-5xl font-black tracking-tight transition-transform duration-500 group-hover:scale-110 ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-gray-400 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] px-2">
                  {stat.label}
                </p>
                <div className="sm:hidden w-8 h-1 bg-gray-100 mx-auto rounded-full mt-6" />
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </section>
  );
}