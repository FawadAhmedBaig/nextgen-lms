import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import API from '../utils/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ course }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  // Robust price parsing for your schema
  const rawPrice = course.price?.toString() || "0";
  const basePrice = parseFloat(rawPrice.replace(/[^\d.-]/g, '')) || 0;
  const serviceFee = basePrice * 0.10;
  const totalPrice = basePrice + serviceFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    const loadingToast = toast.loading("Processing Payment...");

try {
      // 1. Create Payment Intent via API instance
      const { data: { clientSecret } } = await API.post('/payments/create-intent', {
        amount: Math.round(totalPrice * 100),
        courseId: course._id
      });

      // 2. Confirm Stripe Payment (Stripe's internal library handles this)
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        toast.error(result.error.message, { id: loadingToast });
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          // 3. Complete Enrollment via API instance
          await API.post(`/users/enroll/${course._id}`, {});

          toast.success("Enrollment Successful!", { id: loadingToast });

          navigate('/order-complete', { 
            state: { 
              course, 
              orderId: result.paymentIntent.id 
            } 
          });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Transaction failed. Please try again.", { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
      {/* Left Column: Payment Details */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-[2rem] p-6 lg:p-10 border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-6 lg:mb-8 uppercase tracking-widest">Card Details</h3>
          <div className="p-5 lg:p-7 bg-slate-50 rounded-2xl border border-slate-200">
            <CardElement options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1e293b',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  '::placeholder': { color: '#94a3b8' },
                },
              },
            }} />
          </div>
          <div className="mt-6 flex items-center gap-3 text-slate-400">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <p className="text-[10px] font-black uppercase tracking-widest">Secure 256-bit SSL Encrypted Payment</p>
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
              <p className="text-slate-400 text-[10px] font-black uppercase mt-1">Instructor: {course.instructor?.name}</p>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-white/10 mb-8 font-bold text-xs uppercase tracking-wider">
            <div className="flex justify-between">
              <span className="text-slate-400">Course Base</span>
              <span>${basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Service Fee</span>
              <span className="text-blue-400">+${serviceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-6 border-t border-white/10 text-base">
              <span className="text-white">Total</span>
              <span className="text-3xl font-black text-blue-500">${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <button 
            disabled={!stripe || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer active:scale-95 shadow-xl shadow-blue-900/20"
          >
            {isProcessing ? "Processing..." : "Complete Purchase"}
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
      // 1. Check if course object is in state
      if (location.state?.course) {
        setCourse(location.state.course);
        setLoading(false);
      } 
// 2. Fallback: Fetch from DB using API instance
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
      // 3. Error: No data at all
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