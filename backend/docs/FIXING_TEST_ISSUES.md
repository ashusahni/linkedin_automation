# Fixing Test Issues - Quick Guide

## 🔴 **Two Issues Found:**

### Issue 1: Invalid OpenAI API Key ❌
**Error**: `401 Incorrect API key provided`

**Solution**:
1. Go to: https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key
4. Update `.env` file:
   ```env
   OPENAI_API_KEY=sk-proj-YOUR_NEW_KEY_HERE
   ```

**Note**: The current key in `.env` is expired or invalid.

---

### Issue 2: Missing Database Column ❌
**Error**: `column "approved_at" of relation "approval_queue" does not exist`

**Solution - Run this SQL in your PostgreSQL database:**

```sql
-- Add approved_at column
ALTER TABLE approval_queue 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Update existing approved records
UPDATE approval_queue 
SET approved_at = created_at 
WHERE status = 'approved' AND approved_at IS NULL;
```

**How to run:**
1. Open pgAdmin or psql
2. Connect to `linkedin_leads` database
3. Run the SQL above

**OR use this command:**
```bash
cd backend
node fix-approval-queue.js
```

---

## ✅ **After Fixing Both Issues:**

Run the test again:
```bash
cd backend
node test-end-to-end-campaign.js
```

---

## 📋 **Expected Result:**

```
✅ Created test lead
✅ Created campaign  
✅ Added lead to campaign
✅ Generated AI message (with real OpenAI)
✅ Message saved and auto-approved
✅ Auto Connect launched successfully
✅ END-TO-END TEST COMPLETED SUCCESSFULLY!
```

Then check:
1. **PhantomBuster Dashboard** - Container running/completed
2. **LinkedIn** - Connection request sent to Anjali Gusain
3. **Database** - Test data created

---

## 🔧 **Quick Fix Commands:**

### Fix Database:
```bash
cd z:\linkedin-automation-engine\linkedin-automation-engine\backend
node fix-approval-queue.js
```

### Update OpenAI Key:
Edit `.env` line 40:
```env
OPENAI_API_KEY=sk-proj-YOUR_NEW_KEY_HERE
```

### Run Test:
```bash
node test-end-to-end-campaign.js
```

---

## 💡 **Alternative: Test Without OpenAI**

If you don't want to fix the OpenAI key right now, the test will use a fallback message:
- The test will still work
- It will use a generic message instead of AI-generated
- Auto Connect will still be triggered
- Connection request will still be sent

The fallback message used:
```
"Hi Anjali, I'd love to connect and explore potential synergies between our work."
```

So you can:
1. **Just fix the database** (run `node fix-approval-queue.js`)
2. **Run the test** (it will use fallback message)
3. **Fix OpenAI later** for real AI-generated messages

---

## 🎯 **Priority:**

1. **MUST FIX**: Database column (approved_at)
   ```bash
   node fix-approval-queue.js
   ```

2. **OPTIONAL**: OpenAI API key (test works without it, just uses fallback)
   - Get new key from https://platform.openai.com/api-keys
   - Update `.env`

3. **RUN TEST**:
   ```bash
   node test-end-to-end-campaign.js
   ```
