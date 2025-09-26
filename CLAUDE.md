# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start Vite development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Project Architecture

PICASO is an AI-powered art print marketplace built as a lean Vite + vanilla JS web application. The architecture follows a serverless approach with manual fulfillment.

### Tech Stack
- **Frontend**: Vanilla HTML/CSS/JS with Vite build tool
- **Styling**: Google Fonts (Kosugi), CSS with design system
- **Image Generation**: Replicate Flux Pro API integration
- **Database**: Firebase Firestore for order storage
- **Storage**: Firebase Storage for generated images
- **Payments**: Stripe Checkout (hosted pages)
- **Rate Limiting**: Client-side localStorage (3 generations/24hrs)
- **Deployment**: Designed for Vercel hosting

### Core User Flow
1. **Landing Page** - User enters text prompt with optional filters
2. **Generation** - Replicate Flux Pro creates art, uploads to Firebase Storage
3. **Review Page** - User reviews generated image, can retry
4. **Stripe Checkout** - Payment collection with shipping address
5. **Order Storage** - Webhook saves order to Firestore for manual fulfillment

### Key Business Logic
- **Rate Limiting**: 3 generations per browser per 24 hours via localStorage
- **Image Pipeline**: Replicate Flux Pro stable URL → Firebase Storage permanent URL
- **Pricing**: Fixed $99 for 12x12 matte canvas prints
- **Manual Fulfillment**: Orders downloaded from Firebase Console → Printful

### File Structure
- `index.html` - Landing page with prompt input and filters
- `src/main.js` - Entry point and shared utilities  
- `src/style.css` - Global styles with Kosugi font and design system
- `docs/prd.md` - Complete product requirements document

### Design System
- **Colors**: Primary purple #8B5CF6, background #F9FAFB, text #111827
- **Typography**: Kosugi font, H1 48px, body 16px
- **Responsive**: Mobile-first with 768px breakpoint

### Environment Variables Required
- `VITE_REPLICATE_API_TOKEN` - Replicate API access
- `VITE_FIREBASE_*` - Firebase project configuration
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe payments
- Server-only: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### Implementation Notes
- Generated images from Replicate are stable URLs - more reliable than DALL-E temporary URLs
- Filters are converted to natural language and appended to base prompt template
- All API calls should include comprehensive error handling
- Mobile responsiveness critical for conversion rates