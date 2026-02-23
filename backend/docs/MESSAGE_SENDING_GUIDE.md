# 📧 LinkedIn Message Sending Guide

## Overview

This guide explains how LinkedIn messages are sent through PhantomBuster and how to configure the backend URL.

---

## 🔄 Complete Message Sending Flow

### Step 1: Message Generation
1. User approves a message in the approval queue
2. The system calls `sendMessage()` with:
   - LinkedIn profile URL
   - AI-generated message content

### Step 2: CSV Token Creation
1. A unique token is created: `msg_<timestamp>_<random>`
2. The token stores:
   - LinkedIn URL
   - Message content
   - Expiration time (10 minutes)

### Step 3: Spreadsheet URL Generation
1. Backend creates a public URL: `{BACKEND_PUBLIC_URL}/api/phantom/message-csv/{token}`
2. This URL returns a CSV when accessed:
   ```csv
   LinkedInUrl,Message
   "https://linkedin.com/in/profile","Hi John, I'd like to connect..."
   ```

### Step 4: PhantomBuster Launch
1. PhantomBuster receives:
   - `spreadsheetUrl`: URL to fetch CSV
   - `message`: Fallback/default message
   - `messageColumnName`: "message" (column name in CSV)
   - `profilesPerLaunch`: 1
2. PhantomBuster fetches the CSV from your backend
3. PhantomBuster sends the message using the LinkedIn URL and message from CSV

### Step 5: Completion
1. PhantomBuster container completes
2. Result is logged
3. Lead status is updated

---

## 🌐 Setting Up BACKEND_PUBLIC_URL

The `BACKEND_PUBLIC_URL` is required so PhantomBuster can fetch the CSV with LinkedIn URLs and messages.

### Option 1: Production (Deployed Server)

If your backend is deployed (e.g., Heroku, AWS, DigitalOcean):

```env
BACKEND_PUBLIC_URL=https://your-api-domain.com
```

**Example:**
```env
BACKEND_PUBLIC_URL=https://api.mycompany.com
```

### Option 2: Local Development (Using ngrok)

For local development, use **ngrok** to create a public tunnel:

#### Step 1: Install ngrok
- Download from: https://ngrok.com/download
- Or install via package manager:
  ```bash
  # Windows (via Chocolatey)
  choco install ngrok
  
  # macOS (via Homebrew)
  brew install ngrok
  
  # Or download from website
  ```

#### Step 2: Start ngrok
```bash
# Start ngrok tunnel on your backend port (default: 5000)
ngrok http 5000
```

#### Step 3: Copy the HTTPS URL
You'll see output like:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:5000
```

#### Step 4: Add to .env
```env
BACKEND_PUBLIC_URL=https://abc123.ngrok.io
```

**Important:** The ngrok URL changes each time you restart ngrok (unless you have a paid account). Update `.env` if the URL changes.

### Option 3: Local Development (Using localtunnel)

Alternative to ngrok:

```bash
# Install
npm install -g localtunnel

# Start tunnel
lt --port 5000

# Add to .env
BACKEND_PUBLIC_URL=https://your-random-subdomain.loca.lt
```

---

## 📝 Complete .env Configuration

Add these to your `backend/.env` file:

```env
# PhantomBuster Configuration
PHANTOMBUSTER_API_KEY=your_phantombuster_api_key
PHANTOM_MESSAGE_SENDER_ID=6916181421927761

# Backend Public URL (REQUIRED for message sending)
# For production: https://your-api-domain.com
# For local dev: https://your-ngrok-url.ngrok.io
BACKEND_PUBLIC_URL=https://your-public-url.com

# LinkedIn Session (optional - phantom uses dashboard connection)
LINKEDIN_SESSION_COOKIE=your_linkedin_cookie
```

---

## 🔍 How It Works: Technical Details

### 1. Message CSV Endpoint

**Route:** `GET /api/phantom/message-csv/:token`

**What it does:**
- Receives a token (e.g., `msg_1770075236067_abc123`)
- Looks up the token in memory store
- Returns CSV with LinkedIn URL and message
- Token expires after 10 minutes

**CSV Format:**
```csv
LinkedInUrl,Message
"https://linkedin.com/in/profile","Your personalized message here"
```

### 2. Token Store

The token store is in-memory (not persistent):
- Created when `sendMessage()` is called
- Stored for 10 minutes
- Automatically deleted after PhantomBuster fetches it
- One-time use (deleted after first fetch)

### 3. PhantomBuster Arguments

When launching the phantom, we send:

```javascript
{
  spreadsheetUrl: "https://your-backend.com/api/phantom/message-csv/msg_123",
  message: "Fallback message if CSV fails",
  messageColumnName: "message",
  profilesPerLaunch: 1
}
```

**Why `spreadsheetUrl`?**
- The LinkedIn Message Sender phantom expects a CSV URL
- It fetches the CSV and reads LinkedIn URLs and messages from it
- This allows us to pass dynamic, AI-generated messages

---

## ✅ Verification Steps

### 1. Check BACKEND_PUBLIC_URL is Set
```bash
# In backend directory
grep BACKEND_PUBLIC_URL .env
```

Should show:
```
BACKEND_PUBLIC_URL=https://your-url.com
```

### 2. Test CSV Endpoint (Manual)
```bash
# Create a test token (you'll need to check the code or create one manually)
curl https://your-backend.com/api/phantom/message-csv/test_token
```

### 3. Check Server Logs
When sending a message, you should see:
```
📌 Using LinkedIn Message Sender format (spreadsheetUrl required)
🔍 DEBUG: Launch Args: {
  "spreadsheetUrl": "https://your-backend.com/api/phantom/message-csv/msg_...",
  "message": "...",
  "messageColumnName": "message",
  "profilesPerLaunch": 1
}
```

### 4. Check PhantomBuster Dashboard
1. Go to PhantomBuster dashboard
2. Find the container that was launched
3. Check the logs - it should show:
   - Fetching CSV from your backend URL
   - Reading LinkedIn URL and message from CSV
   - Sending message successfully

---

## 🐛 Troubleshooting

### Error: "LinkedIn Message Sender requires spreadsheetUrl"

**Cause:** `BACKEND_PUBLIC_URL` is not set in `.env`

**Fix:**
1. Add `BACKEND_PUBLIC_URL` to `backend/.env`
2. For local dev, use ngrok: `BACKEND_PUBLIC_URL=https://abc123.ngrok.io`
3. Restart your backend server

### Error: "CSV expired or not found"

**Cause:** Token expired (10 minutes) or PhantomBuster couldn't reach your backend

**Fix:**
1. Ensure `BACKEND_PUBLIC_URL` is publicly accessible
2. Check firewall/network settings
3. Verify ngrok is running (if using ngrok)
4. Check backend server is running

### Error: "argument-invalid"

**Cause:** PhantomBuster rejected the arguments

**Fix:**
1. Ensure you're using the correct phantom ID
2. Check that `spreadsheetUrl` is accessible
3. Verify CSV format is correct (LinkedInUrl,Message columns)
4. Check PhantomBuster dashboard for detailed error

### PhantomBuster Can't Reach Your Backend

**Symptoms:**
- Container fails immediately
- Error about CSV not found
- Network timeout

**Fix:**
1. **If using ngrok:** Ensure ngrok is running and URL is correct
2. **If using localtunnel:** Restart tunnel if it disconnected
3. **If deployed:** Check server is running and URL is correct
4. **Test manually:** Open the CSV URL in browser - should show CSV

---

## 📊 Example Flow Diagram

```
User Approves Message
        ↓
sendMessage() called
        ↓
Token created: msg_123
        ↓
Spreadsheet URL: https://backend.com/api/phantom/message-csv/msg_123
        ↓
PhantomBuster launched with spreadsheetUrl
        ↓
PhantomBuster fetches CSV from your backend
        ↓
CSV contains: LinkedInUrl,Message
        ↓
PhantomBuster sends message to LinkedIn
        ↓
Container completes successfully
        ↓
Lead status updated
```

---

## 🚀 Quick Start Checklist

- [ ] Install ngrok (for local dev) or deploy backend (for production)
- [ ] Add `BACKEND_PUBLIC_URL` to `backend/.env`
- [ ] Restart backend server
- [ ] Test by approving a message
- [ ] Check server logs for spreadsheetUrl generation
- [ ] Verify PhantomBuster container completes successfully

---

## 💡 Tips

1. **Keep ngrok running:** If using ngrok, keep the terminal open while developing
2. **Update URL if changed:** If ngrok URL changes, update `.env` and restart backend
3. **Check token expiration:** Tokens expire in 10 minutes - ensure PhantomBuster fetches quickly
4. **Monitor logs:** Watch backend logs to see if CSV is being fetched
5. **Test CSV endpoint:** Manually test the CSV URL in browser to verify it works

---

**Need Help?** Check the server logs for detailed debug information including the exact arguments being sent to PhantomBuster.
