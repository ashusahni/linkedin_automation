# Auto Connect Phantom - Argument Format Issue

## 🔴 Problem

PhantomBuster is showing "Not a valid URL" error when we send LinkedIn profile URLs.

## 🔍 Root Cause

The "LinkedIn Auto Connect" phantom expects one of these formats for the `spreadsheetUrl` argument:

### Option 1: Google Sheets URL (PREFERRED)
```
https://docs.google.com/spreadsheets/d/XXXXX/edit
```

### Option 2: Plain Text URLs (ONE PER LINE)
```
https://www.linkedin.com/in/profile1/
https://www.linkedin.com/in/profile2/
```

### Option 3: CSV Format (if phantom supports it)
```
LinkedInUrl,Message
https://www.linkedin.com/in/profile1/,Hi there!
https://www.linkedin.com/in/profile2/,Hello!
```

## 🔧 Current Implementation

We're sending:
```javascript
{
  spreadsheetUrl: "https://www.linkedin.com/in/chavi-shrivastava/",
  message: "Hi Chavi, I noticed your impressive background...",
  numberOfAddsPerLaunch: 1
}
```

## ✅ Solution

The phantom needs the argument name to match what it expects. Let me check the phantom configuration in PhantomBuster dashboard.

## 📋 Steps to Fix

1. **Check Phantom Configuration**
   - Go to PhantomBuster dashboard
   - Open the "LinkedIn Auto Connect" phantom
   - Click "Settings" or "Arguments"
   - Check what argument names it expects

2. **Common Argument Names**
   - `spreadsheetUrl` - URL or text with LinkedIn profiles
   - `profileUrls` - Alternative name
   - `linkedinUrls` - Alternative name
   - `message` - Connection request message
   - `numberOfAddsPerLaunch` - How many to process

3. **Update Code**
   Based on what the phantom expects, update the `autoConnect` function.

## 🎯 Quick Test

Try sending just the URL without the message first:

```javascript
{
  spreadsheetUrl: "https://www.linkedin.com/in/chavi-shrivastava/"
}
```

If that works, then add the message:

```javascript
{
  spreadsheetUrl: "https://www.linkedin.com/in/chavi-shrivastava/",
  message: "Hi Chavi..."
}
```

## 💡 Alternative: Use Google Sheets

If the phantom only accepts Google Sheets URLs:
1. Create a Google Sheet with LinkedIn URLs
2. Share it publicly or with PhantomBuster
3. Pass the sheet URL to the phantom

---

**Next Step**: Check the phantom configuration in PhantomBuster dashboard to see what arguments it expects.
