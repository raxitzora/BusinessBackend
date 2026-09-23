import { chromium } from "playwright";
import websiteAnalysisConfig from "./config.js";

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
            chromium
                .launch({
                    headless:
                        websiteAnalysisConfig.headless,

                    slowMo:
                        websiteAnalysisConfig.slowMo,

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
                                "[WebsiteAnalysis Browser] Browser disconnected."
                            );

                            this.browser = null;
                        }
                    );

                    return browser;
                })
                .finally(() => {
                    this.browserLaunchPromise = null;
                });

        return this.browserLaunchPromise;
    }

    async createMobileContext() {
        const browser =
            await this.getSharedBrowser();

        return await browser.newContext({
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
    }

    async shutdown() {
        if (!this.browser) {
            return;
        }

        try {
            await this.browser.close();
        } finally {
            this.browser = null;
        }
    }
}

export default new BrowserManager();