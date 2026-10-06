

import websiteAnalysisConfig from "./shared/config.js";
import browserManager from "./shared/browser.js";
import { withTimeout } from "./shared/utils.js";

import ReachabilityService from "./reachability/reachability.service.js";
import PerformanceService from "./performance/performance.service.js";
import ResponsiveService from "./responsive/responsive.service.js";
import LinksService from "./links/links.service.js";
import TechStackService from "./techStack/techStack.service.js";

class WebsiteAnalysisService {
    async analyze(websiteUrl) {
        if (!websiteUrl) {
            throw new Error(
                "Website URL is required."
            );
        }

        const parsedUrl =
            this.validateUrl(websiteUrl);

        const context =
            await browserManager.createMobileContext();

        try {
            return await withTimeout(
                this.runAnalysis(
                    context,
                    parsedUrl.href
                ),
                websiteAnalysisConfig.analysisTimeoutMs,
                "Website analysis"
            );
        } catch (error) {
            console.error(
                "Website analysis failed:",
                error
            );

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
                        parsedUrl.protocol ===
                        "https:",

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
                        stage:
                            "Website analysis",

                        message:
                            error?.message ||
                            "Unknown analysis error.",
                    },
                ],
            };
        } finally {
            try {
                await context.close();
            } catch (error) {
                console.error(
                    "Failed to close browser context:",
                    error.message
                );
            }
        }
    }

    validateUrl(websiteUrl) {
        let parsedUrl;

        try {
            parsedUrl =
                new URL(websiteUrl);
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

        return parsedUrl;
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
                            websiteAnalysisConfig.navTimeoutMs,
                    }
                );

            await page.waitForTimeout(
                websiteAnalysisConfig.settleTimeMs
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
                        this.isHttps(
                            websiteUrl
                        ),

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
                        stage:
                            "Navigation",

                        message:
                            error?.message ||
                            "Navigation failed.",
                    },
                ],
            };
        }

        const reachability =
            ReachabilityService.analyze(
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

        const techStack =
            await this.runStage(
                "Tech stack analysis",
                () =>
                    TechStackService.analyze(
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

        const performance =
            await this.runStage(
                "Performance analysis",
                () =>
                    PerformanceService.analyze(
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

        const responsive =
            await this.runStage(
                "Responsive analysis",
                () =>
                    ResponsiveService.analyze(
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

        const brokenLinks =
            await this.runStage(
                "Broken link analysis",
                () =>
                    LinksService.analyzeBrokenLinks(
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

        const brokenImages =
            await this.runStage(
                "Broken image analysis",
                () =>
                    LinksService.analyzeBrokenImages(
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

        delete result.reachability.response;

        return result;
    }

    async runStage(
        stageName,
        operation
    ) {
        try {
            const data =
                await withTimeout(
                    operation(),
                    websiteAnalysisConfig.stageTimeoutMs,
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
                    stage: stageName,

                    message:
                        error?.message ||
                        "Unknown error.",
                },
            };
        }
    }

    attachNetworkListeners(
        page,
        resources
    ) {
        page.on(
            "response",
            async (response) => {
                try {
                    const headers =
                        response.headers();

                    let size =
                        Number(
                            headers[
                                "content-length"
                            ] || 0
                        );

                    if (!size) {
                        try {
                            const body =
                                await response.body();

                            size =
                                body.length;
                        } catch {
                            size = 0;
                        }
                    }

                    resources.push({
                        url:
                            response.url(),

                        type:
                            response
                                .request()
                                .resourceType(),

                        status:
                            response.status(),

                        size,

                        headers,
                    });
                } catch {
                    // Ignore responses that
                    // cannot be inspected.
                }
            }
        );
    }

    isHttps(url) {
        try {
            return (
                new URL(url).protocol ===
                "https:"
            );
        } catch {
            return false;
        }
    }
}

export default new WebsiteAnalysisService();