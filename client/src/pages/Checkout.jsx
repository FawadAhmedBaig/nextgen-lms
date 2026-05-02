import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import API from '../utils/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ course }) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Get the user from localStorage safely
  const storedUser = JSON.parse(localStorage.getItem('user'));
  const studentId = storedUser?._id || storedUser?.id;

  // Robust price parsing
// Inside CheckoutForm in Checkout.jsx
const rawPrice = course.price?.toString() || "0";
const basePrice = parseFloat(rawPrice.replace(/[^\d.-]/g, '')) || 0;
const serviceFee = (basePrice * 0.10) + 1; 
const totalPrice = basePrice + serviceFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    const loadingToast = toast.loading("Redirecting to secure payment...");

    if (!studentId) {
      setIsProcessing(false);
      return toast.error("Please login to continue.", { id: loadingToast });
    }

    try {
      // 2. Call backend to create the Hosted Checkout Session
      const { data } = await API.post('/payments/create-checkout-session', {
        amount: totalPrice,
        courseId: course._id,
        instructorStripeId: course.instructor?.stripeAccountId,
        studentId: studentId, // Corrected from 'user'
        instructorId: course.instructor?._id || course.instructor 
      });

      // 3. Redirect to Stripe's Hosted Checkout Page
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout initialization failed:", err);
      toast.error("Failed to start checkout. Please try again.", { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
      {/* Left Column: Confirmation Details */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-[2rem] p-6 lg:p-10 border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-6 lg:mb-8 uppercase tracking-widest">Enrollment Confirmation</h3>
          
          <div className="p-6 lg:p-8 bg-blue-50 rounded-2xl border border-blue-100 mb-6">
            <p className="text-slate-700 font-medium leading-relaxed">
              You are about to enroll in <span className="font-bold text-blue-700">"{course.title}"</span>. 
              Clicking the button will redirect you to Stripe's secure payment server to complete your purchase.
            </p>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Official Stripe Secure Gateway</p>
          </div>
        </div>
      </div>

      {/* Right Column: Order Summary */}
      <div className="lg:sticky lg:top-28 h-fit">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
          <h3 className="text-lg font-black mb-8 uppercase tracking-widest text-blue-400">Order Summary</h3>
          <div className="flex gap-4 mb-8 items-center">
            <img src={course.imageUrl} className="w-20 h-20 rounded-2xl object-cover border border-white/10" alt="Thumb" />
            <div className="min-w-0">
              <h4 className="font-bold text-sm leading-tight truncate">{course.title}</h4>
              <p className="text-slate-400 text-[10px] font-black uppercase mt-1">Instructor: {course.instructor?.name || 'Instructor'}</p>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-white/10 mb-8 font-bold text-xs uppercase tracking-wider">
            <div className="flex justify-between">
              <span className="text-slate-400">Course Base</span>
              <span>${basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Platform & Blockchain Fee</span>
              <span className="text-blue-400">+${serviceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-6 border-t border-white/10 text-base">
              <span className="text-white">Total</span>
              <span className="text-3xl font-black text-blue-500">${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer active:scale-95 shadow-xl shadow-blue-900/20"
          >
            {isProcessing ? "Processing..." : "Continue to Payment"}
          </button>
        </div>
      </div>
    </form>
  );
};

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initCheckout = async () => {
      if (location.state?.course) {
        setCourse(location.state.course);
        setLoading(false);
      } 
      else if (location.state?.courseId) {
        try {
          const { data } = await API.get(`/courses/${location.state.courseId}`);
          setCourse(data);
          setLoading(false);
        } catch (err) {
          toast.error("Could not load course data");
          navigate('/courses');
        }
      }
      else {
        toast.error("No course selected");
        navigate('/courses');
      }
    };

    initCheckout();
  }, [location, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-widest bg-slate-50">
      Preparing Checkout...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pt-20 lg:pt-24 pb-20 font-['Plus_Jakarta_Sans']">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="mb-10 text-center lg:text-left">
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Secure Checkout</h1>
          <p className="text-slate-500 font-bold text-xs lg:text-sm uppercase tracking-widest">
            Step 2 of 2: Confirm Payment & Enrollment
          </p>
        </div>
        <Elements stripe={stripePromise}>
          <CheckoutForm course={course} />
        </Elements>
      </div>
    </div>
  );
};

export default Checkout;