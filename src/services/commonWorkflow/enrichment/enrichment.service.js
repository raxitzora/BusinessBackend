import scraperConfig from "../shared/config.js";
import browserManager from "../shared/browser.js";

class EnrichmentService {

    constructor() {
        this.contactCache = new Map();
    }

    async getBusinessContact(googleMapsLink) {

        if (!googleMapsLink) {
            throw new Error("googleMapsLink is required");
        }

        const cached = this.readFromCache(googleMapsLink);

        if (cached) {
            console.log(
                `[Enrichment] Cache hit for ${googleMapsLink}`
            );

            return cached;
        }

        const context =
            await browserManager.createIsolatedContext();

        try {
            const page = await context.newPage();

            const detailInfo =
                await this.getDetailPanelInfo(
                    page,
                    googleMapsLink
                );

            const result = {
                phone: detailInfo?.phone || null,
                website: detailInfo?.website || null,
                websiteExists: Boolean(detailInfo?.website),
            };

            this.writeToCache(
                googleMapsLink,
                result
            );

            return result;

        } finally {
            await context.close();
        }
    }

    async getDetailPanelInfo(
        page,
        googleMapsLink
    ) {

        await page.goto(
            googleMapsLink,
            {
                waitUntil: "domcontentloaded",
                timeout: scraperConfig.navigationTimeoutMs,
            }
        );

        await page.waitForLoadState(
            "networkidle",
            {
                timeout: 5000,
            }
        ).catch(() => {});

        return await page.evaluate(() => {

            const phoneButton =
                document.querySelector(
                    "button[data-item-id^='phone:tel:']"
                );

            const phoneRaw =
                phoneButton?.getAttribute("aria-label");

            const phone =
                phoneRaw
                    ? phoneRaw.replace(
                        /^Phone:\s*/i,
                        ""
                    )
                    : null;

            const websiteLink =
                document.querySelector(
                    "a[data-item-id='authority']"
                );

            const website =
                websiteLink?.href || null;

            return {
                phone,
                website,
            };
        });
    }

    readFromCache(key) {

        const entry =
            this.contactCache.get(key);

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

        this.contactCache.set(
            key,
            {
                data,
                expiresAt:
                    Date.now() +
                    scraperConfig.contactCacheTtlMs,
            }
        );
    }
}

export default new EnrichmentService();