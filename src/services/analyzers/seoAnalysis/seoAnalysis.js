import websiteAnalysisConfig from "../websiteAnalysis/shared/config.js";
import browserManager from "../websiteAnalysis/shared/browser.js";
import { withTimeout } from "../websiteAnalysis/shared/utils.js";


class SEOAnalysisService {

    /*
     * Main SEO analysis entry point.
     *
     * Creates an isolated browser context, analyzes the website,
     * handles timeouts and failures, and always closes the context.
     */
    async analyze(websiteUrl) {

        if (
            !websiteUrl ||
            typeof websiteUrl !== "string"
        ) {
            return this.createFailureResult(
                websiteUrl,
                "A valid website URL is required."
            );
        }

        let parsedUrl;

        try {

            parsedUrl =
                new URL(websiteUrl.trim());

        } catch {

            return this.createFailureResult(
                websiteUrl,
                "Invalid website URL."
            );
        }

        const context =
            await browserManager.createMobileContext();

        try {

            const result =
                await withTimeout(
                    this.runAnalysis(
                        context,
                        parsedUrl.href
                    ),
                    websiteAnalysisConfig.analysisTimeoutMs,
                    "SEO analysis"
                );

            return result;

        } catch (error) {

            return this.createFailureResult(
                parsedUrl.href,
                error.message ||
                "SEO analysis failed."
            );

        } finally {

            await context.close();
        }
    }


    /*
     * Executes all SEO analysis stages.
     */
    async runAnalysis(
        context,
        websiteUrl
    ) {

        const page =
            await context.newPage();

        const startedAt =
            Date.now();

        let response = null;

        try {

            response =
                await page.goto(
                    websiteUrl,
                    {
                        waitUntil:
                            "domcontentloaded",

                        timeout:
                            websiteAnalysisConfig.navTimeoutMs ||
                            30000,
                    }
                );

            await page.waitForTimeout(
                websiteAnalysisConfig.settleTimeMs ||
                1500
            );

            const finalUrl =
                page.url();

            const technical =
                await this.analyzeTechnical(
                    page,
                    response,
                    finalUrl
                );

            const onPage =
                await this.analyzeOnPage(
                    page
                );

            const content =
                await this.analyzeContent(
                    page
                );

            const images =
                await this.analyzeImages(
                    page
                );

            const links =
                await this.analyzeLinks(
                    page
                );

            const schema =
                await this.analyzeSchema(
                    page
                );

            const localSEO =
                await this.analyzeLocalSEO(
                    page
                );

            const social =
                await this.analyzeSocial(
                    page
                );

            const performance =
                await this.analyzePerformance(
                    page
                );

            const mobile =
                await this.analyzeMobile(
                    page
                );

            const indexability =
                await this.analyzeIndexability(
                    page,
                    response,
                    finalUrl
                );

            const urlStructure =
                this.analyzeUrlStructure(
                    finalUrl
                );

            const security =
                await this.analyzeSecurity(
                    page,
                    finalUrl
                );

            const issues =
                this.buildIssues({
                    technical,
                    onPage,
                    content,
                    images,
                    links,
                    schema,
                    localSEO,
                    social,
                    performance,
                    mobile,
                    indexability,
                    urlStructure,
                    security,
                });

            const opportunities =
                this.buildOpportunities(
                    issues,
                    {
                        technical,
                        onPage,
                        content,
                        images,
                        links,
                        schema,
                        localSEO,
                        social,
                        performance,
                        mobile,
                        indexability,
                        urlStructure,
                        security,
                    }
                );

            const score =
                this.calculateScore({
                    technical,
                    onPage,
                    content,
                    images,
                    links,
                    schema,
                    localSEO,
                    social,
                    performance,
                    mobile,
                    indexability,
                    urlStructure,
                    security,
                });

            const summary =
                this.buildSummary(
                    score,
                    issues,
                    opportunities
                );

            return {
                success: true,

                partial: false,

                websiteUrl,

                finalUrl,

                status:
                    response?.status() ||
                    null,

                responseTime:
                    Date.now() -
                    startedAt,

                score,

                summary,

                technical,

                onPage,

                content,

                images,

                links,

                schema,

                localSEO,

                social,

                performance,

                mobile,

                indexability,

                urlStructure,

                security,

                issues,

                opportunities,

                errors: [],
            };

        } finally {

            await page.close();
        }
    }


    /*
     * Technical SEO checks.
     */
    async analyzeTechnical(
        page,
        response,
        finalUrl
    ) {

        return await page.evaluate(
            ({
                finalUrl,
                status,
                headers,
            }) => {

                const getMeta =
                    (name) => {

                        const element =
                            document.querySelector(
                                `meta[name="${name}"]`
                            );

                        return element?.getAttribute(
                            "content"
                        )?.trim() || null;
                    };

                const title =
                    document.title?.trim() ||
                    null;

                const metaDescription =
                    getMeta(
                        "description"
                    );

                const robots =
                    getMeta(
                        "robots"
                    );

                const googlebot =
                    getMeta(
                        "googlebot"
                    );

                const viewport =
                    getMeta(
                        "viewport"
                    );

                const canonicalElement =
                    document.querySelector(
                        "link[rel='canonical']"
                    );

                const canonical =
                    canonicalElement?.href ||
                    null;

                const language =
                    document.documentElement
                        .getAttribute("lang")
                        ?.trim() ||
                    null;

                const charset =
                    document.characterSet ||
                    null;

                const favicon =
                    Boolean(
                        document.querySelector(
                            "link[rel~='icon']"
                        )
                    );

                const hreflang =
                    Array.from(
                        document.querySelectorAll(
                            "link[rel='alternate'][hreflang]"
                        )
                    ).map(
                        (element) => ({
                            language:
                                element.getAttribute(
                                    "hreflang"
                                ),

                            url:
                                element.href,
                        })
                    );

                const charsetMeta =
                    Boolean(
                        document.querySelector(
                            "meta[charset]"
                        )
                    );

                const responseRobots =
                    headers?.["x-robots-tag"] ||
                    null;

                return {

                    title: {
                        value: title,

                        length:
                            title?.length ||
                            0,

                        exists:
                            Boolean(title),

                        ideal:
                            Boolean(
                                title &&
                                title.length >= 30 &&
                                title.length <= 60
                            ),
                    },

                    metaDescription: {
                        value:
                            metaDescription,

                        length:
                            metaDescription?.length ||
                            0,

                        exists:
                            Boolean(
                                metaDescription
                            ),

                        ideal:
                            Boolean(
                                metaDescription &&
                                metaDescription.length >= 120 &&
                                metaDescription.length <= 160
                            ),
                    },

                    canonical: {
                        value:
                            canonical,

                        exists:
                            Boolean(canonical),

                        selfReferencing:
                            Boolean(
                                canonical &&
                                canonical === finalUrl
                            ),
                    },

                    robots: {
                        value:
                            robots,

                        googlebot,

                        responseHeader:
                            responseRobots,

                        exists:
                            Boolean(
                                robots ||
                                googlebot ||
                                responseRobots
                            ),

                        noindex:
                            Boolean(
                                robots?.toLowerCase()
                                    .includes("noindex") ||
                                googlebot?.toLowerCase()
                                    .includes("noindex") ||
                                responseRobots?.toLowerCase()
                                    .includes("noindex")
                            ),

                        nofollow:
                            Boolean(
                                robots?.toLowerCase()
                                    .includes("nofollow") ||
                                googlebot?.toLowerCase()
                                    .includes("nofollow")
                            ),
                    },

                    viewport: {
                        value:
                            viewport,

                        exists:
                            Boolean(viewport),
                    },

                    language: {
                        value:
                            language,

                        exists:
                            Boolean(language),
                    },

                    charset: {
                        value:
                            charset,

                        metaDefined:
                            charsetMeta,

                        exists:
                            Boolean(charset),
                    },

                    favicon,

                    hreflang: {
                        count:
                            hreflang.length,

                        exists:
                            hreflang.length > 0,

                        entries:
                            hreflang,
                    },

                    https:
                        finalUrl
                            .toLowerCase()
                            .startsWith("https://"),

                    status,

                    finalUrl,
                };
            },
            {
                finalUrl,

                status:
                    response?.status() ||
                    null,

                headers:
                    response?.headers() ||
                    {},
            }
        );
    }


    /*
     * On page SEO checks.
     */
    async analyzeOnPage(page) {

        return await page.evaluate(
            () => {

                const headings =
                    Array.from(
                        document.querySelectorAll(
                            "h1, h2, h3, h4, h5, h6"
                        )
                    ).map(
                        (element) => ({
                            level:
                                Number(
                                    element.tagName
                                        .substring(1)
                                ),

                            text:
                                element.textContent
                                    ?.replace(/\s+/g, " ")
                                    .trim() ||
                                "",
                        })
                    );

                const h1 =
                    headings.filter(
                        (heading) =>
                            heading.level === 1
                    );

                const h2 =
                    headings.filter(
                        (heading) =>
                            heading.level === 2
                    );

                const h3 =
                    headings.filter(
                        (heading) =>
                            heading.level === 3
                    );

                const anchors =
                    Array.from(
                        document.querySelectorAll(
                            "a[href]"
                        )
                    ).map(
                        (element) => {

                            const text =
                                element.textContent
                                    ?.replace(/\s+/g, " ")
                                    .trim() ||
                                "";

                            return {
                                text,

                                href:
                                    element.href,

                                rel:
                                    element.getAttribute(
                                        "rel"
                                    ) || "",

                                ariaLabel:
                                    element.getAttribute(
                                        "aria-label"
                                    ) || "",
                            };
                        }
                    );

                const emptyAnchorCount =
                    anchors.filter(
                        (anchor) =>
                            !anchor.text &&
                            !anchor.ariaLabel
                    ).length;

                const headingHierarchyIssues =
                    [];

                for (
                    let index = 1;
                    index < headings.length;
                    index++
                ) {

                    const previous =
                        headings[index - 1];

                    const current =
                        headings[index];

                    if (
                        current.level >
                        previous.level + 1
                    ) {

                        headingHierarchyIssues.push({
                            previous:
                                previous.level,

                            current:
                                current.level,

                            text:
                                current.text,
                        });
                    }
                }

                const main =
                    document.querySelector(
                        "main"
                    );

                const article =
                    document.querySelector(
                        "article"
                    );

                const paragraphs =
                    Array.from(
                        document.querySelectorAll(
                            "p"
                        )
                    );

                const paragraphText =
                    paragraphs
                        .map(
                            (element) =>
                                element.textContent || ""
                        )
                        .join(" ")
                        .replace(/\s+/g, " ")
                        .trim();

                return {

                    h1: {
                        count:
                            h1.length,

                        values:
                            h1.map(
                                (heading) =>
                                    heading.text
                            ),
                    },

                    h2: {
                        count:
                            h2.length,
                    },

                    h3: {
                        count:
                            h3.length,
                    },

                    headings: {
                        total:
                            headings.length,

                        hierarchyIssues:
                            headingHierarchyIssues,
                    },

                    paragraphs: {
                        count:
                            paragraphs.length,

                        textLength:
                            paragraphText.length,
                    },

                    anchors: {
                        total:
                            anchors.length,

                        empty:
                            emptyAnchorCount,

                        values:
                            anchors,
                    },

                    semanticStructure: {
                        main:
                            Boolean(main),

                        article:
                            Boolean(article),
                    },
                };
            }
        );
    }


    /*
     * Content quality signals.
     */
    async analyzeContent(page) {

        return await page.evaluate(
            () => {

                const bodyText =
                    document.body?.innerText
                        ?.replace(/\s+/g, " ")
                        .trim() ||
                    "";

                const words =
                    bodyText
                        .split(/\s+/)
                        .filter(Boolean);

                const uniqueWords =
                    new Set(
                        words.map(
                            (word) =>
                                word.toLowerCase()
                        )
                    );

                const title =
                    document.title
                        ?.trim() ||
                    "";

                const h1 =
                    document.querySelector(
                        "h1"
                    )?.textContent
                        ?.replace(/\s+/g, " ")
                        .trim() ||
                    "";

                const metaDescription =
                    document.querySelector(
                        "meta[name='description']"
                    )?.getAttribute("content")
                        ?.trim() ||
                    "";

                const duplicateH1Count =
                    Array.from(
                        document.querySelectorAll(
                            "h1"
                        )
                    ).filter(
                        (element) =>
                            element.textContent
                                ?.replace(/\s+/g, " ")
                                .trim()
                                .toLowerCase() ===
                            h1.toLowerCase()
                    ).length;

                return {

                    wordCount:
                        words.length,

                    uniqueWordCount:
                        uniqueWords.size,

                    textLength:
                        bodyText.length,

                    title,

                    h1,

                    metaDescription,

                    hasMainContent:
                        Boolean(
                            document.querySelector(
                                "main, article"
                            )
                        ),

                    duplicateH1Count,

                    contentDepth:
                        words.length >= 1500
                            ? "strong"
                            : words.length >= 700
                                ? "good"
                                : words.length >= 300
                                    ? "moderate"
                                    : "thin",
                };
            }
        );
    }


    /*
     * Image SEO checks.
     */
    async analyzeImages(page) {

        return await page.evaluate(
            () => {

                const images =
                    Array.from(
                        document.querySelectorAll(
                            "img"
                        )
                    );

                const missingAlt =
                    images.filter(
                        (image) =>
                            !image.hasAttribute(
                                "alt"
                            )
                    );

                const emptyAlt =
                    images.filter(
                        (image) =>
                            image.hasAttribute(
                                "alt"
                            ) &&
                            !image.getAttribute(
                                "alt"
                            )?.trim()
                    );

                const lazyImages =
                    images.filter(
                        (image) =>
                            image.getAttribute(
                                "loading"
                            ) === "lazy"
                    );

                const dimensionsMissing =
                    images.filter(
                        (image) =>
                            !image.getAttribute(
                                "width"
                            ) ||
                            !image.getAttribute(
                                "height"
                            )
                    );

                return {

                    total:
                        images.length,

                    missingAlt:
                        missingAlt.length,

                    emptyAlt:
                        emptyAlt.length,

                    lazy:
                        lazyImages.length,

                    missingDimensions:
                        dimensionsMissing.length,
                };
            }
        );
    }


    /*
     * Link and internal linking analysis.
     */
    async analyzeLinks(page) {

        return await page.evaluate(
            () => {

                const currentHost =
                    window.location.hostname;

                const anchors =
                    Array.from(
                        document.querySelectorAll(
                            "a[href]"
                        )
                    );

                let internal = 0;
                let external = 0;
                let nofollow = 0;
                let sponsored = 0;
                let ugc = 0;
                let emptyText = 0;

                const internalUrls = [];
                const externalUrls = [];

                for (
                    const anchor
                    of anchors
                ) {

                    const href =
                        anchor.href;

                    const rel =
                        anchor.getAttribute(
                            "rel"
                        ) || "";

                    const text =
                        anchor.textContent
                            ?.replace(/\s+/g, " ")
                            .trim() ||
                        "";

                    if (!text) {
                        emptyText++;
                    }

                    if (
                        rel.includes(
                            "nofollow"
                        )
                    ) {
                        nofollow++;
                    }

                    if (
                        rel.includes(
                            "sponsored"
                        )
                    ) {
                        sponsored++;
                    }

                    if (
                        rel.includes(
                            "ugc"
                        )
                    ) {
                        ugc++;
                    }

                    try {

                        const url =
                            new URL(
                                href
                            );

                        if (
                            url.hostname ===
                            currentHost
                        ) {

                            internal++;

                            internalUrls.push(
                                href
                            );

                        } else {

                            external++;

                            externalUrls.push(
                                href
                            );
                        }

                    } catch {
                        // Ignore invalid links.
                    }
                }

                return {

                    total:
                        anchors.length,

                    internal,

                    external,

                    nofollow,

                    sponsored,

                    ugc,

                    emptyText,

                    internalUrls:
                        internalUrls.slice(
                            0,
                            100
                        ),

                    externalUrls:
                        externalUrls.slice(
                            0,
                            100
                        ),
                };
            }
        );
    }


    /*
     * Structured data analysis.
     */
    async analyzeSchema(page) {

        return await page.evaluate(
            () => {

                const scripts =
                    Array.from(
                        document.querySelectorAll(
                            "script[type='application/ld+json']"
                        )
                    );

                const types = [];
                let valid = 0;
                let invalid = 0;

                for (
                    const script
                    of scripts
                ) {

                    try {

                        const parsed =
                            JSON.parse(
                                script.textContent ||
                                "{}"
                            );

                        valid++;

                        const collectTypes =
                            (value) => {

                                if (
                                    !value ||
                                    typeof value !==
                                        "object"
                                ) {
                                    return;
                                }

                                if (
                                    Array.isArray(
                                        value
                                    )
                                ) {

                                    value.forEach(
                                        collectTypes
                                    );

                                    return;
                                }

                                if (
                                    value["@type"]
                                ) {

                                    if (
                                        Array.isArray(
                                            value["@type"]
                                        )
                                    ) {

                                        types.push(
                                            ...value["@type"]
                                        );

                                    } else {

                                        types.push(
                                            value["@type"]
                                        );
                                    }
                                }

                                if (
                                    value["@graph"]
                                ) {

                                    collectTypes(
                                        value["@graph"]
                                    );
                                }
                            };

                        collectTypes(
                            parsed
                        );

                    } catch {

                        invalid++;
                    }
                }

                const uniqueTypes =
                    [
                        ...new Set(
                            types
                        ),
                    ];

                return {

                    total:
                        scripts.length,

                    valid,

                    invalid,

                    exists:
                        scripts.length > 0,

                    types:
                        uniqueTypes,

                    hasLocalBusiness:
                        uniqueTypes.some(
                            (type) =>
                                String(type)
                                    .toLowerCase()
                                    .includes(
                                        "localbusiness"
                                    )
                        ),

                    hasOrganization:
                        uniqueTypes.some(
                            (type) =>
                                String(type)
                                    .toLowerCase() ===
                                "organization"
                        ),

                    hasWebsite:
                        uniqueTypes.some(
                            (type) =>
                                String(type)
                                    .toLowerCase() ===
                                "website"
                        ),

                    hasBreadcrumb:
                        uniqueTypes.some(
                            (type) =>
                                String(type)
                                    .toLowerCase() ===
                                "breadcrumblist"
                        ),
                };
            }
        );
    }


    /*
     * Local SEO signals.
     */
    async analyzeLocalSEO(page) {

        return await page.evaluate(
            () => {

                const bodyText =
                    document.body?.innerText
                        ?.replace(/\s+/g, " ")
                        .trim() ||
                    "";

                const telLinks =
                    document.querySelectorAll(
                        "a[href^='tel:']"
                    );

                const mailLinks =
                    document.querySelectorAll(
                        "a[href^='mailto:']"
                    );

                const address =
                    document.querySelector(
                        "address"
                    );

                const localBusinessElements =
                    document.querySelectorAll(
                        "[itemtype*='LocalBusiness'], [itemtype*='Organization']"
                    );

                const locationSignals =
                    [
                        "city",
                        "state",
                        "country",
                        "location",
                        "address",
                    ].filter(
                        (term) =>
                            bodyText
                                .toLowerCase()
                                .includes(term)
                    );

                return {

                    phone:
                        telLinks.length > 0,

                    phoneCount:
                        telLinks.length,

                    email:
                        mailLinks.length > 0,

                    emailCount:
                        mailLinks.length,

                    address:
                        Boolean(address),

                    addressText:
                        address?.textContent
                            ?.replace(/\s+/g, " ")
                            .trim() ||
                        null,

                    localBusinessMarkup:
                        localBusinessElements.length >
                        0,

                    locationSignals:
                        locationSignals.length,

                    hasLocationSignals:
                        locationSignals.length >=
                        2,
                };
            }
        );
    }


    /*
     * Open Graph and Twitter social metadata.
     */
    async analyzeSocial(page) {

        return await page.evaluate(
            () => {

                const getProperty =
                    (property) => {

                        const element =
                            document.querySelector(
                                `meta[property="${property}"]`
                            );

                        return element?.getAttribute(
                            "content"
                        )?.trim() || null;
                    };

                const getName =
                    (name) => {

                        const element =
                            document.querySelector(
                                `meta[name="${name}"]`
                            );

                        return element?.getAttribute(
                            "content"
                        )?.trim() || null;
                    };

                const openGraph = {

                    title:
                        getProperty(
                            "og:title"
                        ),

                    description:
                        getProperty(
                            "og:description"
                        ),

                    image:
                        getProperty(
                            "og:image"
                        ),

                    url:
                        getProperty(
                            "og:url"
                        ),

                    type:
                        getProperty(
                            "og:type"
                        ),
                };

                const twitter = {

                    card:
                        getName(
                            "twitter:card"
                        ),

                    title:
                        getName(
                            "twitter:title"
                        ),

                    description:
                        getName(
                            "twitter:description"
                        ),

                    image:
                        getName(
                            "twitter:image"
                        ),
                };

                return {

                    openGraph,

                    twitter,

                    openGraphComplete:
                        Boolean(
                            openGraph.title &&
                            openGraph.description &&
                            openGraph.image
                        ),

                    twitterComplete:
                        Boolean(
                            twitter.card &&
                            twitter.title &&
                            twitter.description
                        ),
                };
            }
        );
    }


    /*
     * Lightweight performance signals.
     *
     * Detailed performance analysis remains the responsibility
     * of the existing Website Analysis module.
     */
    async analyzePerformance(page) {

        return await page.evaluate(
            () => {

                const resources =
                    performance.getEntriesByType(
                        "resource"
                    );

                const navigation =
                    performance.getEntriesByType(
                        "navigation"
                    )[0];

                const scripts =
                    document.querySelectorAll(
                        "script[src]"
                    ).length;

                const stylesheets =
                    document.querySelectorAll(
                        "link[rel='stylesheet']"
                    ).length;

                const images =
                    document.querySelectorAll(
                        "img"
                    ).length;

                const fonts =
                    resources.filter(
                        (resource) =>
                            resource.name.match(
                                /\.(woff2?|ttf|otf)(\?|$)/i
                            )
                    ).length;

                const javascriptResources =
                    resources.filter(
                        (resource) =>
                            resource.name.match(
                                /\.js(\?|$)/i
                            )
                    ).length;

                const cssResources =
                    resources.filter(
                        (resource) =>
                            resource.name.match(
                                /\.css(\?|$)/i
                            )
                    ).length;

                const imageResources =
                    resources.filter(
                        (resource) =>
                            resource.name.match(
                                /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i
                            )
                    ).length;

                return {

                    resourceCount:
                        resources.length,

                    scripts,

                    stylesheets,

                    images,

                    fonts,

                    javascriptResources,

                    cssResources,

                    imageResources,

                    transferSize:
                        resources.reduce(
                            (
                                total,
                                resource
                            ) =>
                                total +
                                (
                                    resource.transferSize ||
                                    0
                                ),
                            0
                        ),

                    navigation: {

                        dns:
                            navigation?.domainLookupEnd -
                            navigation?.domainLookupStart ||
                            0,

                        connection:
                            navigation?.connectEnd -
                            navigation?.connectStart ||
                            0,

                        response:
                            navigation?.responseEnd -
                            navigation?.responseStart ||
                            0,

                        domContentLoaded:
                            navigation?.domContentLoadedEventEnd ||
                            0,

                        load:
                            navigation?.loadEventEnd ||
                            0,
                    },
                };
            }
        );
    }


    /*
     * Mobile SEO checks.
     */
    async analyzeMobile(page) {

        return await page.evaluate(
            () => {

                const viewport =
                    document.querySelector(
                        "meta[name='viewport']"
                    );

                const viewportContent =
                    viewport?.getAttribute(
                        "content"
                    ) || "";

                const documentWidth =
                    document.documentElement
                        .scrollWidth;

                const viewportWidth =
                    window.innerWidth;

                const horizontalOverflow =
                    documentWidth >
                    viewportWidth + 5;

                const smallTextElements =
                    Array.from(
                        document.querySelectorAll(
                            "body *"
                        )
                    ).filter(
                        (element) => {

                            const style =
                                window.getComputedStyle(
                                    element
                                );

                            const size =
                                parseFloat(
                                    style.fontSize
                                );

                            return (
                                size > 0 &&
                                size < 12
                            );
                        }
                    ).length;

                return {

                    viewport:
                        viewportContent,

                    viewportExists:
                        Boolean(viewport),

                    horizontalOverflow,

                    documentWidth,

                    viewportWidth,

                    smallTextElements,
                };
            }
        );
    }


    /*
     * Indexability checks.
     *
     * Checks robots.txt and sitemap availability
     * in addition to page-level robots directives.
     */
    async analyzeIndexability(
        page,
        response,
        finalUrl
    ) {

        const pageRobots =
            await page.evaluate(
                () => {

                    const meta =
                        document.querySelector(
                            "meta[name='robots']"
                        );

                    const googlebot =
                        document.querySelector(
                            "meta[name='googlebot']"
                        );

                    return {

                        robots:
                            meta?.getAttribute(
                                "content"
                            ) || null,

                        googlebot:
                            googlebot?.getAttribute(
                                "content"
                            ) || null,
                    };
                }
            );

        let origin;

        try {

            origin =
                new URL(
                    finalUrl
                ).origin;

        } catch {

            origin = null;
        }

        let robotsTxt = {
            exists: false,
            status: null,
            content: "",
            sitemapUrls: [],
        };

        let sitemap = {
            exists: false,
            status: null,
            url: null,
        };

        if (origin) {

            robotsTxt =
                await page.evaluate(
                    async (
                        robotsUrl
                    ) => {

                        try {

                            const response =
                                await fetch(
                                    robotsUrl,
                                    {
                                        method:
                                            "GET",
                                        credentials:
                                            "omit",
                                    }
                                );

                            const content =
                                await response.text();

                            const sitemapUrls =
                                content
                                    .split(/\r?\n/)
                                    .map(
                                        (line) =>
                                            line.trim()
                                    )
                                    .filter(
                                        (line) =>
                                            /^sitemap\s*:/i.test(
                                                line
                                            )
                                    )
                                    .map(
                                        (line) =>
                                            line
                                                .replace(
                                                    /^sitemap\s*:/i,
                                                    ""
                                                )
                                                .trim()
                                    );

                            return {

                                exists:
                                    response.ok,

                                status:
                                    response.status,

                                content,

                                sitemapUrls,
                            };

                        } catch {

                            return {

                                exists: false,

                                status: null,

                                content: "",

                                sitemapUrls: [],
                            };
                        }
                    },
                    `${origin}/robots.txt`
                );

            const sitemapCandidates =
                [
                    ...robotsTxt.sitemapUrls,

                    `${origin}/sitemap.xml`,

                    `${origin}/sitemap_index.xml`,
                ];

            for (
                const sitemapUrl
                of sitemapCandidates
            ) {

                const result =
                    await page.evaluate(
                        async (
                            url
                        ) => {

                            try {

                                const response =
                                    await fetch(
                                        url,
                                        {
                                            method:
                                                "GET",
                                            credentials:
                                                "omit",
                                        }
                                    );

                                return {

                                    exists:
                                        response.ok,

                                    status:
                                        response.status,

                                    url,
                                };

                            } catch {

                                return {

                                    exists: false,

                                    status: null,

                                    url,
                                };
                            }
                        },
                        sitemapUrl
                    );

                if (result.exists) {

                    sitemap =
                        result;

                    break;
                }
            }
        }

        const responseHeaders =
            response?.headers() ||
            {};

        const xRobotsTag =
            responseHeaders[
                "x-robots-tag"
            ] || null;

        const robotsValue =
            [
                pageRobots.robots,
                pageRobots.googlebot,
                xRobotsTag,
            ]
                .filter(Boolean)
                .join(",");

        const noindex =
            robotsValue
                .toLowerCase()
                .includes(
                    "noindex"
                );

        const nofollow =
            robotsValue
                .toLowerCase()
                .includes(
                    "nofollow"
                );

        return {

            noindex,

            nofollow,

            robotsMeta:
                pageRobots.robots,

            googlebotMeta:
                pageRobots.googlebot,

            xRobotsTag,

            robotsTxt,

            sitemap,

            crawlable:
                !noindex,

            indexable:
                !noindex &&
                response?.status() >= 200 &&
                response?.status() < 300,
        };
    }


    /*
     * URL structure checks.
     */
    analyzeUrlStructure(
        finalUrl
    ) {

        try {

            const url =
                new URL(
                    finalUrl
                );

            const path =
                url.pathname;

            const segments =
                path
                    .split("/")
                    .filter(Boolean);

            return {

                protocol:
                    url.protocol,

                hostname:
                    url.hostname,

                path,

                depth:
                    segments.length,

                length:
                    finalUrl.length,

                queryParameters:
                    url.searchParams.size,

                hasFragment:
                    Boolean(
                        url.hash
                    ),

                hasUnderscore:
                    path.includes("_"),

                hasUppercase:
                    path !==
                    path.toLowerCase(),

                trailingSlash:
                    path.length > 1 &&
                    path.endsWith("/"),

                clean:
                    finalUrl.length <= 120 &&
                    !path.includes("_") &&
                    path === path.toLowerCase(),
            };

        } catch {

            return {

                protocol: null,

                hostname: null,

                path: null,

                depth: 0,

                length:
                    finalUrl?.length ||
                    0,

                queryParameters: 0,

                hasFragment: false,

                hasUnderscore: false,

                hasUppercase: false,

                trailingSlash: false,

                clean: false,
            };
        }
    }


    /*
     * HTTPS and mixed content checks.
     */
    async analyzeSecurity(
        page,
        finalUrl
    ) {

        return await page.evaluate(
            ({
                finalUrl,
            }) => {

                const isHttps =
                    finalUrl
                        .toLowerCase()
                        .startsWith(
                            "https://"
                        );

                const mixedContent =
                    isHttps
                        ? Array.from(
                            document.querySelectorAll(
                                "[src], [href]"
                            )
                        ).filter(
                            (element) => {

                                const value =
                                    element.getAttribute(
                                        "src"
                                    ) ||
                                    element.getAttribute(
                                        "href"
                                    ) ||
                                    "";

                                return value
                                    .toLowerCase()
                                    .startsWith(
                                        "http://"
                                    );
                            }
                        ).length
                        : 0;

                return {

                    https:
                        isHttps,

                    mixedContent,

                    secure:
                        isHttps &&
                        mixedContent === 0,
                };
            },
            {
                finalUrl,
            }
        );
    }


    /*
     * Converts raw SEO problems into prioritized issues.
     */
    buildIssues(
        data
    ) {

        const issues = [];

        const addIssue =
            (
                category,
                title,
                description,
                severity,
                impact,
                service
            ) => {

                issues.push({

                    category,

                    title,

                    description,

                    severity,

                    impact,

                    service,
                });
            };


        /*
         * Technical SEO issues.
         */

        if (
            !data.technical.title.exists
        ) {

            addIssue(
                "technical",
                "Missing title tag",
                "The page does not have a title tag.",
                "critical",
                "high",
                "Technical SEO"
            );

        } else if (
            !data.technical.title.ideal
        ) {

            addIssue(
                "technical",
                "Title tag length needs improvement",
                "The title exists but its length is outside the commonly recommended range.",
                "medium",
                "medium",
                "On Page SEO"
            );
        }


        if (
            !data.technical.metaDescription.exists
        ) {

            addIssue(
                "technical",
                "Missing meta description",
                "The page does not define a meta description.",
                "high",
                "high",
                "On Page SEO"
            );

        } else if (
            !data.technical.metaDescription.ideal
        ) {

            addIssue(
                "technical",
                "Meta description length needs improvement",
                "The meta description exists but its length could be improved.",
                "medium",
                "medium",
                "On Page SEO"
            );
        }


        if (
            !data.technical.canonical.exists
        ) {

            addIssue(
                "technical",
                "Missing canonical URL",
                "The page does not define a canonical URL.",
                "high",
                "high",
                "Technical SEO"
            );

        } else if (
            !data.technical.canonical.selfReferencing
        ) {

            addIssue(
                "technical",
                "Canonical URL differs from current URL",
                "The canonical URL does not point to the current final page URL.",
                "medium",
                "medium",
                "Technical SEO"
            );
        }


        if (
            !data.technical.language.exists
        ) {

            addIssue(
                "technical",
                "Missing language attribute",
                "The HTML document does not define a language.",
                "medium",
                "medium",
                "Technical SEO"
            );
        }


        if (
            !data.technical.viewport.exists
        ) {

            addIssue(
                "mobile",
                "Missing viewport configuration",
                "The page does not define a mobile viewport.",
                "high",
                "high",
                "Technical SEO"
            );
        }


        if (
            !data.technical.hreflang.exists
        ) {

            /*
             * No issue is created here.
             *
             * Hreflang is only important for multilingual
             * or multi-regional websites.
             */
        }


        if (
            !data.technical.https
        ) {

            addIssue(
                "security",
                "Website is not using HTTPS",
                "The analyzed page is not served over HTTPS.",
                "critical",
                "high",
                "Technical SEO"
            );
        }


        if (
            data.technical.robots.noindex
        ) {

            addIssue(
                "indexability",
                "Page contains a noindex directive",
                "Search engines are explicitly instructed not to index this page.",
                "critical",
                "high",
                "Technical SEO"
            );
        }


        if (
            data.technical.robots.nofollow
        ) {

            addIssue(
                "indexability",
                "Page contains a nofollow directive",
                "Search engines are instructed not to follow links from this page.",
                "high",
                "medium",
                "Technical SEO"
            );
        }


        /*
         * On page issues.
         */

        if (
            data.onPage.h1.count === 0
        ) {

            addIssue(
                "onPage",
                "Missing H1 heading",
                "The page does not contain an H1 heading.",
                "high",
                "high",
                "On Page SEO"
            );

        } else if (
            data.onPage.h1.count > 1
        ) {

            addIssue(
                "onPage",
                "Multiple H1 headings",
                "The page contains multiple H1 headings. The headings should clearly represent the main topic.",
                "medium",
                "medium",
                "On Page SEO"
            );
        }


        if (
            data.onPage.headings.hierarchyIssues.length >
            0
        ) {

            addIssue(
                "onPage",
                "Heading hierarchy has gaps",
                "Heading levels skip one or more levels and should be structured more consistently.",
                "medium",
                "medium",
                "On Page SEO"
            );
        }


        if (
            data.onPage.anchors.empty > 0
        ) {

            addIssue(
                "onPage",
                "Links without descriptive text",
                `${data.onPage.anchors.empty} links do not contain useful visible text or an aria label.`,
                "medium",
                "medium",
                "On Page SEO"
            );
        }


        /*
         * Content issues.
         */

        if (
            data.content.wordCount < 300
        ) {

            addIssue(
                "content",
                "Thin page content",
                "The page contains relatively little visible text and may have limited topical depth.",
                "high",
                "high",
                "Content SEO"
            );

        } else if (
            data.content.wordCount < 700
        ) {

            addIssue(
                "content",
                "Limited content depth",
                "The page contains moderate text but may have room for more useful topical coverage.",
                "medium",
                "medium",
                "Content SEO"
            );
        }


        if (
            data.content.duplicateH1Count > 1
        ) {

            addIssue(
                "content",
                "Repeated H1 content",
                "The same H1 content appears more than once.",
                "medium",
                "medium",
                "On Page SEO"
            );
        }


        /*
         * Image issues.
         */

        if (
            data.images.missingAlt > 0
        ) {

            addIssue(
                "images",
                "Images missing alt attributes",
                `${data.images.missingAlt} images do not have alt attributes.`,
                "high",
                "high",
                "Technical SEO"
            );
        }


        if (
            data.images.missingDimensions > 0
        ) {

            addIssue(
                "images",
                "Images missing dimensions",
                `${data.images.missingDimensions} images do not define width and height attributes.`,
                "medium",
                "medium",
                "Technical SEO"
            );
        }


        /*
         * Internal linking.
         */

        if (
            data.links.internal < 3
        ) {

            addIssue(
                "links",
                "Weak internal linking",
                "The page contains very few internal links.",
                "medium",
                "high",
                "On Page SEO"
            );
        }


        /*
         * Schema issues.
         */

        if (
            !data.schema.exists
        ) {

            addIssue(
                "schema",
                "No structured data detected",
                "No JSON LD structured data was detected on the page.",
                "high",
                "high",
                "Technical SEO"
            );

        } else if (
            data.schema.invalid > 0
        ) {

            addIssue(
                "schema",
                "Invalid structured data detected",
                `${data.schema.invalid} structured data blocks could not be parsed as valid JSON.`,
                "high",
                "high",
                "Technical SEO"
            );
        }


        /*
         * Local SEO issues.
         */

        if (
            !data.localSEO.phone
        ) {

            addIssue(
                "localSEO",
                "No visible phone signal detected",
                "No tel link was detected on the analyzed page.",
                "medium",
                "medium",
                "Local SEO"
            );
        }


        if (
            !data.localSEO.address
        ) {

            addIssue(
                "localSEO",
                "No address element detected",
                "No semantic address element was detected.",
                "medium",
                "high",
                "Local SEO"
            );
        }


        if (
            !data.localSEO.localBusinessMarkup &&
            !data.schema.hasLocalBusiness
        ) {

            addIssue(
                "localSEO",
                "LocalBusiness structured data missing",
                "No LocalBusiness structured data was detected.",
                "high",
                "high",
                "Local SEO"
            );
        }


        /*
         * Social metadata.
         */

        if (
            !data.social.openGraphComplete
        ) {

            addIssue(
                "social",
                "Incomplete Open Graph metadata",
                "Open Graph title, description and image are not all configured.",
                "medium",
                "medium",
                "Social Media SEO"
            );
        }


        if (
            !data.social.twitterComplete
        ) {

            addIssue(
                "social",
                "Incomplete Twitter metadata",
                "Twitter card metadata is incomplete.",
                "low",
                "low",
                "Social Media SEO"
            );
        }


        /*
         * Performance signals.
         */

        if (
            data.performance.scripts > 15
        ) {

            addIssue(
                "performance",
                "High number of JavaScript files",
                "The page loads a large number of JavaScript files.",
                "medium",
                "medium",
                "Technical SEO"
            );
        }


        if (
            data.performance.stylesheets > 10
        ) {

            addIssue(
                "performance",
                "High number of stylesheets",
                "The page loads a large number of stylesheet resources.",
                "medium",
                "medium",
                "Technical SEO"
            );
        }


        if (
            data.performance.imageResources > 30
        ) {

            addIssue(
                "performance",
                "High number of image resources",
                "The page loads many image resources and may benefit from image optimization.",
                "medium",
                "medium",
                "Performance SEO"
            );
        }


        /*
         * Mobile issues.
         */

        if (
            data.mobile.horizontalOverflow
        ) {

            addIssue(
                "mobile",
                "Horizontal mobile overflow",
                "The page is wider than the mobile viewport.",
                "high",
                "high",
                "Technical SEO"
            );
        }


        if (
            data.mobile.smallTextElements > 20
        ) {

            addIssue(
                "mobile",
                "Many very small text elements",
                "The page contains many elements with font sizes below 12 pixels.",
                "medium",
                "medium",
                "Technical SEO"
            );
        }


        /*
         * Robots and sitemap.
         */

        if (
            !data.indexability.robotsTxt.exists
        ) {

            addIssue(
                "indexability",
                "robots.txt not detected",
                "A robots.txt file could not be detected.",
                "medium",
                "medium",
                "Technical SEO"
            );
        }


        if (
            !data.indexability.sitemap.exists
        ) {

            addIssue(
                "indexability",
                "XML sitemap not detected",
                "A sitemap could not be detected from robots.txt or common sitemap locations.",
                "medium",
                "high",
                "Technical SEO"
            );
        }


        /*
         * URL structure.
         */

        if (
            data.urlStructure.hasUnderscore
        ) {

            addIssue(
                "url",
                "URL contains underscores",
                "The URL path contains underscores and could use a cleaner structure.",
                "low",
                "low",
                "Technical SEO"
            );
        }


        if (
            data.urlStructure.hasUppercase
        ) {

            addIssue(
                "url",
                "URL contains uppercase characters",
                "The URL path contains uppercase characters.",
                "low",
                "low",
                "Technical SEO"
            );
        }


        if (
            data.urlStructure.length > 120
        ) {

            addIssue(
                "url",
                "Long URL",
                "The current URL is unusually long.",
                "low",
                "low",
                "Technical SEO"
            );
        }


        /*
         * Security.
         */

        if (
            data.security.mixedContent > 0
        ) {

            addIssue(
                "security",
                "Mixed content detected",
                `${data.security.mixedContent} HTTP resources were detected on an HTTPS page.`,
                "high",
                "high",
                "Technical SEO"
            );
        }


        return issues;
    }


    /*
     * Converts SEO issues into actionable services
     * that an SEO agency can potentially sell.
     */
    buildOpportunities(
        issues,
        data
    ) {

        const opportunities =
            issues.map(
                (issue) => {

                    return {

                        service:
                            issue.service,

                        priority:
                            issue.severity,

                        impact:
                            issue.impact,

                        title:
                            issue.title,

                        reason:
                            issue.description,

                        category:
                            issue.category,

                        recommendedAction:
                            this.getRecommendedAction(
                                issue
                            ),
                    };
                }
            );


        /*
         * Add positive opportunities when the website
         * already has some strong foundations.
         */

        if (
            data.content.wordCount >= 700 &&
            data.technical.title.exists &&
            data.technical.metaDescription.exists
        ) {

            opportunities.push({

                service:
                    "Content SEO",

                priority:
                    "medium",

                impact:
                    "high",

                title:
                    "Content expansion opportunity",

                reason:
                    "The website already has basic content foundations and may benefit from expanding commercial and informational content.",

                category:
                    "content",

                recommendedAction:
                    "Build targeted landing pages, service pages, location pages and supporting informational content.",
            });
        }


        if (
            data.localSEO.phone &&
            data.localSEO.address &&
            !data.schema.hasLocalBusiness
        ) {

            opportunities.push({

                service:
                    "Local SEO",

                priority:
                    "high",

                impact:
                    "high",

                title:
                    "Local SEO markup opportunity",

                reason:
                    "The website exposes local business information but does not appear to provide LocalBusiness structured data.",

                category:
                    "localSEO",

                recommendedAction:
                    "Implement complete LocalBusiness structured data and align business information across the website and local listings.",
            });
        }


        if (
            data.links.internal >= 5 &&
            data.content.wordCount >= 700
        ) {

            opportunities.push({

                service:
                    "SEO Strategy",

                priority:
                    "medium",

                impact:
                    "high",

                title:
                    "Internal linking optimization",

                reason:
                    "The website has enough content and internal pages to support a stronger internal linking strategy.",

                category:
                    "links",

                recommendedAction:
                    "Create topic clusters and connect important commercial pages with relevant supporting content.",
            });
        }


        return opportunities;
    }


    /*
     * Maps an issue to a client-facing SEO service.
     */
    getRecommendedAction(
        issue
    ) {

        const actions = {

            "Missing title tag":
                "Create unique keyword-focused title tags for important pages.",

            "Title tag length needs improvement":
                "Rewrite the title tag to communicate the page topic clearly within an appropriate length.",

            "Missing meta description":
                "Create a compelling meta description focused on the page intent and target audience.",

            "Meta description length needs improvement":
                "Rewrite the meta description to improve search-result presentation.",

            "Missing canonical URL":
                "Implement canonical URLs to control duplicate URL signals.",

            "Missing H1 heading":
                "Create a clear primary H1 describing the main topic of the page.",

            "Multiple H1 headings":
                "Review heading structure and ensure the primary page topic is clearly represented.",

            "Thin page content":
                "Expand the page with useful, original and commercially relevant content.",

            "Limited content depth":
                "Expand topical coverage with useful sections, FAQs and supporting information.",

            "Images missing alt attributes":
                "Add descriptive alt text to meaningful images.",

            "Images missing dimensions":
                "Add image dimensions and optimize image delivery to reduce layout shifts.",

            "Weak internal linking":
                "Build a stronger internal linking structure between important pages.",

            "No structured data detected":
                "Implement relevant Schema.org structured data.",

            "Invalid structured data detected":
                "Fix invalid JSON LD markup and validate the structured data.",

            "LocalBusiness structured data missing":
                "Implement LocalBusiness structured data with accurate business information.",

            "No visible phone signal detected":
                "Improve visible contact information and local business signals.",

            "No address element detected":
                "Add clear business location information using semantic markup.",

            "Incomplete Open Graph metadata":
                "Add complete Open Graph metadata for social sharing.",

            "Incomplete Twitter metadata":
                "Add Twitter card metadata for better social previews.",

            "High number of JavaScript files":
                "Reduce JavaScript requests and optimize script loading.",

            "High number of stylesheets":
                "Consolidate and optimize CSS resources.",

            "High number of image resources":
                "Compress, resize and lazy-load images where appropriate.",

            "Horizontal mobile overflow":
                "Fix responsive layout problems causing horizontal scrolling.",

            "robots.txt not detected":
                "Create and configure a robots.txt file.",

            "XML sitemap not detected":
                "Create and submit an XML sitemap.",

            "Mixed content detected":
                "Convert HTTP resources to HTTPS and remove mixed content warnings.",

            "Website is not using HTTPS":
                "Move the website to HTTPS and redirect HTTP URLs properly.",
        };

        return (
            actions[issue.title] ||
            "Review the issue and implement an SEO-focused improvement."
        );
    }


    /*
     * Calculates the final SEO score.
     *
     * The score is based on multiple independent SEO areas
     * rather than only checking whether fields exist.
     */
    calculateScore(
        data
    ) {

        const technical =
            this.scoreTechnical(
                data.technical
            );

        const onPage =
            this.scoreOnPage(
                data.onPage
            );

        const content =
            this.scoreContent(
                data.content
            );

        const images =
            this.scoreImages(
                data.images
            );

        const links =
            this.scoreLinks(
                data.links
            );

        const schema =
            this.scoreSchema(
                data.schema
            );

        const localSEO =
            this.scoreLocalSEO(
                data.localSEO,
                data.schema
            );

        const social =
            this.scoreSocial(
                data.social
            );

        const performance =
            this.scorePerformance(
                data.performance
            );

        const mobile =
            this.scoreMobile(
                data.mobile
            );

        const indexability =
            this.scoreIndexability(
                data.indexability
            );

        const security =
            this.scoreSecurity(
                data.security
            );

        const urlStructure =
            this.scoreUrlStructure(
                data.urlStructure
            );

        const total =
            Math.round(
                (
                    technical * 0.18 +
                    onPage * 0.12 +
                    content * 0.12 +
                    images * 0.06 +
                    links * 0.08 +
                    schema * 0.08 +
                    localSEO * 0.10 +
                    social * 0.04 +
                    performance * 0.08 +
                    mobile * 0.06 +
                    indexability * 0.10 +
                    security * 0.04 +
                    urlStructure * 0.02
                )
            );

        return {

            overall:
                Math.max(
                    0,
                    Math.min(
                        100,
                        total
                    )
                ),

            technical,

            onPage,

            content,

            images,

            links,

            schema,

            localSEO,

            social,

            performance,

            mobile,

            indexability,

            security,

            urlStructure,
        };
    }


    /*
     * Technical SEO score.
     */
    scoreTechnical(
        technical
    ) {

        let score = 0;

        if (
            technical.title.exists
        ) {
            score += 15;
        }

        if (
            technical.title.ideal
        ) {
            score += 5;
        }

        if (
            technical.metaDescription.exists
        ) {
            score += 10;
        }

        if (
            technical.metaDescription.ideal
        ) {
            score += 5;
        }

        if (
            technical.canonical.exists
        ) {
            score += 15;
        }

        if (
            technical.canonical.selfReferencing
        ) {
            score += 5;
        }

        if (
            technical.viewport.exists
        ) {
            score += 10;
        }

        if (
            technical.language.exists
        ) {
            score += 5;
        }

        if (
            technical.charset.exists
        ) {
            score += 5;
        }

        if (
            technical.favicon
        ) {
            score += 5;
        }

        if (
            technical.https
        ) {
            score += 20;
        }

        return Math.min(
            100,
            score
        );
    }


    /*
     * On page SEO score.
     */
    scoreOnPage(
        onPage
    ) {

        let score = 0;

        if (
            onPage.h1.count === 1
        ) {
            score += 30;
        } else if (
            onPage.h1.count > 0
        ) {
            score += 15;
        }

        if (
            onPage.h2.count > 0
        ) {
            score += 15;
        }

        if (
            onPage.h3.count > 0
        ) {
            score += 10;
        }

        if (
            onPage.headings.hierarchyIssues.length ===
            0
        ) {
            score += 15;
        }

        if (
            onPage.anchors.total >= 5
        ) {
            score += 15;
        }

        if (
            onPage.anchors.empty === 0
        ) {
            score += 15;
        }

        return Math.min(
            100,
            score
        );
    }


    /*
     * Content score.
     */
    scoreContent(
        content
    ) {

        let score = 0;

        if (
            content.wordCount >= 1500
        ) {
            score += 60;

        } else if (
            content.wordCount >= 700
        ) {
            score += 45;

        } else if (
            content.wordCount >= 300
        ) {
            score += 30;

        } else {
            score += 10;
        }

        if (
            content.hasMainContent
        ) {
            score += 20;
        }

        if (
            content.h1
        ) {
            score += 10;
        }

        if (
            content.metaDescription
        ) {
            score += 10;
        }

        return Math.min(
            100,
            score
        );
    }


    /*
     * Image SEO score.
     */
    scoreImages(
        images
    ) {

        if (
            images.total === 0
        ) {
            return 80;
        }

        let score = 100;

        if (
            images.missingAlt > 0
        ) {

            score -= Math.min(
                40,
                images.missingAlt * 5
            );
        }

        if (
            images.missingDimensions > 0
        ) {

            score -= Math.min(
                20,
                images.missingDimensions * 3
            );
        }

        return Math.max(
            0,
            score
        );
    }


    /*
     * Internal linking score.
     */
    scoreLinks(
        links
    ) {

        let score = 0;

        if (
            links.internal >= 10
        ) {
            score += 60;

        } else if (
            links.internal >= 5
        ) {
            score += 45;

        } else if (
            links.internal >= 3
        ) {
            score += 30;

        } else {
            score += 10;
        }

        if (
            links.emptyText === 0
        ) {
            score += 20;
        }

        if (
            links.total > 0
        ) {
            score += 20;
        }

        return Math.min(
            100,
            score
        );
    }


    /*
     * Structured data score.
     */
    scoreSchema(
        schema
    ) {

        if (
            !schema.exists
        ) {
            return 20;
        }

        let score = 50;

        if (
            schema.valid > 0
        ) {
            score += 20;
        }

        if (
            schema.invalid === 0
        ) {
            score += 10;
        }

        if (
            schema.hasOrganization ||
            schema.hasLocalBusiness
        ) {
            score += 10;
        }

        if (
            schema.hasWebsite
        ) {
            score += 5;
        }

        if (
            schema.hasBreadcrumb
        ) {
            score += 5;
        }

        return Math.min(
            100,
            score
        );
    }


    /*
     * Local SEO score.
     */
    scoreLocalSEO(
        localSEO,
        schema
    ) {

        let score = 0;

        if (
            localSEO.phone
        ) {
            score += 20;
        }

        if (
            localSEO.email
        ) {
            score += 10;
        }

        if (
            localSEO.address
        ) {
            score += 25;
        }

        if (
            localSEO.hasLocationSignals
        ) {
            score += 20;
        }

        if (
            localSEO.localBusinessMarkup ||
            schema.hasLocalBusiness
        ) {
            score += 25;
        }

        return Math.min(
            100,
            score
        );
    }


    /*
     * Social metadata score.
     */
    scoreSocial(
        social
    ) {

        let score = 0;

        if (
            social.openGraphComplete
        ) {
            score += 60;
        } else if (
            social.openGraph.title ||
            social.openGraph.description
        ) {
            score += 30;
        }

        if (
            social.twitterComplete
        ) {
            score += 40;
        }

        return Math.min(
            100,
            score
        );
    }


    /*
     * Performance score.
     */
    scorePerformance(
        performance
    ) {

        let score = 100;

        if (
            performance.scripts > 20
        ) {
            score -= 30;

        } else if (
            performance.scripts > 15
        ) {
            score -= 20;

        } else if (
            performance.scripts > 10
        ) {
            score -= 10;
        }

        if (
            performance.stylesheets > 10
        ) {
            score -= 20;

        } else if (
            performance.stylesheets > 6
        ) {
            score -= 10;
        }

        if (
            performance.imageResources > 30
        ) {
            score -= 20;

        } else if (
            performance.imageResources > 20
        ) {
            score -= 10;
        }

        return Math.max(
            0,
            score
        );
    }


    /*
     * Mobile score.
     */
    scoreMobile(
        mobile
    ) {

        let score = 100;

        if (
            !mobile.viewportExists
        ) {
            score -= 40;
        }

        if (
            mobile.horizontalOverflow
        ) {
            score -= 40;
        }

        if (
            mobile.smallTextElements > 20
        ) {
            score -= 20;
        }

        return Math.max(
            0,
            score
        );
    }


    /*
     * Indexability score.
     */
    scoreIndexability(
        indexability
    ) {

        let score = 0;

        if (
            indexability.indexable
        ) {
            score += 45;
        }

        if (
            indexability.robotsTxt.exists
        ) {
            score += 25;
        }

        if (
            indexability.sitemap.exists
        ) {
            score += 30;
        }

        return Math.min(
            100,
            score
        );
    }


    /*
     * Security score.
     */
    scoreSecurity(
        security
    ) {

        if (
            security.secure
        ) {
            return 100;
        }

        if (
            security.https
        ) {
            return 60;
        }

        return 20;
    }


    /*
     * URL structure score.
     */
    scoreUrlStructure(
        urlStructure
    ) {

        let score = 100;

        if (
            urlStructure.hasUnderscore
        ) {
            score -= 20;
        }

        if (
            urlStructure.hasUppercase
        ) {
            score -= 20;
        }

        if (
            urlStructure.length > 120
        ) {
            score -= 20;
        }

        if (
            urlStructure.queryParameters > 3
        ) {
            score -= 20;
        }

        if (
            urlStructure.depth > 5
        ) {
            score -= 20;
        }

        return Math.max(
            0,
            score
        );
    }


    /*
     * Builds the summary used by the frontend
     * and the AI sales assistant.
     */
    buildSummary(
        score,
        issues,
        opportunities
    ) {

        const criticalIssues =
            issues.filter(
                (issue) =>
                    issue.severity ===
                    "critical"
            ).length;

        const highIssues =
            issues.filter(
                (issue) =>
                    issue.severity ===
                    "high"
            ).length;

        const mediumIssues =
            issues.filter(
                (issue) =>
                    issue.severity ===
                    "medium"
            ).length;

        const lowIssues =
            issues.filter(
                (issue) =>
                    issue.severity ===
                    "low"
            ).length;

        const serviceCounts =
            {};

        for (
            const opportunity
            of opportunities
        ) {

            const service =
                opportunity.service;

            serviceCounts[service] =
                (
                    serviceCounts[service] ||
                    0
                ) + 1;
        }

        return {

            score:
                score.overall,

            rating:
                this.getScoreRating(
                    score.overall
                ),

            issues:
                issues.length,

            criticalIssues,

            highIssues,

            mediumIssues,

            lowIssues,

            opportunities:
                opportunities.length,

            seoOpportunity:
                this.getOpportunityLevel(
                    score.overall,
                    criticalIssues,
                    highIssues,
                    opportunities.length
                ),

            recommendedServices:
                Object.entries(
                    serviceCounts
                )
                    .sort(
                        (
                            [, a],
                            [, b]
                        ) =>
                            b - a
                    )
                    .map(
                        (
                            [service, count]
                        ) => ({
                            service,
                            opportunities:
                                count,
                        })
                    ),
        };
    }


    /*
     * Converts the numerical score into a readable rating.
     */
    getScoreRating(
        score
    ) {

        if (
            score >= 90
        ) {
            return "Excellent";
        }

        if (
            score >= 75
        ) {
            return "Good";
        }

        if (
            score >= 60
        ) {
            return "Needs Improvement";
        }

        if (
            score >= 40
        ) {
            return "Poor";
        }

        return "Critical";
    }


    /*
     * Determines how valuable the website may be
     * as an SEO service opportunity.
     */
    getOpportunityLevel(
        score,
        criticalIssues,
        highIssues,
        opportunities
    ) {

        if (
            criticalIssues >= 2 ||
            highIssues >= 5 ||
            score < 40
        ) {

            return "HIGH";
        }

        if (
            highIssues >= 2 ||
            opportunities >= 5 ||
            score < 65
        ) {

            return "MEDIUM";
        }

        return "LOW";
    }


    /*
     * Standard failure response.
     */
    createFailureResult(
        websiteUrl,
        message
    ) {

        return {

            success: false,

            partial: false,

            message,

            code:
                "SEO_ANALYSIS_FAILED",

            websiteUrl:

                websiteUrl ||
                null,

            status:
                null,

            responseTime:
                null,

            score: {
                overall: 0,

                technical: 0,

                onPage: 0,

                content: 0,

                images: 0,

                links: 0,

                schema: 0,

                localSEO: 0,

                social: 0,

                performance: 0,

                mobile: 0,

                indexability: 0,

                security: 0,

                urlStructure: 0,
            },

            summary: {

                score: 0,

                rating: "Unavailable",

                issues: 0,

                criticalIssues: 0,

                highIssues: 0,

                mediumIssues: 0,

                lowIssues: 0,

                opportunities: 0,

                seoOpportunity: "UNKNOWN",

                recommendedServices: [],
            },

            technical: null,

            onPage: null,

            content: null,

            images: null,

            links: null,

            schema: null,

            localSEO: null,

            social: null,

            performance: null,

            mobile: null,

            indexability: null,

            urlStructure: null,

            security: null,

            issues: [],

            opportunities: [],

            errors: [
                message,
            ],
        };
    }
}


export default new SEOAnalysisService();