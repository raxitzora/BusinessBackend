// import { chromium } from "playwright";

// /**
//  * ============================================================================
//  * CommonWorkflowService
//  * ============================================================================
//  *
//  * WHAT THIS FILE DOES
//  * --------------------
//  * This is the engine behind the "search keyword + location" feature.
//  * It talks to Google Maps using a real (headless) browser and pulls out
//  * business data — then, separately, can fetch deeper contact info
//  * (phone/email/socials) for ONE specific business when the user clicks it.
//  *
//  * WHY IT'S SPLIT INTO TWO STAGES
//  * -------------------------------
//  * Stage 1 — discoverBusinesses(keyword, location)
//  *   Scrolls the Google Maps results feed and grabs only what's already
//  *   visible on each card: name, category, address, rating, review count,
//  *   maps link. This is FAST (roughly 5-15 seconds) because it never opens
//  *   a business's own website or its Maps detail page.
//  *   -> This is what populates the screen the moment the user searches.
//  *
//  * Stage 2 — getBusinessContact(googleMapsLink)
//  *   Only runs for ONE business — the one the user clicked. Opens that
//  *   business's Maps detail page (for phone/website), then opens the
//  *   business's own website and scans it for email + social links.
//  *   This takes longer (3-6 seconds) but only runs once per click, not
//  *   once per search result. Running this for all 60 search results
//  *   upfront would make every search take a minute or more — that's why
//  *   it's deliberately separate.
//  *
//  * BROWSER REUSE
//  * --------------
//  * Starting a fresh Chromium browser on every single call is slow (1-2
//  * seconds just to boot it) and memory-hungry. Instead, this file keeps
//  * ONE browser running in the background (`getSharedBrowser()`) and opens
//  * a fresh, isolated "context" (think: a private browsing window) for
//  * each request. Contexts are cheap and don't share cookies/state with
//  * each other, so concurrent users never interfere with one another.
//  *
//  * WHAT'S DELIBERATELY NOT HERE YET (documented so it's a choice, not a gap)
//  * ---------------------------------------------------------------------------
//  * - No job queue (BullMQ/Redis). Each call blocks until it finishes.
//  *   Fine for low traffic; will need a queue once you have many
//  *   simultaneous users, or Maps requests will pile up.
//  * - Caching is in-memory only (a plain JS Map). It resets every time
//  *   the server restarts. The comment above `contactCache` shows exactly
//  *   where to swap this for Redis later — it's a one-function change.
//  * - No retry/backoff on network failures. A flaky Maps response just
//  *   fails the request. Add retries before this handles real customer
//  *   traffic at scale.
//  * ============================================================================
//  */


// // ----------------------------------------------------------------------------
// // CONFIG — tunable knobs, all overridable via environment variables so you
// // don't have to touch code to change behavior between local dev and prod.
// // ----------------------------------------------------------------------------

// const CONFIG = {
//     // Run Chrome invisibly (true) vs. with a visible window (false).
//     // ALWAYS true in production — a visible browser window on a server
//     // makes no sense and just wastes resources.
//     headless: process.env.SCRAPER_HEADLESS !== "false",

//     // Artificially slows down every browser action by this many ms.
//     // Useful ONLY for local debugging (watching what the browser does).
//     // Leave at 0 in production.
//     slowMo: Number(process.env.SCRAPER_SLOWMO || 0),

//     // Stop collecting search results once we hit this many. Google Maps
//     // itself only shows ~120 per search anyway, so this is a safety cap,
//     // not the main limiter.
//     maxResults: Number(process.env.SCRAPER_MAX_RESULTS || 60),

//     // Maximum number of times we'll scroll the results feed looking for
//     // more businesses before giving up.
//     maxScrollAttempts: Number(process.env.SCRAPER_MAX_SCROLLS || 40),

//     // How long to wait for a page to load before considering it failed.
//     navTimeoutMs: 60000,
//     websiteTimeoutMs: 12000,

//     // How long a cached contact-info result stays valid before we'll
//     // re-scrape it (in milliseconds). 24 hours by default — phone numbers
//     // and emails don't change often.
//     contactCacheTtlMs: Number(process.env.CONTACT_CACHE_TTL_MS || 24 * 60 * 60 * 1000),
// };


// // ----------------------------------------------------------------------------
// // Small reusable helpers
// // ----------------------------------------------------------------------------

// /**
//  * Waits a random amount of time between minMs and maxMs.
//  * WHY: if every action happens at exactly the same speed every time,
//  * it looks robotic and Google's bot-detection is more likely to flag it.
//  * Randomized pauses make the browsing pattern look more human.
//  */
// function randomDelay(minMs, maxMs) {
//     const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
//     return new Promise((resolve) => setTimeout(resolve, ms));
// }

// // Regex patterns used to find emails/phones/social links inside raw HTML.
// // Defined once at the top of the file (not inside functions) so they're
// // compiled a single time instead of on every call.
// const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// const PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/g;

// // Emails matching these patterns are junk — image filenames that happen to
// // look like emails, or known third-party service addresses that aren't the
// // actual business's contact email.
// const EMAIL_BLOCKLIST_EXT = /\.(png|jpe?g|gif|svg|webp|css|js|json)$/i;
// const EMAIL_BLOCKLIST_DOMAINS = ["example.com", "sentry.io", "wixpress.com"];


// class CommonWorkflowService {

//     constructor() {
//         // The ONE shared browser instance, reused across every request.
//         // Starts as null — gets created the first time it's needed.
//         this.browser = null;

//         // Prevents two requests arriving at the exact same moment from
//         // both trying to launch a browser at once.
//         this.browserLaunchPromise = null;

//         // In-memory cache for contact-enrichment results, keyed by the
//         // Google Maps link of the business.
//         // Shape: Map<googleMapsLink, { data: {...}, expiresAt: timestamp }>
//         //
//         // TO SWAP FOR REDIS LATER: replace this Map with redis.get/set
//         // calls inside `getBusinessContact()` — that's the only place
//         // this cache is read from and written to.
//         this.contactCache = new Map();
//     }


//     // ==========================================================================
//     // BROWSER LIFECYCLE
//     // ==========================================================================

//     /**
//      * Returns the shared browser, launching it if it doesn't exist yet
//      * or has crashed/disconnected.
//      */
//     async getSharedBrowser() {

//         if (this.browser && this.browser.isConnected()) {
//             return this.browser;
//         }

//         // If another request is already launching the browser right now,
//         // wait for that instead of launching a second one.
//         if (this.browserLaunchPromise) {
//             return this.browserLaunchPromise;
//         }

//         this.browserLaunchPromise = chromium
//             .launch({
//                 headless: CONFIG.headless,
//                 slowMo: CONFIG.slowMo,
//                 args: [
//                     "--disable-blink-features=AutomationControlled",
//                     "--disable-dev-shm-usage",
//                 ],
//             })
//             .then((browser) => {

//                 this.browser = browser;
//                 this.browserLaunchPromise = null;

//                 // Chrome occasionally crashes under load. If that happens,
//                 // forget the dead reference so the next request launches
//                 // a fresh one instead of trying to use a broken browser.
//                 browser.on("disconnected", () => {
//                     console.warn("[CommonWorkflowService] Browser disconnected. Will relaunch on next request.");
//                     this.browser = null;
//                 });

//                 return browser;

//             });

//         return this.browserLaunchPromise;

//     }

//     /**
//      * Opens a fresh, isolated browser context — like a new private/incognito
//      * window. Every request gets its own context so concurrent users never
//      * share cookies, login state, or cache with each other.
//      *
//      * IMPORTANT: whoever calls this MUST close the context when done
//      * (always inside a try/finally), or memory will leak over time.
//      */
//     async createIsolatedContext() {

//         const browser = await this.getSharedBrowser();

//         const context = await browser.newContext({
//             viewport: { width: 1600, height: 900 },
//             locale: "en-IN",
//             timezoneId: "Asia/Kolkata",
//             userAgent:
//                 "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
//         });

//         // Block images/fonts/video for every page opened in this context.
//         // We never need to actually SEE the page, only read its text/HTML,
//         // so this makes every page load noticeably faster and lighter.
//         await context.route(/\.(png|jpg|jpeg|gif|webp|woff2?|mp4)(\?.*)?$/i, (route) =>
//             route.abort()
//         );

//         return context;

//     }

//     /**
//      * Call this when your server is shutting down, to close the browser
//      * cleanly instead of leaving an orphaned Chrome process running.
//      */
//     async shutdown() {
//         if (this.browser) {
//             await this.browser.close();
//             this.browser = null;
//         }
//     }


//     // ==========================================================================
//     // STAGE 1 — DISCOVERY (fast search, powers the live results screen)
//     // ==========================================================================

//     /**
//      * Alias for discoverBusinesses — kept so existing controller code calling
//      * `searchBusinesses(...)` doesn't need to change. Both names do the
//      * exact same thing; pick one name and use it consistently going forward
//      * to avoid confusion for anyone else reading this codebase.
//      */
//     async searchBusinesses(keyword, location) {
//         return this.discoverBusinesses(keyword, location);
//     }

//     /**
//      * Searches Google Maps for `keyword` in `location` and returns a list
//      * of businesses with the info that's already visible on the results
//      * feed. Does NOT visit each business's website or detail page — that
//      * would make this far too slow for a "live search" experience.
//      *
//      * @param {string} keyword   e.g. "motorcycle customization"
//      * @param {string} location  e.g. "Porbandar Gujarat"
//      * @returns {Promise<Array<object>>}
//      */
//     async discoverBusinesses(keyword, location) {

//         if (!keyword || !keyword.trim()) {
//             throw new Error("keyword is required");
//         }
//         if (!location || !location.trim()) {
//             throw new Error("location is required");
//         }

//         const context = await this.createIsolatedContext();

//         try {

//             const page = await context.newPage();

//             await this.searchGoogleMaps(page, keyword.trim(), location.trim());

//             const rawResults = await this.collectFeedCards(page);

//             console.log(`[Discovery] "${keyword} ${location}" -> ${rawResults.length} businesses found.`);

//             return this.normalizeDiscoveryResults(rawResults);

//         } finally {
//             // ALWAYS close the context, even if something above threw an
//             // error. Otherwise every failed search leaks browser memory.
//             await context.close();
//         }

//     }

//     /**
//      * Tries a list of CSS selectors in order and returns the first one
//      * that actually appears on the page. Google changes its internal
//      * class names often, so having several fallback selectors makes this
//      * far less likely to break when that happens.
//      */
//     async waitForAnySelector(page, selectors, timeout = 15000) {

//         for (const selector of selectors) {
//             try {
//                 const locator = page.locator(selector).first();
//                 await locator.waitFor({ state: "visible", timeout });
//                 return locator;
//             } catch (error) {
//                 // This selector didn't show up — try the next one.
//             }
//         }

//         throw new Error(`None of these selectors appeared on the page:\n${selectors.join("\n")}`);

//     }


//     async searchGoogleMaps(page, keyword, location) {

//         await page.goto("https://www.google.com/maps?hl=en", {
//             waitUntil: "domcontentloaded",
//             timeout: CONFIG.navTimeoutMs,
//         });

//         await randomDelay(1000, 1800);

//         // The cookie-consent popup doesn't always appear (depends on
//         // session/region), so we check for it briefly and move on if
//         // it's not there instead of waiting the full timeout.
//         const cookieButtonSelectors = [
//             "text=Accept all",
//             "text=I agree",
//             "button:has-text('Accept all')",
//             "button:has-text('Agree')",
//         ];

//         for (const selector of cookieButtonSelectors) {
//             try {
//                 const button = page.locator(selector).first();
//                 if (await button.isVisible({ timeout: 1200 })) {
//                     await button.click();
//                     await randomDelay(800, 1500);
//                     break;
//                 }
//             } catch (error) {
//                 // Not present this time — that's fine, try the next selector.
//             }
//         }

//         const searchQuery = `${keyword} ${location}`;

//         const searchBox = await this.waitForAnySelector(page, [
//             "input#searchboxinput",
//             "input[name='q']",
//             "input[aria-label='Search Google Maps']",
//         ]);

//         await searchBox.fill(searchQuery);
//         await searchBox.press("Enter");

//         // After hitting Enter, Maps either shows a scrollable list of
//         // many results (the "feed") OR, if the query is very specific,
//         // jumps straight to a single business's detail page. We wait for
//         // either outcome.
//         await this.waitForAnySelector(
//             page,
//             ["div[role='feed']", "div.m6QErb[role='feed']", "h1.DUwDvf"],
//             20000
//         ).catch(() => {
//             console.warn(`[Discovery] No results feed or detail panel appeared for "${searchQuery}".`);
//         });

//         await randomDelay(1000, 1800);

//     }


//     async collectFeedCards(page) {

//         // Some very specific searches skip the list entirely and open one
//         // business directly. Handle that case first.
//         const singleResult = await this.tryExtractSingleResult(page);
//         if (singleResult) {
//             return [singleResult];
//         }

//         const feedIsPresent = await page.locator("div[role='feed']").count();
//         if (!feedIsPresent) {
//             return []; // No matches for this search at all.
//         }

//         const feed = page.locator("div[role='feed']").first();

//         let previousCardCount = 0;
//         let roundsWithNoNewCards = 0;

//         for (let attempt = 0; attempt < CONFIG.maxScrollAttempts; attempt++) {

//             const currentCardCount = await page
//                 .locator("div[role='feed'] > div > div[jsaction]")
//                 .count();

//             if (currentCardCount >= CONFIG.maxResults) {
//                 console.log(`[Discovery] Hit max results cap (${CONFIG.maxResults}).`);
//                 break;
//             }

//             // Scroll the feed container down by its own height.
//             await feed.evaluate((el) => el.scrollBy(0, el.scrollHeight));

//             await randomDelay(900, 1600);

//             const newCardCount = await page
//                 .locator("div[role='feed'] > div > div[jsaction]")
//                 .count();

//             if (newCardCount === previousCardCount) {

//                 roundsWithNoNewCards++;

//                 const reachedEndOfList = await page
//                     .locator("text=You've reached the end of the list")
//                     .count();

//                 // Stop if Google explicitly says we're done, OR if we've
//                 // scrolled 3 times in a row with zero new results (means
//                 // we're stuck, even without the explicit end-of-list message).
//                 if (reachedEndOfList > 0 || roundsWithNoNewCards >= 3) {
//                     break;
//                 }

//             } else {
//                 roundsWithNoNewCards = 0;
//             }

//             previousCardCount = newCardCount;

//         }

//         return await this.extractCardsFromFeed(page);

//     }

 




//     async tryExtractSingleResult(page) {

//         const hasDetailHeading = await page.locator("h1.DUwDvf").count();
//         if (!hasDetailHeading) {
//             return null;
//         }

//         try {

//             return await page.evaluate(() => {

//                 const getText = (selector) =>
//                     document.querySelector(selector)?.textContent?.trim() || null;

//                 const name = getText("h1.DUwDvf");
//                 if (!name) return null;

//                 const category =
//                     document.querySelector("button[jsaction*='category']")?.textContent?.trim() || null;

//                 const ratingText = getText("div.F7nice span[aria-hidden='true']");
//                 const rating = ratingText ? parseFloat(ratingText.replace(",", ".")) : null;

//                 const reviewMatch = document
//                     .querySelector("div.F7nice")
//                     ?.textContent?.match(/[\d,]+/g);
//                 const reviewCount = reviewMatch
//                     ? parseInt(reviewMatch[reviewMatch.length - 1].replace(/,/g, ""), 10)
//                     : null;

//                 const addressRaw = document
//                     .querySelector("button[data-item-id='address']")
//                     ?.getAttribute("aria-label");
//                 const address = addressRaw ? addressRaw.replace(/^Address:\s*/i, "") : null;

//                 return {
//                     business_name: name,
//                     category,
//                     google_rating: rating,
//                     review_count: reviewCount,
//                     address,
//                     google_maps_link: window.location.href,
//                 };

//             });

//         } catch (error) {
//             console.warn("[Discovery] Failed reading single-result panel:", error.message);
//             return null;
//         }

//     }

//     /**
//      * Reads every business "card" currently rendered in the results feed
//      * and pulls out the fields visible on the card itself.
//      *
//      * NOTE on selectors: Google obfuscates its CSS class names (e.g.
//      * "Nv2PK") and changes them periodically. Where possible we rely on
//      * structural attributes instead — like role="feed" and the fact that
//      * every card contains a link to "/maps/place/" — because those are
//      * far more stable across Google's frontend updates than class names.
//      */
//     async extractCardsFromFeed(page) {

//         return await page.evaluate(() => {

//             const feed = document.querySelector("div[role='feed']");
//             if (!feed) return [];

//             // A "card" is any direct child of the feed that contains a
//             // link to a business's detail page.
//             const cardNodes = Array.from(feed.children).filter((node) =>
//                 node.querySelector("a[href*='/maps/place/']")
//             );

//             const seenLinks = new Set(); // avoids duplicate entries
//             const results = [];

//             for (const card of cardNodes) {

//                 const linkEl = card.querySelector("a[href*='/maps/place/']");
//                 if (!linkEl) continue;

//                 const href = linkEl.href;
//                 if (seenLinks.has(href)) continue;
//                 seenLinks.add(href);

//                 const name =
//                     linkEl.getAttribute("aria-label")?.trim() ||
//                     card.querySelector(".qBF1Pd, .fontHeadlineSmall")?.textContent?.trim() ||
//                     null;

//                 if (!name) continue; // can't use a result with no name

//                 // Rating and review count are usually rendered together,
//                 // e.g. "4.5(238)".
//                 const ratingBlock = card.querySelector("span.MW4etd, span[aria-label*='stars']");
//                 const reviewBlock = card.querySelector("span.UY7F9, span[aria-label*='Reviews']");

//                 let rating = null;
//                 if (ratingBlock) {
//                     const text = ratingBlock.textContent || ratingBlock.getAttribute("aria-label") || "";
//                     const match = text.match(/[\d.]+/);
//                     if (match) rating = parseFloat(match[0]);
//                 }

//                 let reviewCount = null;
//                 if (reviewBlock) {
//                     const text = reviewBlock.textContent || reviewBlock.getAttribute("aria-label") || "";
//                     const match = text.match(/[\d,]+/);
//                     if (match) reviewCount = parseInt(match[0].replace(/,/g, ""), 10);
//                 }

//                 // Category and address are rendered as short text rows,
//                 // separated by "·". BUG FIX: the previous version used
//                 // `/^\d/` (starts with a digit) to detect addresses, but
//                 // rating strings like "4.5(706)" ALSO start with a digit
//                 // — so ratings were getting misread as addresses, and
//                 // review counts were getting corrupted in the process.
//                 //
//                 // Fix: explicitly exclude any text chunk that matches a
//                 // rating pattern (digit.digit, optionally followed by a
//                 // parenthesized review count) BEFORE checking whether
//                 // something looks like an address. Address detection
//                 // also now requires a real street-address shape — a
//                 // leading number followed by a space and more text — not
//                 // just "starts with any digit."
//                 const RATING_PATTERN = /^\d\.\d(\(\d+\))?$/; // e.g. "4.5" or "4.5(706)"
//                 const STREET_ADDRESS_PATTERN = /^\d+[\s,].{3,}/; // e.g. "12 MG Road" — digit, then space/comma, then more text
//                 const ADDRESS_KEYWORD_PATTERN =
//                     /(road|street|rd\.?|st\.?|nagar|circle|chowk|society|marg|highway|sector|block|floor|plot)/i;
//                 const HOURS_PATTERN = /(open|closed|closes|opens|⋅|am|pm)\b/i; // e.g. "Open ⋅ Closes 10 PM"

//                 const infoRows = Array.from(card.querySelectorAll(".W4Efsd"))
//                     .map((el) => el.textContent.trim())
//                     .filter(Boolean);

//                 let category = null;
//                 let address = null;

//                 for (const row of infoRows) {

//                     const parts = row.split("·").map((p) => p.trim()).filter(Boolean);

//                     for (const part of parts) {

//                         // Skip anything that's actually the rating/review
//                         // text — this is the chunk that was corrupting
//                         // the address field before.
//                         if (RATING_PATTERN.test(part)) continue;

//                         // Skip opening-hours text ("Open ⋅ Closes 10 PM")
//                         // — without this it gets misclassified as category.
//                         if (HOURS_PATTERN.test(part)) continue;

//                         const looksLikeAddress =
//                             STREET_ADDRESS_PATTERN.test(part) ||
//                             ADDRESS_KEYWORD_PATTERN.test(part);

//                         if (looksLikeAddress && !address) {
//                             address = part;
//                         } else if (!looksLikeAddress && !category && part.length < 40) {
//                             category = part;
//                         }

//                     }

//                 }

//                 results.push({
//                     business_name: name,
//                     category,
//                     address,
//                     google_rating: rating,
//                     review_count: reviewCount,
//                     google_maps_link: href,
//                 });

//             }

//             return results;

//         });

//     }

//     /**
//      * Makes sure every discovery result has the exact same shape, with
//      * missing fields explicitly set to null (not undefined, not missing
//      * entirely) — this keeps the frontend code simple and predictable.
//      */
//     normalizeDiscoveryResults(rawResults) {
//         return rawResults.map((item) => ({
//             business_name: item.business_name || null,
//             category: item.category || null,
//             address: item.address || null,
//             google_rating: item.google_rating ?? null,
//             review_count: item.review_count ?? null,
//             google_maps_link: item.google_maps_link || null,
//         }));
//     }


//     // ==========================================================================
//     // STAGE 2 — CONTACT ENRICHMENT (runs once, only when user clicks a result)
//     // ==========================================================================

//     /**
//      * Given the google_maps_link of ONE business (from a discoverBusinesses
//      * result), fetches its phone number and website from the Maps detail
//      * page, then visits that website to find an email address and social
//      * media links.
//      *
//      * This is intentionally a separate, slower call from discovery — it's
//      * only meant to run when a user actually clicks into a specific
//      * business, not for every result in a search.
//      *
//      * @param {string} googleMapsLink
//      * @returns {Promise<object>} { phone, website, email, instagram, facebook, linkedin }
//      */
//     async getBusinessContact(googleMapsLink) {

//         if (!googleMapsLink) {
//             throw new Error("googleMapsLink is required");
//         }

//         // Check the cache first — if we already fetched this business's
//         // contact info recently, return that instead of scraping again.
//         const cached = this.readFromCache(googleMapsLink);
//         if (cached) {
//             console.log(`[Enrichment] Cache hit for ${googleMapsLink}`);
//             return cached;
//         }

//         const context = await this.createIsolatedContext();

//         try {

//             const page = await context.newPage();

//             const detailInfo = await this.getDetailPanelInfo(page, googleMapsLink);

//             let websiteInfo = {
//                 email: null,
//                 phone: null,
//                 instagram: null,
//                 facebook: null,
//                 linkedin: null,
//             };

//             if (detailInfo.website) {
//                 try {
//                     websiteInfo = await this.scrapeWebsiteForContactInfo(context, detailInfo.website);
//                 } catch (error) {
//                     // If the business's website is down, broken, or blocks
//                     // bots, we still want to return whatever Maps gave us
//                     // instead of failing the whole request.
//                     console.warn(`[Enrichment] Could not scrape website ${detailInfo.website}:`, error.message);
//                 }
//             }

//             const result = {
//                 address: detailInfo.address,
//                 phone: detailInfo.phone || websiteInfo.phone || null,
//                 website: detailInfo.website || null,
//                 email: websiteInfo.email,
//                 instagram: websiteInfo.instagram,
//                 facebook: websiteInfo.facebook,
//                 linkedin: websiteInfo.linkedin,
//             };

//             this.writeToCache(googleMapsLink, result);

//             return result;

//         } finally {
//             await context.close();
//         }

//     }

//     /**
//      * Opens a business's own Maps detail page and reads its phone number,
//      * website link, and address from there.
//      */
//     async getDetailPanelInfo(page, googleMapsLink) {

//         await page.goto(googleMapsLink, {
//             waitUntil: "domcontentloaded",
//             timeout: CONFIG.navTimeoutMs,
//         });

//         await randomDelay(1000, 1800);

//         // Wait for the business name heading to appear, confirming the
//         // detail panel has actually loaded. We don't fail hard if it
//         // times out — we just try reading whatever's there.
//         await this.waitForAnySelector(page, ["h1.DUwDvf"], 10000).catch(() => null);

//         return await page.evaluate(() => {

//             const addressRaw = document
//                 .querySelector("button[data-item-id='address']")
//                 ?.getAttribute("aria-label");
//             const address = addressRaw ? addressRaw.replace(/^Address:\s*/i, "") : null;

//             const phoneButton = document.querySelector("button[data-item-id^='phone:tel:']");
//             const phoneRaw = phoneButton ? phoneButton.getAttribute("aria-label") : null;
//             const phone = phoneRaw ? phoneRaw.replace(/^Phone:\s*/i, "") : null;

//             const websiteLink = document.querySelector("a[data-item-id='authority']");
//             const website = websiteLink ? websiteLink.href : null;

//             return { address, phone, website };

//         });

//     }

//     /**
//      * Visits a business's own website and scans its HTML for an email
//      * address, phone number, and social media links. If nothing is found
//      * on the homepage, makes one extra attempt on a "Contact" page if one
//      * exists — many sites put contact details there instead of the
//      * homepage.
//      */
//     async scrapeWebsiteForContactInfo(context, websiteUrl) {

//         const page = await context.newPage();

//         try {

//             await page.goto(websiteUrl, {
//                 waitUntil: "domcontentloaded",
//                 timeout: CONFIG.websiteTimeoutMs,
//             });

//             // Small pause to let any lazy-loaded footer content (where
//             // contact info often lives) finish rendering.
//             await page.waitForTimeout(600);

//             const html = await page.content();

//             const emails = this.extractEmails(html);
//             const phones = this.extractPhones(html);
//             const socials = this.extractSocialLinks(html);

//             if (emails.length === 0) {

//                 const contactPageData = await this.tryContactPage(page);

//                 if (contactPageData) {
//                     emails.push(...contactPageData.emails);
//                     phones.push(...contactPageData.phones);
//                     socials.instagram = socials.instagram || contactPageData.socials.instagram;
//                     socials.facebook = socials.facebook || contactPageData.socials.facebook;
//                     socials.linkedin = socials.linkedin || contactPageData.socials.linkedin;
//                 }

//             }

//             return {
//                 email: emails[0] || null,
//                 phone: phones[0] || null,
//                 instagram: socials.instagram,
//                 facebook: socials.facebook,
//                 linkedin: socials.linkedin,
//             };

//         } finally {
//             await page.close();
//         }

//     }

//     /**
//      * Looks for a link containing the word "contact" on the current page,
//      * navigates to it, and extracts contact info from that page instead.
//      * Returns null if no contact link is found or navigation fails.
//      */
//     async tryContactPage(page) {

//         try {

//             const contactPageUrl = await page.evaluate(() => {
//                 const link = Array.from(document.querySelectorAll("a")).find(
//                     (a) => /contact/i.test(a.textContent || "") || /contact/i.test(a.href || "")
//                 );
//                 return link ? link.href : null;
//             });

//             if (!contactPageUrl) return null;

//             await page.goto(contactPageUrl, {
//                 waitUntil: "domcontentloaded",
//                 timeout: CONFIG.websiteTimeoutMs,
//             });

//             const html = await page.content();

//             return {
//                 emails: this.extractEmails(html),
//                 phones: this.extractPhones(html),
//                 socials: this.extractSocialLinks(html),
//             };

//         } catch (error) {
//             return null; // contact page didn't exist or failed to load — that's fine
//         }

//     }

//     /**
//      * Pulls all email addresses out of raw HTML text, removes obvious
//      * junk matches (image filenames, known non-business domains), and
//      * removes duplicates.
//      */
//     extractEmails(html) {

//         const matches = html.match(EMAIL_REGEX) || [];

//         const cleaned = matches
//             .map((email) => email.toLowerCase())
//             .filter((email) => !EMAIL_BLOCKLIST_EXT.test(email))
//             .filter((email) => !EMAIL_BLOCKLIST_DOMAINS.some((domain) => email.endsWith(domain)));

//         return [...new Set(cleaned)];

//     }

//     /**
//      * Pulls phone-number-shaped strings out of raw HTML text. Strips HTML
//      * tags first so we don't accidentally match version numbers or IDs
//      * hiding inside attribute values.
//      */
//     extractPhones(html) {

//         const textOnly = html.replace(/<[^>]*>/g, " ");

//         const matches = textOnly.match(PHONE_REGEX) || [];

//         const cleaned = matches
//             .map((phone) => phone.replace(/[\s.-]/g, ""))
//             .filter((phone) => phone.length >= 7 && phone.length <= 15);

//         return [...new Set(cleaned)];

//     }

//     /**
//      * Finds the first Instagram/Facebook/LinkedIn link present in the
//      * given HTML, if any.
//      */
//     extractSocialLinks(html) {

//         const findFirstMatch = (pattern) => {
//             const match = html.match(pattern);
//             return match ? match[0] : null;
//         };

//         return {
//             instagram: findFirstMatch(/https?:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.\-/]+/i),
//             facebook: findFirstMatch(/https?:\/\/(www\.)?facebook\.com\/[A-Za-z0-9_.\-/]+/i),
//             linkedin: findFirstMatch(/https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[A-Za-z0-9_.\-/]+/i),
//         };

//     }


//     // ==========================================================================
//     // SIMPLE IN-MEMORY CACHE (for contact enrichment results)
//     // ==========================================================================

//     readFromCache(key) {

//         const entry = this.contactCache.get(key);
//         if (!entry) return null;

//         if (Date.now() > entry.expiresAt) {
//             this.contactCache.delete(key); // expired — remove it
//             return null;
//         }

//         return entry.data;

//     }

//     writeToCache(key, data) {
//         this.contactCache.set(key, {
//             data,
//             expiresAt: Date.now() + CONFIG.contactCacheTtlMs,
//         });
//     }

// }

// // Exported as a single shared instance (not a class you instantiate
// // yourself) so the same browser and cache are reused across your whole
// // app, instead of every import accidentally creating a new one.
// export default new CommonWorkflowService();

