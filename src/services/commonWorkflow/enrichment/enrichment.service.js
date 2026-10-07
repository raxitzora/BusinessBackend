import scraperConfig from "../shared/config.js";
import browserManager from "../shared/browser.js";

class EnrichmentService {
    constructor() {
        this.contactCache = new Map();
        this.inFlight = new Map();

        this.navigationTimeoutMs = 10000;
        this.elementTimeoutMs = 2000;
    }

    async getBusinessContact(googleMapsLink) {
        if (!googleMapsLink?.trim()) {
            throw new Error("googleMapsLink is required");
        }

        const key = googleMapsLink.trim();

        const cached = this.readFromCache(key);

        if (cached) {
            console.log(`[Enrichment] Cache hit: ${key}`);
            return cached;
        }

        const existingRequest = this.inFlight.get(key);

        if (existingRequest) {
            console.log(`[Enrichment] Waiting for existing request: ${key}`);
            return existingRequest;
        }

        const request = this.enrichOnce(key);

        this.inFlight.set(key, request);

        try {
            const result = await request;

            this.writeToCache(key, result);

            console.log(
                `[Enrichment] Complete | phone=${result.phone ? "yes" : "no"} | website=${result.website ? "yes" : "no"}`
            );

            return result;
        } finally {
            this.inFlight.delete(key);
        }
    }

    async enrichOnce(googleMapsLink) {
        const context =
            await browserManager.createIsolatedContext();

        try {
            const page = await context.newPage();

            await page.goto(googleMapsLink, {
                waitUntil: "domcontentloaded",
                timeout: this.navigationTimeoutMs,
            });

            await this.waitForBusinessData(page);

            return await page.evaluate(() => {
                const phoneButton = document.querySelector(
                    "button[data-item-id^='phone:tel:']"
                );

                const phoneRaw =
                    phoneButton?.getAttribute("aria-label");

                const phone = phoneRaw
                    ? phoneRaw
                        .replace(/^Phone:\s*/i, "")
                        .trim()
                    : null;

                const websiteLink = document.querySelector(
                    "a[data-item-id='authority']"
                );

                const website =
                    websiteLink?.href || null;

                return {
                    phone,
                    website,
                };
            });
        } finally {
            await context.close();
        }
    }

    async waitForBusinessData(page) {
        const selector = [
            "h1.DUwDvf",
            "button[data-item-id^='phone:tel:']",
            "a[data-item-id='authority']",
        ].join(",");

        try {
            await page
                .locator(selector)
                .first()
                .waitFor({
                    state: "attached",
                    timeout: this.elementTimeoutMs,
                });
        } catch {
            console.warn(
                "[Enrichment] Business data selectors not found within timeout."
            );
        }
    }

    readFromCache(key) {
        const entry = this.contactCache.get(key);

        if (!entry) {
            return null;
        }

        if (Date.now() > entry.expiresAt) {
            this.contactCache.delete(key);
            return null;
        }

        return entry.data;
    }

    writeToCache(key, data) {
        this.contactCache.set(key, {
            data,
            expiresAt:
                Date.now() +
                scraperConfig.contactCacheTtlMs,
        });
    }
}

export default new EnrichmentService();