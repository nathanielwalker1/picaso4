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

// Auto-resize textarea and manage container expansion
function autoResizeTextarea() {
  const container = document.getElementById('promptContainer');
  const textarea = promptInput;
  
  if (textarea && container) {
    // Reset height to get accurate scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate the new height
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = 20; // Approximate line height
    const padding = 24; // Top and bottom padding
    const minHeight = lineHeight + padding;
    const maxHeight = 120 + padding;
    
    // Set the new height
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = newHeight + 'px';
    
    // Add/remove expanded class based on content
    const hasContent = textarea.value.trim().length > 50 || scrollHeight > minHeight + 10;
    if (hasContent) {
      container.classList.add('expanded');
    } else {
      container.classList.remove('expanded');
    }
  }
}

// Prompt validation - enable Start button when 3+ words
function validatePrompt() {
  const words = promptInput.value.trim().split(/\s+/).filter(word => word.length > 0);
  startBtn.disabled = words.length < 3;
  autoResizeTextarea();
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
  
  // More detailed prompts that will trigger expansion
  const stylePrompts = {
    'french': 'A romantic French Academic painting featuring elegant figures in classical poses, with dramatic chiaroscuro lighting, rich warm tones, and detailed fabric textures in the style of 19th century salon artists',
    'dutch': 'A Dutch Renaissance maritime scene with tall sailing ships navigating turbulent seas under dramatic cloudy skies, featuring rich earth tones and masterful attention to atmospheric perspective and water reflections',
    'japan': 'An Edo period Japanese artwork depicting serene natural elements like cherry blossoms, cranes, or mountain landscapes, rendered in minimalist style with delicate brushwork, subtle colors, and harmonious composition',
    'edo': 'A contemporary boho abstract artwork featuring flowing organic forms, earthy textures, and warm botanical elements with modern minimalist aesthetics and soft, muted color palette'
  };
  
  if (stylePrompts[style] && promptInput) {
    promptInput.value = stylePrompts[style];
    validatePrompt();
    
    // Trigger expansion and focus
    setTimeout(() => {
      autoResizeTextarea();
      promptInput.focus();
      
      // Scroll to input with some delay for smooth animation
      setTimeout(() => {
        promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }, 50);
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
    
    // Store artwork data for review page
    sessionStorage.setItem('currentArtwork', JSON.stringify({
      imageUrl: artwork.imageUrl,
      prompt: prompt,
      selectedFilters: selectedFilters,
      timestamp: Date.now()
    }));
    
    // Small delay to show completion before redirect
    setTimeout(() => {
      hideLoading();
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
promptInput.addEventListener('focus', autoResizeTextarea);
promptInput.addEventListener('blur', autoResizeTextarea);

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
