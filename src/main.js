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
const trendingScrollLeftBtn = document.getElementById('trendingScrollLeftBtn');
const trendingScrollRightBtn = document.getElementById('trendingScrollRightBtn');

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

// Scroll trending carousel right with infinite loop
function scrollTrendingCarouselRight() {
  const carousel = document.getElementById('trendingCarousel');
  if (carousel) {
    console.log('Scrolling trending carousel right...'); // Debug log
    const scrollAmount = 244; // Item width (220px) + gap (24px) - exactly one image
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    
    // Check if we're at or near the end
    if (carousel.scrollLeft >= maxScroll - 10) {
      // Loop back to the beginning
      carousel.scrollTo({
        left: 0,
        behavior: 'smooth'
      });
    } else {
      // Normal scroll right
      carousel.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  }
}

// Scroll trending carousel left with infinite loop
function scrollTrendingCarouselLeft() {
  const carousel = document.getElementById('trendingCarousel');
  if (carousel) {
    console.log('Scrolling trending carousel left...'); // Debug log
    const scrollAmount = 244; // Item width (220px) + gap (24px) - exactly one image
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    
    // Check if we're at or near the beginning
    if (carousel.scrollLeft <= 10) {
      // Loop to the end
      carousel.scrollTo({
        left: maxScroll,
        behavior: 'smooth'
      });
    } else {
      // Normal scroll left
      carousel.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    }
  }
}

// Try This button functionality
function handleTryThisClick(event) {
  const button = event.target;
  const style = button.getAttribute('data-style');
  
  // You can customize these prompts based on the style
  const stylePrompts = {
    'french': 'A romantic scene in French Academic style with dramatic lighting',
    'dutch': 'A maritime scene in Dutch Renaissance style with rich colors',
    'japan': 'A minimalist scene in Edo Japanese style with natural elements',
    'edo': 'A beautiful still life with flowers in artistic style'
  };
  
  if (stylePrompts[style] && promptInput) {
    promptInput.value = stylePrompts[style];
    validatePrompt();
    
    // Scroll to input
    promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    promptInput.focus();
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
    
    // Show remaining attempts if any (while loading screen is still visible)
    showRemainingAttempts(newStatus.remaining);
    
    // Redirect immediately to eliminate any flash
    window.location.href = '/review.html';
    
  } catch (error) {
    console.error('Error generating artwork:', error);
    hideLoading();
    
    // Show user-friendly error message
    alert(error.message || 'Failed to generate artwork. Please try again.');
  }
}

// Event listeners
promptInput.addEventListener('input', validatePrompt);

// Only add filter-related listeners if the elements exist
if (filterBtn) filterBtn.addEventListener('click', openFilterModal);
if (closeModal) closeModal.addEventListener('click', closeFilterModal);
if (modalBackdrop) modalBackdrop.addEventListener('click', closeFilterModal);
if (applyFilters) applyFilters.addEventListener('click', applySelectedFilters);

// Trending Carousel functionality
if (trendingScrollLeftBtn) {
  trendingScrollLeftBtn.addEventListener('click', scrollTrendingCarouselLeft);
}

if (trendingScrollRightBtn) {
  trendingScrollRightBtn.addEventListener('click', scrollTrendingCarouselRight);
}


// Try This buttons
document.querySelectorAll('.try-this-btn').forEach(button => {
  button.addEventListener('click', handleTryThisClick);
});

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
