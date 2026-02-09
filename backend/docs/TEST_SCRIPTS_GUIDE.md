# Test Scripts - Quick Reference

## 🧪 Available Test Scripts

### 1. **End-to-End Campaign Test** (RECOMMENDED)
**File**: `test-end-to-end-campaign.js`

**What it tests**:
- ✅ Lead creation
- ✅ Campaign creation
- ✅ AI message generation (OpenAI)
- ✅ Auto-approval workflow
- ✅ Auto Connect phantom with personalized message

**How to run**:
```bash
cd backend
node test-end-to-end-campaign.js
```

**What to expect**:
1. Creates test lead (Anjali Gusain)
2. Creates test campaign
3. Generates AI message using OpenAI
4. Auto-approves the message
5. Launches Auto Connect phantom
6. Sends connection request with personalized message

**Cleanup**:
```bash
node test-end-to-end-campaign.js --cleanup
```

---

### 2. **Auto Connect Test** (Simple)
**File**: `test-auto-connect.js`

**What it tests**:
- ✅ Connection request WITHOUT message
- ✅ Connection request WITH custom message

**How to run**:
```bash
cd backend
node test-auto-connect.js
```

**What to expect**:
- Test 1: Sends connection request without note
- Test 2: Sends connection request with custom message
- Both tests use Anjali Gusain's profile

---

### 3. **Message Sender Test** (Simple)
**File**: `test-message-sender.js`

**What it tests**:
- ✅ Sending LinkedIn message to connected profile

**How to run**:
```bash
cd backend
node test-message-sender.js
```

**⚠️ IMPORTANT**: You must be CONNECTED with Anjali Gusain on LinkedIn first!

**What to expect**:
- Sends a test message via PhantomBuster
- Message appears in LinkedIn chat

---

## 📋 Test Configuration

### Test Profile
- **Name**: Anjali Gusain
- **LinkedIn**: https://www.linkedin.com/in/anjali-gusain-489698184/
- **Used in**: All test scripts

### Phantom IDs (from .env)
- **Auto Connect**: `815699719041593`
- **Message Sender**: `6916181421927761`
- **Search Export**: `1817311377100254`

---

## 🎯 Recommended Testing Order

### First Time Setup:
1. **Run End-to-End Test**
   ```bash
   node test-end-to-end-campaign.js
   ```
   - This tests the complete workflow
   - Verifies all integrations work together

2. **Check Results**
   - PhantomBuster dashboard → verify container completed
   - LinkedIn → check for connection request
   - Database → verify lead and campaign created

3. **Cleanup**
   ```bash
   node test-end-to-end-campaign.js --cleanup
   ```

### Individual Feature Testing:
1. **Test Auto Connect Only**
   ```bash
   node test-auto-connect.js
   ```

2. **Test Message Sender Only** (if connected)
   ```bash
   node test-message-sender.js
   ```

---

## ✅ Success Criteria

### End-to-End Test Success:
- ✅ Lead created in database
- ✅ Campaign created in database
- ✅ AI message generated (visible in console)
- ✅ Message saved to approval_queue
- ✅ Auto Connect phantom launched
- ✅ Container ID returned
- ✅ No errors in console

### PhantomBuster Success:
- ✅ Container status: "finished"
- ✅ Exit code: 0
- ✅ No errors in container logs

### LinkedIn Success:
- ✅ Connection request sent to Anjali Gusain
- ✅ Personalized message included
- ✅ Request appears in LinkedIn "Sent" tab

---

## ❌ Common Issues

### Issue: "AUTO_CONNECT_PHANTOM_ID not set"
**Solution**: Check `.env` file has:
```env
AUTO_CONNECT_PHANTOM_ID=815699719041593
```

### Issue: "OpenAI API error"
**Solution**: Check `.env` file has valid:
```env
OPENAI_API_KEY=sk-proj-...
```

### Issue: "argument-invalid"
**Solution**: 
- Check phantom configuration in PhantomBuster dashboard
- Verify LinkedIn session cookie is valid
- Check phantom accepts the arguments being sent

### Issue: "Database connection failed"
**Solution**:
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists

---

## 📊 Monitoring

### During Test:
Watch the console output for:
- ✅ Green checkmarks = success
- ❌ Red X = failure
- ⚠️  Yellow warning = non-critical issue

### After Test:
1. **PhantomBuster Dashboard**
   - Go to: https://phantombuster.com/
   - Check "Containers" tab
   - Find the container ID from test output
   - Verify status and logs

2. **Database**
   ```sql
   -- Check test lead
   SELECT * FROM leads WHERE linkedin_url LIKE '%anjali-gusain%';
   
   -- Check test campaign
   SELECT * FROM campaigns WHERE name LIKE '%Test Campaign%';
   
   -- Check approval queue
   SELECT * FROM approval_queue WHERE status = 'approved';
   ```

3. **LinkedIn**
   - Go to: https://www.linkedin.com/mynetwork/invitation-manager/sent/
   - Look for connection request to Anjali Gusain
   - Verify personalized message is included

---

## 🔄 Re-running Tests

### Clean State:
```bash
# Remove test data
node test-end-to-end-campaign.js --cleanup

# Run test again
node test-end-to-end-campaign.js
```

### Quick Re-test:
The end-to-end test will reuse existing lead if found, so you can run it multiple times without cleanup.

---

## 📝 Notes

- All tests use the same profile (Anjali Gusain)
- Tests create real data in database
- Tests trigger real PhantomBuster containers
- Tests may send real LinkedIn connection requests
- Use cleanup flag to remove test data

---

## 🆘 Need Help?

If tests fail:
1. Check console output for specific error
2. Check PhantomBuster dashboard for container logs
3. Verify all environment variables in `.env`
4. Check database connection
5. Verify LinkedIn session cookie is valid

For detailed analysis, see:
- `docs/PHANTOM_WORKFLOW_ANALYSIS.md`
- `docs/PHANTOM_WORKFLOW_SUMMARY.md`
