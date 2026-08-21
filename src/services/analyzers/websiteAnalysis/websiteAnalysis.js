import { chromium } from "playwright";

// Global scraper configuration, driven by environment variables so behaviour
// can be tweaked without touching code (e.g. run headed for debugging).
const CONFIG = {

    headless:
        process.env.SCRAPER_HEADLESS !== "false",

    slowMo:
        Number(process.env.SCRAPER_SLOWMO || 0),

    /*
    |--------------------------------------------------------------------------
    | Navigation
    |--------------------------------------------------------------------------
    */

    navTimeoutMs:
        Number(
            process.env.SCRAPER_NAV_TIMEOUT_MS || 30000
        ),

    settleTimeMs:
        Number(
            process.env.SCRAPER_SETTLE_TIME_MS || 1500
        ),

    /*
    |--------------------------------------------------------------------------
    | Broken Link Analysis
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Reliability
    |--------------------------------------------------------------------------
    */

    analysisTimeoutMs:
        Number(
            process.env.SCRAPER_ANALYSIS_TIMEOUT_MS || 90000
        ),

    stageTimeoutMs:
        Number(
            process.env.SCRAPER_STAGE_TIMEOUT_MS || 20000
        ),

};
/**
 * WebsiteAnalysis
 * ----------------
 * Launches a headless Chromium browser, visits a target URL, and produces a
 * report covering:
 *   1. reachability   - is the site up, how fast did it respond, is it HTTPS
 *   2. techStack      - frontend framework, CMS, CSS framework, analytics,
 *                        hosting provider, backend framework (best-effort
 *                        detection from HTML/scripts/response headers)
 *   3. performance     - request/byte counts for images, JS, CSS, fonts,
 *                        plus whether compression/caching headers are used
 *   4. responsive      - mobile-friendliness signals: viewport meta tag,
 *                        horizontal overflow, responsive images, touch
 *                        target sizes, and font-size readability
 */
class WebsiteAnalysis {

    withTimeout(
        promise,
        timeoutMs,
        operationName
    ) {

        let timeoutId;

        const timeoutPromise =
            new Promise((_, reject) => {

                timeoutId = setTimeout(() => {

                    reject(
                        new Error(
                            `${operationName} timed out after ${timeoutMs}ms.`
                        )
                    );

                }, timeoutMs);

            });

        return Promise.race([
            promise,
            timeoutPromise,
        ]).finally(() => {

            clearTimeout(timeoutId);

        });

    }

    /**
     * Entry point. Spins up a browser + page, navigates to `websiteUrl`,
     * gathers all analysis sections, and always cleans up the browser
     * (via the finally block) even if something throws along the way.
     */
   async analyze(websiteUrl) {

    if (!websiteUrl) {

        throw new Error(
            "Website URL is required."
        );

    }

    /*
    |--------------------------------------------------------------------------
    | Validate URL
    |--------------------------------------------------------------------------
    */

    let parsedUrl;

    try {

        parsedUrl = new URL(
            websiteUrl
        );

    } catch {

        throw new Error(
            "Invalid website URL."
        );

    }

    if (
        parsedUrl.protocol !== "http:" &&
        parsedUrl.protocol !== "https:"
    ) {

        throw new Error(
            "Website URL must use HTTP or HTTPS."
        );

    }

    /*
    |--------------------------------------------------------------------------
    | Launch Browser
    |--------------------------------------------------------------------------
    */

    const browser =
        await chromium.launch({

            headless:
                CONFIG.headless,

            slowMo:
                CONFIG.slowMo,

            args: [

                "--disable-blink-features=AutomationControlled",

                "--disable-dev-shm-usage",

            ],

        });

    /*
    |--------------------------------------------------------------------------
    | Create Isolated Context
    |--------------------------------------------------------------------------
    */

    const context =
        await browser.newContext({

            viewport: {

                width: 390,

                height: 844,

            },

            isMobile: true,

            hasTouch: true,

            deviceScaleFactor: 3,

            locale: "en-IN",

            timezoneId: "Asia/Kolkata",

        });

    /*
    |--------------------------------------------------------------------------
    | Run Analysis With Overall Timeout
    |--------------------------------------------------------------------------
    */

    try {

        return await this.withTimeout(

            this.runAnalysis(
                context,
                parsedUrl.href
            ),

            CONFIG.analysisTimeoutMs,

            "Website analysis"

        );

    } catch (error) {

        console.error(
            "Website analysis failed:",
            error
        );

        /*
        |--------------------------------------------------------------------------
        | Return Structured Timeout/Error
        |--------------------------------------------------------------------------
        */

        const isTimeout =
            error?.message?.includes(
                "timed out"
            );

        return {

            success: false,

            partial: false,

            message:
                isTimeout
                    ? "Website analysis timed out."
                    : "Website analysis failed.",

            code:
                isTimeout
                    ? "ANALYSIS_TIMEOUT"
                    : "ANALYSIS_FAILED",

            reachability: {

                reachable: null,

                status: null,

                responseTime: null,

                https:
                    parsedUrl.protocol === "https:",

                redirects: 0,

                finalUrl:
                    parsedUrl.href,

                error:
                    error?.message ||
                    "Unknown analysis error.",

            },

            techStack: null,

            performance: null,

            responsive: null,

            brokenLinks: null,

            brokenImages: null,

            errors: [

                {

                    stage: "Website analysis",

                    message:
                        error?.message ||
                        "Unknown analysis error.",

                },

            ],

        };

    } finally {

        /*
        |--------------------------------------------------------------------------
        | Always Cleanup
        |--------------------------------------------------------------------------
        */

        try {

            await context.close();

        } catch (error) {

            console.error(
                "Failed to close browser context:",
                error.message
            );

        }

        try {

            await browser.close();

        } catch (error) {

            console.error(
                "Failed to close browser:",
                error.message
            );

        }

    }

}

async runAnalysis(
    context,
    websiteUrl
) {

    const page =
        await context.newPage();

    const resources = [];

    this.attachNetworkListeners(
        page,
        resources
    );

    /*
    |--------------------------------------------------------------------------
    | Navigation
    |--------------------------------------------------------------------------
    */

    const startTime =
        Date.now();

    let response;

    try {

        response =
            await page.goto(
                websiteUrl,
                {
                    waitUntil:
                        "domcontentloaded",

                    timeout:
                        CONFIG.navTimeoutMs,
                }
            );

        await page.waitForTimeout(
            CONFIG.settleTimeMs
        );

    } catch (error) {

        return {

            success: true,

            partial: true,

            reachability: {

                reachable: false,

                status: null,

                responseTime:
                    Date.now() -
                    startTime,

                https:
                    parsedUrlProtocol(
                        websiteUrl
                    ) === "https:",

                redirects: 0,

                finalUrl:
                    page.url() ||
                    websiteUrl,

                error:
                    error?.message ||
                    "Navigation failed.",

            },

            techStack: null,

            performance: null,

            responsive: null,

            brokenLinks: null,

            brokenImages: null,

            errors: [

                {

                    stage: "Navigation",

                    message:
                        error?.message ||
                        "Navigation failed.",

                },

            ],

        };

    }

    /*
    |--------------------------------------------------------------------------
    | Reachability
    |--------------------------------------------------------------------------
    */

    const reachability =
        this.checkReachability(
            page,
            response,
            startTime
        );

    if (!reachability.reachable) {

        delete reachability.response;

        return {

            success: true,

            partial: true,

            reachability,

            techStack: null,

            performance: null,

            responsive: null,

            brokenLinks: null,

            brokenImages: null,

            errors: [],

        };

    }

    /*
    |--------------------------------------------------------------------------
    | Result
    |--------------------------------------------------------------------------
    */

    const result = {

        success: true,

        partial: false,

        reachability,

        techStack: null,

        performance: null,

        responsive: null,

        brokenLinks: null,

        brokenImages: null,

        errors: [],

    };

    /*
    |--------------------------------------------------------------------------
    | Tech Stack
    |--------------------------------------------------------------------------
    */

    const techStack =
        await this.runStage(
            "Tech stack analysis",
            () =>
                this.detectTechStack(
                    page,
                    reachability.response
                )
        );

    if (techStack.success) {

        result.techStack =
            techStack.data;

    } else {

        result.partial = true;

        result.errors.push(
            techStack.error
        );

    }

    /*
    |--------------------------------------------------------------------------
    | Performance
    |--------------------------------------------------------------------------
    */

    const performance =
        await this.runStage(
            "Performance analysis",
            () =>
                this.analyzePerformance(
                    resources
                )
        );

    if (performance.success) {

        result.performance =
            performance.data;

    } else {

        result.partial = true;

        result.errors.push(
            performance.error
        );

    }

    /*
    |--------------------------------------------------------------------------
    | Responsive
    |--------------------------------------------------------------------------
    */

    const responsive =
        await this.runStage(
            "Responsive analysis",
            () =>
                this.analyzeResponsive(
                    page
                )
        );

    if (responsive.success) {

        result.responsive =
            responsive.data;

    } else {

        result.partial = true;

        result.errors.push(
            responsive.error
        );

    }

    /*
    |--------------------------------------------------------------------------
    | Broken Links
    |--------------------------------------------------------------------------
    */

    const brokenLinks =
        await this.runStage(
            "Broken link analysis",
            () =>
                this.detectBrokenLinks(
                    page
                )
        );

    if (brokenLinks.success) {

        result.brokenLinks =
            brokenLinks.data;

    } else {

        result.partial = true;

        result.errors.push(
            brokenLinks.error
        );

    }

    /*
    |--------------------------------------------------------------------------
    | Broken Images
    |--------------------------------------------------------------------------
    */

    const brokenImages =
        await this.runStage(
            "Broken image analysis",
            () =>
                this.detectBrokenImages(
                    page
                )
        );

    if (brokenImages.success) {

        result.brokenImages =
            brokenImages.data;

    } else {

        result.partial = true;

        result.errors.push(
            brokenImages.error
        );

    }

    /*
    |--------------------------------------------------------------------------
    | Remove Playwright Response Object
    |--------------------------------------------------------------------------
    */

    delete result.reachability.response;

    return result;

}

async runStage(
    stageName,
    operation
) {

    try {

        const data =
            await this.withTimeout(
                operation(),
                CONFIG.stageTimeoutMs,
                stageName
            );

        return {

            success: true,

            data,

        };

    } catch (error) {

        console.error(
            `${stageName} failed:`,
            error
        );

        return {

            success: false,

            error: {

                stage:
                    stageName,

                message:
                    error?.message ||
                    "Unknown error.",

            },

        };

    }

}

    /**
     * Builds the "reachability" section of the report: whether the page
     * responded, its HTTP status, how long it took, whether it's served
     * over HTTPS, and how many redirects occurred.
     */
checkReachability(page, response, startTime) {

    const endTime = Date.now();

    // Playwright's page.goto() can resolve with `null` in some cases
    // (e.g. navigation to about:blank, or certain download flows).
    // Guard against that so we don't crash trying to call methods on it.
    if (!response) {

        return {

            reachable: false,

            status: null,

            responseTime: endTime - startTime,

            https: page.url().startsWith("https://"),

            redirects: 0,

            finalUrl: page.url(),

            error: "No response received from server.",

        };

    }

    return {

        reachable: true,

        status: response?.status() ?? null,

        responseTime: endTime - startTime,

        https: page.url().startsWith("https://"),

        // If this response was reached via a redirect, redirectedFrom()
        // will be non-null. This only detects a single hop, not a full
        // redirect chain length.
        redirects:
            response.request().redirectedFrom()
                ? 1
                : 0,

        finalUrl: page.url(),

        // Kept temporarily so detectTechStack() can read response headers;
        // removed from the final result before it's returned to the caller.
        response,

    };

}

    /**
     * Inspects the rendered page (HTML + <script> src attributes) and the
     * HTTP response headers to guess which frontend framework, CMS, CSS
     * framework, analytics tools, hosting provider, and backend framework
     * the site is built with. This is heuristic/best-effort detection, not
     * a guaranteed-accurate fingerprint.
     */
async detectTechStack(page, response) {
const html =
    (await page.content()).toLowerCase();

// Grab every <script> tag's resolved src URL so we can pattern-match
// against known CDN paths (e.g. "/_next/", "cdn.shopify.com").
const scripts =
    await page.$$eval(
        "script",
        elements =>
            elements.map(
                script => script.src.toLowerCase()
            )
    );

// Normalize response headers to lowercase keys/values for reliable
// substring matching regardless of how the server capitalized them.
const headers =
    Object.fromEntries(
        Object.entries(response.headers()).map(
            ([key, value]) => [
                key.toLowerCase(),
                String(value).toLowerCase(),
            ]
        )
    );

    const result = {

        frontend: [],
        cms: [],
        css: [],
        analytics: [],
        hosting: [],
        backend: [],

    };

    // Each of these inspects a different signal source and pushes matches
    // into the relevant `result` bucket.
    this.detectFrontend(result, html, scripts);   // React, Next.js, Vue, etc.
    this.detectCMS(result, html, scripts);        // WordPress, Shopify, Wix, etc.
    this.detectCSS(result, html, scripts);        // Tailwind, Bootstrap, etc.
    this.detectAnalytics(result, scripts);        // GA, GTM, Facebook Pixel, etc.
    this.detectHosting(result, headers);          // Vercel, Netlify, Cloudflare, etc.
    this.detectBackend(result, headers);          // PHP, Express, ASP.NET, etc.

    return result;

}

    /**
     * Rolls up the captured network `resources` into per-category
     * performance stats (images, JS, CSS, fonts) plus overall compression/
     * caching usage and a total-size summary.
     */
async analyzePerformance(resources) {

    return {

        images:
            this.analyzeImages(resources),

        javascript:
            this.analyzeJavaScript(resources),

        css:
            this.analyzeCSSResources(resources),

        fonts:
            this.analyzeFonts(resources),

        compression:
            this.analyzeCompression(resources),

        caching:
            this.analyzeCaching(resources),

        summary:
            this.calculatePerformanceSummary(resources),

    };

}

    /**
     * Runs all the mobile-friendliness / responsive-design checks against
     * the live page and combines them into one "responsive" report section.
     */
async analyzeResponsive(page) {

    const result = {};

    // Is there a <meta name="viewport"> tag at all, and what does it say?
    result.viewport =
        await this.checkViewport(page);

    // Does the page overflow horizontally at the current viewport width?
    result.layout =
        await this.checkResponsiveLayout(page);

    // How many <img> tags use responsive techniques (srcset, fluid width)
    // vs. fixed sizing, and how many are lazy-loaded?
    result.images =
        await this.checkResponsiveImages(page);

    // Are interactive elements (buttons/links/inputs) big enough to tap
    // comfortably on a touchscreen (44x44px is the common accessibility
    // guideline)?
    result.touchTargets =
        await this.checkTouchTargets(page);

    // How many elements use font sizes below a comfortably readable
    // threshold (14px)?
    result.fonts =
        await this.checkFontSizes(page);

    return result;

}


/** It is find for broken links**/
async detectBrokenLinks(page) {

    const rawLinks = await page.$$eval(
        "a[href]",
        elements =>
            elements.map(link => ({
                href: link.href,
                text: link.innerText.trim(),
            }))
    );

    /*
    |--------------------------------------------------------------------------
    | Normalize + filter links
    |--------------------------------------------------------------------------
    */

    const uniqueLinks = [];

    const seen = new Set();

    for (const link of rawLinks) {

        if (!link.href) {
            continue;
        }

        let url;

        try {

            url = new URL(link.href);

        } catch {

            continue;

        }

        /*
        Skip links that aren't HTTP requests.
        */

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {
            continue;
        }

        /*
        Skip duplicate URLs.
        */

        const normalizedUrl = url.href;

        if (seen.has(normalizedUrl)) {
            continue;
        }

        seen.add(normalizedUrl);

        uniqueLinks.push({
            href: normalizedUrl,
            text: link.text || "",
        });

    }

    /*
    |--------------------------------------------------------------------------
    | Limit work
    |--------------------------------------------------------------------------
    */

    const linksToCheck =
        uniqueLinks.slice(
            0,
            CONFIG.maxLinks
        );

    /*
    |--------------------------------------------------------------------------
    | Concurrent link checking
    |--------------------------------------------------------------------------
    */

    const broken = [];

    let currentIndex = 0;

    const worker = async () => {

        while (true) {

            const index = currentIndex++;

            if (index >= linksToCheck.length) {
                return;
            }

            const link =
                linksToCheck[index];

            try {

                const response =
                    await page.request.get(
                        link.href,
                        {
                            timeout:
                                CONFIG.linkTimeoutMs,

                            failOnStatusCode: false,
                        }
                    );

                const status =
                    response.status();

                if (status >= 400) {

                    broken.push({

                        url: link.href,

                        text: link.text,

                        status,

                    });

                }

            } catch {

                broken.push({

                    url: link.href,

                    text: link.text,

                    status: "Failed",

                });

            }

        }

    };

    /*
    |--------------------------------------------------------------------------
    | Start limited workers
    |--------------------------------------------------------------------------
    */

    const workerCount = Math.min(
        CONFIG.linkConcurrency,
        linksToCheck.length
    );

    await Promise.all(
        Array.from(
            {
                length: workerCount,
            },
            () => worker()
        )
    );

    return {

        total:
            uniqueLinks.length,

        checked:
            linksToCheck.length,

        truncated:
            uniqueLinks.length >
            linksToCheck.length,

        broken:
            broken.length,

        links:
            broken,

    };

}

async detectBrokenImages(page) {

    return await page.evaluate(() => {

        const images = Array.from(document.images);

        const broken = [];

        for (const image of images) {

            if (

                !image.complete ||

                image.naturalWidth === 0

            ) {

                broken.push({

                    src: image.src,

                    alt: image.alt,

                });

            }

        }

        return {

            total: images.length,

            broken: broken.length,

            images: broken,

        };

    });

}


    /**
     * Detects horizontal overflow: if the page's total scrollable width is
     * wider than the visible viewport, content is likely spilling off-screen
     * on smaller devices - a common non-responsive-design symptom.
     */
async checkResponsiveLayout(page) {

    return await page.evaluate(() => {

        return {

          horizontalScroll:

Math.ceil(
    document.documentElement.scrollWidth
) >

Math.ceil(window.innerWidth),

            pageWidth:
                document.documentElement.scrollWidth,

            viewportWidth:
                window.innerWidth,

        };

    });

}

    /**
     * Walks every <img> on the page and classifies it as responsive
     * (has a srcset, fluid max-width style, or a "responsive" class),
     * fixed-size (none of the above), and/or lazy-loaded.
     */
async checkResponsiveImages(page) {

    return await page.evaluate(() => {

        const images = Array.from(
            document.images
        );

        let responsive = 0;
        let fixed = 0;
        let lazy = 0;

        for (const image of images) {

            if (
                image.loading === "lazy"
            ) {

                lazy++;

            }

            if (

                image.hasAttribute("srcset") ||

                image.style.maxWidth === "100%" ||

                getComputedStyle(image).maxWidth === "100%" ||

                image.width <= window.innerWidth

            ) {

                responsive++;

            }

            else {

                fixed++;

            }

        }

        return {

            total: images.length,

            responsive,

            fixed,

            lazy,

        };

    });

}

    /**
     * Inspects the computed font-size of every element under <body> and
     * tallies how many fall below a 14px "comfortably readable" threshold
     * versus how many are at or above it.
     */
async checkFontSizes(page) {

    return await page.$$eval(

        "body *",

        elements => {

            let smallFonts = 0;

            let readable = 0;

            for (const element of elements) {

                const size =
                    parseFloat(

                        getComputedStyle(element)

                            .fontSize

                    );

                if (

                    size < 14

                ) {

                    smallFonts++;

                }

                else {

                    readable++;

                }

            }

            return {

                readable,

                smallFonts,

            };

        }

    );

}

    /**
     * Measures the rendered bounding box of every button/link/input and
     * flags any that are smaller than the common 44x44px minimum
     * recommended touch-target size for mobile usability.
     */
async checkTouchTargets(page) {

    return await page.evaluate(() => {

        const elements = [

            ...document.querySelectorAll(

                "button,a,input,textarea,select,[role='button'],[onclick]"

            )

        ];

        let small = 0;
        let good = 0;

        for (const element of elements) {

            const rect =
                element.getBoundingClientRect();

            if (

                rect.width >= 44 &&

                rect.height >= 44

            ) {

                good++;

            }

            else {

                small++;

            }

        }

        return {

            total: elements.length,

            good,

            small,

        };

    });

}

    /**
     * Checks for the presence (and content) of a <meta name="viewport">
     * tag - the standard signal that a page opts into responsive scaling
     * on mobile devices rather than rendering at a fixed desktop width.
     */
async checkViewport(page) {

    return await page.evaluate(() => {

        const viewport =
            document.querySelector(
                "meta[name='viewport']"
            );

        return {

            exists: !!viewport,

            content:
                viewport?.content || null,

        };

    });

}

    /**
     * Subscribes to every network response Playwright observes while the
     * page loads, and records its URL, resource type, status, byte size,
     * and headers into the shared `resources` array for later analysis.
     */
attachNetworkListeners(page, resources) {

    page.on(
        "response",
        async response => {

            try {

                const headers =
                    response.headers();

     // Prefer the Content-Length header (cheap); fall back to actually
     // reading the response body if the server didn't send one.
     let size = Number(headers["content-length"] || 0);

if (!size) {

    try {

        const body = await response.body();

        size = body.length;

    } catch {

        // Body unavailable (e.g. redirect, aborted request) - treat as 0.
        size = 0;

    }

}

resources.push({

    url: response.url(),

    type: response.request().resourceType(),

    status: response.status(),

    size,

    headers,

});

            } catch {

                // Ignore any response we couldn't inspect (e.g. it was
                // cancelled mid-flight); it just won't be counted.

            }

        }
    );

}

    /** Aggregates stats for all image ("image" resourceType) requests. */
analyzeImages(resources) {

    const images =
        resources.filter(
            resource =>
                resource.type === "image"
        );

    return {

        total: images.length,

        totalSize:
            images.reduce(
                (sum, image) => sum + image.size,
                0
            ),

        // Images over 500KB are flagged as candidates for optimization.
        largeImages:
            images.filter(
                image =>
                    image.size > 500 * 1024
            ).length,

    };

}

    /** Aggregates stats for all script ("script" resourceType) requests. */
analyzeJavaScript(resources) {

    const scripts =
        resources.filter(
            resource =>
                resource.type === "script"
        );

    return {

        total: scripts.length,

        totalSize:
            scripts.reduce(
                (sum, script) => sum + script.size,
                0
            ),

        // Bundles over 250KB are flagged as candidates for code-splitting.
        largeBundles:
            scripts.filter(
                script =>
                    script.size > 250 * 1024
            ).length,

    };

}

    /** Aggregates stats for all stylesheet resourceType requests. */
analyzeCSSResources(resources) {

    const css =
        resources.filter(
            resource =>
                resource.type === "stylesheet"
        );

    return {

        total: css.length,

        totalSize:
            css.reduce(
                (sum, file) => sum + file.size,
                0
            ),

    };

}

    /** Aggregates stats for all font resourceType requests. */
analyzeFonts(resources) {

    const fonts =
        resources.filter(
            resource =>
                resource.type === "font"
        );

    return {

        total: fonts.length,

        totalSize:
            fonts.reduce(
                (sum, font) => sum + font.size,
                0
            ),

    };

}

    /**
     * Returns true only if EVERY captured resource was served with a
     * gzip/br/deflate Content-Encoding header (i.e. compression is used
     * consistently across the site). Returns false if there were no
     * resources captured at all, to avoid a misleading "true" on an
     * empty set.
     */
analyzeCompression(resources) {

    if (resources.length === 0) {

        return false;

    }

    return resources.every(resource => {

        const encoding =
            resource.headers["content-encoding"];

        return (
            encoding === "gzip" ||
            encoding === "br" ||
            encoding === "deflate"
        );

    });

}

    /**
     * Returns true only if EVERY captured resource included a
     * Cache-Control header. Returns false (not a vacuous true) if no
     * resources were captured.
     */
analyzeCaching(resources) {

    if (resources.length === 0) {

        return false;

    }

    return resources.every(resource =>

        Boolean(resource.headers["cache-control"])

    );

}

    /** Produces overall request-count and total-transferred-size stats. */
calculatePerformanceSummary(resources) {

    const totalSize =
        resources.reduce(
            (sum, resource) =>
                sum + resource.size,
            0
        );

    return {

        requests:
            resources.length,

        totalSize,

        totalSizeMB:
            (
                totalSize /
                1024 /
                1024
            ).toFixed(2),

    };

}

    /**
     * Looks for tell-tale markers (in the HTML or script URLs) of common
     * frontend frameworks/libraries and records any matches.
     */
detectFrontend(result, html, scripts) {

    // React
    if (
        html.includes("__react") ||
        html.includes("_reactroot") ||
        html.includes("react") ||
        scripts.some(src => src.includes("react"))
    ) {

        result.frontend.push("React");

    }

    // Next.js
    if (
        html.includes("__next") ||
        html.includes("/_next/") ||
        scripts.some(src => src.includes("/_next/"))
    ) {

        result.frontend.push("Next.js");

    }

    // Vue
    if (
        html.includes("data-v-") ||
        html.includes("__vue__") ||
        scripts.some(src => src.includes("vue"))
    ) {

        result.frontend.push("Vue.js");

    }

    // Nuxt
    if (
        html.includes("__nuxt") ||
        scripts.some(src => src.includes("_nuxt"))
    ) {

        result.frontend.push("Nuxt.js");

    }

    // Angular
    if (
        html.includes("ng-version") ||
        html.includes("ng-app") ||
        scripts.some(src => src.includes("angular"))
    ) {

        result.frontend.push("Angular");

    }

    // Svelte
    if (
        html.includes("__svelte") ||
        scripts.some(src => src.includes("svelte"))
    ) {

        result.frontend.push("Svelte");

    }

    // Astro
    if (
        html.includes("astro-island") ||
        html.includes("astro-root") ||
        scripts.some(src => src.includes("astro"))
    ) {

        result.frontend.push("Astro");

    }

}

    /**
     * Looks for tell-tale markers of common Content Management Systems /
     * website builders and records any matches.
     */
detectCMS(result, html, scripts) {

    // WordPress
    if (
        html.includes("wp-content") ||
        html.includes("wp-includes") ||
        scripts.some(src => src.includes("wp-content"))
    ) {

        result.cms.push("WordPress");

    }

    // Shopify
    if (
        html.includes("cdn.shopify.com") ||
        html.includes("shopify") ||
        scripts.some(src => src.includes("cdn.shopify.com"))
    ) {

        result.cms.push("Shopify");

    }

    // Wix
    if (
        html.includes("wix.com") ||
        html.includes("wixstatic") ||
        scripts.some(src => src.includes("wixstatic"))
    ) {

        result.cms.push("Wix");

    }

    // Squarespace
    if (
        html.includes("squarespace") ||
        scripts.some(src => src.includes("squarespace"))
    ) {

        result.cms.push("Squarespace");

    }

    // Drupal
    if (
        html.includes("drupal") ||
        html.includes("sites/default/files")
    ) {

        result.cms.push("Drupal");

    }

    // Joomla
    if (
        html.includes("joomla") ||
        html.includes("/media/jui/")
    ) {

        result.cms.push("Joomla");

    }

    // Webflow
    if (
        html.includes("webflow") ||
        scripts.some(src => src.includes("webflow"))
    ) {

        result.cms.push("Webflow");

    }

    // Ghost
    if (
        html.includes("ghost.io") ||
        html.includes("/ghost/")
    ) {

        result.cms.push("Ghost");

    }

}

    /**
     * Looks for tell-tale markers of common CSS frameworks/libraries and
     * records any matches.
     */
detectCSS(result, html, scripts) {

    // Tailwind CSS
    if (
        html.includes("tailwind") ||
        scripts.some(src => src.includes("tailwind"))
    ) {

        result.css.push("Tailwind CSS");

    }

    // Bootstrap
    if (
        html.includes("bootstrap") ||
        scripts.some(src => src.includes("bootstrap"))
    ) {

        result.css.push("Bootstrap");

    }

    // Bulma
    if (html.includes("bulma")) {

        result.css.push("Bulma");

    }

    // Material UI
    if (
        html.includes("material-ui") ||
        html.includes("mui-") ||
        scripts.some(src => src.includes("material-ui"))
    ) {

        result.css.push("Material UI");

    }

    // Foundation
    if (html.includes("foundation.min.css") || html.includes("foundation-css")) {

        result.css.push("Foundation");

    }

}

    /**
     * Looks for known analytics/tracking script URLs (Google Analytics,
     * GTM, Facebook Pixel, etc.) and records any matches.
     */
detectAnalytics(result, scripts) {

    // Google Analytics
    if (
        scripts.some(
            src =>
                src.includes("google-analytics.com") ||
                src.includes("googletagmanager.com/gtag")
        )
    ) {

        result.analytics.push("Google Analytics");

    }

    // Google Tag Manager
    if (
        scripts.some(src => src.includes("googletagmanager.com/gtm.js"))
    ) {

        result.analytics.push("Google Tag Manager");

    }

    // Facebook Pixel
    if (
        scripts.some(src => src.includes("connect.facebook.net"))
    ) {

        result.analytics.push("Facebook Pixel");

    }

    // Hotjar
    if (
        scripts.some(src => src.includes("hotjar.com"))
    ) {

        result.analytics.push("Hotjar");

    }

    // Mixpanel
    if (
        scripts.some(src => src.includes("mixpanel.com") || src.includes("cdn.mxpnl.com"))
    ) {

        result.analytics.push("Mixpanel");

    }

    // Segment
    if (
        scripts.some(src => src.includes("cdn.segment.com"))
    ) {

        result.analytics.push("Segment");

    }

}

    /**
     * Uses response headers (Server, Via, X-Powered-By, and provider-
     * specific headers like CF-Ray or X-Vercel-Id) to guess the hosting
     * provider / CDN in front of the site.
     */
detectHosting(result, headers) {

    const server = headers["server"] || "";
    const via = headers["via"] || "";
    const poweredBy = headers["x-powered-by"] || "";

    // Vercel
    if (
        server.includes("vercel") ||
        headers["x-vercel-id"] ||
        poweredBy.includes("vercel")
    ) {

        result.hosting.push("Vercel");

    }

    // Netlify
    if (
        server.includes("netlify") ||
        headers["x-nf-request-id"]
    ) {

        result.hosting.push("Netlify");

    }

    // Cloudflare
    if (
        server.includes("cloudflare") ||
        headers["cf-ray"]
    ) {

        result.hosting.push("Cloudflare");

    }

    // AWS (CloudFront / S3)
    if (
        via.includes("cloudfront") ||
        server.includes("amazons3") ||
        headers["x-amz-cf-id"]
    ) {

        result.hosting.push("AWS");

    }

    // GitHub Pages
    if (
        server.includes("github.com") ||
        headers["x-github-request-id"]
    ) {

        result.hosting.push("GitHub Pages");

    }

    // Firebase
    if (server.includes("firebase")) {

        result.hosting.push("Firebase");

    }

}

    /**
     * Uses response headers (X-Powered-By, Server, framework-specific
     * headers like X-Runtime for Rails) to guess the backend
     * language/framework serving the site.
     */
detectBackend(result, headers) {

    const poweredBy = headers["x-powered-by"] || "";
    const server = headers["server"] || "";

    // PHP
    if (
        poweredBy.includes("php") ||
        headers["x-php-version"]
    ) {

        result.backend.push("PHP");

    }

    // Express / Node.js
    if (poweredBy.includes("express")) {

        result.backend.push("Express (Node.js)");

    }

    // ASP.NET
    if (
        poweredBy.includes("asp.net") ||
        headers["x-aspnet-version"] ||
        headers["x-aspnetmvc-version"]
    ) {

        result.backend.push("ASP.NET");

    }

    // Nginx / Apache (web server, not app framework, but useful signal)
    if (server.includes("nginx")) {

        result.backend.push("Nginx");

    }

    if (server.includes("apache")) {

        result.backend.push("Apache");

    }

    // Django / Python
    if (poweredBy.includes("django") || server.includes("wsgiserver")) {

        result.backend.push("Django (Python)");

    }

    // Ruby on Rails
    if (poweredBy.includes("rails") || headers["x-runtime"]) {

        result.backend.push("Ruby on Rails");

    }

}

}

function parsedUrlProtocol(url) {

    try {

        return new URL(url).protocol;

    } catch {

        return null;

    }

}
// Exported as a ready-to-use singleton instance.
export default new WebsiteAnalysis();