import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar stays at the top */}
      <Navbar />

      {/* The main area starts here. 
        pt-20 (80px) exactly matches the height of your fixed navbar.
        Outlet renders whatever page is currently active in the router.
      */}
      <main className="flex-1 pt-20">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;