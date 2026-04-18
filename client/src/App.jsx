import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout'; 
import LandingPage from './pages/LandingPage';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Courses from './pages/Courses';
import CourseView from './pages/CourseView';
import Profile from './pages/Profile';
import Verify from './pages/Verify';
import OrderComplete from './pages/OrderComplete';
import Checkout from './pages/Checkout';
import InstructorDashboard from './pages/InstructorDashboard';
import ForgotPassword from './pages/forgotPassword';
import ResetPassword from './pages/resetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import EditCourse from './pages/editCourse';
import CourseManagement from './pages/CourseManagement';
import MyCourses from './pages/MyCourses';
import AdminDashboard from './pages/AdminDashboard';
import CourseDetail from './pages/CourseDetail';

function App() {
  return (
    <Router>
      <Routes>
        {/* Everything inside this Route will use the Layout (Navbar + pt-20) */}
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

          {/* FALLBACK: Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Route>
      </Routes>
    </Router>
  );
}

export default App;