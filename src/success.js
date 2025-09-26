import './style.css';
import { handleCheckoutSuccess } from './stripe.js';

// DOM Elements
const orderSessionIdElement = document.getElementById('orderSessionId');
const estimatedDeliveryElement = document.getElementById('estimatedDelivery');

/**
 * Initialize the success page
 */
function initializeSuccessPage() {
  try {
    // Get session ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      console.log('Processing successful checkout:', sessionId);
      
      // Display the session ID (truncated for display)
      const displaySessionId = sessionId.length > 20 
        ? sessionId.substring(0, 20) + '...' 
        : sessionId;
      orderSessionIdElement.textContent = displaySessionId;
      
      // Handle checkout success (cleanup localStorage, etc.)
      handleCheckoutSuccess(sessionId).then(result => {
        if (result.success) {
          console.log('Checkout success handled successfully');
        } else {
          console.error('Error handling checkout success:', result.error);
          // Don't show error to user on success page - they already paid
        }
      });
      
    } else {
      console.warn('No session_id found in URL parameters');
      orderSessionIdElement.textContent = 'Order confirmation in progress...';
    }
    
    // Calculate and display estimated delivery date
    const deliveryDate = calculateDeliveryDate();
    estimatedDeliveryElement.textContent = deliveryDate;
    
    // Add some celebration effects
    setTimeout(() => {
      addConfetti();
    }, 500);
    
  } catch (error) {
    console.error('Error initializing success page:', error);
    orderSessionIdElement.textContent = 'Order confirmed';
  }
}

/**
 * Calculate estimated delivery date (7 business days from now)
 */
function calculateDeliveryDate() {
  const today = new Date();
  let businessDays = 0;
  let currentDate = new Date(today);
  
  // Add 7 business days (skip weekends)
  while (businessDays < 7) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }
  
  // Format the date
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  return currentDate.toLocaleDateString('en-US', options);
}

/**
 * Add confetti celebration effect
 */
function addConfetti() {
  try {
    // Create confetti elements
    const confettiCount = 50;
    const colors = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];
    
    for (let i = 0; i < confettiCount; i++) {
      createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
    }
    
    // Clean up confetti after animation
    setTimeout(() => {
      document.querySelectorAll('.confetti').forEach(confetti => {
        confetti.remove();
      });
    }, 3000);
    
  } catch (error) {
    console.error('Error adding confetti:', error);
    // Non-critical error, continue without confetti
  }
}

/**
 * Create a single confetti piece
 */
function createConfettiPiece(color) {
  const confetti = document.createElement('div');
  confetti.className = 'confetti';
  confetti.style.cssText = `
    position: fixed;
    width: 8px;
    height: 8px;
    background-color: ${color};
    left: ${Math.random() * 100}vw;
    top: -10px;
    z-index: 1000;
    pointer-events: none;
    animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
  `;
  
  document.body.appendChild(confetti);
}

// Add CSS for confetti animation
const style = document.createElement('style');
style.textContent = `
  @keyframes confettiFall {
    0% {
      transform: translateY(-10px) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100vh) rotate(720deg);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeSuccessPage);

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSuccessPage);
} else {
  initializeSuccessPage();
}

console.log('PICASO Success Page loaded! 🎉');