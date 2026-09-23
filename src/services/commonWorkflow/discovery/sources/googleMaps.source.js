import scraperConfig from "../../shared/config.js";
import browserManager from "../../shared/browser.js";
import { randomDelay } from "../../shared/utils.js";

import GoogleMapsParser from "../googleMaps.parser.js";

class GoogleMapsSource {

    async search(keyword, location) {

        if (!keyword || !keyword.trim()) {
            throw new Error(
                "keyword is required"
            );
        }

        if (!location || !location.trim()) {
            throw new Error(
                "location is required"
            );
        }

        const cleanKeyword =
            keyword.trim();

        const cleanLocation =
            location.trim();

        const context =
            await browserManager.createIsolatedContext();

        try {

            const page =
                await context.newPage();

            await this.searchGoogleMaps(
                page,
                cleanKeyword,
                cleanLocation
            );

            return await this.collectResults(
                page
            );

        } finally {

            await context.close();
        }
    }

    async searchGoogleMaps(
        page,
        keyword,
        location
    ) {

        await page.goto(
            "https://www.google.com/maps?hl=en",
            {
                waitUntil:
                    "domcontentloaded",

                timeout:
                    scraperConfig.navigationTimeoutMs,
            }
        );

        await page.waitForLoadState(
            "load"
        );

        const cookieButtonSelectors = [
            "text=Accept all",
            "text=I agree",
            "button:has-text('Accept all')",
            "button:has-text('Agree')",
        ];

        for (
            const selector
            of cookieButtonSelectors
        ) {

            try {

                const button =
                    page.locator(
                        selector
                    ).first();

                if (
                    await button.isVisible({
                        timeout: 1200,
                    })
                ) {

                    await button.click();

                    await page.waitForLoadState(
                        "load"
                    );

                    break;
                }

            } catch {
                // Try the next selector.
            }
        }

        const searchQuery =
            `${keyword} in ${location}`;

      const searchBox =
    page
        .locator(
            "input[name='q']"
        )
        .first();

        await searchBox.fill(
            searchQuery
        );

        await searchBox.press(
            "Enter"
        );

        await this.waitForAnySelector(
            page,
            [
                "div[role='feed']",
                "div.m6QErb[role='feed']",
                "h1.DUwDvf",
            ],
            20000
        );
    }

    async collectResults(page) {

        const singleResult =
            await GoogleMapsParser.parseSingleResult(
                page
            );

        if (singleResult) {
            return [singleResult];
        }

        const feedIsPresent =
            await page
                .locator(
                    "div[role='feed']"
                )
                .count();

        if (!feedIsPresent) {
            return [];
        }

        const feed =
            page
                .locator(
                    "div[role='feed']"
                )
                .first();

        const cards =
            page.locator(
                "div[role='feed'] > div > div[jsaction]"
            );

        let previousCardCount = 0;
        let roundsWithNoNewCards = 0;

        for (
            let attempt = 0;
            attempt <
                scraperConfig.maxScrollAttempts;
            attempt++
        ) {

            const currentCardCount =
                await cards.count();

            if (
                currentCardCount >=
                scraperConfig.maxResults
            ) {

                console.log(
                    `[GoogleMaps] Hit max results cap (${scraperConfig.maxResults}).`
                );

                break;
            }

            await feed.evaluate(
                (element) => {
                    element.scrollBy(
                        0,
                        element.scrollHeight
                    );
                }
            );

            await page.waitForTimeout(
                600
            );

            const newCardCount =
                await cards.count();

            console.log(
                `[GoogleMaps] Scroll ${attempt + 1}: ${newCardCount} businesses`
            );

            if (
                newCardCount ===
                previousCardCount
            ) {

                roundsWithNoNewCards++;

                const reachedEnd =
                    await page
                        .locator(
                            "text=You've reached the end of the list"
                        )
                        .count();

                if (
                    reachedEnd > 0 ||
                    roundsWithNoNewCards >= 3
                ) {
                    break;
                }

            } else {

                roundsWithNoNewCards = 0;
            }

            previousCardCount =
                newCardCount;
        }

        return await GoogleMapsParser.parseFeed(
            page
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
}

export default new GoogleMapsSource();