// LinkedIn utility functions
// Handles profile ID extraction and URL normalization

/**
 * Extract LinkedIn profile ID from a LinkedIn URL
 * 
 * Examples:
 * - https://www.linkedin.com/in/john-doe-12345678/ → john-doe-12345678
 * - https://linkedin.com/in/jane-smith → jane-smith
 * - linkedin.com/in/bob-jones/ → bob-jones
 * - /in/alice-williams → alice-williams
 * 
 * @param {string} url - LinkedIn profile URL
 * @returns {string|null} - Profile ID or null if invalid
 */
export function extractLinkedInProfileId(url) {
    if (!url || typeof url !== 'string') {
        return null;
    }

    // Normalize URL (trim whitespace, remove trailing slashes)
    const normalized = url.trim().toLowerCase().replace(/\/+$/, '');

    // Match pattern: linkedin.com/in/{profile-id}
    // Handles various formats:
    // - Full URLs: https://www.linkedin.com/in/john-doe
    // - Partial URLs: linkedin.com/in/john-doe
    // - Path only: /in/john-doe
    const match = normalized.match(/linkedin\.com\/in\/([a-z0-9-]+)/i);

    if (match && match[1]) {
        return match[1].toLowerCase().trim();
    }

    // Fallback: If URL is just "/in/something"
    const pathMatch = normalized.match(/^\/in\/([a-z0-9-]+)/i);
    if (pathMatch && pathMatch[1]) {
        return pathMatch[1].toLowerCase().trim();
    }

    return null;
}

/**
 * Validate if a string is a valid LinkedIn profile ID
 * 
 * Rules:
 * - Only lowercase letters, numbers, and hyphens
 * - Length between 3 and 100 characters
 * - Cannot start or end with hyphen
 * 
 * @param {string} profileId - Profile ID to validate
 * @returns {boolean} - True if valid
 */
export function isValidLinkedInProfileId(profileId) {
    if (!profileId || typeof profileId !== 'string') {
        return false;
    }

    // Check length
    if (profileId.length < 3 || profileId.length > 100) {
        return false;
    }

    // Check format: only lowercase letters, numbers, hyphens
    // Cannot start or end with hyphen
    const validPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    return validPattern.test(profileId);
}

/**
 * Normalize LinkedIn URL to standard format
 * 
 * @param {string} url - LinkedIn profile URL
 * @returns {string|null} - Normalized URL or null if invalid
 */
export function normalizeLinkedInUrl(url) {
    const profileId = extractLinkedInProfileId(url);
    if (!profileId) {
        return null;
    }
    return `https://www.linkedin.com/in/${profileId}/`;
}

/**
 * Extract multiple profile IDs from an array of URLs
 * Filters out duplicates and invalid URLs
 * 
 * @param {string[]} urls - Array of LinkedIn URLs
 * @returns {string[]} - Array of unique profile IDs
 */
export function extractMultipleProfileIds(urls) {
    if (!Array.isArray(urls)) {
        return [];
    }

    const profileIds = new Set();

    for (const url of urls) {
        const profileId = extractLinkedInProfileId(url);
        if (profileId && isValidLinkedInProfileId(profileId)) {
            profileIds.add(profileId);
        }
    }

    return Array.from(profileIds);
}

/**
 * Check if two LinkedIn URLs refer to the same profile
 * 
 * @param {string} url1 - First URL
 * @param {string} url2 - Second URL
 * @returns {boolean} - True if same profile
 */
export function isSameLinkedInProfile(url1, url2) {
    const id1 = extractLinkedInProfileId(url1);
    const id2 = extractLinkedInProfileId(url2);

    if (!id1 || !id2) {
        return false;
    }

    return id1 === id2;
}

/**
 * Get profile URL from profile ID
 * 
 * @param {string} profileId - LinkedIn profile ID
 * @returns {string} - Full LinkedIn URL
 */
export function getProfileUrl(profileId) {
    if (!profileId || !isValidLinkedInProfileId(profileId)) {
        throw new Error(`Invalid LinkedIn profile ID: ${profileId}`);
    }
    return `https://www.linkedin.com/in/${profileId}/`;
}

// Export all functions as default object for convenience
export default {
    extractLinkedInProfileId,
    isValidLinkedInProfileId,
    normalizeLinkedInUrl,
    extractMultipleProfileIds,
    isSameLinkedInProfile,
    getProfileUrl
};
