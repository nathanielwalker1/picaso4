import { storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Base prompt template for consistent high-quality results
const BASE_PROMPT = `Create a high-quality image suitable for printing on canvas, based on the user's prompt and filters.`

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
 * Wrapper function for Firebase upload with detailed progress tracking
 */
async function uploadImageToFirebaseWithProgress(dalleImageUrl, progressCallback) {
  console.log('Starting Firebase Storage upload process...');
  
  try {
    progressCallback?.('fetching', 'Fetching generated image...');
    
    // Step 1: Create a server-side proxy to fetch the image
    console.log('Fetching image from DALL-E URL...');
    
    // Use a proxy approach with an img element and canvas to bypass CORS
    const imageBlob = await new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set up canvas for conversion
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        try {
          progressCallback?.('converting', 'Converting to permanent format...');
          console.log('Image loaded successfully, converting to blob...');
          
          // Set canvas size to match image
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              console.log(`Image converted to blob: ${blob.size} bytes`);
              resolve(blob);
            } else {
              reject(new Error('Failed to convert image to blob'));
            }
          }, 'image/png', 0.95);
          
        } catch (canvasError) {
          console.error('Canvas conversion error:', canvasError);
          reject(canvasError);
        }
      };
      
      img.onerror = (error) => {
        console.error('Failed to load image:', error);
        reject(new Error('Failed to load image from DALL-E URL. This may be due to CORS restrictions.'));
      };
      
      img.onabort = () => {
        reject(new Error('Image loading was aborted'));
      };
      
      // Set a timeout to prevent hanging
      setTimeout(() => {
        reject(new Error('Image loading timeout (30 seconds)'));
      }, 30000);
      
      // Try loading the image
      try {
        img.src = dalleImageUrl;
      } catch (loadError) {
        console.error('Error setting image src:', loadError);
        reject(loadError);
      }
    });
    
    progressCallback?.('uploading', 'Uploading to secure storage...');
    
    // Step 2: Generate unique filename
    const timestamp = Date.now();
    const randomId = generateRandomId();
    const filename = `images/${timestamp}-${randomId}.png`;
    
    console.log(`Uploading to Firebase Storage: ${filename}`);
    
    // Step 3: Upload to Firebase Storage
    const storageRef = ref(storage, filename);
    
    // Add metadata
    const metadata = {
      contentType: 'image/png',
      customMetadata: {
        'generated': new Date().toISOString(),
        'source': 'dall-e-3',
        'size': imageBlob.size.toString()
      }
    };
    
    const snapshot = await uploadBytes(storageRef, imageBlob, metadata);
    console.log('Upload successful!', snapshot.metadata);
    
    // Step 4: Get permanent download URL
    const permanentUrl = await getDownloadURL(snapshot.ref);
    console.log('Permanent URL generated:', permanentUrl);
    
    progressCallback?.('finalizing', 'Finalizing your masterpiece...');
    
    return permanentUrl;
    
  } catch (error) {
    console.error('Firebase Storage upload failed:', error);
    
    // Handle different types of errors with fallback approaches
    if (error.message.includes('CORS') || error.message.includes('load')) {
      console.warn('CORS issue detected - trying fallback approach');
      
      try {
        progressCallback?.('fetching', 'Trying alternative method...');
        
        // Alternative approach: Use CORS proxy
        const corsProxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(dalleImageUrl)}`;
        console.log('Trying CORS proxy approach...');
        
        const response = await fetch(corsProxy);
        if (response.ok) {
          progressCallback?.('converting', 'Processing with proxy...');
          
          const blob = await response.blob();
          
          progressCallback?.('uploading', 'Uploading to secure storage...');
          
          // Upload the blob
          const timestamp = Date.now();
          const randomId = generateRandomId();
          const filename = `images/${timestamp}-${randomId}.png`;
          
          const storageRef = ref(storage, filename);
          const snapshot = await uploadBytes(storageRef, blob);
          const permanentUrl = await getDownloadURL(snapshot.ref);
          
          console.log('CORS proxy upload successful:', permanentUrl);
          return permanentUrl;
        }
      } catch (proxyError) {
        console.error('CORS proxy also failed:', proxyError);
      }
      
      // Ultimate fallback: Return DALL-E URL with expiry warning
      console.warn('All upload methods failed. Using temporary DALL-E URL (expires in 1 hour)');
      return dalleImageUrl;
      
    } else if (error.code === 'storage/quota-exceeded') {
      throw new Error('Storage quota exceeded. Please contact support.');
      
    } else if (error.code === 'storage/unauthorized') {
      throw new Error('Storage access denied. Please check Firebase configuration.');
      
    } else if (error.message.includes('timeout')) {
      throw new Error('Upload timeout. Please check your connection and try again.');
      
    } else if (error.message.includes('network') || error.name === 'TypeError') {
      throw new Error('Network error during upload. Please check your connection.');
      
    } else {
      // Re-throw other errors
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
}