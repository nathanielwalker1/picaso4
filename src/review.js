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
let currentFilters = {};

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
    currentFilters = data.selectedFilters || {
      medium: [],
      style: [],
      tone: [],
      realism: []
    };
    
    // Display the artwork
    generatedImage.src = currentArtwork.imageUrl;
    generatedImage.alt = `Generated artwork: ${currentArtwork.prompt}`;
    reviewPrompt.value = currentArtwork.prompt;
    
    // Initialize filter checkboxes with current selections
    initializeFilterCheckboxes();
    updateFilterButtonState();
    
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

// Initialize filter checkboxes with current selections
function initializeFilterCheckboxes() {
  document.querySelectorAll('.filter-options input[type="checkbox"]').forEach(checkbox => {
    const category = checkbox.closest('.filter-category').querySelector('h4').textContent.toLowerCase();
    const value = checkbox.value;
    
    if (currentFilters[category] && currentFilters[category].includes(value)) {
      checkbox.checked = true;
    }
    
    // Add event listener
    checkbox.addEventListener('change', handleFilterChange);
  });
}

function handleFilterChange(event) {
  const checkbox = event.target;
  const category = checkbox.closest('.filter-category').querySelector('h4').textContent.toLowerCase();
  const value = checkbox.value;
  
  if (checkbox.checked) {
    if (!currentFilters[category].includes(value)) {
      currentFilters[category].push(value);
    }
  } else {
    currentFilters[category] = currentFilters[category].filter(item => item !== value);
  }
}

function applySelectedFilters() {
  // Update sessionStorage with new filters
  const artworkData = JSON.parse(sessionStorage.getItem('currentArtwork'));
  artworkData.selectedFilters = currentFilters;
  sessionStorage.setItem('currentArtwork', JSON.stringify(artworkData));
  
  // Update filter button visual state
  updateFilterButtonState();
  
  closeFilterModal();
}

function updateFilterButtonState() {
  const hasFilters = Object.values(currentFilters).some(arr => arr.length > 0);
  
  if (hasFilters) {
    filterBtn.style.backgroundColor = '#8B5CF6';
    filterBtn.style.color = 'white';
  } else {
    filterBtn.style.backgroundColor = '';
    filterBtn.style.color = '';
  }
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

// Handle retry generation
async function handleRetry() {
  try {
    // Check rate limit first
    const rateLimitStatus = getRateLimitStatus();
    
    if (!rateLimitStatus.allowed) {
      showRateLimitModal();
      return;
    }
    
    // Enable editing of prompt
    reviewPrompt.readOnly = false;
    reviewPrompt.focus();
    reviewPrompt.style.background = 'white';
    reviewPrompt.style.border = '2px solid #8B5CF6';
    
    // Change retry button to confirm
    retryBtn.textContent = 'Generate New';
    retryBtn.onclick = confirmRetry;
    
  } catch (error) {
    console.error('Error handling retry:', error);
  }
}

// Confirm retry with new prompt
async function confirmRetry() {
  const newPrompt = reviewPrompt.value.trim();
  
  // Validate prompt
  const words = newPrompt.split(/\s+/).filter(word => word.length > 0);
  if (words.length < 3) {
    alert('Please enter at least 3 words for your prompt.');
    return;
  }
  
  try {
    showLoading();
    
    // Generate new artwork
    const newArtwork = await createArtwork(newPrompt, currentFilters, updateProgress);
    
    // Record the generation
    const newStatus = recordGeneration(newArtwork.imageUrl, newPrompt);
    
    // Update current artwork
    currentArtwork = newArtwork;
    
    // Update sessionStorage
    const artworkData = JSON.parse(sessionStorage.getItem('currentArtwork'));
    artworkData.imageUrl = newArtwork.imageUrl;
    artworkData.prompt = newPrompt;
    sessionStorage.setItem('currentArtwork', JSON.stringify(artworkData));
    
    // Update UI
    generatedImage.src = newArtwork.imageUrl;
    generatedImage.alt = `Generated artwork: ${newPrompt}`;
    
    // Reset prompt field
    reviewPrompt.readOnly = true;
    reviewPrompt.style.background = '#F9FAFB';
    reviewPrompt.style.border = '2px solid #E5E7EB';
    
    // Reset retry button
    retryBtn.textContent = 'Retry';
    retryBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M3 21v-5h5"/>
      </svg>
      Retry
    `;
    retryBtn.onclick = handleRetry;
    
    hideLoading();
    
    // Show remaining attempts
    showRemainingAttempts(newStatus.remaining);
    
  } catch (error) {
    console.error('Error regenerating artwork:', error);
    hideLoading();
    
    // Show error message
    alert(error.message || 'Failed to generate new artwork. Please try again.');
    
    // Reset UI
    reviewPrompt.readOnly = true;
    reviewPrompt.style.background = '#F9FAFB';
    reviewPrompt.style.border = '2px solid #E5E7EB';
    retryBtn.textContent = 'Retry';
    retryBtn.onclick = handleRetry;
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
applyFilters.addEventListener('click', applySelectedFilters);

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