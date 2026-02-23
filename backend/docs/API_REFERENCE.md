# 📡 Backend API Reference

Base URL: `http://localhost:3000`

## 📊 Dashboard & Stats

### Get Dashboard Statistics
Returns counts of leads by status and total count.

- **Endpoint:** `GET /api/leads/stats`
- **Response:**
  ```json
  {
    "totalLeads": 1008,
    "statusCount": {
      "new": 1000,
      "contacted": 5,
      "replied": 3
    }
  }
  ```

---

## 👥 Lead Management

### 1. Get All Leads (Paginated)
Fetches a list of leads with pagination support.

- **Endpoint:** `GET /api/leads`
- **Query Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 50)
- **Response:**
  ```json
  {
    "leads": [
      {
        "id": 1,
        "full_name": "Rishab Khandelwal",
        "company": "SCOTTISH CHEMICAL INDUSTRIES",
        "title": "Director",
        "status": "new",
        "created_at": "2026-01-22T..."
      }
    ],
    "pagination": {
      "total": 1008,
      "page": 1,
      "limit": 50
    }
  }
  ```

### 2. Search Leads
Search leads by name, company, or title.

- **Endpoint:** `GET /api/leads/search`
- **Query Parameters:**
  - `query`: The search term (e.g., "Google", "Engineer")
- **Response:** Array of matching lead objects.

### 3. Get Single Lead
Fetch detailed information for a specific lead.

- **Endpoint:** `GET /api/leads/:id`
- **Example:** `GET /api/leads/123`

### 4. Update Lead
Update a lead's status or details.

- **Endpoint:** `PUT /api/leads/:id`
- **Body:**
  ```json
  {
    "status": "contacted",
    "notes": "Sent connection request"
  }
  ```
- **Response:** The updated lead object.

### 5. Delete Lead
Remove a lead from the database.

- **Endpoint:** `DELETE /api/leads/:id`
- **Response:**
  ```json
  { "success": true, "message": "Lead deleted" }
  ```

---

## 🔄 Data Import

### Import Leads from PhantomBuster
Trigger an import of leads from a PhantomBuster result URL (CSV/JSON).

- **Endpoint:** `POST /api/leads/import`
- **Body:**
  ```json
  {
    "resultUrl": "https://phantombuster.s3.amazonaws.com/...",
    "source": "search-phantom"
  }
  ```
