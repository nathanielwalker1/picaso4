import './style.css'

// DOM Elements
const promptInput = document.getElementById('promptInput');
const startBtn = document.getElementById('startBtn');
const filterBtn = document.getElementById('filterBtn');
const filterModal = document.getElementById('filterModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const closeModal = document.getElementById('closeModal');
const applyFilters = document.getElementById('applyFilters');

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
startBtn.addEventListener('click', function() {
  const prompt = promptInput.value.trim();
  
  if (prompt.split(/\s+/).filter(word => word.length > 0).length >= 3) {
    console.log('Starting generation with prompt:', prompt);
    console.log('Selected filters:', selectedFilters);
    
    // TODO: Implement image generation flow
    alert('Image generation will be implemented next! 🎨');
  }
});

// Initialize
validatePrompt();

console.log('PICASO is ready to build! 🎨');
