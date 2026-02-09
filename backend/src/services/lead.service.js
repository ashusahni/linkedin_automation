import pool from "../db.js";

// Ensure we never exceed database column limits
function safeTruncate(value, maxLength) {
  if (value === null || value === undefined) return null;
  const str = String(value);
  return str.length > maxLength ? str.slice(0, maxLength) : str;
}

export async function saveLead(lead) {
  const query = `
    INSERT INTO leads
    (linkedin_url, first_name, last_name, full_name, title, company, location, profile_image, source, connection_degree, review_status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (linkedin_url) DO UPDATE SET
      first_name = COALESCE(EXCLUDED.first_name, leads.first_name),
      last_name = COALESCE(EXCLUDED.last_name, leads.last_name),
      full_name = COALESCE(EXCLUDED.full_name, leads.full_name),
      title = COALESCE(EXCLUDED.title, leads.title),
      company = COALESCE(EXCLUDED.company, leads.company),
      location = COALESCE(EXCLUDED.location, leads.location),
      profile_image = COALESCE(EXCLUDED.profile_image, leads.profile_image),
      -- Always update connection_degree with new data from PhantomBuster (don't keep NULL)
      connection_degree = EXCLUDED.connection_degree,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted;
  `;

  const values = [
    safeTruncate(lead.linkedinUrl, 500),   // VARCHAR(500)
    safeTruncate(lead.firstName, 100),     // VARCHAR(100)
    safeTruncate(lead.lastName, 100),      // VARCHAR(100)
    safeTruncate(lead.fullName, 255),      // VARCHAR(255)
    safeTruncate(lead.title, 255),         // VARCHAR(255)
    safeTruncate(lead.company, 255),       // VARCHAR(255)
    safeTruncate(lead.location, 255),      // VARCHAR(255)
    safeTruncate(lead.profileImage, 500),  // VARCHAR(500)
    safeTruncate(lead.source, 100),        // VARCHAR(100) e.g. 'connections_export', 'search_export'
    safeTruncate(lead.connectionDegree || lead.connection_degree, 50), // VARCHAR(50) e.g. '1st', '2nd', '3rd'
    safeTruncate(lead.reviewStatus || 'to_be_reviewed', 50) // Default to to_be_reviewed for imported leads
  ];

  const result = await pool.query(query, values);
  // Return the lead if it was inserted (not a duplicate)
  return result.rows[0]?.inserted ? result.rows[0] : null;
}
