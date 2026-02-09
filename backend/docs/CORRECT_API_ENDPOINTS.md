# ✅ Correct API Endpoints - LinkedIn Reach

## 🎯 **Working Endpoints**

### 1. Health Check ✅
```bash
curl http://localhost:3000/health
```
**Expected Response:**
```json
{"status":"ok","service":"linkedin-reach-backend"}
```

---

## 🚀 **PhantomBuster Integration Endpoints**

### 2. Export Connections (Complete Flow) 🔥
**Correct Endpoint:**
```bash
curl -X POST http://localhost:3000/api/phantom/export-connections-complete
```

**What it does:**
- ✅ Launches PhantomBuster phantom
- ✅ Waits for completion (~2-5 minutes)
- ✅ Downloads results
- ✅ Saves to PostgreSQL database
- ✅ Exports to CSV file

**Expected Response:**
```json
{
  "success": true,
  "message": "Connection export completed",
  "totalLeads": 150,
  "savedToDatabase": 150,
  "duplicates": 0,
  "csvFile": "linkedin_leads_2026-01-22T08-15-30.csv",
  "csvPath": "z:\\Linkedin_reach\\backend\\exports\\linkedin_leads_2026-01-22T08-15-30.csv"
}
```

⚠️ **Warning**: This will consume PhantomBuster credits!

---

### 3. Search Leads (Complete Flow) 🔍
**Correct Endpoint:**
```bash
curl -X POST http://localhost:3000/api/phantom/search-leads-complete ^
  -H "Content-Type: application/json" ^
  -d "{\"query\": \"CEO at Tech Company\", \"limit\": 50}"
```

**Request Body:**
```json
{
  "query": "CEO at Tech Company",
  "limit": 50
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Lead search completed",
  "query": "CEO at Tech Company",
  "totalLeads": 50,
  "savedToDatabase": 50,
  "duplicates": 0,
  "csvFile": "linkedin_leads_2026-01-22T08-20-15.csv",
  "csvPath": "z:\\Linkedin_reach\\backend\\exports\\linkedin_leads_2026-01-22T08-20-15.csv"
}
```

---

### 4. Enrich Profiles (Complete Flow) 💎
**Correct Endpoint:**
```bash
curl -X POST http://localhost:3000/api/phantom/enrich-profiles-complete ^
  -H "Content-Type: application/json" ^
  -d "{\"profileUrls\": [\"https://www.linkedin.com/in/example1/\", \"https://www.linkedin.com/in/example2/\"]}"
```

**Request Body:**
```json
{
  "profileUrls": [
    "https://www.linkedin.com/in/example1/",
    "https://www.linkedin.com/in/example2/"
  ]
}
```

---

## 🔧 **Network Endpoints (2-Step Process)**

### 5. Extract Connection Network
```bash
curl -X POST http://localhost:3000/api/network/extract-network ^
  -H "Content-Type: application/json" ^
  -d "{\"profileUrl\": \"https://www.linkedin.com/in/example/\", \"phantomId\": \"your_phantom_id\", \"sessionCookie\": \"your_cookie\"}"
```

### 6. Import Network Results
```bash
curl -X POST http://localhost:3000/api/network/import-network-results ^
  -H "Content-Type: application/json" ^
  -d "{\"resultUrl\": \"https://phantombuster.s3.amazonaws.com/.../result.json\"}"
```

---

## ❌ **Wrong Endpoints (Don't Use)**

These endpoints **DO NOT EXIST**:
- ❌ `/api/network/export-connections` 
- ❌ `/api/network/search-leads`
- ❌ `/api/network/enrich-profiles`

---

## 🧪 **Quick Test Commands**

### Test 1: Health Check (Safe)
```bash
curl http://localhost:3000/health
```

### Test 2: Export Connections (Uses PhantomBuster Credits!)
```bash
curl -X POST http://localhost:3000/api/phantom/export-connections-complete
```

### Test 3: Search Leads (Uses PhantomBuster Credits!)
```bash
curl -X POST http://localhost:3000/api/phantom/search-leads-complete ^
  -H "Content-Type: application/json" ^
  -d "{\"query\": \"Software Engineer at Google\", \"limit\": 10}"
```

---

## 📊 **What Happens When You Call These Endpoints**

1. **Server receives request**
2. **PhantomBuster phantom launches** (you'll see it in PhantomBuster dashboard)
3. **Server polls every 10 seconds** for completion status
4. **Phantom completes** (~2-5 minutes depending on data size)
5. **Server downloads results** from PhantomBuster S3
6. **Data is parsed** and cleaned
7. **Saved to PostgreSQL** database
8. **Exported to CSV** in `exports/` folder
9. **Response sent** back to you with summary

---

## 🐛 **Troubleshooting**

### Error: "Cannot POST /api/network/export-connections"
**Problem**: Wrong endpoint
**Solution**: Use `/api/phantom/export-connections-complete` instead

### Error: Database connection error
**Problem**: PostgreSQL not running
**Solution**: Start PostgreSQL service

### Error: PhantomBuster API error
**Problem**: Invalid API key or network issue
**Solution**: Check `.env` file and test with `node test-phantom-axios.js`

---

## 📝 **Summary of All Endpoints**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| POST | `/api/phantom/export-connections-complete` | Export all connections |
| POST | `/api/phantom/search-leads-complete` | Search for leads |
| POST | `/api/phantom/enrich-profiles-complete` | Enrich profile data |
| POST | `/api/network/extract-network` | Extract network (2-step) |
| POST | `/api/network/import-network-results` | Import results (2-step) |
| POST | `/api/phantom/connection-export` | Legacy: Start export |
| POST | `/api/phantom/import-results` | Legacy: Import results |
