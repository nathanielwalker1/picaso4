const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Get the domain for redirect URLs
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const domain = `${protocol}://${host}`;

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
}