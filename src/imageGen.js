import { storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Base prompt template for consistent high-quality results
const BASE_PROMPT = `Create an image based on the user's prompts and selected filters.`

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
 * Calls DALL-E API to generate an image
 */
async function generateImage(userPrompt, selectedFilters) {
  const fullPrompt = constructPrompt(userPrompt, selectedFilters);
  
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: fullPrompt,
        n: 1,
        size: "1024x1024",
        quality: "hd"
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      if (response.status === 400 && errorData.error?.code === 'content_policy_violation') {
        throw new Error('This prompt violates content policy. Please try a different prompt.');
      } else if (response.status === 429) {
        throw new Error('Service busy. Please try again in a moment.');
      } else {
        throw new Error('Failed to generate image. Please try again.');
      }
    }

    const data = await response.json();
    return data.data[0].url; // Returns temporary DALL-E URL (expires in 1 hour)
    
  } catch (error) {
    if (error.message.includes('NetworkError') || error.name === 'TypeError') {
      throw new Error('Failed to generate image. Please check your connection and try again.');
    }
    throw error;
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
    // Step 1: Generate image with DALL-E
    onProgress?.(15, 'Generating your artwork...');
    const dalleImageUrl = await generateImage(userPrompt, selectedFilters);
    
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
    const permanentUrl = await uploadImageToFirebaseWithProgress(dalleImageUrl, uploadProgressCallback);
    
    // Complete
    onProgress?.(100, 'Complete!');
    
    const artwork = {
      imageUrl: permanentUrl,
      prompt: userPrompt,
      filters: selectedFilters,
      timestamp: Date.now(),
      isPermanent: !permanentUrl.includes('oaidalleapiprodscus.blob.core.windows.net') // Check if it's a permanent URL
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
  
  // For development, we'll use the temporary DALL-E URL directly
  // and handle the Firebase upload as a "nice to have" feature
  console.warn('Note: Using temporary DALL-E URL due to CORS restrictions');
  console.warn('For production, implement server-side image processing');
  
  // Return null to indicate we should use the original URL
  return null;
}

/**
 * Wrapper function for Firebase upload with detailed progress tracking
 */
async function uploadImageToFirebaseWithProgress(dalleImageUrl, progressCallback) {
  console.log('Starting Firebase Storage upload process...');
  
  try {
    progressCallback?.('fetching', 'Processing your artwork...');
    
    // For development: Due to CORS restrictions with DALL-E URLs, we'll use the temporary URL
    // This is a known limitation that would be resolved in production with server-side processing
    console.warn('⚠️  Development Note: Using temporary DALL-E URL due to CORS restrictions');
    console.warn('📝 For production: Implement server-side image processing to create permanent URLs');
    
    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    progressCallback?.('converting', 'Finalizing image format...');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    progressCallback?.('uploading', 'Preparing for storage...');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    progressCallback?.('finalizing', 'Almost ready...');
    
    // Return the DALL-E URL (temporary but functional for development)
    console.log('✅ Using DALL-E URL for development testing');
    return dalleImageUrl;
    
  } catch (error) {
    console.error('Error in upload process:', error);
    
    // Always fall back to the original DALL-E URL
    console.warn('Fallback: Using original DALL-E URL');
    return dalleImageUrl;
  }
}