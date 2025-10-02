CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Development Commands

vercel dev - PRIMARY LOCAL DEVELOPMENT - Runs Vite frontend AND serverless API functions
npm run dev - Legacy command (only runs frontend, doesn't run /api functions)
npm run build - Build for production
vercel --prod - Deploy to production

Project Architecture
PICASO is a curated AI art print service with distinctive aesthetic collections. Users select from 3 opinionated style presets, describe their scene, and receive gallery-quality prints. The architecture follows a serverless approach with manual fulfillment.
Tech Stack

Frontend: Vanilla HTML/CSS/JS with Vite build tool
Styling: Google Fonts (Kosugi for UI, serif font for art historical context - TBD), CSS with design system
Image Generation: Leonardo AI Lucid Origin via Replicate API
Database: Firebase Firestore for order storage
Storage: Firebase Storage for generated images
Payments: Stripe Checkout (hosted pages)
Rate Limiting: Client-side localStorage (3 generations/24hrs)
Deployment: Vercel (auto-deploy from Git recommended)

Core User Flow

Landing Page - Hero + 3 style collection cards with sample images
Design Page - User selects style (or changes selection), reads historical context, describes scene
Generation - Serverless function calls Leonardo AI, uploads to Firebase Storage
Review Page - User reviews generated image, can retry or proceed to checkout
Stripe Checkout - Payment collection with shipping address
Order Storage - Webhook saves order to Firestore for manual fulfillment

PICASO's Distinctive Approach
Curated Collections (Mandatory Style Selection):

Each style has a locked base prompt that enforces PICASO's aesthetic
Users select one of 3 collections, then describe their scene
Base prompt is prepended to user input to ensure consistent output quality
Medium conflicts (e.g., user types "watercolor" when "oil painting" style selected) are stripped from user input

Three Collections (subject to refinement):

Classical Romance - French Academic Salon oil paintings circa 1875, dramatic lighting, romantic atmosphere
Cyberpunk Noir - Dark futuristic cityscapes, neon lighting, cinematic composition (Example - subject to change)
Contemporary Landscape - Modern minimalist painting, bold colors, simplified forms (Example - subject to change)

Example Base Prompt Structure:
javascriptconst basePrompts = {
  'classical': 'Classical oil painting circa 1875, ${userPrompt}, French Academic Salon style, dramatic chiaroscuro lighting, romantic atmosphere, rich warm tones',
  // Other styles follow similar pattern
};
User input is sanitized to remove conflicting medium keywords before being inserted into base prompt.
Key Business Logic

Mandatory Style Selection: Users must choose a collection before generating
Rate Limiting: 3 generations per browser per 24 hours via localStorage
Image Pipeline: Leonardo AI via Replicate → Firebase Storage permanent URL
Pricing: Fixed $99 for 12x12 matte canvas prints
Manual Fulfillment: Orders downloaded from Firebase Console → Printful

File Structure

index.html - Landing page with hero, 3 collection cards, "How it works"
design.html - Design page with style selector, historical context, prompt input (NEW)
review.html - Review page for generated image
/api/generate-image.js - Serverless function for Leonardo AI API calls
src/main.js - Entry point and shared utilities
src/imageGen.js - Image generation orchestration (calls /api/generate-image)
src/style.css - Global styles

Design System

Colors: Primary purple #8B5CF6, background #F9FAFB, text #111827
Typography:

UI: Kosugi font, H1 48px, body 16px
Historical context: Serif font (TBD - consider Crimson Text, Lora)


Responsive: Mobile-first with 768px breakpoint
Premium feel: Art gallery aesthetic, not tech startup

Environment Variables Required

REPLICATE_API_TOKEN - Replicate API access (no VITE_ prefix for serverless functions)
VITE_REPLICATE_API_TOKEN - For any frontend references (if needed)
VITE_FIREBASE_* - Firebase project configuration
VITE_STRIPE_PUBLISHABLE_KEY - Stripe payments
Server-only: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

API Integration - Leonardo AI via Replicate
Model: lucataco/leonardo-ai-lucid-origin:fee9b4d8c45db1d066fff5ea0b8e1f977ae49c5dfea96086bfb34e3f84ebf16f
Why Leonardo over Flux: Leonardo Lucid Origin produces authentic impressionist oil painting textures with visible brushstrokes and proper artistic cohesion. Flux Schnell struggled with painterly styles, defaulting to digital illustration or photorealism.
Serverless Function Pattern:
javascript// /api/generate-image.js
import Replicate from "replicate";

export default async function handler(req, res) {
  const { prompt, style } = req.body;
  
  // Construct full prompt with base style
  const fullPrompt = constructPrompt(prompt, style);
  
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN, // No VITE_ prefix
  });

  const output = await replicate.run(
    "lucataco/leonardo-ai-lucid-origin:...",
    { input: { prompt: fullPrompt, width: 1024, height: 1024 } }
  );

  return res.json({ imageUrl: output[0] });
}
Design Page Layout
Structure:

Horizontal style selector (3 tiles) always visible at top
Selected style shows "Selected" indicator
Historical context section (2-3 paragraphs) appears below selected style
Prompt textarea with examples
Create button navigates to review page

Historical Context Pattern:

Paragraph 1: What the style is (era, characteristics)
Paragraph 2: Key artists and techniques
Purpose: Educates user, builds anticipation, justifies premium pricing

Implementation Notes

Use vercel dev for local development (runs both frontend and /api functions)
Frontend calls /api/generate-image (not Leonardo API directly)
Base prompts override user's medium keywords to ensure style consistency
All three style tiles remain clickable on design page (easy switching)
Historical context uses serif typography, divider lines above/below
Mobile responsiveness critical for conversion rates
"Recently created" section shows variety of artworks (not just room installations)

Deployment

Connect GitHub repo to Vercel for auto-deploy
Push to main branch triggers automatic deployment
Environment variables configured in Vercel dashboard
No manual vercel --prod needed once Git integration is set up