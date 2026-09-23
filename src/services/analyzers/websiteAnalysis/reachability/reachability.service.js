class ReachabilityService {
    analyze(page, response, startTime) {
        const endTime = Date.now();

        // Playwright's page.goto() can return null
        // for some navigation scenarios.
        if (!response) {
            return {
                reachable: false,

                status: null,

                responseTime:
                    endTime - startTime,

                https:
                    page.url().startsWith("https://"),

                redirects: 0,

                finalUrl:
                    page.url(),

                error:
                    "No response received from server.",
            };
        }

        return {
            reachable: true,

            status:
                response.status() ?? null,

            responseTime:
                endTime - startTime,

            https:
                page.url().startsWith("https://"),

            // Detect whether this response was reached
            // through a redirect.
            redirects:
                response.request().redirectedFrom()
                    ? 1
                    : 0,

            finalUrl:
                page.url(),

            // Keep the Playwright response internally.
            // The orchestrator will remove it before
            // returning the final API response.
            response,
        };
    }
}

export default new ReachabilityService();