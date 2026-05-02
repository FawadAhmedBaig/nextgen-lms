import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/authMiddleware.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// --- 1. INSTRUCTOR ONBOARDING & DASHBOARD ---

// 🔥 FIX: Renamed to match the 404 error your frontend is throwing
router.post('/create-onboarding-link', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Ensure the instructor has a Stripe Account ID
    if (!user.stripeAccountId) {
      const account = await stripe.accounts.create({ type: 'express' });
      user.stripeAccountId = account.id;
      await user.save();
    }

    const accountLink = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      // Ensure these URLs match your actual frontend routes
      refresh_url: `${process.env.FRONTEND_URL}/instructor-dashboard?tab=payouts`,
      return_url: `${process.env.FRONTEND_URL}/instructor-dashboard?tab=payouts`,
      type: 'account_onboarding',
    });

    res.status(200).json({ url: accountLink.url });
  } catch (error) {
    console.error("Onboarding Route Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/create-login-link', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.stripeAccountId) return res.status(400).json({ error: "No Stripe account linked" });
    
    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId);
    res.json({ url: loginLink.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/instructor-balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.stripeAccountId) return res.json({ available: 0, pending: 0 });

    const balance = await stripe.balance.retrieve({
      stripeAccount: user.stripeAccountId,
    });

    res.json({
      available: balance.available[0]?.amount || 0,
      pending: balance.pending[0]?.amount || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 2. FETCH TRANSACTIONS ---
router.get('/instructor-transactions', authMiddleware, async (req, res) => {
  try {
    const instructorId = req.user?._id || req.user?.id;
    const transactions = await Transaction.find({ instructorId })
      .populate('courseId', 'title') 
      .populate('studentId', 'name email') 
      .sort({ createdAt: -1 });

    const formattedTransactions = transactions.map(txn => {
      const txnObj = txn.toObject();
      return {
        ...txnObj,
        amount: parseFloat((txnObj.amount || 0).toFixed(2)),
        platformFee: parseFloat((txnObj.platformFee || 0).toFixed(2)),
        instructorNet: parseFloat((txnObj.instructorNet || 0).toFixed(2))
      };
    });

    res.status(200).json(formattedTransactions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// --- 3. SPLIT PAYMENT CHECKOUT ---
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { amount, courseId, instructorStripeId, studentId, instructorId } = req.body;

    if (!studentId || !instructorId || !courseId || !instructorStripeId) {
      return res.status(400).json({ error: "Missing required checkout metadata." });
    }

    const validAmount = parseFloat(amount);
    const unitAmountCents = Math.round(validAmount * 100);
    
    // Fee Calculation: (10% of base) + $1
    const basePrice = (validAmount - 1) / 1.1; 
    const feeAmountCents = Math.round(((basePrice * 0.10) + 1) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Course Enrollment`, description: `Course ID: ${courseId}` },
          unit_amount: unitAmountCents,
        },
        quantity: 1,
      }],
      metadata: { 
        studentId: String(studentId), 
        instructorId: String(instructorId), 
        courseId: String(courseId) 
      },
      payment_intent_data: {
        application_fee_amount: feeAmountCents,
        transfer_data: { destination: instructorStripeId },
        metadata: { 
          studentId: String(studentId), 
          instructorId: String(instructorId), 
          courseId: String(courseId) 
        },
      },
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/order-complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-failed`,
    });

    res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 4. UNIFIED WEBHOOK ---
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { studentId, instructorId, courseId } = session.metadata;

    try {
      const totalAmount = session.amount_total / 100;
      const coursePrice = (totalAmount - 1) / 1.1;
      const platformFee = (coursePrice * 0.10) + 1;
      const instructorNet = coursePrice;

      // 1. Log Transaction
      await Transaction.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        instructorId: new mongoose.Types.ObjectId(instructorId),
        courseId: new mongoose.Types.ObjectId(courseId),
        amount: totalAmount,
        platformFee: platformFee,      
        instructorNet: instructorNet,  
        stripeSessionId: session.id,
        status: 'completed'
      });

      // 2. Create Enrollment
      await Enrollment.create({
        student: new mongoose.Types.ObjectId(studentId),
        course: new mongoose.Types.ObjectId(courseId),
        progress: 0,
        isCompleted: false
      });

      // 3. Update User
      await User.findByIdAndUpdate(studentId, { 
        $addToSet: { enrolledCourses: courseId } 
      });

    } catch (dbErr) {
      console.error("❌ Webhook Database Error:", dbErr.message);
    }
  }
  res.json({ received: true });
});

export default router;