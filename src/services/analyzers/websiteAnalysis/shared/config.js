const websiteAnalysisConfig = {
    headless:
        process.env.SCRAPER_HEADLESS !== "false",

    slowMo:
        Number(
            process.env.SCRAPER_SLOWMO || 0
        ),

    navTimeoutMs:
        Number(
            process.env.SCRAPER_NAV_TIMEOUT_MS || 30000
        ),

    settleTimeMs:
        Number(
            process.env.SCRAPER_SETTLE_TIME_MS || 1500
        ),

    linkTimeoutMs:
        Number(
            process.env.SCRAPER_LINK_TIMEOUT_MS || 5000
        ),

    maxLinks:
        Number(
            process.env.SCRAPER_MAX_LINKS || 50
        ),

    linkConcurrency:
        Number(
            process.env.SCRAPER_LINK_CONCURRENCY || 5
        ),

    analysisTimeoutMs:
        Number(
            process.env.SCRAPER_ANALYSIS_TIMEOUT_MS || 90000
        ),

    stageTimeoutMs:
        Number(
            process.env.SCRAPER_STAGE_TIMEOUT_MS || 20000
        ),
};

export default websiteAnalysisConfig;