import scraperConfig from "../shared/config.js";
import browserManager from "../shared/browser.js";
import { randomDelay } from "../shared/utils.js";

class EnrichmentService {

    constructor() {
        this.contactCache = new Map();
    }

    async getBusinessContact(
        googleMapsLink
    ) {

        if (!googleMapsLink) {
            throw new Error(
                "googleMapsLink is required"
            );
        }

        const cached =
            this.readFromCache(
                googleMapsLink
            );

        if (cached) {

            console.log(
                `[Enrichment] Cache hit for ${googleMapsLink}`
            );

            return cached;
        }

        const context =
            await browserManager.createIsolatedContext();

        try {

            const page =
                await context.newPage();

            const detailInfo =
                await this.getDetailPanelInfo(
                    page,
                    googleMapsLink
                );

            const result = {
                phone:
                    detailInfo?.phone ||
                    null,

                website:
                    detailInfo?.website ||
                    null,
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
                waitUntil:
                    "domcontentloaded",

                timeout:
                    scraperConfig.navigationTimeoutMs,
            }
        );

        await randomDelay(
            1000,
            1800
        );

        await this.waitForAnySelector(
            page,
            ["h1.DUwDvf"],
            10000
        ).catch(() => null);

        return await page.evaluate(
            () => {

                const phoneButton =
                    document.querySelector(
                        "button[data-item-id^='phone:tel:']"
                    );

                const phoneRaw =
                    phoneButton
                        ? phoneButton.getAttribute(
                            "aria-label"
                        )
                        : null;

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
                    websiteLink
                        ? websiteLink.href
                        : null;

                return {
                    phone,
                    website,
                };
            }
        );
    }

    async waitForAnySelector(
        page,
        selectors,
        timeout = 15000
    ) {

        for (
            const selector
            of selectors
        ) {

            try {

                const locator =
                    page
                        .locator(selector)
                        .first();

                await locator.waitFor({
                    state: "visible",
                    timeout,
                });

                return locator;

            } catch {
                // Try next selector.
            }
        }

        throw new Error(
            `None of these selectors appeared on the page:\n${selectors.join("\n")}`
        );
    }

    readFromCache(key) {

        const entry =
            this.contactCache.get(key);

        if (!entry) {
            return null;
        }

        if (
            Date.now() >
            entry.expiresAt
        ) {

            this.contactCache.delete(
                key
            );

            return null;
        }

        return entry.data;
    }

    writeToCache(
        key,
        data
    ) {

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