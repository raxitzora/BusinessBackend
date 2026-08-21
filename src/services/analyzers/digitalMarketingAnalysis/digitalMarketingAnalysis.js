import { chromium } from "playwright";

/**
 * Digital Marketing Analysis Service
 * ------------------------------------------------------------------------
 * IMPORTANT: This file is completely separate from websiteAnalysis.js.
 * websiteAnalysis.js covers TECHNICAL concerns (performance, responsiveness,
 * tech stack, reachability). This file ONLY covers DIGITAL MARKETING
 * concerns - the things a marketing/lead-gen agency cares about when
 * deciding what services it can sell a prospective client:
 *
 *   - Is the business tracking its traffic and conversions?
 *   - Does it capture leads (forms, CTAs, lead magnets)?
 *   - Does it show up on social media?
 *   - Does it build trust (reviews, testimonials, case studies)?
 *   - What marketing/CRM/chat/email tools are already installed?
 *   - Is it set up to run paid advertising effectively?
 *   - What's missing that the agency could offer to fix?
 *
 * Architecture
 * ------------------------------------------------------------------------
 * 1. `analyze(websiteUrl)` launches an isolated browser/page and calls
 *    `gatherPageData(page)` ONCE to collect every raw signal the page
 *    exposes (HTML, scripts, links, forms, buttons, iframes, body text).
 * 2. Every `analyze*()` method is a pure function of that single
 *    `pageData` object - no method re-queries the DOM, so there is no
 *    duplicated Playwright work no matter how many detectors run.
 * 3. Detection dictionaries (which URLs/keywords identify which tool)
 *    are declared as plain data objects at the top of the file. Adding a
 *    new detector for a new tool is just adding an entry to a dictionary -
 *    no new code paths are required, which keeps the service extensible.
 */

// --------------------------------------------------------------------------
// Configuration
// --------------------------------------------------------------------------

const CONFIG = {
    headless: process.env.SCRAPER_HEADLESS !== "false",
    slowMo: Number(process.env.SCRAPER_SLOWMO || 0),
    navTimeoutMs: 60000,
};

// --------------------------------------------------------------------------
// Detection dictionaries
// --------------------------------------------------------------------------
// Each dictionary maps a result key -> a list of substrings that, if found
// in the relevant "haystack" (combined HTML/script source, form text, link
// text, or body text), indicate that signal is present. To add a new
// detector, add a new key with its patterns - no other code changes needed.

/** Analytics / advertising tracking pixels, matched against page source. */
const TRACKING_SIGNATURES = {
    googleAnalytics: ["google-analytics.com", "gtag(", "www.googletagmanager.com/gtag/js", "ga('create'"],
    googleTagManager: ["googletagmanager.com/gtm.js", "gtm.start"],
    metaPixel: ["connect.facebook.net", "fbq("],
    linkedInInsight: ["snap.licdn.com", "_linkedin_partner_id", "linkedin_data_partner_ids"],
    clarity: ["clarity.ms", 'clarity("set"', "www.clarity.ms"],
    hotjar: ["hotjar.com", "_hjsettings", "hj(settings"],
    mixpanel: ["mixpanel.com", "cdn.mxpnl.com"],
    segment: ["cdn.segment.com", "analytics.load("],
    tiktokPixel: ["analytics.tiktok.com", "ttq.load", "ttq.track"],
    pinterestPixel: ["s.pinimg.com/ct", "pintrk("],
};

/** Third-party marketing/automation tools, matched against page source. */
const MARKETING_TOOL_SIGNATURES = {

    hubspot: {
        patterns: [
            "js.hs-scripts.com",
            "js.hsforms.net",
            "hs-banner.com",
            "hsforms.com"
        ]
    },

    mailchimp: {
        patterns: [
            "list-manage.com",
            "chimpstatic.com",
            "mailchimp.com"
        ]
    },

    brevo: {
        patterns: [
            "brevo.com",
            "sendinblue.com",
            "sibforms.com"
        ]
    },

    convertkit: {
        patterns: [
            "convertkit.com"
        ]
    },

    klaviyo: {
        patterns: [
            "klaviyo.com",
            "static.klaviyo.com"
        ]
    },

    calendly: {
        patterns: [
            "calendly.com"
        ]
    },

    typeform: {
        patterns: [
            "typeform.com",
            "embed.typeform.com"
        ]
    },

    jotform: {
        patterns: [
            "jotform.com"
        ]
    },

    googleForms: {
        patterns: [
            "docs.google.com/forms"
        ]
    }

};

/** CRM platforms, matched against page source. */
const CRM_SIGNATURES = {
    hubspot: ["forms.hubspot.com", "js.hs-scripts.com"],
    salesforce: ["force.com", "salesforce.com", "pi.pardot.com"],
    zoho: ["zoho.com/crm", "zohopublic.com", "zohostatic.com"],
    pipedrive: ["pipedrive.com"],
    freshsales: ["freshsales.io", "freshworks.com"],
    monday: ["monday.com/crm", "cdn.monday.com"],
};

/** Live-chat / help-desk widgets, matched against page source. */
const LIVE_CHAT_SIGNATURES = {
    tawk: ["embed.tawk.to"],
    intercom: ["widget.intercom.io", "intercomcdn.com"],
    crisp: ["client.crisp.chat"],
    zendesk: ["zdassets.com", "zendesk.com/embeddable"],
    liveChat: ["cdn.livechatinc.com"],
    drift: ["js.driftt.com"],
    hubspotChat: ["js.usemessages.com"],
};


/** Lead-generation form types, matched against a form's searchable text. */
const LEAD_FORM_KEYWORDS = {
    contactForm: ["contact"],
    newsletter: ["newsletter", "subscribe"],
    quoteRequest: ["quote"],
    booking: ["book now", "booking", "reserve"],
    appointment: ["appointment", "schedule a"],
    callback: ["callback", "call back", "request a call"],
    demo: ["demo"],
};

/** Known CTA button labels, in priority order (first match = primary CTA). */
const CTA_LABELS = [
    "book now",
    "book appointment",
    "get quote",
    "request demo",
    "call now",
    "buy now",
    "shop now",
    "contact us",
    "learn more",
];

/** Social platforms, matched against outbound link hrefs. */
const SOCIAL_SIGNATURES = {

    facebook: [
        "facebook.com",
        "fb.com",
        "m.facebook.com"
    ],

    instagram: [
        "instagram.com"
    ],

    linkedin: [
        "linkedin.com"
    ],

    youtube: [
        "youtube.com",
        "youtu.be"
    ],

    twitter: [
        "twitter.com",
        "x.com"
    ],

    threads: [
        "threads.net"
    ],

    pinterest: [
        "pinterest.com"
    ],

    tiktok: [
        "tiktok.com"
    ],

    snapchat: [
        "snapchat.com"
    ],

    whatsapp: [
        "wa.me",
        "api.whatsapp.com",
        "whatsapp.com"
    ],

    telegram: [
        "t.me",
        "telegram.me"
    ]

};

/** Trust-signal keywords, matched against body text / link text. */
const TRUST_KEYWORDS = {
    testimonials: ["testimonial", "what our clients say", "what our customers say"],
    trustpilot: ["trustpilot.com"],
    clientLogos: ["trusted by", "our clients", "brands we", "as seen in"],
    caseStudies: ["case study", "case studies"],
    awards: ["award-winning", "awarded", "award winning"],
    certifications: ["certified", "certification", "accredited", "iso 9001"],
};

/** Content-marketing keywords, matched against body text / link text. */
const CONTENT_KEYWORDS = {
    blog: ["/blog", "our blog"],
    faq: ["faq", "frequently asked questions"],
    resources: ["resources", "resource center", "resource centre"],
    guides: ["guide", "ultimate guide", "free guide"],
};



/** Email-marketing keywords, matched against body text. */
const LEAD_MAGNET_KEYWORDS = ["free ebook", "free guide", "free checklist", "whitepaper", "download our", "free template"];
const EXIT_INTENT_SIGNATURES = ["optinmonster", "sumo.com", "privy.com", "exit-intent", "exitintent"];
const POPUP_KEYWORDS = ["modal", "popup", "lightbox"];

/** Advertising-readiness keywords/signatures. */
const AD_PLATFORM_SIGNATURES = {
    googleAds: ["googleadservices.com", "gtag('config', 'aw-"],
    facebookAds: ["fbq('track', 'lead'", "fbq('track', 'purchase'", "fbq('track', 'conversion'"],
    retargeting: ["doubleclick.net", "criteo.com", "adroll.com", "googleadservices.com"],
};

// --------------------------------------------------------------------------
// Class
// --------------------------------------------------------------------------

class DigitalMarketingAnalysis {

    /**
     * Entry point. Loads the target page once, runs every marketing
     * analyzer against the collected data, then closes the browser.
     * Always resolves with a fully-shaped report object - navigation
     * failures produce a report with empty/false defaults plus a
     * `summary.error` message instead of throwing, so callers never have
     * to special-case this service around try/catch.
     */
    async analyze(websiteUrl) {

        if (!websiteUrl) {
            throw new Error("Website URL is required.");
        }

        const browser = await chromium.launch({
            headless: CONFIG.headless,
            slowMo: CONFIG.slowMo,
            args: ["--disable-blink-features=AutomationControlled", "--disable-dev-shm-usage"],
        });

        const context = await browser.newContext({
            viewport: { width: 1600, height: 900 },
            locale: "en-IN",
            timezoneId: "Asia/Kolkata",
        });

        try {

            const page = await context.newPage();

            try {
                await page.goto(websiteUrl, { waitUntil: "networkidle", timeout: CONFIG.navTimeoutMs });
            } catch (error) {
                return this.buildEmptyReport(error.message);
            }

            // Single DOM pass: every analyzer below reads from this object,
            // none of them touch Playwright/the page again.
            const pageData = await this.gatherPageData(page);

            const tracking = this.analyzeTracking(pageData);
            const leadGeneration = this.analyzeLeadGeneration(pageData);
            const ctas = this.analyzeCTAs(pageData);
            const socialPresence = this.analyzeSocialPresence(pageData);
            const contactOptions = this.analyzeContactOptions(pageData);
            const trustSignals = this.analyzeTrustSignals(pageData);
            const marketingTools = this.analyzeMarketingTools(pageData);
            const crm = this.analyzeCRM(pageData);
            const liveChat = this.analyzeLiveChat(pageData);
            const emailMarketing = this.analyzeEmailMarketing(pageData);
            const contentMarketing = this.analyzeContentMarketing(pageData);
            const advertisingReadiness = this.analyzeAdvertisingReadiness(pageData);

            const sections = {
                tracking,
                leadGeneration,
                ctas,
                socialPresence,
                contactOptions,
                trustSignals,
                marketingTools,
                crm,
                liveChat,
                emailMarketing,
                contentMarketing,
                advertisingReadiness,
            };

            // These two run last because they synthesize the sections above
            // rather than reading the page directly.
            const aiOpportunities = this.analyzeAIOpportunities(sections);
            const summary = this.generateMarketingSummary(sections);

            return {
                ...sections,
                aiOpportunities,
                summary,
            };

        } finally {
            await context.close();
            await browser.close();
        }

    }

    // ----------------------------------------------------------------------
    // Data collection (the only place that touches the DOM/Playwright)
    // ----------------------------------------------------------------------

    /**
     * Collects every raw signal every analyzer needs, in a single
     * `page.evaluate()` call. Also pre-builds a couple of combined
     * "haystack" strings (`sourceBlob`, `textBlob`) so downstream
     * analyzers can do plain string matching instead of re-walking the DOM.
     */
    async gatherPageData(page) {

        const raw = await page.evaluate(() => {

            

            const toLower = value => (value || "").toString().toLowerCase();

            // Scripts with a src attribute - used for CDN/vendor matching.
            const scripts = Array.from(document.querySelectorAll("script[src]"))
                .map(script => toLower(script.src));

            // Inline scripts - used to catch vendor snippets (fbq(), gtag(),
            // ttq.load, etc.) that are pasted directly into the page rather
            // than loaded from a CDN. Capped per-script and overall so a
            // pathological page can't blow up memory/serialization.
            const inlineScripts = Array.from(document.querySelectorAll("script:not([src])"))
                .map(script => toLower(script.textContent).slice(0, 3000))
                .join(" ")
                .slice(0, 200000);

            // Outbound/anchor links - used for social presence, contact
            // options (tel:/mailto:/wa.me), content marketing, ads/UTM, etc.
            const links = Array.from(document.querySelectorAll("a[href]")).map(anchor => ({
                href: toLower(anchor.href),
                text: toLower(anchor.textContent).trim(),
            }));

            // Forms - each form is reduced to one searchable string
            // (action + id + classes + visible text + field names/
            // placeholders) so lead-gen/email-marketing detectors can do a
            // single .includes() check per keyword instead of re-parsing
            // form structure themselves.
            const forms = Array.from(document.querySelectorAll("form")).map(form => {
                const fields = Array.from(form.querySelectorAll("input,textarea,select"));
                const fieldText = fields
                    .map(field => `${field.name || ""} ${field.placeholder || ""} ${field.type || ""}`)
                    .join(" ");
                return toLower([form.action, form.id, form.className, form.innerText, fieldText].join(" "));
            });

            // Button-like elements - used for CTA detection. Covers real
            // <button>s, submit/button inputs, and anchors styled as
            // buttons (class contains btn/button/cta, or role="button").
            const buttons = Array.from(
                document.querySelectorAll(
                    'button, a.btn, a.button, a[class*="cta"], a[role="button"], input[type="submit"], input[type="button"]'
                )
            ).map(element => ({
                text: toLower(element.innerText || element.value || element.textContent).trim(),
                position: getComputedStyle(element).position,
            }));

            const iframes = Array.from(document.querySelectorAll("iframe[src]"))
                .map(iframe => toLower(iframe.src));

                const headings =
    Array.from(
        document.querySelectorAll(
            "h1,h2,h3,h4,h5,h6"
        )
    ).map(element =>
        toLower(element.textContent)
    );

            return {
                html: toLower(document.documentElement.outerHTML),
                bodyText: document.body ? toLower(document.body.innerText) : "",
                scripts,
                inlineScripts,
                links,
                forms,
                buttons,
                iframes,
                hasAddressTag: !!document.querySelector("address"),
                headings,
            };

        });

        // Pre-combine the two "haystacks" most detectors search against, so
        // no analyzer needs to rebuild them from the raw arrays itself.
        const sourceBlob = [raw.html, raw.scripts.join(" "), raw.inlineScripts].join(" ");
        const textBlob = [raw.bodyText, raw.links.map(link => link.text).join(" ")].join(" ");

        return { ...raw, sourceBlob, textBlob };

    }

    // ----------------------------------------------------------------------
    // Generic helpers (shared by multiple analyzers - no duplicated logic)
    // ----------------------------------------------------------------------

    /** True if `haystack` contains ANY of the given substrings. */
    containsAny(haystack, patterns) {
        return patterns.some(pattern => haystack.includes(pattern));
    }

    /**
     * Given a `{ key: [pattern, ...] }` dictionary, returns `{ key: boolean }`
     * indicating whether `haystack` contains any of that key's patterns.
     * Powers tracking/marketingTools/crm/liveChat detection with one
     * implementation.
     */
    detectSignatures(haystack, signatures) {
        return Object.fromEntries(
            Object.entries(signatures).map(([key, patterns]) => [key, this.containsAny(haystack, patterns)])
        );
    }

    /** True if ANY link's href contains any of the given substrings. */
    anyLinkHrefIncludes(links, patterns) {
        return links.some(link => this.containsAny(link.href, patterns));
    }

    /** True if ANY form's searchable text contains any of the given keywords. */
    anyFormIncludes(forms, keywords) {
        return forms.some(form => this.containsAny(form, keywords));
    }

    /**
     * Given a `{ key: [keyword, ...] }` dictionary, returns `{ key: boolean }`
     * indicating whether any form's searchable text matches that key's
     * keywords. Powers lead-generation detection.
     */
    detectFormSignatures(forms, keywordMap) {
        return Object.fromEntries(
            Object.entries(keywordMap).map(([key, keywords]) => [key, this.anyFormIncludes(forms, keywords)])
        );
    }

    /**
     * Given a `{ key: [keyword, ...] }` dictionary, returns `{ key: boolean }`
     * indicating whether `textBlob` (body text + link text) matches that
     * key's keywords. Powers trust-signal / content-marketing / local-
     * marketing detection.
     */
    detectTextSignatures(textBlob, keywordMap) {
        return Object.fromEntries(
            Object.entries(keywordMap).map(([key, keywords]) => [key, this.containsAny(textBlob, keywords)])
        );
    }

    /** Percentage (0-100) of an object's boolean-valued fields that are true. */
    percentTrue(obj) {
        const flags = Object.values(obj).filter(value => typeof value === "boolean");
        if (flags.length === 0) return 0;
        const trueCount = flags.filter(Boolean).length;
        return Math.round((trueCount / flags.length) * 100);
    }

    /** True if at least one boolean field on the object is true. */
    anyTrue(obj) {
        return Object.values(obj).some(value => value === true);
    }

    // ----------------------------------------------------------------------
    // Analyzers - each solves exactly one responsibility
    // ----------------------------------------------------------------------

    /** Detects analytics/advertising tracking pixels installed on the page. */
    analyzeTracking(pageData) {
        return this.detectSignatures(pageData.sourceBlob, TRACKING_SIGNATURES);
    }

    /** Detects which lead-capture form types exist on the page. */
    analyzeLeadGeneration(pageData) {
        return this.detectFormSignatures(pageData.forms, LEAD_FORM_KEYWORDS);
    }

    /**
     * Detects call-to-action buttons: total count, the strongest recognized
     * CTA label (if any), and whether any CTA is sticky/floating (fixed or
     * sticky positioned, so it stays visible while scrolling).
     */
    analyzeCTAs(pageData) {

        const buttons = pageData.buttons;

        const recognized = buttons
            .map(button => ({
                ...button,
                matchedLabel: CTA_LABELS.find(label => button.text.includes(label)) || null,
            }))
            .filter(button => button.matchedLabel);

        const primaryCTA = recognized.length > 0 ? recognized[0].matchedLabel : null;
        const stickyCTA = buttons.some(button => button.position === "fixed" || button.position === "sticky");
        const floatingCTA = buttons.some(
            button => button.position === "fixed" && (button.text.includes("chat") || button.text.length === 0)
        );

        return {
            totalButtons: buttons.length,
            primaryCTA,
            stickyCTA,
            floatingCTA,
            buttons: recognized.map(button => button.matchedLabel),
        };

    }

    /** Detects which social media platforms the business links to. */
analyzeSocialPresence(pageData) {

    const result = {};

    for (const [platform, patterns] of Object.entries(SOCIAL_SIGNATURES)) {

        const link = pageData.links.find(link =>
            patterns.some(pattern =>
                link.href.includes(pattern)
            )
        );

        result[platform] = {

            exists: !!link,

            url: link
                ? link.href
                : null,

        };

    }

    return result;

}

    /** Detects available direct-contact channels. */
    analyzeContactOptions(pageData) {

    const phoneRegex =
        /\+?\d[\d\s().-]{7,}\d/g;

    const emailRegex =
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

    const phoneNumbers = [

        ...new Set(

            (pageData.bodyText.match(phoneRegex) || [])

        )

    ];

    const emails = [

        ...new Set(

            (pageData.bodyText.match(emailRegex) || [])

        )

    ];

    const whatsappLinks =
        pageData.links
            .filter(link =>
                link.href.includes("wa.me") ||
                link.href.includes("api.whatsapp.com") ||
                link.href.includes("whatsapp")
            )
            .map(link => link.href);

    const telegramLinks =
        pageData.links
            .filter(link =>
                link.href.includes("t.me") ||
                link.href.includes("telegram.me")
            )
            .map(link => link.href);

    const messengerLinks =
        pageData.links
            .filter(link =>
                link.href.includes("m.me") ||
                link.href.includes("messenger.com")
            )
            .map(link => link.href);

    return {

        phone: {

            exists:
                phoneNumbers.length > 0,

            numbers:
                phoneNumbers,

        },

        email: {

            exists:
                emails.length > 0,

            emails,

        },

        whatsapp: {

            exists:
                whatsappLinks.length > 0,

            links:
                whatsappLinks,

        },

        telegram: {

            exists:
                telegramLinks.length > 0,

            links:
                telegramLinks,

        },

        messenger: {

            exists:
                messengerLinks.length > 0,

            links:
                messengerLinks,

        }

    };

}

    /** Detects trust-building elements: reviews, testimonials, awards, etc. */
   analyzeTrustSignals(pageData) {

    const text =
        pageData.textBlob;

    const headings =
        pageData.headings.join(" ");

    const html =
        pageData.html;

    const testimonials =

        this.containsAny(

            headings + " " + text,

            [
                "testimonial",
                "testimonials",
                "what our clients say",
                "happy clients",
                "happy customers",
                "customer stories"
            ]

        ) ||

        html.includes("testimonial");

    const clientLogos =

        this.containsAny(

            text,

            [
                "trusted by",
                "our clients",
                "brands we work with",
                "our partners",
                "companies we work with"
            ]

        ) ||

        html.includes("client-logo") ||

        html.includes("logo-slider");

    const caseStudies =

        this.containsAny(

            headings + " " + text,

            [
                "case study",
                "case studies",
                "success stories",
                "our work",
                "portfolio"
            ]

        );

    const awards =

        this.containsAny(

            text,

            [
                "award",
                "award-winning",
                "winner",
                "best company",
                "recognized by"
            ]

        );

    const certifications =

        this.containsAny(

            text,

            [
                "iso",
                "certified",
                "certification",
                "google partner",
                "meta business partner",
                "official partner"
            ]

        );

    const googleReviews =

        pageData.links.some(link =>

            link.href.includes("google.com") ||

            link.href.includes("g.page")

        ) &&

        text.includes("review");

    const trustpilot =

        pageData.links.some(link =>

            link.href.includes("trustpilot.com")

        );

    return {

        testimonials: {

            exists: testimonials

        },

        clientLogos: {

            exists: clientLogos

        },

        caseStudies: {

            exists: caseStudies

        },

        awards: {

            exists: awards

        },

        certifications: {

            exists: certifications

        },

        googleReviews: {

            exists: googleReviews

        },

        trustpilot: {

            exists: trustpilot

        }

    };

}

    /** Detects third-party marketing/automation tools installed on the page. */
  analyzeMarketingTools(pageData) {

    const result = {};

    for (

        const [tool, config]

        of Object.entries(
            MARKETING_TOOL_SIGNATURES
        )

    ) {

        const matchedPattern =

            config.patterns.find(pattern =>

                pageData.sourceBlob.includes(pattern)

            );

        result[tool] = {

            exists: !!matchedPattern,

            source: matchedPattern || null,

        };

    }

    return result;

}

    /** Detects CRM platforms integrated with the page. */
    analyzeCRM(pageData) {
        return this.detectSignatures(pageData.sourceBlob, CRM_SIGNATURES);
    }

    /** Detects live-chat / help-desk widgets installed on the page. */
    analyzeLiveChat(pageData) {
        return this.detectSignatures(pageData.sourceBlob, LIVE_CHAT_SIGNATURES);
    }

    /** Detects email-capture mechanisms: newsletter, popups, lead magnets. */
    analyzeEmailMarketing(pageData) {

        const newsletter = this.anyFormIncludes(pageData.forms, LEAD_FORM_KEYWORDS.newsletter);
        const popup = this.containsAny(pageData.html, POPUP_KEYWORDS);
        const exitIntent = this.containsAny(pageData.sourceBlob, EXIT_INTENT_SIGNATURES);
        const leadMagnet = this.containsAny(pageData.textBlob, LEAD_MAGNET_KEYWORDS);

        return { newsletter, popup, exitIntent, leadMagnet };

    }

    /** Detects content-marketing assets: blog, FAQ, resources, guides, videos. */
    analyzeContentMarketing(pageData) {

        const detected = this.detectTextSignatures(pageData.textBlob, CONTENT_KEYWORDS);
        const videos = pageData.iframes.some(src => src.includes("youtube.com") || src.includes("vimeo.com"));

        return { ...detected, videos };

    }



    /**
     * Detects whether the site is set up to run and measure paid
     * advertising effectively (ad platform tags, conversion tracking,
     * retargeting, thank-you pages, UTM-ready links/forms).
     */
    analyzeAdvertisingReadiness(pageData) {

        const adSignals = this.detectSignatures(pageData.sourceBlob, AD_PLATFORM_SIGNATURES);

        const conversionTracking =
            this.containsAny(pageData.sourceBlob, ["gtag('event'", "fbq('track', 'lead'", "fbq('track', 'purchase'"]) ||
            adSignals.facebookAds;
        const utmSupport =
            pageData.links.some(link => link.href.includes("utm_source=")) ||
            pageData.forms.some(form => form.includes("utm_source"));

   return {

    googleAds:
        adSignals.googleAds,

    facebookAds:
        adSignals.facebookAds,

    retargeting:
        adSignals.retargeting,

    conversionTracking,

    utmSupport,

};

    }


    /**
     * Does NOT detect technologies - inspects the already-computed sections
     * and surfaces plain-English marketing opportunities an agency could
     * pitch to the client.
     */
    analyzeAIOpportunities(sections) {

        const rules = [
            { when: !this.anyTrue(sections.liveChat), message: "No chatbot or live chat widget detected" },
            { when: !this.anyTrue(sections.leadGeneration), message: "No lead capture form found on the site" },
            { when: !sections.emailMarketing.newsletter, message: "No newsletter signup found" },
            { when: sections.ctas.totalButtons === 0, message: "No call-to-action buttons found" },
            {
                when: sections.ctas.totalButtons > 0 && !sections.ctas.primaryCTA,
                message: "CTAs exist but none use strong, action-driven wording",
            },
            { when: !sections.trustSignals.testimonials.exists, message: "No testimonials found" },
            {
                when: !sections.trustSignals.googleReviews.exists && !sections.trustSignals.trustpilot.exists,
                message: "No third-party reviews (Google/Trustpilot) displayed",
            },
            {
                when: !sections.leadGeneration.booking && !sections.leadGeneration.appointment,
                message: "No online booking or appointment system detected",
            },
            { when: !sections.contactOptions.whatsapp.exists, message: "No WhatsApp contact option detected" },
            { when: !sections.emailMarketing.leadMagnet, message: "No lead magnet (free guide/ebook) offered" },
            { when: !this.anyTrue(sections.tracking), message: "No analytics or tracking pixels installed" },
            { when: !this.anyTrue(sections.crm), message: "No CRM integration detected" },
        ];

        return { opportunities: rules.filter(rule => rule.when).map(rule => rule.message) };

    }

    /**
     * Produces the top-line scorecard an agency would show a prospect:
     * tracking/conversion/engagement/overall scores plus a short list of
     * the most sellable missing pieces.
     */
   generateMarketingSummary(analysis) {

    const countExists = (object) =>

        Object.values(object).filter(value => {

            if (typeof value === "boolean") {

                return value;

            }

            if (
                value &&
                typeof value === "object" &&
                "exists" in value
            ) {

                return value.exists;

            }

            return false;

        }).length;

    const trackingScore =
        countExists(
            analysis.tracking
        );

    const conversionScore =
        countExists(
            analysis.leadGeneration
        ) +
        countExists(
            analysis.contactOptions
        ) +
        (
            analysis.ctas.totalButtons > 0
                ? 1
                : 0
        );

    const engagementScore =
        countExists(
            analysis.socialPresence
        ) +
        countExists(
            analysis.trustSignals
        ) +
        countExists(
            analysis.contentMarketing
        );

    const marketingScore =
        trackingScore +
        conversionScore +
        engagementScore;

    const missing = [];

    if (
        !analysis.tracking.googleAnalytics
    ) {

        missing.push(
            "Google Analytics"
        );

    }

    if (
        !analysis.tracking.metaPixel
    ) {

        missing.push(
            "Meta Pixel"
        );

    }

    if (
        !analysis.tracking.googleTagManager
    ) {

        missing.push(
            "Google Tag Manager"
        );

    }

    if (
        !analysis.contactOptions.whatsapp.exists
    ) {

        missing.push(
            "WhatsApp"
        );

    }

    if (
        !analysis.emailMarketing.newsletter
    ) {

        missing.push(
            "Newsletter"
        );

    }

    if (
        !Object.values(
            analysis.liveChat
        ).some(Boolean)
    ) {

        missing.push(
            "Live Chat"
        );

    }

    if (
        !analysis.leadGeneration.contactForm.exists
    ) {

        missing.push(
            "Contact Form"
        );

    }

    if (
        !analysis.emailMarketing.leadMagnet
    ) {

        missing.push(
            "Lead Magnet"
        );

    }

    if (
        !Object.values(
            analysis.crm
        ).some(Boolean)
    ) {

        missing.push(
            "CRM Integration"
        );

    }

    return {

        trackingScore,

        conversionScore,

        engagementScore,

        marketingScore,

        missing,

    };

}

    // ----------------------------------------------------------------------
    // Fallback report (used only when the initial navigation fails)
    // ----------------------------------------------------------------------

    /**
     * Returns a fully-shaped report with every boolean/array defaulted to
     * empty, so callers can always destructure the standard result shape
     * even when the page never loaded.
     */
    buildEmptyReport(errorMessage) {

        const emptyTracking = Object.fromEntries(Object.keys(TRACKING_SIGNATURES).map(key => [key, false]));
        const emptyLeadGen = Object.fromEntries(Object.keys(LEAD_FORM_KEYWORDS).map(key => [key, false]));
        const emptySocial = Object.fromEntries(Object.keys(SOCIAL_SIGNATURES).map(key => [key, false]));
        const emptyTrust = Object.fromEntries(Object.keys(TRUST_KEYWORDS).map(key => [key, false]));
        const emptyMarketingTools = Object.fromEntries(Object.keys(MARKETING_TOOL_SIGNATURES).map(key => [key, false]));
        const emptyCRM = Object.fromEntries(Object.keys(CRM_SIGNATURES).map(key => [key, false]));
        const emptyLiveChat = Object.fromEntries(Object.keys(LIVE_CHAT_SIGNATURES).map(key => [key, false]));
        const emptyContent = Object.fromEntries([...Object.keys(CONTENT_KEYWORDS), "videos"].map(key => [key, false]));
        const emptyLocal = { maps: false, address: false, businessHours: false, serviceAreas: false, multipleLocations: false };
        const emptyAds = {
            conversionTracking: false,
            googleAds: false,
            facebookAds: false,
            retargeting: false,
            utmSupport: false,
        };

        return {
            tracking: emptyTracking,
            leadGeneration: emptyLeadGen,
            ctas: { totalButtons: 0, primaryCTA: null, stickyCTA: false, floatingCTA: false, buttons: [] },
            socialPresence: Object.fromEntries(

    Object.keys(SOCIAL_SIGNATURES).map(platform => [

        platform,

        {

            exists: false,

            url: null,

        }

    ])

),
contactOptions: {

    phone: {

        exists: false,

        numbers: []

    },

    email: {

        exists: false,

        emails: []

    },

    whatsapp: {

        exists: false,

        links: []

    },

    telegram: {

        exists: false,

        links: []

    },

    messenger: {

        exists: false,

        links: []

    }

},            trustSignals: {

    testimonials: {

        exists: false

    },

    clientLogos: {

        exists: false

    },

    caseStudies: {

        exists: false

    },

    awards: {

        exists: false

    },

    certifications: {

        exists: false

    },

    googleReviews: {

        exists: false

    },

    trustpilot: {

        exists: false

    }

},
            marketingTools: Object.fromEntries(

    Object.keys(

        MARKETING_TOOL_SIGNATURES

    ).map(tool => [

        tool,

        {

            exists: false,

            source: null

        }

    ])

),
            crm: emptyCRM,
            liveChat: emptyLiveChat,
            emailMarketing: { newsletter: false, popup: false, exitIntent: false, leadMagnet: false },
            contentMarketing: emptyContent,
            advertisingReadiness: emptyAds,
            aiOpportunities: { opportunities: ["Site could not be analyzed: " + errorMessage] },
            summary: { trackingScore: 0, conversionScore: 0, engagementScore: 0, marketingScore: 0, missing: [] },
        };

    }

}

export default new DigitalMarketingAnalysis();