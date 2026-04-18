import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast, { Toaster } from 'react-hot-toast';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, instructors: 0, students: 0 });
  const [loading, setLoading] = useState(true);
  
  // New state for Mobile Sidebar Toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const adminUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!adminUser || adminUser.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [activeTab]);

const fetchData = async () => {
    setLoading(true);
    try {
      // API instance handles Base URL and Bearer Token
      const statsRes = await API.get('/auth/admin/stats');
      setStats(statsRes.data);
      
      if (activeTab === 'users') {
        const usersRes = await API.get('/auth/admin/users');
        setUsers(usersRes.data);
      } else if (activeTab === 'courses') {
        const coursesRes = await API.get('/courses/all');
        setCourses(coursesRes.data);
      } else if (activeTab === 'certificates') {
        try {
          const certsRes = await API.get('/auth/admin/certificates');
          setCertificates(certsRes.data);
        } catch (err) {
          setCertificates([]);
          toast.error("Certificate Registry empty or unavailable.");
        }
      }
    } catch (err) {
      toast.error("Unauthorized or Server Error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await API.patch(`/auth/admin/users/${userId}/approve`, {});
      toast.success("Instructor Approved Successfully");
      fetchData();
    } catch (err) {
      toast.error("Approval failed");
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      await API.patch(`/auth/admin/users/${userId}/status`, { status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'Unblocked' : 'Blocked'}`);
      fetchData();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Admin Action: Permanently delete this course?")) return;
    try {
      await API.delete(`/courses/${courseId}`);
      toast.success("Course Removed");
      fetchData();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans'] overflow-hidden">
      <Toaster position="top-right" />
      
      {/* MOBILE HEADER */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 z-50">
        <Link to="/" className="text-xl font-black text-blue-600 tracking-tighter">AdminPanel.</Link>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 text-2xl">
          {isSidebarOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* SIDEBAR (Responsive Toggle) */}
      <div className={`
        fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col p-8 z-40 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Link to="/" className="hidden lg:block text-2xl font-black text-blue-600 mb-12 tracking-tighter">AdminPanel.</Link>
        <nav className="space-y-3 flex-1">
          {['users', 'courses', 'certificates'].map((tab) => (
            <button 
              key={tab}
              onClick={() => { setActiveTab(tab); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-sm transition-all cursor-pointer ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              {tab === 'users' ? '👤 User Management' : tab === 'courses' ? '📚 Course Moderation' : '📜 Issued Certificates'}
            </button>
          ))}
        </nav>
        <div className="p-5 bg-slate-900 rounded-[2rem] text-white mt-auto">
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Super Admin</p>
          <p className="text-sm font-bold truncate">{adminUser?.name}</p>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="mt-2 text-[10px] text-slate-400 hover:text-red-400 font-bold uppercase cursor-pointer">Logout</button>
        </div>
      </div>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden" />
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white/80 backdrop-blur-md px-6 lg:px-10 py-6 border-b border-slate-100 sticky top-0 z-20 flex justify-between items-center">
          <h2 className="text-lg lg:text-xl font-extrabold text-slate-900 uppercase tracking-tight">System {activeTab}</h2>
          <div className="hidden sm:block text-xs font-bold text-slate-400">Total Records: {activeTab === 'users' ? users.length : (activeTab === 'courses' ? courses.length : certificates.length)}</div>
        </div>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          {/* STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-10">
            {[
              { label: 'Total Users', val: stats.totalUsers, color: 'text-slate-900' },
              { label: 'Instructors', val: stats.instructors, color: 'text-blue-600' },
              { label: 'Students', val: stats.students, color: 'text-green-600' }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{stat.label}</p>
                <p className={`text-2xl lg:text-3xl font-black ${stat.color}`}>{stat.val}</p>
              </div>
            ))}
          </div>

          {/* DATA TABLE (Horizontal scroll container) */}
          <div className="bg-white rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Information</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">{activeTab === 'certificates' ? 'Course' : 'Category'}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">{activeTab === 'certificates' ? 'Verify' : 'Status'}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeTab === 'users' ? users.map(u => (
                    <tr key={u._id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${u.role === 'instructor' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                      </td>
                      <td className="px-8 py-6 text-[10px] font-black uppercase">
                        <span className={u.status === 'blocked' ? 'text-red-500' : u.status === 'pending' ? 'text-amber-500' : 'text-green-500'}>{u.status || 'active'}</span>
                      </td>
                      <td className="px-8 py-6 text-right space-x-2 whitespace-nowrap">
                        {u.role === 'instructor' && u.status === 'pending' && (
                          <button onClick={() => handleApprove(u._id)} className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-blue-600 text-white shadow-md">Approve</button>
                        )}
                        <button disabled={u.role === 'admin'} onClick={() => handleStatusToggle(u._id, u.status)} className={`text-[10px] font-bold px-3 py-1.5 rounded-xl ${u.status === 'blocked' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'} disabled:opacity-30`}>
                          {u.status === 'blocked' ? 'Unblock' : 'Block'}
                        </button>
                      </td>
                    </tr>
                  )) : activeTab === 'courses' ? courses.map(c => (
                    <tr key={c._id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-900 text-sm">{c.title}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">By {c.instructorName}</p>
                      </td>
                      <td className="px-8 py-6 text-xs font-medium text-slate-500">{c.category}</td>
                      <td className="px-8 py-6 text-xs font-black text-slate-900">{c.price}</td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => handleDeleteCourse(c._id)} className="text-xs font-bold text-red-500 hover:underline">Delete</button>
                      </td>
                    </tr>
                  )) : certificates.map(cert => (
                    <tr key={cert._id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-900 text-sm">{cert.student?.name}</p>
                        <p className="text-[10px] text-slate-400">{cert.student?.email}</p>
                      </td>
                      <td className="px-8 py-6 text-xs font-bold text-blue-600">{cert.course?.title}</td>
                      <td className="px-8 py-6"><span className="text-[9px] font-black uppercase px-2 py-1 bg-green-50 text-green-600 rounded-lg">Verified</span></td>
                      <td className="px-8 py-6 text-right text-[9px] font-mono text-slate-300">HASH: 0x{cert._id.substring(15).toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {loading && <div className="p-20 text-center text-slate-300 font-bold animate-pulse">Syncing Blockchain Records...</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;