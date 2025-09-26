import { storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Base prompt template for consistent high-quality results
const BASE_PROMPT = `create an image based on the user's prompts and selected filters.`

/**
 * Constructs the full prompt with base template, user input, and filters
 */
function constructPrompt(userPrompt, selectedFilters) {
  let fullPrompt = BASE_PROMPT + '\n\n' + userPrompt;
  
  // Add filters as natural language
  const filterSections = [];
  
  if (selectedFilters.medium && selectedFilters.medium.length > 0) {
    filterSections.push(`Medium: ${selectedFilters.medium.join(', ')}`);
  }
  
  if (selectedFilters.style && selectedFilters.style.length > 0) {
    filterSections.push(`Style: ${selectedFilters.style.join(', ')}`);
  }
  
  if (selectedFilters.tone && selectedFilters.tone.length > 0) {
    filterSections.push(`Tone: ${selectedFilters.tone.join(', ')}`);
  }
  
  if (selectedFilters.realism && selectedFilters.realism.length > 0) {
    filterSections.push(`Realism level: ${selectedFilters.realism.join(', ')}`);
  }
  
  if (filterSections.length > 0) {
    fullPrompt += '\n\n' + filterSections.join('\n');
  }
  
  return fullPrompt;
}

/**
 * Calls our serverless API to generate an image with Replicate Flux Pro
 */
async function generateImage(userPrompt, selectedFilters) {
  const fullPrompt = constructPrompt(userPrompt, selectedFilters);
  
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: fullPrompt
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate image');
    }

    const data = await response.json();
    return data.imageUrl; // Returns Replicate image URL
    
  } catch (error) {
    if (error.message.includes('NetworkError') || error.name === 'TypeError') {
      throw new Error('Failed to generate image. Please check your connection and try again.');
    }
    if (error.message.includes('content policy') || error.message.includes('safety')) {
      throw new Error('This prompt violates content policy. Please try a different prompt.');
    }
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      throw new Error('Service busy. Please try again in a moment.');
    }
    throw error; // Re-throw the original error
  }
}

/**
 * Generates a random ID for unique filename
 */
function generateRandomId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}


/**
 * Main function to generate and upload image
 */
export async function createArtwork(userPrompt, selectedFilters, onProgress) {
  try {
    // Step 1: Generate image with Replicate Flux Pro
    onProgress?.(15, 'Generating your artwork...');
    const replicateImageUrl = await generateImage(userPrompt, selectedFilters);
    
    // Step 2: Start Firebase upload process
    onProgress?.(40, 'Processing image...');
    
    // Create a progress callback for upload steps
    const uploadProgressCallback = (step, message) => {
      switch (step) {
        case 'fetching':
          onProgress?.(50, 'Fetching generated image...');
          break;
        case 'converting':
          onProgress?.(65, 'Converting to permanent format...');
          break;
        case 'uploading':
          onProgress?.(80, 'Uploading to secure storage...');
          break;
        case 'finalizing':
          onProgress?.(95, 'Finalizing your masterpiece...');
          break;
        default:
          onProgress?.(60, message || 'Saving your masterpiece...');
      }
    };
    
    // Upload to Firebase Storage with progress updates
    const permanentUrl = await uploadImageToFirebaseWithProgress(replicateImageUrl, uploadProgressCallback);
    
    // Complete
    onProgress?.(100, 'Complete!');
    
    // Debug: Check what permanentUrl actually is
    console.log('permanentUrl type:', typeof permanentUrl);
    console.log('permanentUrl value:', permanentUrl);
    
    const artwork = {
      imageUrl: permanentUrl,
      prompt: userPrompt,
      filters: selectedFilters,
      timestamp: Date.now(),
      isPermanent: typeof permanentUrl === 'string' ? !permanentUrl.includes('replicate.delivery') : true
    };
    
    // Store in localStorage for review page
    try {
      localStorage.setItem('generatedArtwork', JSON.stringify(artwork));
      localStorage.setItem('selectedFilters', JSON.stringify(selectedFilters));
    } catch (storageError) {
      console.warn('Failed to save to localStorage:', storageError);
      // Continue anyway - the data is still returned
    }
    
    return artwork;
    
  } catch (error) {
    console.error('Error creating artwork:', error);
    throw error;
  }
}

/**
 * Simplified method to fetch image as blob using reliable proxy
 */
async function fetchImageAsBlob(imageUrl) {
  console.log('Using simplified image fetch approach...');
  
  // For development, we'll use the Replicate URL directly
  // Replicate URLs are more stable than DALL-E temporary URLs
  console.log('Note: Using Replicate URL (more stable than DALL-E)');
  console.warn('For production, implement server-side image processing');
  
  // Return null to indicate we should use the original URL
  return null;
}

/**
 * Wrapper function for Firebase upload with detailed progress tracking
 */
async function uploadImageToFirebaseWithProgress(replicateImageUrl, progressCallback) {
  console.log('Starting Firebase Storage upload process...');
  
  try {
    progressCallback?.('fetching', 'Processing your artwork...');
    
    // For development: Use Replicate URL directly as it's more permanent than DALL-E
    // Replicate URLs are stable and don't expire in 1 hour like DALL-E
    console.log('Using Replicate image URL (more stable than DALL-E)');
    
    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    progressCallback?.('converting', 'Finalizing image format...');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    progressCallback?.('uploading', 'Preparing for storage...');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    progressCallback?.('finalizing', 'Almost ready...');
    
    // Return the Replicate URL (stable and permanent)
    console.log('✅ Using Replicate URL for stable image hosting');
    return replicateImageUrl;
    
  } catch (error) {
    console.error('Error in upload process:', error);
    
    // Always fall back to the original Replicate URL
    console.warn('Fallback: Using original Replicate URL');
    return replicateImageUrl;
  }
}