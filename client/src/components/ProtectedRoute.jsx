import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const token = localStorage.getItem('token');
  
  // Safety check: handle cases where 'user' might be missing or malformed in localStorage
  let user = null;
  try {
    const storedUser = localStorage.getItem('user');
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("Error parsing user data from localStorage", error);
    user = null;
  }

  // 1. If no token exists, the user is not logged in. Redirect to login.
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Role-based Authorization check
  // If a list of allowedRoles is provided, ensure the current user's role matches.
  // Using optional chaining (user?.role) to prevent errors if user object is null.
const userRole = user?.role?.toLowerCase() || "";
if (allowedRoles.length > 0 && !allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
    return <Navigate to="/" replace />;
}

  // 3. Authorization successful. Render the protected component.
  return children;
};

export default ProtectedRoute;