import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
let stripePromise;

function getStripe() {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.error('Missing VITE_STRIPE_PUBLISHABLE_KEY environment variable');
      throw new Error('Stripe configuration error. Please contact support.');
    }
    
    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
}

/**
 * Creates a Stripe checkout session and redirects to checkout
 */
export async function createCheckoutSession(imageUrl, prompt) {
  try {
    console.log('Creating Stripe checkout session...');
    
    // Validate inputs
    if (!imageUrl || !prompt) {
      throw new Error('Image URL and prompt are required for checkout');
    }
    
    // Call our serverless function to create checkout session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        prompt: prompt.substring(0, 500) // Limit prompt length
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Response Error:', response.status, errorText);
      throw new Error(`Server error (${response.status}): Please try again`);
    }
    
    const data = await response.json();
    console.log('Checkout session created:', data.sessionId);
    
    // Get Stripe instance
    const stripe = await getStripe();
    
    if (!stripe) {
      throw new Error('Failed to load Stripe. Please try again.');
    }
    
    // Redirect to Stripe Checkout
    console.log('Redirecting to Stripe Checkout...');
    const { error } = await stripe.redirectToCheckout({
      sessionId: data.sessionId,
    });
    
    if (error) {
      console.error('Stripe redirect error:', error);
      throw new Error(error.message || 'Failed to redirect to checkout');
    }
    
  } catch (error) {
    console.error('Checkout error:', error);
    
    // Show user-friendly error messages
    if (error.message.includes('network') || error.name === 'TypeError') {
      throw new Error('Network error. Please check your connection and try again.');
    } else if (error.message.includes('configuration')) {
      throw new Error('Payment system configuration error. Please contact support.');
    } else if (error.message.includes('Server error')) {
      throw error; // Re-throw server errors as-is
    } else {
      throw new Error('Checkout failed. Please try again or contact support.');
    }
  }
}

/**
 * Handles checkout success (called from success page)
 */
export async function handleCheckoutSuccess(sessionId) {
  try {
    console.log('Processing successful checkout:', sessionId);
    
    // Clear the generated artwork from localStorage since order is complete
    localStorage.removeItem('generatedArtwork');
    localStorage.removeItem('selectedFilters');
    
    return {
      success: true,
      sessionId: sessionId,
      message: 'Your order has been successfully placed!'
    };
    
  } catch (error) {
    console.error('Error handling checkout success:', error);
    return {
      success: false,
      error: 'Error processing your order. Please contact support if you were charged.'
    };
  }
}

/**
 * Handles checkout cancellation
 */
export function handleCheckoutCancel() {
  console.log('Checkout was cancelled by user');
  // User is already back on review page, no additional action needed
  return {
    success: false,
    message: 'Checkout was cancelled. Your artwork is still available for purchase.'
  };
}