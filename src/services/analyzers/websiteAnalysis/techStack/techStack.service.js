class TechStackService {

    async analyze(page, response) {

        const data =
            await page.evaluate(() => {

                const scripts =
                    Array.from(
                        document.querySelectorAll(
                            "script[src]"
                        )
                    ).map(
                        (script) =>
                            script.src
                    );

                const stylesheets =
                    Array.from(
                        document.querySelectorAll(
                            "link[href]"
                        )
                    ).map(
                        (link) =>
                            link.href
                    );

                const inlineScripts =
                    Array.from(
                        document.querySelectorAll(
                            "script:not([src])"
                        )
                    ).map(
                        (script) =>
                            script.textContent || ""
                    );

                const meta =
                    Array.from(
                        document.querySelectorAll(
                            "meta"
                        )
                    ).map(
                        (element) => ({
                            name:
                                element
                                    .getAttribute(
                                        "name"
                                    ) || "",

                            property:
                                element
                                    .getAttribute(
                                        "property"
                                    ) || "",

                            content:
                                element
                                    .getAttribute(
                                        "content"
                                    ) || "",
                        })
                    );

                const resourceUrls =
                    performance
                        .getEntriesByType(
                            "resource"
                        )
                        .map(
                            (entry) =>
                                entry.name
                        );

                const html =
                    document.documentElement
                        .outerHTML;

                const attributes =
                    Array.from(
                        document.querySelectorAll(
                            "*"
                        )
                    )
                        .slice(0, 5000)
                        .flatMap(
                            (element) =>
                                Array.from(
                                    element.attributes
                                ).map(
                                    (attribute) =>
                                        `${attribute.name}=${attribute.value}`
                                )
                        );

                const domMarkers = {
                    react:
                        Object.keys(
                            document.body || {}
                        ).some(
                            (key) =>
                                key.startsWith(
                                    "__react"
                                )
                        ),

                    vue:
                        Object.keys(
                            document.body || {}
                        ).some(
                            (key) =>
                                key.startsWith(
                                    "__vue"
                                )
                        ),

                    angular:
                        Boolean(
                            document.querySelector(
                                "[ng-version], [ng-app], [_nghost]"
                            )
                        ),

                    svelte:
                        Boolean(
                            document.querySelector(
                                "[class*='svelte-']"
                            )
                        ),
                };

                return {
                    html,
                    scripts,
                    stylesheets,
                    inlineScripts,
                    meta,
                    resourceUrls,
                    attributes,
                    domMarkers,
                };
            });

        const html =
            String(
                data.html || ""
            ).toLowerCase();

        const scripts =
            this.normalize(
                data.scripts
            );

        const stylesheets =
            this.normalize(
                data.stylesheets
            );

        const inlineScripts =
            this.normalize(
                data.inlineScripts
            );

        const resourceUrls =
            this.normalize(
                data.resourceUrls
            );

        const attributes =
            this.normalize(
                data.attributes
            );

        const headers =
            this.normalizeHeaders(
                response
            );

        const meta =
            data.meta || [];

        const metaText =
            meta
                .map(
                    (item) =>
                        `${item.name} ${item.property} ${item.content}`
                )
                .join(" ")
                .toLowerCase();

        const allScripts =
            [
                ...scripts,
                ...inlineScripts,
                ...resourceUrls,
            ];

        const allResources =
            [
                ...scripts,
                ...stylesheets,
                ...resourceUrls,
            ];

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
            scripts,
            allResources,
            attributes,
            metaText,
            data.domMarkers
        );

        this.detectCMS(
            result,
            html,
            scripts,
            allResources,
            metaText
        );

        this.detectCSS(
            result,
            html,
            stylesheets,
            allResources,
            attributes
        );

        this.detectAnalytics(
            result,
            allScripts,
            html
        );

        this.detectHosting(
            result,
            headers,
            allResources
        );

        this.detectBackend(
            result,
            headers,
            html,
            allResources,
            metaText
        );

        this.removeDuplicates(
            result
        );

        return result;
    }

    normalize(values = []) {

        return values
            .filter(Boolean)
            .map(
                (value) =>
                    String(value)
                        .toLowerCase()
            );
    }

    normalizeHeaders(response) {

        if (
            !response ||
            typeof response.headers !==
                "function"
        ) {
            return {};
        }

        return Object.fromEntries(
            Object.entries(
                response.headers()
            ).map(
                ([key, value]) => [
                    key.toLowerCase(),
                    String(value).toLowerCase(),
                ]
            )
        );
    }

    hasAny(
        values,
        patterns
    ) {

        return patterns.some(
            (pattern) =>
                values.some(
                    (value) =>
                        value.includes(
                            pattern
                        )
                )
        );
    }

    htmlHas(
        html,
        patterns
    ) {

        return patterns.some(
            (pattern) =>
                html.includes(
                    pattern
                )
        );
    }

    add(
        result,
        category,
        technology
    ) {

        if (
            !result[category].includes(
                technology
            )
        ) {
            result[category].push(
                technology
            );
        }
    }

    detectFrontend(
        result,
        html,
        scripts,
        resources,
        attributes,
        metaText,
        domMarkers
    ) {

        // Next.js
        if (
            this.htmlHas(
                html,
                [
                    "__next",
                    "/_next/",
                    "self.__next_f",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "/_next/",
                    "_next/static",
                ]
            )
        ) {
            this.add(
                result,
                "frontend",
                "Next.js"
            );
        }

        // Nuxt
        if (
            this.htmlHas(
                html,
                [
                    "__nuxt",
                    "/_nuxt/",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "/_nuxt/",
                ]
            )
        ) {
            this.add(
                result,
                "frontend",
                "Nuxt.js"
            );
        }

        // Angular
        if (
            domMarkers?.angular ||
            this.htmlHas(
                html,
                [
                    "ng-version",
                    "ng-app",
                    "_nghost",
                    "_ngcontent",
                ]
            ) ||
            this.hasAny(
                scripts,
                [
                    "angular",
                ]
            )
        ) {
            this.add(
                result,
                "frontend",
                "Angular"
            );
        }

        // Vue
        if (
            domMarkers?.vue ||
            this.htmlHas(
                html,
                [
                    "data-v-",
                    "__vue__",
                    "v-cloak",
                    "v-if",
                    "v-for",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "vue.runtime",
                    "vue.global",
                    "/vue/",
                ]
            )
        ) {
            this.add(
                result,
                "frontend",
                "Vue.js"
            );
        }

        // Svelte
        if (
            domMarkers?.svelte ||
            this.htmlHas(
                html,
                [
                    "svelte-",
                    "__svelte",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "svelte",
                ]
            )
        ) {
            this.add(
                result,
                "frontend",
                "Svelte"
            );
        }

        // Astro
        if (
            this.htmlHas(
                html,
                [
                    "astro-island",
                    "astro-root",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "/_astro/",
                ]
            )
        ) {
            this.add(
                result,
                "frontend",
                "Astro"
            );
        }

        // React
        if (
            domMarkers?.react ||
            this.htmlHas(
                html,
                [
                    "data-reactroot",
                    "__reactfiber",
                    "__reactprops",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "react.production",
                    "react-dom",
                    "/react/",
                ]
            )
        ) {
            this.add(
                result,
                "frontend",
                "React"
            );
        }

        // React detection from common bundler output.
        if (
            !result.frontend.includes(
                "React"
            ) &&
            this.hasAny(
                scripts,
                [
                    "react-dom",
                    "react.production",
                    "react.development",
                ]
            )
        ) {
            this.add(
                result,
                "frontend",
                "React"
            );
        }

        // jQuery
        if (
            this.hasAny(
                resources,
                [
                    "jquery",
                    "jquery.min.js",
                ]
            )
        ) {
            this.add(
                result,
                "frontend",
                "jQuery"
            );
        }

        // Alpine.js
        if (
            this.htmlHas(
                html,
                [
                    "x-data",
                    "x-bind",
                    "x-model",
                    "x-show",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "alpine",
                ]
            )
        ) {
            this.add(
                result,
                "frontend",
                "Alpine.js"
            );
        }
    }

    detectCMS(
        result,
        html,
        scripts,
        resources,
        metaText
    ) {

        // WordPress
        if (
            this.htmlHas(
                html,
                [
                    "wp-content",
                    "wp-includes",
                    "wp-json",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "/wp-content/",
                    "/wp-includes/",
                ]
            ) ||
            metaText.includes(
                "wordpress"
            )
        ) {
            this.add(
                result,
                "cms",
                "WordPress"
            );
        }

        // Shopify
        if (
            this.htmlHas(
                html,
                [
                    "cdn.shopify.com",
                    "shopify.theme",
                    "shopifyanalytics",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "cdn.shopify.com",
                    "shopifycdn",
                ]
            )
        ) {
            this.add(
                result,
                "cms",
                "Shopify"
            );
        }

        // Wix
        if (
            this.htmlHas(
                html,
                [
                    "wixstatic.com",
                    "wix-code-sdk",
                    "wix.com",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "wixstatic.com",
                    "wix.com",
                ]
            )
        ) {
            this.add(
                result,
                "cms",
                "Wix"
            );
        }

        // Squarespace
        if (
            this.htmlHas(
                html,
                [
                    "squarespace",
                    "static1.squarespace.com",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "squarespace.com",
                ]
            )
        ) {
            this.add(
                result,
                "cms",
                "Squarespace"
            );
        }

        // Webflow
        if (
            this.htmlHas(
                html,
                [
                    "webflow",
                    "data-wf-page",
                    "data-wf-site",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "webflow.com",
                    "website-files.com",
                ]
            )
        ) {
            this.add(
                result,
                "cms",
                "Webflow"
            );
        }

        // Drupal
        if (
            this.htmlHas(
                html,
                [
                    "drupal-settings-json",
                    "drupal.js",
                    "sites/default/files",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "/sites/default/files/",
                    "/modules/",
                ]
            ) ||
            metaText.includes(
                "drupal"
            )
        ) {
            this.add(
                result,
                "cms",
                "Drupal"
            );
        }

        // Joomla
        if (
            this.htmlHas(
                html,
                [
                    "/media/jui/",
                    "/media/system/",
                    "joomla",
                ]
            ) ||
            metaText.includes(
                "joomla"
            )
        ) {
            this.add(
                result,
                "cms",
                "Joomla"
            );
        }

        // Ghost
        if (
            this.htmlHas(
                html,
                [
                    "ghost.io",
                    "ghost.org",
                    'generator" content="ghost',
                ]
            ) ||
            metaText.includes(
                "ghost"
            )
        ) {
            this.add(
                result,
                "cms",
                "Ghost"
            );
        }
    }

    detectCSS(
        result,
        html,
        stylesheets,
        resources,
        attributes
    ) {

        // Tailwind CSS
        const tailwindSignals =
            attributes.filter(
                (value) =>
                    /(^|\s)(sm|md|lg|xl|2xl):/.test(
                        value
                    ) ||
                    /(^|\s)(flex|grid|items-|justify-|space-|text-|bg-|px-|py-|mx-|my-|rounded-|shadow-)/.test(
                        value
                    )
            ).length;

        if (
            this.hasAny(
                stylesheets,
                [
                    "tailwind",
                    "tailwindcss",
                ]
            ) ||
            tailwindSignals >= 5
        ) {
            this.add(
                result,
                "css",
                "Tailwind CSS"
            );
        }

        // Bootstrap
        if (
            this.hasAny(
                stylesheets,
                [
                    "bootstrap",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "bootstrap.min.css",
                    "bootstrap.bundle",
                ]
            ) ||
            this.htmlHas(
                html,
                [
                    "bootstrap.min.css",
                    "bootstrap.bundle",
                ]
            )
        ) {
            this.add(
                result,
                "css",
                "Bootstrap"
            );
        }

        // Bulma
        if (
            this.hasAny(
                stylesheets,
                [
                    "bulma",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "bulma.min.css",
                ]
            )
        ) {
            this.add(
                result,
                "css",
                "Bulma"
            );
        }

        // Material UI
        if (
            this.htmlHas(
                html,
                [
                    "mui-",
                    "material-ui",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "material-ui",
                    "@mui",
                ]
            )
        ) {
            this.add(
                result,
                "css",
                "Material UI"
            );
        }

        // Foundation
        if (
            this.hasAny(
                stylesheets,
                [
                    "foundation",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "foundation.min.css",
                ]
            )
        ) {
            this.add(
                result,
                "css",
                "Foundation"
            );
        }

        // Chakra UI
        if (
            this.htmlHas(
                html,
                [
                    "chakra-",
                ]
            ) ||
            this.hasAny(
                resources,
                [
                    "@chakra-ui",
                    "chakra-ui",
                ]
            )
        ) {
            this.add(
                result,
                "css",
                "Chakra UI"
            );
        }
    }

    detectAnalytics(
        result,
        scripts,
        html
    ) {

        // Google Analytics
        if (
            this.hasAny(
                scripts,
                [
                    "google-analytics.com",
                    "googletagmanager.com/gtag",
                    "gtag/js",
                ]
            ) ||
            html.includes(
                "google-analytics"
            )
        ) {
            this.add(
                result,
                "analytics",
                "Google Analytics"
            );
        }

        // Google Tag Manager
        if (
            this.hasAny(
                scripts,
                [
                    "googletagmanager.com/gtm.js",
                    "googletagmanager.com/gtm",
                ]
            ) ||
            html.includes(
                "googletagmanager.com/ns.html"
            )
        ) {
            this.add(
                result,
                "analytics",
                "Google Tag Manager"
            );
        }

        // Facebook Pixel
        if (
            this.hasAny(
                scripts,
                [
                    "connect.facebook.net",
                    "facebook.com/tr",
                ]
            ) ||
            html.includes(
                "fbq("
            )
        ) {
            this.add(
                result,
                "analytics",
                "Facebook Pixel"
            );
        }

        // Hotjar
        if (
            this.hasAny(
                scripts,
                [
                    "hotjar.com",
                    "static.hotjar.com",
                ]
            )
        ) {
            this.add(
                result,
                "analytics",
                "Hotjar"
            );
        }

        // Microsoft Clarity
        if (
            this.hasAny(
                scripts,
                [
                    "clarity.ms",
                ]
            ) ||
            html.includes(
                "clarity("
            )
        ) {
            this.add(
                result,
                "analytics",
                "Microsoft Clarity"
            );
        }

        // Mixpanel
        if (
            this.hasAny(
                scripts,
                [
                    "mixpanel.com",
                    "cdn.mxpnl.com",
                ]
            )
        ) {
            this.add(
                result,
                "analytics",
                "Mixpanel"
            );
        }

        // Segment
        if (
            this.hasAny(
                scripts,
                [
                    "cdn.segment.com",
                    "segment.io",
                ]
            )
        ) {
            this.add(
                result,
                "analytics",
                "Segment"
            );
        }

        // Plausible
        if (
            this.hasAny(
                scripts,
                [
                    "plausible.io",
                ]
            )
        ) {
            this.add(
                result,
                "analytics",
                "Plausible"
            );
        }
    }

    detectHosting(
        result,
        headers,
        resources
    ) {

        const server =
            headers["server"] || "";

        const via =
            headers["via"] || "";

        const poweredBy =
            headers["x-powered-by"] || "";

        // Vercel
        if (
            headers["x-vercel-id"] ||
            server.includes("vercel") ||
            poweredBy.includes("vercel") ||
            this.hasAny(
                resources,
                [
                    "vercel.app",
                ]
            )
        ) {
            this.add(
                result,
                "hosting",
                "Vercel"
            );
        }

        // Netlify
        if (
            headers["x-nf-request-id"] ||
            server.includes("netlify") ||
            this.hasAny(
                resources,
                [
                    "netlify.app",
                ]
            )
        ) {
            this.add(
                result,
                "hosting",
                "Netlify"
            );
        }

        // Cloudflare
        if (
            headers["cf-ray"] ||
            server.includes("cloudflare") ||
            headers["cf-cache-status"]
        ) {
            this.add(
                result,
                "hosting",
                "Cloudflare"
            );
        }

        // AWS / CloudFront
        if (
            headers["x-amz-cf-id"] ||
            headers["x-amz-cf-pop"] ||
            via.includes(
                "cloudfront"
            ) ||
            server.includes(
                "amazons3"
            ) ||
            this.hasAny(
                resources,
                [
                    "cloudfront.net",
                    "amazonaws.com",
                ]
            )
        ) {
            this.add(
                result,
                "hosting",
                "AWS"
            );
        }

        // Firebase
        if (
            server.includes(
                "firebase"
            ) ||
            this.hasAny(
                resources,
                [
                    "firebaseapp.com",
                    "web.app",
                ]
            )
        ) {
            this.add(
                result,
                "hosting",
                "Firebase"
            );
        }

        // GitHub Pages
        if (
            headers["x-github-request-id"] ||
            server.includes(
                "github.com"
            ) ||
            this.hasAny(
                resources,
                [
                    "github.io",
                ]
            )
        ) {
            this.add(
                result,
                "hosting",
                "GitHub Pages"
            );
        }

        // Render
        if (
            server.includes(
                "render"
            ) ||
            this.hasAny(
                resources,
                [
                    "onrender.com",
                ]
            )
        ) {
            this.add(
                result,
                "hosting",
                "Render"
            );
        }

        // Railway
        if (
            this.hasAny(
                resources,
                [
                    "railway.app",
                    "up.railway.app",
                ]
            )
        ) {
            this.add(
                result,
                "hosting",
                "Railway"
            );
        }
    }

    detectBackend(
        result,
        headers,
        html,
        resources,
        metaText
    ) {

        const poweredBy =
            headers["x-powered-by"] || "";

        const server =
            headers["server"] || "";

        // PHP
        if (
            poweredBy.includes("php") ||
            headers["x-php-version"] ||
            this.hasAny(
                resources,
                [
                    ".php",
                ]
            )
        ) {
            this.add(
                result,
                "backend",
                "PHP"
            );
        }

        // Express / Node.js
        if (
            poweredBy.includes(
                "express"
            ) ||
            this.hasAny(
                resources,
                [
                    "express",
                ]
            )
        ) {
            this.add(
                result,
                "backend",
                "Express (Node.js)"
            );
        }

        // ASP.NET
        if (
            poweredBy.includes(
                "asp.net"
            ) ||
            headers["x-aspnet-version"] ||
            headers[
                "x-aspnetmvc-version"
            ] ||
            this.hasAny(
                resources,
                [
                    ".aspx",
                    "__viewstate",
                ]
            )
        ) {
            this.add(
                result,
                "backend",
                "ASP.NET"
            );
        }

        // Nginx
        if (
            server.includes(
                "nginx"
            )
        ) {
            this.add(
                result,
                "backend",
                "Nginx"
            );
        }

        // Apache
        if (
            server.includes(
                "apache"
            )
        ) {
            this.add(
                result,
                "backend",
                "Apache"
            );
        }

        // Django
        if (
            poweredBy.includes(
                "django"
            ) ||
            server.includes(
                "wsgiserver"
            ) ||
            this.hasAny(
                resources,
                [
                    "django",
                    "csrfmiddlewaretoken",
                ]
            )
        ) {
            this.add(
                result,
                "backend",
                "Django (Python)"
            );
        }

        // Ruby on Rails
        if (
            poweredBy.includes(
                "rails"
            ) ||
            headers["x-runtime"] ||
            this.hasAny(
                resources,
                [
                    "/assets/",
                ]
            ) &&
            html.includes(
                "csrf-token"
            )
        ) {
            this.add(
                result,
                "backend",
                "Ruby on Rails"
            );
        }

        // Laravel
        if (
            this.hasAny(
                resources,
                [
                    "laravel",
                ]
            ) ||
            html.includes(
                "laravel_session"
            )
        ) {
            this.add(
                result,
                "backend",
                "Laravel (PHP)"
            );
        }

        // ASP.NET generator
        if (
            metaText.includes(
                "asp.net"
            )
        ) {
            this.add(
                result,
                "backend",
                "ASP.NET"
            );
        }
    }

    removeDuplicates(result) {

        Object.keys(result).forEach(
            (category) => {

                result[category] =
                    [
                        ...new Set(
                            result[category]
                        ),
                    ];
            }
        );
    }
}

export default new TechStackService();