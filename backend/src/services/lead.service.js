import pool from "../db.js";
import profileEnrichmentService from "./profileEnrichment.service.js";

// Ensure we never exceed database column limits
function safeTruncate(value, maxLength) {
  if (value === null || value === undefined) return null;
  const str = String(value);
  return str.length > maxLength ? str.slice(0, maxLength) : str;
}

/**
 * Check if a lead matches the user's profile niche
 * Auto-qualifies leads that match:
 * - Preferred company keywords (from PREFERRED_COMPANY_KEYWORDS env var)
 * - User's industry (from their LinkedIn profile in database)
 * - User's company/title keywords
 */
export async function matchesUserNiche(lead) {
  try {
    const userProfileUrl = process.env.LINKEDIN_PROFILE_URL;
    const preferredKeywords = (process.env.PREFERRED_COMPANY_KEYWORDS || '')
      .toLowerCase()
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    // If no profile URL and no keywords configured, don't auto-qualify
    if (!userProfileUrl && preferredKeywords.length === 0) {
      return false;
    }

    const leadText = `${lead.company || ''} ${lead.title || ''}`.toLowerCase();
    
    // Check preferred company keywords
    if (preferredKeywords.length > 0) {
      const matchesKeyword = preferredKeywords.some(keyword => 
        leadText.includes(keyword.toLowerCase())
      );
      if (matchesKeyword) {
        console.log(`✅ Auto-qualifying lead: "${lead.company}" matches preferred keyword`);
        return true;
      }
    }

    // Check user's profile data if available
    if (userProfileUrl) {
      const userProfile = await profileEnrichmentService.enrichProfileFromUrl(userProfileUrl);
      
      if (userProfile) {
        // Check industry match
        if (userProfile.industry) {
          // Extract industry from lead's company/title
          const leadIndustry = profileEnrichmentService.extractIndustryFromCompany(
            lead.company || '', 
            lead.title || ''
          );
          
          if (leadIndustry && leadIndustry === userProfile.industry) {
            console.log(`✅ Auto-qualifying lead: Industry match (${leadIndustry})`);
            return true;
          }
        }

        // Check company/title keyword match from user's profile
        const userText = `${userProfile.company || ''} ${userProfile.title || ''}`.toLowerCase();
        if (userText) {
          // Extract meaningful keywords from user's company/title (2+ chars, not common words)
          const commonWords = ['the', 'and', 'of', 'in', 'at', 'for', 'to', 'a', 'an'];
          const userKeywords = userText
            .split(/\s+/)
            .filter(word => word.length >= 3 && !commonWords.includes(word))
            .slice(0, 5); // Top 5 keywords
          
          const matchesUserKeywords = userKeywords.some(keyword => 
            leadText.includes(keyword)
          );
          
          if (matchesUserKeywords && userKeywords.length > 0) {
            console.log(`✅ Auto-qualifying lead: Matches user profile keywords`);
            return true;
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking user niche match:', error);
    // On error, don't auto-qualify (fail safe)
    return false;
  }
}

export async function saveLead(lead) {
  // Check if lead matches user's niche BEFORE determining review_status
  const matchesNiche = await matchesUserNiche(lead);
  const shouldAutoApprove = matchesNiche || 
                            (lead.connectionDegree && lead.connectionDegree.toLowerCase().includes('1st')) ||
                            lead.reviewStatus === 'approved';

  // Determine initial review_status
  let initialReviewStatus = lead.reviewStatus || 'to_be_reviewed';
  if (shouldAutoApprove) {
    initialReviewStatus = 'approved';
  }

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
      -- Auto-promote to approved if:
      -- 1. New connection_degree is '1st' (case insensitive)
      -- 2. Lead matches user's niche (preferred keywords, industry, profile keywords)
      -- 3. New review_status is 'approved' (from auto-approval logic)
      -- Never downgrade from 'approved' back to 'to_be_reviewed'
      review_status = CASE
        WHEN LOWER(EXCLUDED.connection_degree) LIKE '%1st%' THEN 'approved'
        WHEN EXCLUDED.review_status = 'approved' THEN 'approved'
        WHEN leads.review_status = 'approved' THEN 'approved'
        ELSE COALESCE(EXCLUDED.review_status, leads.review_status)
      END,
      -- Set approved_at timestamp when promoting to approved
      approved_at = CASE
        WHEN (LOWER(EXCLUDED.connection_degree) LIKE '%1st%' OR EXCLUDED.review_status = 'approved') 
             AND leads.approved_at IS NULL 
        THEN NOW()
        ELSE leads.approved_at
      END,
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
    safeTruncate(initialReviewStatus, 50) // Use determined review_status (auto-approved if matches niche)
  ];

  const result = await pool.query(query, values);
  const wasInserted = result.rows[0]?.inserted;
  
  // If lead matches niche and was updated (not inserted), check if we need to auto-approve
  if (matchesNiche && !wasInserted) {
    // Check current status - if it's 'to_be_reviewed', auto-approve it
    const currentLead = await pool.query(
      'SELECT review_status FROM leads WHERE linkedin_url = $1',
      [safeTruncate(lead.linkedinUrl, 500)]
    );
    
    if (currentLead.rows[0]?.review_status === 'to_be_reviewed') {
      await pool.query(
        `UPDATE leads 
         SET review_status = 'approved', 
             approved_at = CASE WHEN approved_at IS NULL THEN NOW() ELSE approved_at END
         WHERE linkedin_url = $1 AND review_status = 'to_be_reviewed'`,
        [safeTruncate(lead.linkedinUrl, 500)]
      );
      console.log(`🎯 Auto-qualified existing lead matching your niche: ${lead.company || 'Unknown'} - ${lead.title || 'Unknown'}`);
    }
  }
  
  // Log auto-qualification if it happened for new leads
  if (matchesNiche && wasInserted) {
    console.log(`🎯 Auto-qualified new lead matching your niche: ${lead.company || 'Unknown'} - ${lead.title || 'Unknown'}`);
  }
  
  // Return the lead if it was inserted (not a duplicate)
  return wasInserted ? result.rows[0] : null;
}
