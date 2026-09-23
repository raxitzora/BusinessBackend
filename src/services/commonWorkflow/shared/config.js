const scraperConfig = {
    headless: process.env.SCRAPER_HEADLESS !== "false",

    slowMo: Number(
        process.env.SCRAPER_SLOWMO || 0
    ),

    maxResults: Number(
        process.env.SCRAPER_MAX_RESULTS || 60
    ),

    maxScrollAttempts: Number(
        process.env.SCRAPER_MAX_SCROLLS || 40
    ),

    navigationTimeoutMs: Number(
        process.env.SCRAPER_NAV_TIMEOUT_MS || 60000
    ),

    discoveryTimeoutMs: Number(
        process.env.SCRAPER_DISCOVERY_TIMEOUT_MS || 20000
    ),

    contactCacheTtlMs: Number(
        process.env.CONTACT_CACHE_TTL_MS ||
        24 * 60 * 60 * 1000
    ),
};

export default scraperConfig;