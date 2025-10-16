import './style.css';
import { createArtwork } from './imageGen.js';
import { getRateLimitStatus, recordGeneration, showRateLimitModal, showRemainingAttempts } from './rateLimit.js';
import { createCheckoutSession } from './stripe.js';

// DOM Elements
const generatedImage = document.getElementById('generatedImage');
const reviewPrompt = document.getElementById('reviewPrompt');
const retryBtn = document.getElementById('retryBtn');
const continueBtn = document.getElementById('continueBtn');
const backBtn = document.getElementById('backBtn');
const filterBtn = document.getElementById('filterBtn');
const filterModal = document.getElementById('filterModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const closeModal = document.getElementById('closeModal');
const applyFilters = document.getElementById('applyFilters');
const loadingScreen = document.getElementById('loadingScreen');
const loadingProgress = document.getElementById('loadingProgress');
const loadingText = document.getElementById('loadingText');
const loadingPercentage = document.getElementById('loadingPercentage');

// State
let currentArtwork = null;

// Initialize page with generated artwork data
function initializePage() {
  try {
    // Get artwork data from sessionStorage
    const artworkData = sessionStorage.getItem('currentArtwork');
    
    if (!artworkData) {
      // No artwork data, redirect to home
      window.location.href = '/';
      return;
    }
    
    const data = JSON.parse(artworkData);
    currentArtwork = {
      imageUrl: data.imageUrl,
      prompt: data.prompt
    };
    
    // Display the artwork
    generatedImage.src = currentArtwork.imageUrl;
    generatedImage.alt = `Generated artwork: ${currentArtwork.prompt}`;
    reviewPrompt.value = currentArtwork.prompt;
    
    // Make prompt editable so users can modify before retrying
    reviewPrompt.readOnly = false;
    
  } catch (error) {
    console.error('Error initializing review page:', error);
    window.location.href = '/';
  }
}

// Filter modal functionality
function openFilterModal() {
  filterModal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeFilterModal() {
  filterModal.classList.remove('show');
  document.body.style.overflow = 'auto';
}



// Show loading screen
function showLoading() {
  loadingScreen.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  // Reset progress
  loadingProgress.style.width = '0%';
  loadingPercentage.textContent = '0%';
  loadingText.textContent = 'Generating your artwork...';
}

// Hide loading screen
function hideLoading() {
  loadingScreen.classList.remove('show');
  document.body.style.overflow = 'auto';
}

// Update loading progress
function updateProgress(percentage, text) {
  loadingProgress.style.width = percentage + '%';
  loadingPercentage.textContent = percentage + '%';
  if (text) {
    loadingText.textContent = text;
  }
}

// Handle retry generation - simplified to directly regenerate
async function handleRetry() {
  try {
    // Check rate limit first
    const rateLimitStatus = getRateLimitStatus();
    
    if (!rateLimitStatus.allowed) {
      showRateLimitModal();
      return;
    }
    
    // Get current prompt (user can edit it before clicking retry)
    const currentPrompt = reviewPrompt.value.trim();
    
    // Validate prompt
    const words = currentPrompt.split(/\s+/).filter(word => word.length > 0);
    if (words.length < 3) {
      alert('Please enter at least 3 words for your prompt.');
      return;
    }
    
    // Show loading screen
    showLoading();
    
    // Generate new artwork with current prompt
    const newArtwork = await createArtwork(currentPrompt, updateProgress);
    
    // Record the generation for rate limiting
    const newStatus = recordGeneration(newArtwork.imageUrl, currentPrompt);
    
    // Update current artwork
    currentArtwork = {
      imageUrl: newArtwork.imageUrl,
      prompt: currentPrompt
    };
    
    // Update sessionStorage
    const artworkData = JSON.parse(sessionStorage.getItem('currentArtwork'));
    artworkData.imageUrl = newArtwork.imageUrl;
    artworkData.prompt = currentPrompt;
    sessionStorage.setItem('currentArtwork', JSON.stringify(artworkData));
    
    // Update the displayed image
    generatedImage.src = newArtwork.imageUrl;
    generatedImage.alt = `Generated artwork: ${currentPrompt}`;
    
    // Hide loading screen
    hideLoading();
    
    // Ensure Continue button is reset to normal state
    continueBtn.disabled = false;
    continueBtn.textContent = 'Continue';
    continueBtn.style.cursor = 'pointer';
    
    // Show remaining attempts notification
    showRemainingAttempts(newStatus.remaining);
    
  } catch (error) {
    console.error('Error regenerating artwork:', error);
    hideLoading();
    
    // Ensure Continue button is reset to normal state even on error
    continueBtn.disabled = false;
    continueBtn.textContent = 'Continue';
    continueBtn.style.cursor = 'pointer';
    
    // Show user-friendly error message
    alert(error.message || 'Failed to generate new artwork. Please try again.');
  }
}

// Handle continue to checkout
async function handleContinue() {
  try {
    console.log('Starting checkout process...');
    
    // Validate artwork data
    if (!currentArtwork || !currentArtwork.imageUrl || !currentArtwork.prompt) {
      throw new Error('Missing artwork data. Please regenerate your image.');
    }
    
    // Disable button to prevent double clicks
    continueBtn.disabled = true;
    continueBtn.textContent = 'Processing...';
    continueBtn.style.cursor = 'not-allowed';
    
    // Create checkout session and redirect to Stripe
    await createCheckoutSession(currentArtwork.imageUrl, currentArtwork.prompt);
    
    // If we reach here, there was an error (normal flow redirects away)
    console.error('Checkout redirect failed - user is still on page');
    
  } catch (error) {
    console.error('Checkout error:', error);
    
    // Re-enable button
    continueBtn.disabled = false;
    continueBtn.textContent = 'Continue';
    continueBtn.style.cursor = 'pointer';
    
    // Show error to user
    alert(error.message || 'Failed to start checkout. Please try again.');
  }
}

// Handle back button
function handleBack() {
  // Clear current generation data
  sessionStorage.removeItem('currentArtwork');
  
  // Navigate back to home
  window.location.href = '/';
}

// Event listeners
retryBtn.addEventListener('click', handleRetry);
continueBtn.addEventListener('click', handleContinue);
backBtn.addEventListener('click', handleBack);

// Filter modal event listeners
filterBtn.addEventListener('click', openFilterModal);
closeModal.addEventListener('click', closeFilterModal);
modalBackdrop.addEventListener('click', closeFilterModal);
applyFilters.addEventListener('click', closeFilterModal);

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape' && filterModal.classList.contains('show')) {
    closeFilterModal();
  }
});

// Handle browser back button
window.addEventListener('popstate', handleBack);

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);

// Initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}