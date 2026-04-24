import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // 👈 Added useLocation
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';
import API from '../utils/api'; 

const socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket', 'polling'],
  withCredentials: true
});

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); // 👈 Initialize location hook
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 🔥 Helper function to check if a link is active
  const isActive = (path) => location.pathname === path;

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await API.get('/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error("Error fetching notifications", err);
    }
  }, []);

const syncUser = useCallback(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token'); // 🔥 Added token check

    // 🔥 If token is missing OR user data is missing, treat as logged out
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const userId = parsedUser.id || parsedUser._id;
        
        setUser(parsedUser);
        
        if (userId) {
          socket.emit('register_user', userId);
        }
        
        fetchNotifications();
      } catch (err) {
        console.error("Error parsing user data:", err);
        setUser(null);
      }
    } else {
      // 🔥 This ensures the Navbar switches back to Login/Signup buttons
      setUser(null);
      setNotifications([]);
      setUnreadCount(0);
      // Optional: if you want to force redirect on token loss
      // navigate('/login'); 
    }
  }, [fetchNotifications]);

  useEffect(() => {
    syncUser();
    window.addEventListener('storage', syncUser);
    window.addEventListener('userLogin', syncUser);

    socket.on('notification_received', (data) => {
      setUnreadCount(prev => prev + 1);
      setNotifications(prev => [data, ...prev]);
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out'} max-w-sm w-full bg-white shadow-2xl rounded-2xl border-l-4 border-blue-600 p-4 flex items-center gap-4`}>
          <div className="text-xl">🔔</div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-sm">{data.title}</p>
            <p className="text-xs text-slate-500">{data.message}</p>
          </div>
        </div>
      ), { duration: 6000 });
    });

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('userLogin', syncUser);
      socket.off('notification_received');
    };
  }, [syncUser]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/login');
  };

  const markAsRead = async (noti) => {
    try {
      const notiId = noti._id || noti.id;
      if (!noti.isRead) {
        await API.patch(`/notifications/${notiId}/read`, {});
        setNotifications(prev => 
          prev.map(n => (n._id === notiId ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setIsNotiOpen(false);
      if (noti.path) navigate(noti.path);
    } catch (err) {
      console.error("❌ Notification Click Error:", err);
    }
  };

  return (
    <nav className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-gray-100 font-['Plus_Jakarta_Sans']">
      <Toaster 
  position="top-center" 
  reverseOrder={false} 
  toastOptions={{
    duration: 5000,
    style: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      borderRadius: '12px',
    },
  }} 
/>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          
          {/* Brand */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shadow-lg shadow-blue-100">
              <span className="text-white font-bold text-xl">N</span>
            </div>
            <span className="font-bold text-xl md:text-2xl tracking-tight text-slate-900">NextGen LMS</span>
          </Link>

          {/* DESKTOP LINKS - 🔥 Conditional Blue Styling Added */}
          <div className="hidden md:flex space-x-8 text-sm font-semibold">
            <Link 
              to="/" 
              className={`transition cursor-pointer ${isActive('/') ? 'text-blue-600 font-bold' : 'text-slate-600 hover:text-blue-600'}`}
            >
              Home
            </Link>
            
{user?.role === 'instructor' ? (
  <Link 
    to="/instructor-dashboard" 
    className={`transition cursor-pointer ${isActive('/instructor-dashboard') ? 'text-blue-600 font-extrabold' : 'text-slate-600 font-semibold hover:text-blue-600'}`}
  >
    Instructor Studio
  </Link>
) : (
  <Link 
    to="/courses" 
    className={`transition cursor-pointer ${isActive('/courses') ? 'text-blue-600 font-bold' : 'text-slate-600 hover:text-blue-600'}`}
  >
    Courses
  </Link>
)}
            
            <Link 
              to="/verify" 
              className={`transition cursor-pointer ${isActive('/verify') ? 'text-blue-600 font-bold' : 'text-slate-600 hover:text-blue-600'}`}
            >
              Verify
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Notification Bell */}
            {user && (
              <div className="relative">
                <button 
                  onClick={() => { setIsNotiOpen(!isNotiOpen); setIsOpen(false); }}
                  className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-all relative cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {isNotiOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsNotiOpen(false)}></div>
                    <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-20 overflow-hidden animate-in fade-in zoom-in duration-200">
                      <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((noti) => (
                            <div key={noti._id} onClick={() => markAsRead(noti)} className={`px-4 py-4 border-b border-gray-50 hover:bg-slate-50 transition cursor-pointer relative ${!noti.isRead ? 'bg-blue-50/30' : ''}`}>
                              {!noti.isRead && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full"></div>}
                              <p className={`text-sm ${!noti.isRead ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{noti.title}</p>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{noti.message}</p>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-slate-400 text-xs">No notifications yet</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {!user ? (
              <div className="hidden md:flex items-center gap-4">
                <Link to="/login" className="text-sm font-bold text-slate-700 hover:text-blue-600 transition cursor-pointer">Log in</Link>
                <Link to="/signup" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg active:scale-95 cursor-pointer">Join Now</Link>
              </div>
            ) : (
              <div className="hidden md:block relative">
                <button onClick={() => { setIsOpen(!isOpen); setIsNotiOpen(false); }} className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold overflow-hidden transition-all group-hover:ring-4 group-hover:ring-blue-50 ${isActive('/profile') ? 'border-blue-600 bg-blue-50' : 'border-blue-600 bg-blue-100'}`}>
                    {user.profilePicture ? <img src={user.profilePicture} alt="P" className="w-full h-full object-cover" /> : (user.name?.charAt(0).toUpperCase() || 'U')}
                  </div>
                </button>
                {isOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 py-1">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-xs text-slate-500 font-medium">Signed in as</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                      </div>
                      {user.role !== 'admin' && (
                        <Link 
                          to="/profile" 
                          className={`block px-4 py-3 text-sm font-semibold hover:bg-slate-50 ${isActive('/profile') ? 'text-blue-600 bg-blue-50/20' : 'text-slate-700'}`} 
                          onClick={() => setIsOpen(false)}
                        >
                          Profile
                        </Link>
                      )}
                      {user.role === 'student' && (
                        <Link 
                          to="/my-courses" 
                          className={`block px-4 py-3 text-sm font-semibold hover:bg-slate-50 ${isActive('/my-courses') ? 'text-blue-600 bg-blue-50/20' : 'text-slate-700'}`} 
                          onClick={() => setIsOpen(false)}
                        >
                          My Learning
                        </Link>
                      )}
                      <button onClick={handleLogout} className="w-full text-left cursor-pointer block px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">Logout</button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU PANEL - 🔥 Updated Active Styling */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-100 animate-in slide-in-from-top-5 duration-300">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={`block px-4 py-3 text-base font-bold rounded-xl transition-colors ${isActive('/') ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'}`}>Home</Link>
            
{user?.role === 'instructor' ? (
  <Link 
    to="/instructor-dashboard" 
    onClick={() => setIsMobileMenuOpen(false)} 
    className={`block px-4 py-3 text-base font-bold rounded-xl transition-colors ${isActive('/instructor-dashboard') ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'}`}
  >
    Instructor Studio
  </Link>
) : (
  <Link 
    to="/courses" 
    onClick={() => setIsMobileMenuOpen(false)} 
    className={`block px-4 py-3 text-base font-bold rounded-xl transition-colors ${isActive('/courses') ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'}`}
  >
    Courses
  </Link>
)}
            
            <Link to="/verify" onClick={() => setIsMobileMenuOpen(false)} className={`block px-4 py-3 text-base font-bold rounded-xl transition-colors ${isActive('/verify') ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'}`}>Verify Credentials</Link>
            
            {user ? (
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3 px-4 mb-4">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold overflow-hidden ${isActive('/profile') ? 'ring-2 ring-blue-600 bg-blue-50' : 'bg-blue-100'}`}>
                     {user.profilePicture ? <img src={user.profilePicture} alt="P" className="w-full h-full object-cover" /> : user.name?.charAt(0).toUpperCase()}
                   </div>
                   <div>
                     <p className="font-bold text-slate-900">{user.name}</p>
                     <p className="text-xs text-slate-500 uppercase font-black">{user.role}</p>
                   </div>
                </div>
                {user.role !== 'admin' && (
                  <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className={`block px-4 py-3 text-sm font-bold rounded-xl ${isActive('/profile') ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>Profile Settings</Link>
                )}
                {user.role === 'student' && <Link to="/my-courses" onClick={() => setIsMobileMenuOpen(false)} className={`block px-4 py-3 text-sm font-bold rounded-xl ${isActive('/my-courses') ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>My Learning</Link>}
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600">Sign Out</button>
              </div>
            ) : (
              <div className="pt-4 grid grid-cols-2 gap-3 px-4">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="py-3 text-center text-sm font-bold text-slate-700 border border-slate-200 rounded-xl">Login</Link>
                <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="py-3 text-center text-sm font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-100">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}