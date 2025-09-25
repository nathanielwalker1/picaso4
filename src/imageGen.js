import { storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Base prompt template for consistent high-quality results
const BASE_PROMPT = `A highly detailed, gallery-quality artwork, composed with professional artistry. Emphasis on striking composition, balanced color harmony, and refined detail. The piece should feel premium, visually captivating, and suitable as a framed canvas print. Inspired by fine art photography and masterful painting techniques.`;

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
 * Uploads image from DALL-E URL to Firebase Storage
 */
async function uploadImageToFirebase(dalleImageUrl) {
  console.log('Attempting to upload image to Firebase Storage...');
  console.warn('Note: Due to CORS restrictions, using DALL-E URL directly.');
  console.warn('Image URL will expire in 1 hour. For production, implement server-side image handling.');
  
  // For now, return the DALL-E URL directly
  // This is a temporary solution - the URL will expire in 1 hour
  // For production, you'll need server-side image proxying
  return dalleImageUrl;
}

/**
 * Main function to generate and upload image
 */
export async function createArtwork(userPrompt, selectedFilters, onProgress) {
  try {
    // Update progress
    onProgress?.(20, 'Generating your artwork...');
    
    // Generate image with DALL-E
    const dalleImageUrl = await generateImage(userPrompt, selectedFilters);
    
    // Update progress
    onProgress?.(60, 'Saving your masterpiece...');
    
    // Upload to Firebase Storage
    const permanentUrl = await uploadImageToFirebase(dalleImageUrl);
    
    // Update progress
    onProgress?.(100, 'Complete!');
    
    return {
      imageUrl: permanentUrl,
      prompt: userPrompt,
      filters: selectedFilters,
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('Error creating artwork:', error);
    throw error;
  }
}