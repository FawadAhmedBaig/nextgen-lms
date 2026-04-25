import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';

// --- SHARED COMPONENTS (KEEP STANDARD IMPORT) ---
import Layout from './components/Layout'; 
import ProtectedRoute from './components/ProtectedRoute';

// --- LAZY LOADED PAGES (OPTIMIZATION) ---
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Signup = lazy(() => import('./pages/Signup'));
const Login = lazy(() => import('./pages/Login'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseView = lazy(() => import('./pages/CourseView'));
const Profile = lazy(() => import('./pages/Profile'));
const Verify = lazy(() => import('./pages/Verify'));
const OrderComplete = lazy(() => import('./pages/OrderComplete'));
const Checkout = lazy(() => import('./pages/Checkout'));
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'));
const ForgotPassword = lazy(() => import('./pages/forgotPassword'));
const ResetPassword = lazy(() => import('./pages/resetPassword'));
const EditCourse = lazy(() => import('./pages/EditCourse'));
const CourseManagement = lazy(() => import('./pages/CourseManagement'));
const MyCourses = lazy(() => import('./pages/MyCourses'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));

// --- HELPER COMPONENT: CLEARS TOASTS ON NAVIGATION ---
const ToastCleanup = () => {
  const location = useLocation();
  useEffect(() => {
    toast.dismiss();
  }, [location.pathname]);
  return null;
};

// --- LOADING FALLBACK COMPONENT ---
const PageLoader = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
    <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Initializing Workspace...</p>
  </div>
);

function App() {
  return (
    <Router>
      <Toaster 
        position="top-center" 
        reverseOrder={false} 
        toastOptions={{
          duration: 5000,
          style: {
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            borderRadius: '12px',
            zIndex: 9999, // Ensure it's above all your dashboards
          },
        }} 
      />
      
      <ToastCleanup />
      
      {/* 🔥 Suspense boundary catches lazy-loaded chunks and shows the loader */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            
            {/* --- PUBLIC ROUTES --- */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/course/:id" element={<CourseDetail />} />

            {/* --- STUDENT ONLY ROUTES --- */}
            <Route path="/courses" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Courses />
              </ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Checkout />
              </ProtectedRoute>
            } />
            <Route path="/my-courses" element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyCourses />
              </ProtectedRoute>
            } />
            <Route path="/order-complete" element={
              <ProtectedRoute allowedRoles={['student']}>
                <OrderComplete />
              </ProtectedRoute>
            } />

            {/* --- SHARED ROUTES (STUDENT & INSTRUCTOR) --- */}
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['student', 'instructor']}>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/course-view/:id" element={
              <ProtectedRoute allowedRoles={['student', 'instructor', 'admin']}>
                <CourseView />
              </ProtectedRoute>
            } />

            {/* --- INSTRUCTOR ONLY ROUTES --- */}
            <Route path="/instructor-dashboard" element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <InstructorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/course-management" element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <CourseManagement />
              </ProtectedRoute>
            } />
            <Route path="/edit-course/:id" element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <EditCourse />
              </ProtectedRoute>
            } />

            {/* --- ADMIN ONLY ROUTE --- */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* FALLBACK */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;