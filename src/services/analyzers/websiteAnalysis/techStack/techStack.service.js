class TechStackService {
    async analyze(page, response) {
        const html =
            (await page.content()).toLowerCase();

        const scripts =
            await page.$$eval(
                "script",
                (elements) =>
                    elements
                        .map((script) =>
                            script.src.toLowerCase()
                        )
            );

        const headers =
            Object.fromEntries(
                Object.entries(
                    response.headers()
                ).map(([key, value]) => [
                    key.toLowerCase(),
                    String(value).toLowerCase(),
                ])
            );

        const result = {
            frontend: [],
            cms: [],
            css: [],
            analytics: [],
            hosting: [],
            backend: [],
        };

        this.detectFrontend(
            result,
            html,
            scripts
        );

        this.detectCMS(
            result,
            html,
            scripts
        );

        this.detectCSS(
            result,
            html,
            scripts
        );

        this.detectAnalytics(
            result,
            scripts
        );

        this.detectHosting(
            result,
            headers
        );

        this.detectBackend(
            result,
            headers
        );

        return result;
    }

    detectFrontend(result, html, scripts) {
        // React
        if (
            html.includes("__react") ||
            html.includes("_reactroot") ||
            html.includes("react") ||
            scripts.some((src) =>
                src.includes("react")
            )
        ) {
            result.frontend.push("React");
        }

        // Next.js
        if (
            html.includes("__next") ||
            html.includes("/_next/") ||
            scripts.some((src) =>
                src.includes("/_next/")
            )
        ) {
            result.frontend.push("Next.js");
        }

        // Vue
        if (
            html.includes("data-v-") ||
            html.includes("__vue__") ||
            scripts.some((src) =>
                src.includes("vue")
            )
        ) {
            result.frontend.push("Vue.js");
        }

        // Nuxt
        if (
            html.includes("__nuxt") ||
            scripts.some((src) =>
                src.includes("_nuxt")
            )
        ) {
            result.frontend.push("Nuxt.js");
        }

        // Angular
        if (
            html.includes("ng-version") ||
            html.includes("ng-app") ||
            scripts.some((src) =>
                src.includes("angular")
            )
        ) {
            result.frontend.push("Angular");
        }

        // Svelte
        if (
            html.includes("__svelte") ||
            scripts.some((src) =>
                src.includes("svelte")
            )
        ) {
            result.frontend.push("Svelte");
        }

        // Astro
        if (
            html.includes("astro-island") ||
            html.includes("astro-root") ||
            scripts.some((src) =>
                src.includes("astro")
            )
        ) {
            result.frontend.push("Astro");
        }
    }

    detectCMS(result, html, scripts) {
        // WordPress
        if (
            html.includes("wp-content") ||
            html.includes("wp-includes") ||
            scripts.some((src) =>
                src.includes("wp-content")
            )
        ) {
            result.cms.push("WordPress");
        }

        // Shopify
        if (
            html.includes("cdn.shopify.com") ||
            html.includes("shopify") ||
            scripts.some((src) =>
                src.includes("cdn.shopify.com")
            )
        ) {
            result.cms.push("Shopify");
        }

        // Wix
        if (
            html.includes("wix.com") ||
            html.includes("wixstatic") ||
            scripts.some((src) =>
                src.includes("wixstatic")
            )
        ) {
            result.cms.push("Wix");
        }

        // Squarespace
        if (
            html.includes("squarespace") ||
            scripts.some((src) =>
                src.includes("squarespace")
            )
        ) {
            result.cms.push("Squarespace");
        }

        // Drupal
        if (
            html.includes("drupal") ||
            html.includes(
                "sites/default/files"
            )
        ) {
            result.cms.push("Drupal");
        }

        // Joomla
        if (
            html.includes("joomla") ||
            html.includes("/media/jui/")
        ) {
            result.cms.push("Joomla");
        }

        // Webflow
        if (
            html.includes("webflow") ||
            scripts.some((src) =>
                src.includes("webflow")
            )
        ) {
            result.cms.push("Webflow");
        }

        // Ghost
        if (
            html.includes("ghost.io") ||
            html.includes("/ghost/")
        ) {
            result.cms.push("Ghost");
        }
    }

    detectCSS(result, html, scripts) {
        // Tailwind CSS
        if (
            html.includes("tailwind") ||
            scripts.some((src) =>
                src.includes("tailwind")
            )
        ) {
            result.css.push(
                "Tailwind CSS"
            );
        }

        // Bootstrap
        if (
            html.includes("bootstrap") ||
            scripts.some((src) =>
                src.includes("bootstrap")
            )
        ) {
            result.css.push(
                "Bootstrap"
            );
        }

        // Bulma
        if (
            html.includes("bulma")
        ) {
            result.css.push("Bulma");
        }

        // Material UI
        if (
            html.includes("material-ui") ||
            html.includes("mui-") ||
            scripts.some((src) =>
                src.includes("material-ui")
            )
        ) {
            result.css.push(
                "Material UI"
            );
        }

        // Foundation
        if (
            html.includes(
                "foundation.min.css"
            ) ||
            html.includes(
                "foundation-css"
            )
        ) {
            result.css.push(
                "Foundation"
            );
        }
    }

    detectAnalytics(result, scripts) {
        // Google Analytics
        if (
            scripts.some(
                (src) =>
                    src.includes(
                        "google-analytics.com"
                    ) ||
                    src.includes(
                        "googletagmanager.com/gtag"
                    )
            )
        ) {
            result.analytics.push(
                "Google Analytics"
            );
        }

        // Google Tag Manager
        if (
            scripts.some((src) =>
                src.includes(
                    "googletagmanager.com/gtm.js"
                )
            )
        ) {
            result.analytics.push(
                "Google Tag Manager"
            );
        }

        // Facebook Pixel
        if (
            scripts.some((src) =>
                src.includes(
                    "connect.facebook.net"
                )
            )
        ) {
            result.analytics.push(
                "Facebook Pixel"
            );
        }

        // Hotjar
        if (
            scripts.some((src) =>
                src.includes(
                    "hotjar.com"
                )
            )
        ) {
            result.analytics.push(
                "Hotjar"
            );
        }

        // Mixpanel
        if (
            scripts.some(
                (src) =>
                    src.includes(
                        "mixpanel.com"
                    ) ||
                    src.includes(
                        "cdn.mxpnl.com"
                    )
            )
        ) {
            result.analytics.push(
                "Mixpanel"
            );
        }

        // Segment
        if (
            scripts.some((src) =>
                src.includes(
                    "cdn.segment.com"
                )
            )
        ) {
            result.analytics.push(
                "Segment"
            );
        }
    }

    detectHosting(result, headers) {
        const server =
            headers["server"] || "";

        const via =
            headers["via"] || "";

        const poweredBy =
            headers["x-powered-by"] || "";

        // Vercel
        if (
            server.includes("vercel") ||
            headers["x-vercel-id"] ||
            poweredBy.includes("vercel")
        ) {
            result.hosting.push(
                "Vercel"
            );
        }

        // Netlify
        if (
            server.includes("netlify") ||
            headers["x-nf-request-id"]
        ) {
            result.hosting.push(
                "Netlify"
            );
        }

        // Cloudflare
        if (
            server.includes("cloudflare") ||
            headers["cf-ray"]
        ) {
            result.hosting.push(
                "Cloudflare"
            );
        }

        // AWS
        if (
            via.includes("cloudfront") ||
            server.includes("amazons3") ||
            headers["x-amz-cf-id"]
        ) {
            result.hosting.push("AWS");
        }

        // GitHub Pages
        if (
            server.includes("github.com") ||
            headers["x-github-request-id"]
        ) {
            result.hosting.push(
                "GitHub Pages"
            );
        }

        // Firebase
        if (
            server.includes("firebase")
        ) {
            result.hosting.push(
                "Firebase"
            );
        }
    }

    detectBackend(result, headers) {
        const poweredBy =
            headers["x-powered-by"] || "";

        const server =
            headers["server"] || "";

        // PHP
        if (
            poweredBy.includes("php") ||
            headers["x-php-version"]
        ) {
            result.backend.push("PHP");
        }

        // Express / Node.js
        if (
            poweredBy.includes(
                "express"
            )
        ) {
            result.backend.push(
                "Express (Node.js)"
            );
        }

        // ASP.NET
        if (
            poweredBy.includes(
                "asp.net"
            ) ||
            headers["x-aspnet-version"] ||
            headers["x-aspnetmvc-version"]
        ) {
            result.backend.push(
                "ASP.NET"
            );
        }

        // Nginx
        if (
            server.includes("nginx")
        ) {
            result.backend.push(
                "Nginx"
            );
        }

        // Apache
        if (
            server.includes("apache")
        ) {
            result.backend.push(
                "Apache"
            );
        }

        // Django / Python
        if (
            poweredBy.includes(
                "django"
            ) ||
            server.includes(
                "wsgiserver"
            )
        ) {
            result.backend.push(
                "Django (Python)"
            );
        }

        // Ruby on Rails
        if (
            poweredBy.includes(
                "rails"
            ) ||
            headers["x-runtime"]
        ) {
            result.backend.push(
                "Ruby on Rails"
            );
        }
    }
}

export default new TechStackService();