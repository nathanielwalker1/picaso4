# PICASO - AI Art Print Marketplace

Transform your imagination into quality art prints with AI-generated artwork.

## Development Setup

### Prerequisites

1. **Environment Variables**: Create a `.env` file with:
   ```env
   # Replicate API
   VITE_REPLICATE_API_TOKEN=r8_...your_replicate_api_token

   # Firebase Configuration
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123

   # Stripe Configuration (Test Mode)
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...your_stripe_test_publishable_key
   STRIPE_SECRET_KEY=sk_test_...your_stripe_test_secret_key
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

### Running the Application

Use Vercel's development server (recommended):
```bash
vercel dev
```

This will start:
- Frontend dev server: http://localhost:3000
- All `/api` serverless functions locally
- Hot-reload for both frontend and backend changes

**Alternative (frontend only):**
```bash
npm run dev
```
Note: This only runs the frontend and won't include serverless functions.

### Testing Stripe Integration

The app uses Stripe's test mode for development. Use these test card numbers:

- **Successful payment**: `4242 4242 4242 4242`
- **Declined payment**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

Use any future expiry date, any CVC, and any postal code.

## Project Structure

```
picaso4/
├── api/                    # Vercel serverless functions
│   └── create-checkout-session.js
├── src/                    # Frontend source code
│   ├── main.js            # Landing page logic
│   ├── review.js          # Review page logic
│   ├── success.js         # Success page logic
│   ├── imageGen.js        # Replicate Flux Pro & Firebase integration
│   ├── rateLimit.js       # Rate limiting logic
│   ├── stripe.js          # Stripe integration
│   ├── firebase.js        # Firebase configuration
│   └── style.css          # Global styles
├── dev-server.js          # Development API server
├── index.html             # Landing page
├── review.html            # Review page
├── success.html           # Order success page
└── about.html             # About page
```

## Deployment

The app is designed for Vercel deployment:

1. **Environment Variables**: Add all `.env` variables to Vercel
2. **API Routes**: Vercel automatically handles `/api/*` routes
3. **Static Files**: Frontend builds to standard Vite output

```bash
npm run build
```

## Features

- ✅ AI Image Generation (Replicate Flux Pro)
- ✅ Firebase Storage for permanent image hosting
- ✅ Rate limiting (3 generations per 24 hours)
- ✅ Retry functionality with prompt editing
- ✅ Stripe Checkout integration
- ✅ Order success page with confirmation
- ✅ Mobile-responsive design
- ✅ Comprehensive error handling