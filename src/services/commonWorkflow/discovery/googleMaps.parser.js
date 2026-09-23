class GoogleMapsParser {

    async parseSingleResult(page) {

        const hasDetailHeading =
            await page.locator("h1.DUwDvf").count();

        if (!hasDetailHeading) {
            return null;
        }

        try {

            return await page.evaluate(() => {

                const getText = (selector) =>
                    document
                        .querySelector(selector)
                        ?.textContent
                        ?.trim() || null;

                const name =
                    getText("h1.DUwDvf");

                if (!name) {
                    return null;
                }

                const category =
                    document
                        .querySelector(
                            "button[jsaction*='category']"
                        )
                        ?.textContent
                        ?.trim() || null;

                const ratingText =
                    getText(
                        "div.F7nice span[aria-hidden='true']"
                    );

                const rating =
                    ratingText
                        ? parseFloat(
                            ratingText.replace(",", ".")
                        )
                        : null;

                const reviewMatch =
                    document
                        .querySelector("div.F7nice")
                        ?.textContent
                        ?.match(/[\d,]+/g);

                const reviewCount =
                    reviewMatch
                        ? parseInt(
                            reviewMatch[
                                reviewMatch.length - 1
                            ].replace(/,/g, ""),
                            10
                        )
                        : null;

                const addressRaw =
                    document
                        .querySelector(
                            "button[data-item-id='address']"
                        )
                        ?.getAttribute("aria-label");

                const address =
                    addressRaw
                        ? addressRaw.replace(
                            /^Address:\s*/i,
                            ""
                        )
                        : null;

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
                        ? phoneRaw
                            .replace(
                                /^Phone:\s*/i,
                                ""
                            )
                            .trim()
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
                    business_name: name,
                    category,
                    google_rating: rating,
                    review_count: reviewCount,
                    address,
                    google_maps_link:
                        window.location.href,
                    phone,
                    website,
                };
            });

        } catch (error) {

            console.warn(
                "[GoogleMapsParser] Failed reading single-result panel:",
                error.message
            );

            return null;
        }
    }

    async parseFeed(page) {

        return await page.evaluate(() => {

            const feed =
                document.querySelector(
                    "div[role='feed']"
                );

            if (!feed) {
                return [];
            }

            const cardNodes =
                Array.from(feed.children)
                    .filter((node) =>
                        node.querySelector(
                            "a[href*='/maps/place/']"
                        )
                    );

            const seenLinks = new Set();
            const results = [];

            for (const card of cardNodes) {

                const linkEl =
                    card.querySelector(
                        "a[href*='/maps/place/']"
                    );

                if (!linkEl) {
                    continue;
                }

                const href = linkEl.href;

                if (seenLinks.has(href)) {
                    continue;
                }

                seenLinks.add(href);

                const name =
                    linkEl
                        .getAttribute("aria-label")
                        ?.trim() ||
                    card
                        .querySelector(
                            ".qBF1Pd, .fontHeadlineSmall"
                        )
                        ?.textContent
                        ?.trim() ||
                    null;

                if (!name) {
                    continue;
                }

                // ------------------------------------------------------------
                // Rating
                // ------------------------------------------------------------

                const ratingBlock =
                    card.querySelector(
                        "span.MW4etd, span[aria-label*='stars']"
                    );

                let rating = null;

                if (ratingBlock) {

                    const text = [
                        ratingBlock.textContent,
                        ratingBlock.getAttribute(
                            "aria-label"
                        ),
                        ratingBlock.getAttribute(
                            "title"
                        ),
                    ]
                        .filter(Boolean)
                        .join(" ");

                    const match =
                        text.match(
                            /\d+(?:\.\d+)?/
                        );

                    if (match) {
                        rating =
                            parseFloat(match[0]);
                    }
                }

                // ------------------------------------------------------------
                // Review count
                // ------------------------------------------------------------

                let reviewCount = null;

                const reviewCandidates =
                    Array.from(
                        card.querySelectorAll(
                            "[aria-label*='review' i], [title*='review' i], span.UY7F9"
                        )
                    );

                for (
                    const element
                    of reviewCandidates
                ) {

                    const text = [
                        element.textContent,
                        element.getAttribute(
                            "aria-label"
                        ),
                        element.getAttribute(
                            "title"
                        ),
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .replace(/\s+/g, " ")
                        .trim();

                    if (!text) {
                        continue;
                    }

                    const reviewMatch =
                        text.match(
                            /(\d[\d,]*)\s*(?:reviews?|ratings?)/i
                        );

                    if (reviewMatch) {

                        reviewCount =
                            parseInt(
                                reviewMatch[1]
                                    .replace(/,/g, ""),
                                10
                            );

                        break;
                    }

                    const parentText =
                        element
                            .parentElement
                            ?.textContent
                            ?.replace(
                                /\s+/g,
                                " "
                            )
                            .trim() || "";

                    const parentMatch =
                        parentText.match(
                            /\((\d[\d,]*)\)/
                        );

                    if (parentMatch) {

                        reviewCount =
                            parseInt(
                                parentMatch[1]
                                    .replace(/,/g, ""),
                                10
                            );

                        break;
                    }
                }

                // ------------------------------------------------------------
                // Category + address
                // ------------------------------------------------------------

                const RATING_PATTERN =
                    /^\d\.\d(\(\d+\))?$/;

                const STREET_ADDRESS_PATTERN =
                    /^\d+[\s,].{3,}/;

                const ADDRESS_KEYWORD_PATTERN =
                    /(road|street|rd\.?|st\.?|nagar|circle|chowk|society|marg|highway|sector|block|floor|plot)/i;

                const HOURS_PATTERN =
                    /(open|closed|closes|opens|⋅|am|pm)\b/i;

                const PHONE_PATTERN =
                    /^[+]?[0-9\s()-]{8,}$/;

                const infoRows =
                    Array.from(
                        card.querySelectorAll(
                            ".W4Efsd"
                        )
                    )
                        .map(
                            (el) =>
                                el.textContent.trim()
                        )
                        .filter(Boolean);

                let category = null;
                let address = null;

                for (
                    const row
                    of infoRows
                ) {

                    const parts =
                        row
                            .split("·")
                            .map(
                                (part) =>
                                    part.trim()
                            )
                            .filter(Boolean);

                    for (
                        const part
                        of parts
                    ) {

                        if (
                            RATING_PATTERN.test(
                                part
                            )
                        ) {
                            continue;
                        }

                        if (
                            HOURS_PATTERN.test(
                                part
                            )
                        ) {
                            continue;
                        }

                        const looksLikePhone =
                            PHONE_PATTERN.test(
                                part
                            );

                        const looksLikeAddress =
                            !looksLikePhone &&
                            (
                                STREET_ADDRESS_PATTERN.test(
                                    part
                                ) ||
                                ADDRESS_KEYWORD_PATTERN.test(
                                    part
                                )
                            );

                        if (
                            looksLikeAddress &&
                            !address
                        ) {

                            address = part;

                        } else if (
                            !looksLikeAddress &&
                            !category &&
                            part.length < 40
                        ) {

                            category = part;
                        }
                    }
                }

                results.push({
                    business_name: name,
                    category,
                    address,
                    google_rating: rating,
                    review_count: reviewCount,
                    google_maps_link: href,
                    phone: null,
                    website: null,
                });
            }

            return results;
        });
    }

    normalizeResults(rawResults) {

        return rawResults.map((item) => ({
            business_name:
                item.business_name || null,

            category:
                item.category || null,

            address:
                item.address || null,

            google_rating:
                item.google_rating ?? null,

            review_count:
                item.review_count ?? null,

            google_maps_link:
                item.google_maps_link || null,

            phone:
                item.phone || null,

            website:
                item.website || null,
        }));
    }
}

export default new GoogleMapsParser();