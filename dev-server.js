import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

// Debug: Check if Stripe secret key is loaded
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
  console.error('Make sure .env file exists and contains STRIPE_SECRET_KEY');
  process.exit(1);
}

console.log('✅ STRIPE_SECRET_KEY loaded:', process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...');

// Middleware
app.use(cors());
app.use(express.json());

// Import the serverless function
const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);

// API route handler - mirrors the Vercel serverless function
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { imageUrl, prompt } = req.body;

    // Validate required fields
    if (!imageUrl || !prompt) {
      return res.status(400).json({ 
        error: 'Missing required fields: imageUrl and prompt are required' 
      });
    }

    // Validate image URL format
    if (!imageUrl.startsWith('http')) {
      return res.status(400).json({ 
        error: 'Invalid imageUrl format' 
      });
    }

    // Get the domain for redirect URLs - always use frontend server for dev
    const protocol = 'http';
    const frontendHost = 'localhost:5173'; // Always redirect to frontend server (correct Vite port)
    const domain = `${protocol}://${frontendHost}`;

    console.log('Creating Stripe checkout session...');
    console.log('Domain:', domain);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Custom AI Art Print (12x12)',
              description: 'High-quality AI-generated artwork printed on premium matte canvas with Ayous wood frame',
              images: [imageUrl], // Show the generated artwork in checkout
            },
            unit_amount: 9900, // $99.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${domain}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/review.html`,
      
      // Collect shipping address
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'], // Expand as needed
      },
      
      // Store metadata for order processing
      metadata: {
        prompt: prompt.substring(0, 500), // Stripe metadata has limits
        imageUrl: imageUrl,
        product: 'ai-art-print',
        size: '12x12',
        material: 'Ayous wood frame',
        finish: 'Matte Canvas',
        generated_at: new Date().toISOString(),
      },
      
      // Optional: Add customer email collection
      // customer_email: null, // Omit to avoid Stripe validation error
      
      // Configure checkout page
      billing_address_collection: 'auto',
      phone_number_collection: {
        enabled: false, // Can be enabled if needed
      },
    });

    console.log('Stripe checkout session created:', session.id);

    // Return session ID to client
    res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Stripe checkout session creation failed:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      res.status(400).json({ error: 'Payment failed. Please try again.' });
    } else if (error.type === 'StripeRateLimitError') {
      res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    } else if (error.type === 'StripeInvalidRequestError') {
      res.status(400).json({ error: 'Invalid request. Please check your data.' });
    } else if (error.type === 'StripeAPIError') {
      res.status(500).json({ error: 'Payment service unavailable. Please try again.' });
    } else if (error.type === 'StripeConnectionError') {
      res.status(500).json({ error: 'Network error. Please try again.' });
    } else if (error.type === 'StripeAuthenticationError') {
      console.error('Stripe authentication error - check API keys');
      res.status(500).json({ error: 'Payment system error. Please contact support.' });
    } else {
      // Generic error
      res.status(500).json({ 
        error: 'Failed to create checkout session. Please try again.' 
      });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Development API server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Development API server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💳 Stripe webhook: http://localhost:${PORT}/api/create-checkout-session`);
  console.log('');
  console.log('🔧 Make sure to run `npm run dev` in another terminal for the frontend');
  console.log('');
});

export default app;