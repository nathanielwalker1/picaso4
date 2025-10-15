const STORAGE_KEY_GENERATIONS = 'picaso_generations';
const STORAGE_KEY_RESET = 'picaso_limit_reset';
const MAX_GENERATIONS = 50;
const RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Gets current rate limit status
 */
export function getRateLimitStatus() {
  try {
    const generations = JSON.parse(localStorage.getItem(STORAGE_KEY_GENERATIONS) || '[]');
    const resetTime = localStorage.getItem(STORAGE_KEY_RESET);
    const now = Date.now();
    
    // Check if 24 hours have passed since last reset
    if (!resetTime || now > parseInt(resetTime)) {
      // Reset the limit
      localStorage.setItem(STORAGE_KEY_GENERATIONS, '[]');
      localStorage.setItem(STORAGE_KEY_RESET, (now + RESET_INTERVAL).toString());
      return { 
        allowed: true, 
        remaining: MAX_GENERATIONS,
        resetTime: now + RESET_INTERVAL
      };
    }
    
    // Check current count
    const remaining = MAX_GENERATIONS - generations.length;
    
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      resetTime: parseInt(resetTime)
    };
    
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // If there's an error, allow the generation but reset the storage
    localStorage.removeItem(STORAGE_KEY_GENERATIONS);
    localStorage.removeItem(STORAGE_KEY_RESET);
    return { 
      allowed: true, 
      remaining: MAX_GENERATIONS,
      resetTime: Date.now() + RESET_INTERVAL
    };
  }
}

/**
 * Records a generation attempt
 */
export function recordGeneration(imageUrl, prompt) {
  try {
    const generations = JSON.parse(localStorage.getItem(STORAGE_KEY_GENERATIONS) || '[]');
    
    const newGeneration = {
      timestamp: Date.now(),
      imageUrl,
      prompt
    };
    
    generations.push(newGeneration);
    localStorage.setItem(STORAGE_KEY_GENERATIONS, JSON.stringify(generations));
    
    return getRateLimitStatus();
    
  } catch (error) {
    console.error('Error recording generation:', error);
    return getRateLimitStatus();
  }
}

/**
 * Gets time until rate limit resets in human readable format
 */
export function getTimeUntilReset() {
  const status = getRateLimitStatus();
  const now = Date.now();
  const timeLeft = status.resetTime - now;
  
  if (timeLeft <= 0) {
    return 'Now';
  }
  
  const hours = Math.floor(timeLeft / (60 * 60 * 1000));
  const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Shows rate limit modal if user has exceeded limit
 */
export function showRateLimitModal() {
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h3>Daily Limit Reached</h3>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 16px;">You've reached your daily limit of 3 generations. Try again in 24 hours!</p>
        <p style="font-size: 14px; color: #6B7280;">
          🌱 PICASO is environmentally friendly - we limit generations to reduce energy consumption.
        </p>
        <p style="font-size: 14px; color: #6B7280; margin-top: 12px;">
          Reset in: <strong>${getTimeUntilReset()}</strong>
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn-apply" onclick="this.closest('.modal').remove()">Got it</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  
  // Close modal when clicking backdrop
  modal.querySelector('.modal-backdrop').addEventListener('click', () => {
    modal.remove();
    document.body.style.overflow = 'auto';
  });
}

/**
 * Shows remaining attempts after generation
 */
export function showRemainingAttempts(remaining) {
  if (remaining > 0) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10B981;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: 'Kosugi', sans-serif;
      font-size: 14px;
      z-index: 1001;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: opacity 0.3s;
    `;
    notification.textContent = `You have ${remaining} attempt${remaining === 1 ? '' : 's'} remaining today`;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}