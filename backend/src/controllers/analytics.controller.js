import pool from "../db.js";
import { INDUSTRY_KEYWORDS as industryKeywords } from '../config/industries.js';

// Simple in-memory cache for LinkedIn industry metadata
let INDUSTRY_METADATA_CACHE = null;

/**
 * Load LinkedIn industry metadata from database
 * Replaces the old CSV-based approach
 */
async function loadIndustryMetadata() {
  if (INDUSTRY_METADATA_CACHE) return INDUSTRY_METADATA_CACHE;

  try {
    // Query all industries from database
    const result = await pool.query(`
      SELECT code, name, hierarchy, description, top_level_industry, sub_category
      FROM linkedin_industries
      ORDER BY code
    `);

    const topLevel = {};
    const subcategoriesByTop = {};

    for (const row of result.rows) {
      const topName = row.top_level_industry;
      if (!topName) continue;

      // Build top-level industry map
      if (!topLevel[topName]) {
        topLevel[topName] = {
          code: row.code,
          name: topName,
          description: row.description,
        };
      }

      // Build sub-categories map
      if (row.sub_category) {
        const subName = row.sub_category;
        if (!subcategoriesByTop[topName]) {
          subcategoriesByTop[topName] = {};
        }
        if (!subcategoriesByTop[topName][subName]) {
          subcategoriesByTop[topName][subName] = {
            code: row.code,
            name: subName,
            description: row.description,
          };
        }
      }
    }

    INDUSTRY_METADATA_CACHE = { topLevel, subcategoriesByTop };
  } catch (err) {
    console.error(
      "[analytics.controller] Failed to load LinkedIn industry metadata from database:",
      err.message
    );
    INDUSTRY_METADATA_CACHE = {
      topLevel: {},
      subcategoriesByTop: {},
    };
  }

  return INDUSTRY_METADATA_CACHE;
}

// Map period to SQL interval
function intervalForPeriod(period) {
  const map = { daily: "1 day", weekly: "7 days", monthly: "30 days", yearly: "365 days" };
  return map[period] || "365 days";
}

// GET /api/analytics/dashboard
// Returns all dashboard analytics: lead scraping + campaign metrics, with optional period filter
export async function getDashboardAnalytics(req, res) {
  try {
    const { period = "monthly" } = req.query;
    const interval = intervalForPeriod(period);

    // Load LinkedIn industry hierarchy (top-level + sub-categories)
    const { topLevel: industryMetaTop, subcategoriesByTop } =
      await loadIndustryMetadata();

    // —— Lead Scraping & Extraction ——
    const totalLeads = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE created_at >= NOW() - $1::interval",
      [interval]
    );
    const sourceBreakdown = await pool.query(
      "SELECT source, COUNT(*) AS count FROM leads WHERE created_at >= NOW() - $1::interval GROUP BY source",
      [interval]
    );
    const sourceCount = sourceBreakdown.rows.reduce((acc, row) => {
      acc[row.source || "unknown"] = parseInt(row.count, 10);
      return acc;
    }, {});
    const withPhone = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE phone IS NOT NULL AND TRIM(phone) != '' AND created_at >= NOW() - $1::interval",
      [interval]
    );
    const withEmail = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE email IS NOT NULL AND TRIM(email) != '' AND created_at >= NOW() - $1::interval",
      [interval]
    );
    const actionableLeads = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE status = $1 AND created_at >= NOW() - $2::interval",
      ["approved", interval]
    );

    // Industry-wise distribution using shared config
    // Using the imported industryKeywords

    const industryCounts = {};
    const subIndustryCounts = {}; // { [topIndustry]: { [subName]: count } }
    // Initialize all industries with 0
    Object.keys(industryKeywords).forEach(industry => {
      industryCounts[industry] = 0;
    });

    const leadsForIndustry = await pool.query(
      "SELECT id, COALESCE(company,'') AS company, COALESCE(title,'') AS title FROM leads WHERE created_at >= NOW() - $1::interval",
      [interval]
    );

    const preferredKeywords = (process.env.PREFERRED_COMPANY_KEYWORDS || '')
      .toLowerCase()
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    // Store scores to classify leads
    const leadScores = [];

    for (const row of leadsForIndustry.rows) {
      const text = `${(row.company || "").toLowerCase()} ${(row.title || "").toLowerCase()}`;
      let matchedIndustry = null;
      let score = 0;

      // Score based on preference keywords matching title/company
      if (preferredKeywords.length > 0) {
        if (preferredKeywords.some(k => text.includes(k))) {
          score += 50;
        }
      }

      // First, match the lead to one of the 20 top-level industries using keywords
      for (const [industry, keywords] of Object.entries(industryKeywords)) {
        if (keywords.some((k) => text.includes(k.toLowerCase()))) {
          industryCounts[industry] = (industryCounts[industry] || 0) + 1;
          matchedIndustry = industry;
          // Bonus score if the industry matches a preference keyword
          if (preferredKeywords.some(pk => industry.toLowerCase().includes(pk))) {
            score += 20;
          }
          break;
        }
      }

      if (!matchedIndustry) {
        industryCounts['Other'] = (industryCounts['Other'] || 0) + 1;
      } else {
        // Then, if we have LinkedIn sub-categories for this top-level industry,
        // try to map the lead into one sub-category using the sub-category name
        const subMetaForIndustry = subcategoriesByTop[matchedIndustry];
        if (subMetaForIndustry) {
          const lowerText = text;
          let matchedSubName = null;

          for (const [subName, meta] of Object.entries(subMetaForIndustry)) {
            // Use simple token-based matching on the sub industry name
            const tokens = meta.name
              .toLowerCase()
              .split(/[\s,&\/-]+/)
              .filter((t) => t.length > 2);

            if (!tokens.length) continue;

            // Require that at least one significant token matches
            if (tokens.some((t) => lowerText.includes(t))) {
              matchedSubName = subName;
              break;
            }
          }

          if (matchedSubName) {
            if (!subIndustryCounts[matchedIndustry]) {
              subIndustryCounts[matchedIndustry] = {};
            }
            subIndustryCounts[matchedIndustry][matchedSubName] =
              (subIndustryCounts[matchedIndustry][matchedSubName] || 0) + 1;
          }
        }
      }

      // Random tie-breaker for consistent sorting if scores are equal
      leadScores.push(score + Math.random());
    }

    // Sort scores descending
    leadScores.sort((a, b) => b - a);

    const totalScored = leadScores.length;
    let primaryCount = 0;
    let secondaryCount = 0;
    let tertiaryCount = 0;

    if (totalScored > 0) {
      // Top 20%
      const primaryCutoffIndex = Math.floor(totalScored * 0.20);
      // Next 30% (so up to 50%)
      const secondaryCutoffIndex = Math.floor(totalScored * 0.50);

      primaryCount = primaryCutoffIndex;
      secondaryCount = secondaryCutoffIndex - primaryCutoffIndex;
      tertiaryCount = totalScored - secondaryCutoffIndex;

      // Handle edge case of small numbers
      if (totalScored < 5) {
        primaryCount = totalScored;
        secondaryCount = 0;
        tertiaryCount = 0;
      }
    }

    const industryDistribution = Object.entries(industryCounts)
      .map(([name, count]) => {
        const subCounts = subIndustryCounts[name] || {};
        const subCategories = Object.entries(subCounts)
          .map(([subName, subCount]) => ({
            name: subName,
            count: subCount,
            code:
              subcategoriesByTop[name]?.[subName]?.code ||
              null,
          }))
          .filter((s) => s.count > 0)
          .sort((a, b) => {
            const isOtherA = a.name === "Other" || a.name === "Others";
            const isOtherB = b.name === "Other" || b.name === "Others";
            if (isOtherA && !isOtherB) return 1;
            if (!isOtherA && isOtherB) return -1;
            return b.count - a.count;
          });

        if (req.query.preferences === 'true' && name === 'Other') {
          return null;
        }

        return {
          industry: name,
          count,
          code: industryMetaTop[name]?.code || null,
          subCategories,
        };
      })
      .filter(item => item && item.count > 0) // Only include valid industries with leads
      .sort((a, b) => {
        const isOtherA = a.industry === "Other" || a.industry === "Others";
        const isOtherB = b.industry === "Other" || b.industry === "Others";
        if (isOtherA && !isOtherB) return 1;
        if (!isOtherA && isOtherB) return -1;
        return b.count - a.count;
      }); // Sort by count descending, but keep 'Other' last

    // Extraction by period (leads created in last interval)
    const extractionByPeriod = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE created_at >= NOW() - $1::interval",
      [interval]
    );

    // Connection type breakdown - Query actual connection degrees from database
    // PhantomBuster stores values like "1st", "2nd", "3rd" in connection_degree column
    const connectionBreakdownResult = await pool.query(`
      SELECT 
        connection_degree,
        COUNT(*) as count
      FROM leads
      WHERE connection_degree IS NOT NULL AND connection_degree != '' AND created_at >= NOW() - $1::interval
      GROUP BY connection_degree
    `, [interval]);

    const connectionBreakdown = {
      firstDegree: 0,
      secondDegree: 0,
      thirdDegree: 0,
    };

    // Map the results to our breakdown object
    connectionBreakdownResult.rows.forEach(row => {
      const degree = (row.connection_degree || '').toLowerCase().trim();
      const count = parseInt(row.count, 10);

      if (degree.includes('1st') || degree === '1') {
        connectionBreakdown.firstDegree += count;
      } else if (degree.includes('2nd') || degree === '2') {
        connectionBreakdown.secondDegree += count;
      } else if (degree.includes('3rd') || degree === '3') {
        connectionBreakdown.thirdDegree += count;
      }
    });

    // —— Campaign Analytics ——
    const campaignStatus = await pool.query(`
      SELECT status, COUNT(*) AS count FROM campaigns WHERE created_at >= NOW() - $1::interval GROUP BY status
    `, [interval]);
    const statusCounts = campaignStatus.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {});
    const activeCampaigns = statusCounts.active || 0;
    const completedCampaigns = statusCounts.completed || 0;
    const scheduledCampaigns = await pool.query(`
      SELECT COUNT(*) AS count FROM campaigns
      WHERE status = $1 AND schedule_start > NOW() AND created_at >= NOW() - $2::interval
    `, ["draft", interval]).then((r) => parseInt(r.rows[0]?.count || 0, 10));

    // Get messages sent count (campaign_leads with status sent, replied, or completed)
    const messagesSentResult = await pool.query(`
      SELECT COUNT(*) AS count FROM campaign_leads
      WHERE status IN ('sent', 'replied', 'completed') AND last_activity_at >= NOW() - $1::interval
    `, [interval]);
    const totalMessagesSent = parseInt(messagesSentResult.rows[0]?.count || 0, 10);

    // Campaign types breakdown - group by type, NULL types show as messages_sent
    const campaignTypesResult = await pool.query(`
      SELECT 
        CASE 
          WHEN type IS NULL OR type = '' THEN 'messages_sent'
          ELSE type
        END AS type,
        COUNT(*) AS count 
      FROM campaigns 
      WHERE created_at >= NOW() - $1::interval
      GROUP BY 
        CASE 
          WHEN type IS NULL OR type = '' THEN 'messages_sent'
          ELSE type
        END
      ORDER BY count DESC
    `, [interval]);

    // Build type breakdown
    const typeBreakdown = {};
    campaignTypesResult.rows.forEach(row => {
      const type = row.type;
      const count = parseInt(row.count || 0, 10);

      if (type === 'messages_sent') {
        // For messages_sent, use actual messages sent count
        typeBreakdown.messages_sent = totalMessagesSent > 0 ? totalMessagesSent : count;
      } else {
        typeBreakdown[type] = count;
      }
    });

    // If no campaigns exist but we have messages sent, show it
    if (Object.keys(typeBreakdown).length === 0 && totalMessagesSent > 0) {
      typeBreakdown.messages_sent = totalMessagesSent;
    }

    const repliesResult = await pool.query(`
      SELECT COUNT(*) AS count FROM campaign_leads WHERE status = $1 AND last_activity_at >= NOW() - $2::interval
    `, ["replied", interval]);
    const totalSent = parseInt(messagesSentResult.rows[0]?.count || 0, 10);
    const totalReplied = parseInt(repliesResult.rows[0]?.count || 0, 10);
    const engagementLevel = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;

    // Campaign totals by period (campaigns created in interval)
    const campaignsByPeriod = await pool.query(
      "SELECT COUNT(*) AS count FROM campaigns WHERE created_at >= NOW() - $1::interval",
      [interval]
    );
    const campaignLeadsByPeriod = await pool.query(
      "SELECT COUNT(*) AS count FROM campaign_leads cl WHERE cl.created_at >= NOW() - $1::interval",
      [interval]
    );
    const messagesSentByPeriod = await pool.query(
      `SELECT COUNT(*) AS count FROM campaign_leads
       WHERE status IN ('sent', 'replied', 'completed') AND last_activity_at >= NOW() - $1::interval`,
      [interval]
    );

    const response = {
      period,
      leadScraping: {
        totalLeads: parseInt(totalLeads.rows[0]?.count || 0, 10),
        sourceCount,
        leadsWithPhone: parseInt(withPhone.rows[0]?.count || 0, 10),
        leadsWithEmail: parseInt(withEmail.rows[0]?.count || 0, 10),
        actionableLeads: parseInt(actionableLeads.rows[0]?.count || 0, 10),
        industryDistribution,
        extractionByPeriod: {
          count: parseInt(extractionByPeriod.rows[0]?.count || 0, 10),
          interval,
        },
        connectionBreakdown: {
          firstDegree: connectionBreakdown.firstDegree,
          secondDegree: connectionBreakdown.secondDegree,
          thirdDegree: connectionBreakdown.thirdDegree,
        },
        leadQuality: {
          primary: primaryCount,
          secondary: secondaryCount,
          tertiary: tertiaryCount,
          totalScored: totalScored
        },
      },
      campaignAnalytics: {
        statusOverview: {
          active: activeCampaigns,
          completed: completedCampaigns,
          scheduled: scheduledCampaigns,
          draft: statusCounts.draft || 0,
        },
        typeBreakdown: typeBreakdown,
        messaging: {
          messagesSent: totalSent,
          repliesReceived: totalReplied,
          engagementPercent: engagementLevel,
        },
        totalsByPeriod: {
          campaigns: parseInt(campaignsByPeriod.rows[0]?.count || 0, 10),
          leadsAdded: parseInt(campaignLeadsByPeriod.rows[0]?.count || 0, 10),
          messagesSent: parseInt(messagesSentByPeriod.rows[0]?.count || 0, 10),
          engagement: totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
        },
      },
    };

    return res.json(response);
  } catch (err) {
    console.error("Dashboard analytics error:", err);
    res.status(500).json({ error: err.message });
  }
}
