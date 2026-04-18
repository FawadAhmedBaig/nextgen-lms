import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Stripe - added a check to prevent crash if key is missing
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    console.error("❌ STRIPE_SECRET_KEY is missing in .env file!");
}
const stripe = new Stripe(stripeSecretKey);

// --- HEALTH CHECK ROUTE ---
// Go to http://localhost:5000/api/payments/test to see if this works
router.get('/test', (req, res) => {
    res.json({ message: "Payment route is active and working!" });
});

// --- CREATE PAYMENT INTENT ---
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, courseId } = req.body;

    // Validation
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount provided." });
    }

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure it's an integer (cents)
      currency: 'usd',
      metadata: { 
        courseId: courseId || "unknown_course" 
      },
      automatic_payment_methods: { enabled: true },
    });

    // Send the clientSecret back
    res.status(200).json({ 
      clientSecret: paymentIntent.client_secret 
    });
    
  } catch (error) {
    console.error("Stripe Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// CRITICAL: Ensure this is exactly like this for ESM
export default router;