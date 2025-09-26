import Replicate from 'replicate';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;

    // Debug: Check environment variable
    console.log('REPLICATE_API_TOKEN exists:', !!process.env.REPLICATE_API_TOKEN);
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('REPLICATE')));

    // Validate required fields
    if (!prompt) {
      return res.status(400).json({ 
        error: 'Missing required field: prompt is required' 
      });
    }

    // Check if API token is available
    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ 
        error: 'Server configuration error: REPLICATE_API_TOKEN not found' 
      });
    }

    // Initialize Replicate client
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Call Replicate API using the correct format from docs
    const input = {
      prompt: prompt
    };

    console.log('Running Flux Schnell with prompt:', prompt);
    const output = await replicate.run("black-forest-labs/flux-schnell", { input });
    
    console.log('Replicate output:', output);
    console.log('Output type:', typeof output);
    console.log('Is array:', Array.isArray(output));

    // According to docs: output[0].url() gets the file URL
    if (Array.isArray(output) && output.length > 0) {
      const firstItem = output[0];
      console.log('First item:', firstItem);
      console.log('First item type:', typeof firstItem);
      
      // Try to get URL using the .url() method
      let imageUrl;
      if (firstItem && typeof firstItem.url === 'function') {
        imageUrl = firstItem.url();
        console.log('Extracted URL:', imageUrl);
      } else if (typeof firstItem === 'string') {
        imageUrl = firstItem;
      } else {
        console.error('Unexpected output format:', firstItem);
        return res.status(500).json({ 
          error: 'Unexpected response format from image generation service' 
        });
      }
      
      return res.status(200).json({ 
        success: true,
        imageUrl: imageUrl
      });
    } else {
      console.error('No output generated');
      return res.status(500).json({ 
        error: 'No image was generated' 
      });
    }

  } catch (error) {
    console.error('Replicate API error:', error);
    
    // Handle specific error types
    if (error.message?.includes('content policy') || error.message?.includes('safety')) {
      return res.status(400).json({ 
        error: 'This prompt violates content policy. Please try a different prompt.' 
      });
    }
    
    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      return res.status(429).json({ 
        error: 'Service busy. Please try again in a moment.' 
      });
    }

    // Generic error response
    return res.status(500).json({ 
      error: 'Failed to generate image. Please try again.' 
    });
  }
}