# 🚀 Quick Setup: BACKEND_PUBLIC_URL

## Why You Need This

The LinkedIn Message Sender phantom needs to fetch a CSV from your backend. For this to work, your backend must be publicly accessible via a URL.

---

## ⚡ Quick Setup (Choose One)

### Option 1: Local Development with ngrok (Recommended for Testing)

1. **Install ngrok:**
   - Download: https://ngrok.com/download
   - Or: `choco install ngrok` (Windows) / `brew install ngrok` (Mac)

2. **Start ngrok:**
   ```bash
   ngrok http 5000
   ```
   (Replace `5000` with your backend port if different)

3. **Copy the HTTPS URL:**
   You'll see:
   ```
   Forwarding   https://abc123.ngrok.io -> http://localhost:5000
   ```

4. **Add to `.env`:**
   ```env
   BACKEND_PUBLIC_URL=https://abc123.ngrok.io
   ```

5. **Restart your backend server**

6. **Keep ngrok running** while you test

---

### Option 2: Production (Deployed Server)

If your backend is already deployed (Heroku, AWS, etc.):

```env
BACKEND_PUBLIC_URL=https://your-actual-domain.com
```

**Example:**
```env
BACKEND_PUBLIC_URL=https://api.mycompany.com
```

---

## ✅ Verify It Works

1. **Check `.env` file:**
   ```bash
   # In backend directory
   cat .env | grep BACKEND_PUBLIC_URL
   ```

2. **Restart backend:**
   ```bash
   npm run dev
   ```

3. **Test sending a message** - you should see in logs:
   ```
   📌 Using LinkedIn Message Sender format (spreadsheetUrl required)
   🔍 DEBUG: Launch Args: {
     "spreadsheetUrl": "https://your-url.com/api/phantom/message-csv/msg_..."
   }
   ```

---

## 🐛 Troubleshooting

### "LinkedIn Message Sender requires spreadsheetUrl"

**Fix:** Add `BACKEND_PUBLIC_URL` to `backend/.env` and restart server

### ngrok URL changed

**Fix:** Update `BACKEND_PUBLIC_URL` in `.env` with new ngrok URL and restart

### Can't access CSV URL

**Test manually:**
```bash
# Replace with your actual URL and token
curl https://your-ngrok-url.ngrok.io/api/phantom/message-csv/test
```

Should return CSV or "CSV expired or not found" (not 404)

---

## 📝 Complete .env Example

```env
# PhantomBuster
PHANTOMBUSTER_API_KEY=your_key
PHANTOM_MESSAGE_SENDER_ID=6916181421927761

# Backend Public URL (REQUIRED for messages)
BACKEND_PUBLIC_URL=https://abc123.ngrok.io

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=linkedin_leads
```

---

**That's it!** Once `BACKEND_PUBLIC_URL` is set, message sending will work. 🎉
