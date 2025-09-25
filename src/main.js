import './style.css';
import { createArtwork } from './imageGen.js';
import { getRateLimitStatus, recordGeneration, showRateLimitModal, showRemainingAttempts } from './rateLimit.js';

// DOM Elements
const promptInput = document.getElementById('promptInput');
const startBtn = document.getElementById('startBtn');
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
let selectedFilters = {
  medium: [],
  style: [],
  tone: [],
  realism: []
};

// Prompt validation - enable Start button when 3+ words
function validatePrompt() {
  const words = promptInput.value.trim().split(/\s+/).filter(word => word.length > 0);
  startBtn.disabled = words.length < 3;
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

function handleFilterChange(event) {
  const checkbox = event.target;
  const category = checkbox.closest('.filter-category').querySelector('h4').textContent.toLowerCase();
  const value = checkbox.value;
  
  if (checkbox.checked) {
    if (!selectedFilters[category].includes(value)) {
      selectedFilters[category].push(value);
    }
  } else {
    selectedFilters[category] = selectedFilters[category].filter(item => item !== value);
  }
}

function applySelectedFilters() {
  // Update filter button visual state if any filters are selected
  const hasFilters = Object.values(selectedFilters).some(arr => arr.length > 0);
  
  if (hasFilters) {
    filterBtn.style.backgroundColor = '#8B5CF6';
    filterBtn.style.color = 'white';
  } else {
    filterBtn.style.backgroundColor = '';
    filterBtn.style.color = '';
  }
  
  closeFilterModal();
}

// Loading screen functions
function showLoading() {
  loadingScreen.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  // Reset progress
  loadingProgress.style.width = '0%';
  loadingPercentage.textContent = '0%';
  loadingText.textContent = 'Generating your artwork...';
}

function hideLoading() {
  loadingScreen.classList.remove('show');
  document.body.style.overflow = 'auto';
}

function updateProgress(percentage, text) {
  loadingProgress.style.width = percentage + '%';
  loadingPercentage.textContent = percentage + '%';
  if (text) {
    loadingText.textContent = text;
  }
}

// Handle image generation
async function handleStartGeneration() {
  const prompt = promptInput.value.trim();
  
  // Validate prompt
  const words = prompt.split(/\s+/).filter(word => word.length > 0);
  if (words.length < 3) {
    alert('Please enter at least 3 words for your prompt.');
    return;
  }
  
  try {
    // Check rate limit
    const rateLimitStatus = getRateLimitStatus();
    
    if (!rateLimitStatus.allowed) {
      showRateLimitModal();
      return;
    }
    
    // Show loading screen
    showLoading();
    
    // Generate artwork
    const artwork = await createArtwork(prompt, selectedFilters, updateProgress);
    
    // Record the generation for rate limiting
    const newStatus = recordGeneration(artwork.imageUrl, prompt);
    
    // Hide loading
    hideLoading();
    
    // Show remaining attempts if any
    showRemainingAttempts(newStatus.remaining);
    
    // Small delay to show the notification, then navigate
    setTimeout(() => {
      window.location.href = '/review.html';
    }, 1000);
    
  } catch (error) {
    console.error('Error generating artwork:', error);
    hideLoading();
    
    // Show user-friendly error message
    alert(error.message || 'Failed to generate artwork. Please try again.');
  }
}

// Event listeners
promptInput.addEventListener('input', validatePrompt);

filterBtn.addEventListener('click', openFilterModal);
closeModal.addEventListener('click', closeFilterModal);
modalBackdrop.addEventListener('click', closeFilterModal);
applyFilters.addEventListener('click', applySelectedFilters);

// Handle filter checkbox changes
document.querySelectorAll('.filter-options input[type="checkbox"]').forEach(checkbox => {
  checkbox.addEventListener('change', handleFilterChange);
});

// Handle Start button click
startBtn.addEventListener('click', handleStartGeneration);

// Handle Enter key in prompt input
promptInput.addEventListener('keydown', function(event) {
  if (event.key === 'Enter' && !startBtn.disabled) {
    event.preventDefault();
    handleStartGeneration();
  }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape' && filterModal.classList.contains('show')) {
    closeFilterModal();
  }
});

// Initialize
validatePrompt();

console.log('PICASO is ready to build! 🎨');
