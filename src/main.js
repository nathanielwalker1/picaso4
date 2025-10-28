import './style.css';
import { createArtwork } from './imageGen.js';
import { getRateLimitStatus, recordGeneration, showRateLimitModal, showRemainingAttempts } from './rateLimit.js';

// DOM Elements
const promptInput = document.getElementById('promptInput');
const startBtn = document.getElementById('startBtn');
const promptError = document.getElementById('promptError');
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
const trendingScrollLeftBtn2 = document.getElementById('trendingScrollLeftBtn2');
const trendingScrollRightBtn2 = document.getElementById('trendingScrollRightBtn2');

// State

// Auto-resize textarea
function autoResizeTextarea() {
  const textarea = promptInput;
  
  if (textarea) {
    // Reset height to get accurate scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate the new height
    const scrollHeight = textarea.scrollHeight;
    const isMobile = window.innerWidth <= 768;
    const minHeight = isMobile ? 44 : 40; // Minimum height
    const maxHeight = isMobile ? 140 : 120; // Maximum height
    
    // Set the new height, ensuring it's at least minHeight and doesn't exceed maxHeight
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = newHeight + 'px';
    
    // Ensure proper word wrap
    textarea.style.wordWrap = 'break-word';
    textarea.style.overflowWrap = 'break-word';
  }
}

// Prompt validation - hide error message when enough words
function validatePrompt() {
  const words = promptInput.value.trim().split(/\s+/).filter(word => word.length > 0);
  
  // Hide error message if user has enough words
  if (words.length >= 3) {
    promptError.style.display = 'none';
  }
  
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

// Scroll second trending carousel right with infinite loop
function scrollTrendingCarousel2Right() {
  const carousel = document.getElementById('trendingCarousel2');
  if (carousel) {
    console.log('Scrolling second trending carousel right...'); // Debug log
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

// Scroll second trending carousel left with infinite loop
function scrollTrendingCarousel2Left() {
  const carousel = document.getElementById('trendingCarousel2');
  if (carousel) {
    console.log('Scrolling second trending carousel left...'); // Debug log
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

// Try This button/card functionality
function handleTryThisClick(event) {
  const element = event.currentTarget;
  const style = element.getAttribute('data-style');
  
  // More detailed prompts that will trigger expansion
  const stylePrompts = {
    'y2k': 'Y2K dreamcore liminal space, flooded indoor pool with blue grid tiles, doorway opening to surreal sky with white clouds, shallow water with rippling reflections, saturated cyan blue color palette, vaporwave aesthetic, shot on early 2000s digital camera, soft focus, slight film grain, nostalgic dreamy atmosphere',
    'french': 'A romantic French Academic painting featuring elegant figures in classical poses, with dramatic chiaroscuro lighting, rich warm tones, and detailed fabric textures in the style of 19th century salon artists',
    'canton': 'Retro 70s muscle cars on neon-lit Asian city street, cinematic night scene, vibrant Chinese signage, motion blur, orange and blue color palette',
    'dutch': 'A Dutch Renaissance maritime scene with tall sailing ships navigating turbulent seas under dramatic cloudy skies, featuring rich earth tones and masterful attention to atmospheric perspective and water reflections',
    'japan': 'An Edo period Japanese artwork depicting serene natural elements like cherry blossoms, cranes, or mountain landscapes, rendered in minimalist style with delicate brushwork, subtle colors, and harmonious composition',
    'edo': 'Modern still life with bold striped or geometric background. Clean composition, flat color areas, thick paint texture. Simple and graphic.',
    'googie': '1950s vintage collage of mid-century modern indoor pool, dramatic angular skylight showing starry night sky, palm trees, turquoise water, beige walls, small swimmers, retro magazine aesthetic, clean vibrant colors',
    'gouaches': 'Matisse-inspired gouache 3x3 grid cutout style artwork featuring bold organic shapes and forms, vibrant flat colors including yellow, orange, red, pink, blue, and green, simple botanical or abstract motifs arranged in a mosaic-like composition'
  };
  
  if (stylePrompts[style] && promptInput) {
    // Clear and set the new value
    promptInput.value = '';
    promptInput.value = stylePrompts[style];
    
    // Force validation and auto-resize with multiple triggers
    validatePrompt();
    autoResizeTextarea();
    
    // Additional triggers to ensure proper mobile formatting
    setTimeout(() => {
      autoResizeTextarea();
      validatePrompt();
      
      // Focus and scroll to input
      promptInput.focus();
      
      // Scroll to input with some delay for smooth animation
      setTimeout(() => {
        promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }, 100);
  }
}

// Handle image generation
async function handleStartGeneration() {
  const prompt = promptInput.value.trim();
  
  // Validate prompt
  const words = prompt.split(/\s+/).filter(word => word.length > 0);
  if (words.length < 3) {
    promptError.style.display = 'block';
    promptInput.focus();
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
    const artwork = await createArtwork(prompt, updateProgress);
    
    // Record the generation for rate limiting
    const newStatus = recordGeneration(artwork.imageUrl, prompt);
    
    // Show remaining attempts if any (while loading screen is still visible)
    showRemainingAttempts(newStatus.remaining);
    
    // Store artwork data for review page
    sessionStorage.setItem('currentArtwork', JSON.stringify({
      imageUrl: artwork.imageUrl,
      prompt: prompt,
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

// Only add filter-related listeners if the elements exist
if (filterBtn) filterBtn.addEventListener('click', openFilterModal);
if (closeModal) closeModal.addEventListener('click', closeFilterModal);
if (modalBackdrop) modalBackdrop.addEventListener('click', closeFilterModal);
if (applyFilters) applyFilters.addEventListener('click', closeFilterModal);

// Trending Carousel functionality
if (trendingScrollLeftBtn) {
  trendingScrollLeftBtn.addEventListener('click', scrollTrendingCarouselLeft);
}

if (trendingScrollRightBtn) {
  trendingScrollRightBtn.addEventListener('click', scrollTrendingCarouselRight);
}

// Second Trending Carousel functionality
if (trendingScrollLeftBtn2) {
  trendingScrollLeftBtn2.addEventListener('click', scrollTrendingCarousel2Left);
}

if (trendingScrollRightBtn2) {
  trendingScrollRightBtn2.addEventListener('click', scrollTrendingCarousel2Right);
}


// Generate buttons and cards
document.querySelectorAll('.generate-btn').forEach(button => {
  button.addEventListener('click', handleTryThisClick);
});

document.querySelectorAll('.trending-card').forEach(card => {
  card.addEventListener('click', handleTryThisClick);
});


// Handle Start button click
startBtn.addEventListener('click', handleStartGeneration);

// Handle Enter key in prompt input
promptInput.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
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

// Handle window resize and orientation changes for mobile responsiveness
window.addEventListener('resize', function() {
  // Debounce resize events
  clearTimeout(window.resizeTimeout);
  window.resizeTimeout = setTimeout(function() {
    autoResizeTextarea();
  }, 100);
});

// Handle orientation change specifically for mobile devices
window.addEventListener('orientationchange', function() {
  setTimeout(function() {
    autoResizeTextarea();
  }, 200);
});

// Initialize
validatePrompt();

console.log('PICASO is ready to build! 🎨');
// Updated for live Stripe keys Fri Oct 17 18:18:46 EDT 2025
