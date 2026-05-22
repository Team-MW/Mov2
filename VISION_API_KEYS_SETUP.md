# Vision API Keys Setup Guide

To fix the vision API errors (gemini expired, groq model decommissioned), you need to add API keys to your `.env.local` file.

## Step 1: Open your .env.local file

The file is located at:
```
c:\Users\Mommy Jayce\Desktop\Microdidact\MarcheDeMoV2\.env.local
```

## Step 2: Add the following API keys

Copy and paste these sections into your `.env.local` file:

```bash
# --- Vision AI (Gemini, Groq, Mistral) pour analyse produits ---
# Utilisé par l'inventaire pour l'analyse d'images et reconnaissance de produits.
# Au moins un fournisseur doit être configuré pour que la vision fonctionne.

# Gemini (Google) - Vision + Text
# Clé API: https://aistudio.google.com/app/apikey
# Supporte pool de clés: GEMINI_API_KEY + GEMINI_API_KEY_1..20
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.5-flash

# Groq - Vision + Text (gratuit, haute vitesse)
# Clé API: https://console.groq.com/keys
# Supporte pool de clés: GROQ_API_KEY + GROQ_API_KEY_1..10
GROQ_API_KEY=your-groq-api-key-here
GROQ_MODEL=llama-3.2-90b-vision-preview
GROQ_TEXT_MODEL=llama-3.3-70b-versatile

# Mistral - Vision + Text (gratuit, 2 req/min limite)
# Clé API: https://console.mistral.ai/api-keys
# Supporte pool de clés: MISTRAL_API_KEY + MISTRAL_API_KEY_1..10
MISTRAL_API_KEY=your-mistral-api-key-here
MISTRAL_MODEL=pixtral-12b-latest
MISTRAL_TEXT_MODEL=mistral-small-latest

# Google Cloud Vision (OCR, labels, objects - fallback)
# Clé API: https://console.cloud.google.com/apis/credentials
GOOGLE_VISION_API_KEY=your-google-vision-api-key-here
```

## Step 3: Get your API keys

### Option A: Groq (Recommended - Free, Fast)
1. Go to https://console.groq.com/keys
2. Sign up or log in (free account, no credit card required)
3. Create a new API key
4. Copy the key and paste it after `GROQ_API_KEY=`

### Option B: Gemini (Google)
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API key"
4. Copy the key and paste it after `GEMINI_API_KEY=`

### Option C: Mistral (Free, but rate-limited)
1. Go to https://console.mistral.ai/api-keys
2. Sign up or log in
3. Create a new API key
4. Copy the key and paste it after `MISTRAL_API_KEY=`

### Option D: Google Cloud Vision (Fallback)
1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new project or select existing
3. Enable "Cloud Vision API"
4. Create credentials (API key)
5. Copy the key and paste it after `GOOGLE_VISION_API_KEY=`

## Step 4: Restart your dev server

After adding the keys, restart your development server:
- Stop the current server (Ctrl+C)
- Run `npm run dev` again

## Step 5: Verify it works

Try scanning a product in the inventory. The vision chain should now work without errors.

## Minimum Requirement

At minimum, you need **ONE** of these API keys configured:
- GROQ_API_KEY (recommended - free and fast)
- GEMINI_API_KEY (good alternative)
- MISTRAL_API_KEY (free but rate-limited to 2 req/min)

The system will automatically fall back between providers if one fails.
