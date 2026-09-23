import { chromium } from "playwright";

import scraperConfig from "./config.js";

class BrowserManager {

    constructor() {
        this.browser = null;
        this.browserLaunchPromise = null;
    }

    async getSharedBrowser() {

        if (
            this.browser &&
            this.browser.isConnected()
        ) {
            return this.browser;
        }

        if (this.browserLaunchPromise) {
            return this.browserLaunchPromise;
        }

        this.browserLaunchPromise =
            chromium.launch({
                headless:
                    scraperConfig.headless,

                slowMo:
                    scraperConfig.slowMo,

                args: [
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                ],
            })
            .then((browser) => {

                this.browser = browser;

                browser.on(
                    "disconnected",
                    () => {

                        console.warn(
                            "[BrowserManager] Browser disconnected. Will relaunch on next request."
                        );

                        this.browser = null;
                    }
                );

                return browser;
            })
            .finally(() => {

                this.browserLaunchPromise =
                    null;

            });

        return this.browserLaunchPromise;
    }

    async createIsolatedContext() {

        const browser =
            await this.getSharedBrowser();

        const context =
            await browser.newContext({

                viewport: {
                    width: 1600,
                    height: 900,
                },

                locale: "en-IN",

                timezoneId:
                    "Asia/Kolkata",

                userAgent:
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
            });

        await context.route(
            "**/*",
            (route) => {

                const type =
                    route
                        .request()
                        .resourceType();

                switch (type) {

                    case "image":
                    case "media":
                    case "font":
                        return route.abort();

                    default:
                        return route.continue();
                }
            }
        );

        return context;
    }

    async shutdown() {

        if (!this.browser) {
            return;
        }

        await this.browser.close();

        this.browser = null;
    }
}

export default new BrowserManager();