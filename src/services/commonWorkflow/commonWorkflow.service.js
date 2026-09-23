
// import { chromium } from "playwright";



// const CONFIG = {
//     headless: process.env.SCRAPER_HEADLESS !== "false",
//     slowMo: Number(process.env.SCRAPER_SLOWMO || 0),
//     maxResults: Number(process.env.SCRAPER_MAX_RESULTS || 60),
//     maxScrollAttempts: Number(process.env.SCRAPER_MAX_SCROLLS || 40),
//     navTimeoutMs: 60000,
//     contactCacheTtlMs: Number(process.env.CONTACT_CACHE_TTL_MS || 24 * 60 * 60 * 1000),
// };


// // ----------------------------------------------------------------------------
// // Small reusable helpers
// // ----------------------------------------------------------------------------

// function randomDelay(minMs, maxMs) {
//     const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
//     return new Promise((resolve) => setTimeout(resolve, ms));
// }
// function normalizeSearchText(value) {

//     return String(value || "")
//         .toLowerCase()
//         .normalize("NFKD")
//         .replace(/[\u0300-\u036f]/g, "")
//         .replace(/[^a-z0-9\s]/g, " ")
//         .replace(/\s+/g, " ")
//         .trim();

// }

// function singularizeWord(word) {

//     const value = normalizeSearchText(word);

//     if (!value) {
//         return "";
//     }

//     if (value.endsWith("ies") && value.length > 3) {
//         return value.slice(0, -3) + "y";
//     }

//     if (
//         value.endsWith("sses") ||
//         value.endsWith("shes") ||
//         value.endsWith("ches") ||
//         value.endsWith("xes") ||
//         value.endsWith("zes")
//     ) {
//         return value.slice(0, -2);
//     }

//     if (
//         value.endsWith("s") &&
//         !value.endsWith("ss")
//     ) {
//         return value.slice(0, -1);
//     }

//     return value;
// }


// function getSearchTokens(value) {

//     return normalizeSearchText(value)
//         .split(" ")
//         .map(singularizeWord)
//         .filter(
//             word =>
//                 word.length >= 2
//         );

// }
 

// /*
// |--------------------------------------------------------------------------
// | Common keyword synonyms
// |--------------------------------------------------------------------------
// |
// | These prevent legitimate businesses from being rejected simply because
// | Google uses a different category name.
// |
// */

// const KEYWORD_SYNONYMS = {

//     gym: [
//         "gym",
//         "gymnasium",
//         "fitness",
//         "fitness center",
//         "fitness centre",
//         "health club",
//         "crossfit",
//         "workout",
//         "training",
//     ],

//     hotel: [
//         "hotel",
//         "resort",
//         "inn",
//         "lodge",
//         "guest house",
//         "guesthouse",
//     ],

//     dentist: [
//         "dentist",
//         "dental",
//         "dental clinic",
//         "dental hospital",
//         "orthodontist",
//         "oral",
//     ],

//     restaurant: [
//         "restaurant",
//         "cafe",
//         "food",
//         "dining",
//         "eatery",
//         "kitchen",
//     ],

// };

// function getKeywordTerms(keyword) {

//     const normalized =
//         normalizeSearchText(keyword);

//     const terms = new Set(
//         getSearchTokens(keyword)
//     );

//     for (const token of terms) {

//         const synonyms =
//             KEYWORD_SYNONYMS[token];

//         if (!synonyms) {
//             continue;
//         }

//         for (const synonym of synonyms) {

//             terms.add(
//                 normalizeSearchText(
//                     synonym
//                 )
//             );

//         }

//     }

//     return Array.from(terms);

// }

// function isKeywordRelevant(
//     business,
//     keyword
// ) {

//     const keywordTerms =
//         getKeywordTerms(keyword);

//     if (!keywordTerms.length) {
//         return true;
//     }

//     const searchableText =
//         normalizeSearchText(
//             [
//                 business.business_name,
//                 business.category,
//             ]
//                 .filter(Boolean)
//                 .join(" ")
//         );

//     if (!searchableText) {
//         return false;
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Exact phrase match
//     |--------------------------------------------------------------------------
//     */

//     const normalizedKeyword =
//         normalizeSearchText(keyword);

//     if (
//         normalizedKeyword &&
//         searchableText.includes(
//             normalizedKeyword
//         )
//     ) {

//         return true;

//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Term / synonym match
//     |--------------------------------------------------------------------------
//     */

//     return keywordTerms.some(term => {

//         return searchableText.includes(term);

//     });

// }

// function isLocationRelevant(
//     business,
//     location
// ) {

//     const normalizedLocation =
//         normalizeSearchText(location);

//     if (!normalizedLocation) {
//         return true;
//     }

//     const address =
//         normalizeSearchText(
//             business.address
//         );

//     /*
//     |--------------------------------------------------------------------------
//     | If Google did not give us an address, don't reject the result solely
//     | because location cannot be verified.
//     |--------------------------------------------------------------------------
//     */

//     if (!address) {
//         return true;
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Direct location match
//     |--------------------------------------------------------------------------
//     */

//     if (
//         address.includes(
//             normalizedLocation
//         )
//     ) {

//         return true;

//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Token-based location match
//     |--------------------------------------------------------------------------
//     */

//     const locationTokens =
//         getSearchTokens(location);

//     if (!locationTokens.length) {
//         return true;
//     }

//     const matchedTokens =
//         locationTokens.filter(
//             token =>
//                 address.includes(token)
//         );

//     /*
//     |--------------------------------------------------------------------------
//     | For multi-word locations, require a meaningful portion of the
//     | location to appear in the address.
//     |--------------------------------------------------------------------------
//     */

//     if (
//         locationTokens.length > 1 &&
//         matchedTokens.length >=
//             Math.ceil(
//                 locationTokens.length / 2
//             )
//     ) {

//         return true;

//     }

//     if (
//         locationTokens.length === 1 &&
//         matchedTokens.length === 1
//     ) {

//         return true;

//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Address exists but does not match the requested location.
//     |
//     | This is the important part that stops:
//     |
//     | Gym + Ahmedabad
//     |
//     | from returning:
//     |
//     | Dental Clinic + Rajkot
//     |--------------------------------------------------------------------------
//     */

//     return false;

// }

// function filterRelevantBusinesses(
//     businesses,
//     keyword,
//     location
// ) {

//     const seen = new Set();

//     const filtered = [];

//     for (const business of businesses) {

//         if (!business) {
//             continue;
//         }

//         const mapsLink =
//             normalizeSearchText(
//                 business.google_maps_link
//             );

//         /*
//         |--------------------------------------------------------------------------
//         | Remove duplicate Google Maps results
//         |--------------------------------------------------------------------------
//         */

//         if (
//             mapsLink &&
//             seen.has(mapsLink)
//         ) {

//             continue;

//         }

//         if (mapsLink) {
//             seen.add(mapsLink);
//         }

//         /*
//         |--------------------------------------------------------------------------
//         | Keyword relevance
//         |--------------------------------------------------------------------------
//         */

//         if (
//             !isKeywordRelevant(
//                 business,
//                 keyword
//             )
//         ) {

//             continue;

//         }

//         /*
//         |--------------------------------------------------------------------------
//         | Location relevance
//         |--------------------------------------------------------------------------
//         */

//         if (
//             !isLocationRelevant(
//                 business,
//                 location
//             )
//         ) {

//             continue;

//         }

//         filtered.push(
//             business
//         );

//     }

//     return filtered;

// }


// class CommonWorkflowService {

//     constructor() {
//         this.browser = null;
//         this.browserLaunchPromise = null;
//         this.contactCache = new Map();
//     }


//     // ==========================================================================
//     // BROWSER LIFECYCLE
//     // ==========================================================================

//     async getSharedBrowser() {

//         if (this.browser && this.browser.isConnected()) {
//             return this.browser;
//         }

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

//                 browser.on("disconnected", () => {
//                     console.warn("[CommonWorkflowService] Browser disconnected. Will relaunch on next request.");
//                     this.browser = null;
//                 });

//                 return browser;

//             });

//         return this.browserLaunchPromise;

//     }

//     async createIsolatedContext() {

//         const browser = await this.getSharedBrowser();

//         const context = await browser.newContext({
//             viewport: { width: 1600, height: 900 },
//             locale: "en-IN",
//             timezoneId: "Asia/Kolkata",
//             userAgent:
//                 "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
//         });

//    await context.route("**/*", (route) => {

//     const type = route.request().resourceType();

//     switch (type) {

//         case "image":
//         case "media":
//         case "font":
//             return route.abort();

//         default:
//             return route.continue();
//     }

// });

//         return context;

//     }

//     async shutdown() {
//         if (this.browser) {
//             await this.browser.close();
//             this.browser = null;
//         }
//     }


//     // ==========================================================================
//     // STAGE 1 — DISCOVERY
//     // ==========================================================================

// async searchBusinesses(keyword, location) {
//         return this.discoverBusinesses(keyword, location);
//     }

//    async discoverBusinesses(keyword, location) {

//     if (!keyword || !keyword.trim()) {
//         throw new Error("keyword is required");
//     }

//     if (!location || !location.trim()) {
//         throw new Error("location is required");
//     }

//     const cleanKeyword =
//         keyword.trim();

//     const cleanLocation =
//         location.trim();

//     const context =
//         await this.createIsolatedContext();

//     try {

//         const page =
//             await context.newPage();

//         const searchStart =
//             performance.now();

//         await this.searchGoogleMaps(
//             page,
//             cleanKeyword,
//             cleanLocation
//         );

//         console.log(
//             "Google Maps Search:",
//             (
//                 (performance.now() -
//                     searchStart) /
//                 1000
//             ).toFixed(2),
//             "seconds"
//         );

//         console.time(
//             "Collect Feed Cards"
//         );

//         const rawResults =
//             await this.collectFeedCards(
//                 page
//             );

//         console.timeEnd(
//             "Collect Feed Cards"
//         );

//         console.log(
//             `[Discovery] "${cleanKeyword} ${cleanLocation}" -> ${rawResults.length} raw businesses found.`
//         );

//         /*
//         |--------------------------------------------------------------------------
//         | IMPORTANT:
//         | Google Maps results are candidates, NOT automatically valid results.
//         |--------------------------------------------------------------------------
//         */

//         const relevantResults =
//             filterRelevantBusinesses(
//                 rawResults,
//                 cleanKeyword,
//                 cleanLocation
//             );
//             console.log(
//     "[Discovery] Sample raw results:",
//     JSON.stringify(
//         rawResults.slice(0, 10),
//         null,
//         2
//     )
// );

//         console.log(
//             `[Discovery] "${cleanKeyword} ${cleanLocation}" -> ${relevantResults.length} relevant businesses after filtering.`
//         );

//         return this.normalizeDiscoveryResults(
//             relevantResults
//         );

//     } finally {

//         await context.close();

//     }

// }

//     async enrichWithContactDetails(page, results) {

//         for (let i = 0; i < results.length; i++) {

//             const business = results[i];

//             if (!business.google_maps_link) {
//                 business.phone = null;
//                 business.website = null;
//                 continue;
//             }

//             try {

//                 console.log(`[Enrichment] ${i + 1}/${results.length} — ${business.business_name}`);

//                 await page.goto(business.google_maps_link, {
//                     waitUntil: "domcontentloaded",
//                     timeout: CONFIG.navTimeoutMs,
//                 });

//                 await randomDelay(800, 1400);

//                 const contactInfo = await page.evaluate(() => {

//                     const phoneButton = document.querySelector("button[data-item-id^='phone:tel:']");
//                     const phoneRaw = phoneButton ? phoneButton.getAttribute("aria-label") : null;
//                     const phone = phoneRaw ? phoneRaw.replace(/^Phone:\s*/i, "").trim() : null;

//                     const websiteLink = document.querySelector("a[data-item-id='authority']");
//                     const website = websiteLink ? websiteLink.href : null;

//                     return { phone, website };

//                 });

//                 business.phone = contactInfo.phone;
//                 business.website = contactInfo.website;

//             } catch (error) {
//                 console.warn(`[Enrichment] Failed for "${business.business_name}":`, error.message);
//                 business.phone = null;
//                 business.website = null;
//             }

//         }

//         return results;

//     }

//     async waitForAnySelector(page, selectors, timeout = 15000) {

//         for (const selector of selectors) {
//             try {
//                 const locator = page.locator(selector).first();
//                 await locator.waitFor({ state: "visible", timeout });
//                 return locator;
//             } catch (error) {
//                 // Try next selector
//             }
//         }

//         throw new Error(`None of these selectors appeared on the page:\n${selectors.join("\n")}`);

//     }


// async searchGoogleMaps(page, keyword, location) {

//     let t = Date.now();

//     await page.goto("https://www.google.com/maps?hl=en", {
//         waitUntil: "domcontentloaded",
//         timeout: CONFIG.navTimeoutMs,
//     });
//     console.log("goto:", Date.now() - t);

//     t = Date.now();
//     await page.waitForLoadState("load");
//     console.log("load:", Date.now() - t);

//     const cookieButtonSelectors = [
//         "text=Accept all",
//         "text=I agree",
//         "button:has-text('Accept all')",
//         "button:has-text('Agree')",
//     ];

//     t = Date.now();
//     for (const selector of cookieButtonSelectors) {
//         try {
//             const button = page.locator(selector).first();
//             if (await button.isVisible({ timeout: 1200 })) {
//                 await button.click();
//                 await page.waitForLoadState("load");
//                 break;
//             }
//         } catch {}
//     }
//     console.log("cookie:", Date.now() - t);

//     const searchQuery =
//     `${keyword} in ${location}`;

//     t = Date.now();
// const searchBox = page.locator("input[name='q']").first();

// console.log("search box:", Date.now() - t);

// t = Date.now();

// await searchBox.fill(searchQuery);
// await searchBox.press("Enter");

// console.log("submit:", Date.now() - t);

//     t = Date.now();
//     await this.waitForAnySelector(
//         page,
//         ["div[role='feed']", "div.m6QErb[role='feed']", "h1.DUwDvf"],
//         20000
//     );
//     console.log("results:", Date.now() - t);
// }


//     async collectFeedCards(page) {

//         const singleResult = await this.tryExtractSingleResult(page);
//         if (singleResult) {
//             return [singleResult];
//         }

//         const feedIsPresent = await page.locator("div[role='feed']").count();
//         if (!feedIsPresent) {
//             return [];
//         }

//       const feed = page.locator("div[role='feed']").first();

// const cards = page.locator("div[role='feed'] > div > div[jsaction]");

// let previousCardCount = 0;
//         let roundsWithNoNewCards = 0;

//         console.time("Scrolling");
//         for (let attempt = 0; attempt < CONFIG.maxScrollAttempts; attempt++) {

//       const currentCardCount = await cards.count();

//             if (currentCardCount >= CONFIG.maxResults) {
//                 console.log(`[Discovery] Hit max results cap (${CONFIG.maxResults}).`);
//                 break;
//             }

//             await feed.evaluate((el) => el.scrollBy(0, el.scrollHeight));

//             await page.waitForTimeout(600);

//         const newCardCount = await cards.count();
//                 console.log(
//     `Scroll ${attempt + 1}: ${newCardCount} businesses`
// );

//             if (newCardCount === previousCardCount) {

//                 roundsWithNoNewCards++;

//                 const reachedEndOfList = await page
//                     .locator("text=You've reached the end of the list")
//                     .count();

//                 if (reachedEndOfList > 0 || roundsWithNoNewCards >= 3) {
//                     break;
//                 }

//             } else {
//                 roundsWithNoNewCards = 0;
//             }

//             previousCardCount = newCardCount;

//         }

//         console.timeEnd("Scrolling");
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

//                 // Single-result panel already shows phone + website,
//                 // so we grab them here too instead of a second navigation.
//                 const phoneButton = document.querySelector("button[data-item-id^='phone:tel:']");
//                 const phoneRaw = phoneButton ? phoneButton.getAttribute("aria-label") : null;
//                 const phone = phoneRaw ? phoneRaw.replace(/^Phone:\s*/i, "").trim() : null;

//                 const websiteLink = document.querySelector("a[data-item-id='authority']");
//                 const website = websiteLink ? websiteLink.href : null;

//                 return {
//                     business_name: name,
//                     category,
//                     google_rating: rating,
//                     review_count: reviewCount,
//                     address,
//                     google_maps_link: window.location.href,
//                     phone,
//                     website,
//                 };

//             });

//         } catch (error) {
//             console.warn("[Discovery] Failed reading single-result panel:", error.message);
//             return null;
//         }

//     }

//     async extractCardsFromFeed(page) {

//         return await page.evaluate(() => {

//             const feed = document.querySelector("div[role='feed']");
//             if (!feed) return [];

//             const cardNodes = Array.from(feed.children).filter((node) =>
//                 node.querySelector("a[href*='/maps/place/']")
//             );

//             const seenLinks = new Set();
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

//                 if (!name) continue;

//          const ratingBlock = card.querySelector(
//     "span.MW4etd, span[aria-label*='stars']"
// );

// let rating = null;

// if (ratingBlock) {

//     const text = [
//         ratingBlock.textContent,
//         ratingBlock.getAttribute("aria-label"),
//         ratingBlock.getAttribute("title"),
//     ]
//         .filter(Boolean)
//         .join(" ");

//     const match =
//         text.match(/\d+(?:\.\d+)?/);

//     if (match) {

//         rating =
//             parseFloat(match[0]);

//     }

// }


// /*
// |--------------------------------------------------------------------------
// | Review Count
// |--------------------------------------------------------------------------
// |
// | IMPORTANT:
// | Never take the first number from the review area.
// |
// | Google Maps can expose something like:
// |
// | "4.6 stars 1,234 Reviews"
// |
// | If we simply take the first number, we get:
// |
// | 4
// |
// | instead of:
// |
// | 1234
// |
// |--------------------------------------------------------------------------
// */

// let reviewCount = null;

// const reviewCandidates =
//     Array.from(
//         card.querySelectorAll(
//             "[aria-label*='review' i], [title*='review' i], span.UY7F9"
//         )
//     );

// for (const element of reviewCandidates) {

//     const text = [
//         element.textContent,
//         element.getAttribute("aria-label"),
//         element.getAttribute("title"),
//     ]
//         .filter(Boolean)
//         .join(" ")
//         .replace(/\s+/g, " ")
//         .trim();

//     if (!text) {
//         continue;
//     }


//     /*
//     |--------------------------------------------------------------------------
//     | Best case:
//     |
//     | "1,234 Reviews"
//     | "1,234 review"
//     | "1234 reviews"
//     |--------------------------------------------------------------------------
//     */

//     const reviewMatch =
//         text.match(
//             /(\d[\d,]*)\s*(?:reviews?|ratings?)/i
//         );

//     if (reviewMatch) {

//         reviewCount =
//             parseInt(
//                 reviewMatch[1]
//                     .replace(/,/g, ""),
//                 10
//             );

//         break;

//     }


//     /*
//     |--------------------------------------------------------------------------
//     | Google sometimes exposes only:
//     |
//     | "(1,234)"
//     |
//     |--------------------------------------------------------------------------
//     */

//     const parentText =
//         element.parentElement?.textContent
//             ?.replace(/\s+/g, " ")
//             .trim() || "";

//     const parentMatch =
//         parentText.match(
//             /\((\d[\d,]*)\)/
//         );

//     if (parentMatch) {

//         reviewCount =
//             parseInt(
//                 parentMatch[1]
//                     .replace(/,/g, ""),
//                 10
//             );

//         break;

//     }

// }

//                 const RATING_PATTERN = /^\d\.\d(\(\d+\))?$/;
//                 const STREET_ADDRESS_PATTERN = /^\d+[\s,].{3,}/;
//                 const ADDRESS_KEYWORD_PATTERN =
//                     /(road|street|rd\.?|st\.?|nagar|circle|chowk|society|marg|highway|sector|block|floor|plot)/i;
//                 const HOURS_PATTERN = /(open|closed|closes|opens|⋅|am|pm)\b/i;

//                 const infoRows = Array.from(card.querySelectorAll(".W4Efsd"))
//                     .map((el) => el.textContent.trim())
//                     .filter(Boolean);

//                 let category = null;
//                 let address = null;

//                 for (const row of infoRows) {

//                     const parts = row.split("·").map((p) => p.trim()).filter(Boolean);

//                     for (const part of parts) {

//                         if (RATING_PATTERN.test(part)) continue;
//                         if (HOURS_PATTERN.test(part)) continue;

//                        const PHONE_PATTERN =
//     /^[+]?[0-9\s()-]{8,}$/;

// const looksLikePhone =
//     PHONE_PATTERN.test(part);

// const looksLikeAddress =
//     !looksLikePhone &&
//     (
//         STREET_ADDRESS_PATTERN.test(part) ||
//         ADDRESS_KEYWORD_PATTERN.test(part)
//     );

//                         if (looksLikeAddress && !address) {
//                             address = part;
//                         } else if (!looksLikeAddress && !category && part.length < 40) {
//                             category = part;
//                         }

//                     }

//                 }

//                 // phone + website are NOT on feed cards — they'll be
//                 // filled in by enrichWithContactDetails() after this.
//                 results.push({
//                     business_name: name,
//                     category,
//                     address,
//                     google_rating: rating,
//                     review_count: reviewCount,
//                     google_maps_link: href,
//                     phone: null,
//                     website: null,
//                 });

//             }

//             return results;

//         });

//     }

//     normalizeDiscoveryResults(rawResults) {
//         return rawResults.map((item) => ({
//             business_name: item.business_name || null,
//             category: item.category || null,
//             address: item.address || null,
//             google_rating: item.google_rating ?? null,
//             review_count: item.review_count ?? null,
//             google_maps_link: item.google_maps_link || null,
//             phone: item.phone || null,
//             website: item.website || null,
//         }));
//     }


//     // ==========================================================================
//     // STAGE 2 — CONTACT ENRICHMENT (phone + website only)
//     // ==========================================================================

//     async getBusinessContact(googleMapsLink) {

//         if (!googleMapsLink) {
//             throw new Error("googleMapsLink is required");
//         }

//         const cached = this.readFromCache(googleMapsLink);
//         if (cached) {
//             console.log(`[Enrichment] Cache hit for ${googleMapsLink}`);
//             return cached;
//         }

//         const context = await this.createIsolatedContext();

//         try {

//             const page = await context.newPage();

//             const detailInfo = await this.getDetailPanelInfo(page, googleMapsLink);

//             const result = {
//                 phone: detailInfo.phone || null,
//                 website: detailInfo.website || null,
//             };

//             this.writeToCache(googleMapsLink, result);

//             return result;

//         } finally {
//             await context.close();
//         }

//     }

//     async getDetailPanelInfo(page, googleMapsLink) {

//         await page.goto(googleMapsLink, {
//             waitUntil: "domcontentloaded",
//             timeout: CONFIG.navTimeoutMs,
//         });

//         await randomDelay(1000, 1800);

//         await this.waitForAnySelector(page, ["h1.DUwDvf"], 10000).catch(() => null);

//         return await page.evaluate(() => {

//             const phoneButton = document.querySelector("button[data-item-id^='phone:tel:']");
//             const phoneRaw = phoneButton ? phoneButton.getAttribute("aria-label") : null;
//             const phone = phoneRaw ? phoneRaw.replace(/^Phone:\s*/i, "") : null;

//             const websiteLink = document.querySelector("a[data-item-id='authority']");
//             const website = websiteLink ? websiteLink.href : null;

//             return { phone, website };

//         });

//     }


//     // ==========================================================================
//     // CACHE
//     // ==========================================================================

//     readFromCache(key) {

//         const entry = this.contactCache.get(key);
//         if (!entry) return null;

//         if (Date.now() > entry.expiresAt) {
//             this.contactCache.delete(key);
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

// export default new CommonWorkflowService();

import DiscoveryService from "./discovery/discovery.service.js";
import RelevanceService from "./relevance/relevance.service.js";
import EnrichmentService from "./enrichment/enrichment.service.js";

class CommonWorkflowService {

    async searchBusinesses(
        keyword,
        location
    ) {

        if (
            !keyword ||
            !keyword.trim()
        ) {
            throw new Error(
                "keyword is required"
            );
        }

        if (
            !location ||
            !location.trim()
        ) {
            throw new Error(
                "location is required"
            );
        }

        const cleanKeyword =
            keyword.trim();

        const cleanLocation =
            location.trim();

        console.time(
            "[CommonWorkflow] Business Search"
        );

        try {

            /*
             * ---------------------------------------------------------
             * STEP 1
             * Discover businesses from configured sources.
             * ---------------------------------------------------------
             */

            const discoveredBusinesses =
                await DiscoveryService.search({
                    keyword:
                        cleanKeyword,

                    location:
                        cleanLocation,
                });

            console.log(
                `[CommonWorkflow] Discovered ${discoveredBusinesses.length} businesses.`
            );

            /*
             * ---------------------------------------------------------
             * STEP 2
             * Remove businesses that aren't relevant to the
             * requested keyword/location.
             * ---------------------------------------------------------
             */

            const relevantBusinesses =
                RelevanceService.filterBusinesses(
                    discoveredBusinesses,
                    cleanKeyword,
                    cleanLocation
                );

            console.log(
                `[CommonWorkflow] ${relevantBusinesses.length} businesses remained after relevance filtering.`
            );

            return relevantBusinesses;

        } finally {

            console.timeEnd(
                "[CommonWorkflow] Business Search"
            );
        }
    }

    async getBusinessContact(
        googleMapsLink
    ) {

        if (
            !googleMapsLink ||
            !googleMapsLink.trim()
        ) {
            throw new Error(
                "googleMapsLink is required"
            );
        }

        return EnrichmentService
            .getBusinessContact(
                googleMapsLink.trim()
            );
    }
}

export default new CommonWorkflowService();