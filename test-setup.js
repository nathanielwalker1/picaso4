#!/usr/bin/env node

import { config } from 'dotenv';
import { readFile } from 'fs/promises';

config();

console.log('🔍 PICASO Development Setup Check\n');

// Check environment variables
console.log('📋 Environment Variables:');
const requiredEnvVars = [
  'VITE_OPENAI_API_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY', 
  'STRIPE_SECRET_KEY',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID'
];

let envOk = true;
for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${envVar}: Missing`);
    envOk = false;
  }
}

if (!envOk) {
  console.log('\n❌ Some environment variables are missing. Please check your .env file.');
  process.exit(1);
}

// Check package.json scripts
console.log('\n📋 Available Scripts:');
try {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  for (const [name, script] of Object.entries(pkg.scripts)) {
    console.log(`📝 npm run ${name}: ${script}`);
  }
} catch (error) {
  console.log('❌ Could not read package.json');
}

console.log('\n🚀 To start development:');
console.log('   npm run dev:full   (starts both API and frontend)');
console.log('   or');
console.log('   npm run dev:api    (terminal 1 - API server)');
console.log('   npm run dev        (terminal 2 - frontend)');

console.log('\n🌐 URLs when running:');
console.log('   Frontend: http://localhost:5173');
console.log('   API:      http://localhost:3001');

console.log('\n💳 Test Stripe cards:');
console.log('   Success: 4242 4242 4242 4242');
console.log('   Decline: 4000 0000 0000 0002');
console.log('   3D Auth: 4000 0025 0000 3155');

console.log('\n✅ Setup looks good! Run the servers and test the checkout flow.');