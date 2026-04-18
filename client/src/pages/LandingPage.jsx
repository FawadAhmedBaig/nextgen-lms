// Correct relative paths
import Hero from '../components/Hero';
import FeaturedCourses from '../components/FeaturedCourses';
import CommunityStats from '../components/CommunityStats';

export default function LandingPage() {
  return (
    // Removed unnecessary bg-gray-50 and min-h-screen if already in Layout
    // overflow-x-hidden is kept to ensure hero animations don't cause scrollbars
    <div className="font-sans text-gray-900 overflow-x-hidden">
      
      {/* STRATEGY: 
          We removed pt-16/pt-20/pt-24. 
          The 'Layout.jsx' component now handles the padding for the Navbar.
          This ensures the Hero starts exactly where the Navbar ends.
      */}
      <main>
        <Hero />
        <CommunityStats />
        <FeaturedCourses />
      </main>
    </div>
  );
}