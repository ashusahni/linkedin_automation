const URL_PATTERN = /(https?:\/\/[^\s<>"')\]]+)/gi;

function normalizeUrl(url = '') {
    return String(url || '')
        .trim()
        .replace(/[),.;!?]+$/g, '');
}

function extractUrlsFromText(text = '') {
    const matches = String(text || '').match(URL_PATTERN) || [];
    return matches.map(normalizeUrl).filter(Boolean);
}

function extractCampaignUrls(campaign = {}) {
    const links = [];

    if (campaign.description) {
        links.push(...extractUrlsFromText(campaign.description));
    }

    const registrationLink = campaign?.settings?.registration_link;
    if (registrationLink) {
        links.unshift(normalizeUrl(registrationLink));
    }

    const deduped = [];
    for (const url of links) {
        if (url && !deduped.includes(url)) deduped.push(url);
    }
    return deduped;
}

function buildLinkBlock(urls = [], campaignType = '') {
    if (!urls.length) return '';
    const firstLineLabel = (campaignType === 'event' || campaignType === 'webinar') ? 'Registration' : 'Link';
    const lines = urls.map((url, idx) => `${idx === 0 ? firstLineLabel : 'Link'}: ${url}`);
    return lines.join('\n');
}

export function appendCampaignLinksToMessage(message = '', campaign = {}, options = {}) {
    const stepType = options.stepType || '';
    const currentMessage = String(message || '').trim();
    const allowStandalone = options.allowStandalone === true;
    if (!currentMessage && !allowStandalone) return currentMessage;
    const campaignUrls = extractCampaignUrls(campaign);
    if (!campaignUrls.length) return currentMessage;

    const existingUrls = extractUrlsFromText(currentMessage);
    const urlsToAppend = campaignUrls.filter((url) => !existingUrls.includes(url));
    if (!urlsToAppend.length) return currentMessage;

    const linkBlock = buildLinkBlock(urlsToAppend, campaign.type);
    if (!linkBlock) return currentMessage;

    const withLinks = currentMessage ? `${currentMessage}\n\n${linkBlock}` : linkBlock;

    // LinkedIn connection request note has strict limits; keep links but cap total length.
    if (stepType === 'connection_request' && withLinks.length > 300) {
        const firstLinkOnly = buildLinkBlock([urlsToAppend[0]], campaign.type);
        const reserved = firstLinkOnly.length + 2;
        if (reserved >= 300) return firstLinkOnly.substring(0, 300);
        const maxBase = Math.max(0, 300 - reserved);
        const trimmedBase = currentMessage.substring(0, maxBase).trim();
        return trimmedBase ? `${trimmedBase}\n\n${firstLinkOnly}` : firstLinkOnly;
    }

    return withLinks;
}
