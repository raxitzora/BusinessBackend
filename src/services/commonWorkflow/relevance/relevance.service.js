const BUSINESS_CATEGORIES = {
    gym: {
        terms: [
            "gym",
            "gymnasium",
            "fitness",
            "fitness center",
            "fitness centre",
            "fitness studio",
            "health club",
            "crossfit",
            "workout",
            "personal training",
        ],
    },

    hotel: {
        terms: [
            "hotel",
            "resort",
            "inn",
            "lodge",
            "guest house",
            "guesthouse",
        ],
    },

    dentist: {
        terms: [
            "dentist",
            "dental",
            "dental clinic",
            "dental hospital",
            "orthodontist",
            "oral",
        ],
    },

    restaurant: {
        terms: [
            "restaurant",
            "restaurants",
            "cafe",
            "cafes",
            "food",
            "dining",
            "eatery",
            "kitchen",
            "food outlet",
            "family restaurant",
            "fast food",
            "fine dining",
        ],
    },

    grocery: {
        terms: [
            "grocery",
            "groceries",
            "grocery store",
            "supermarket",
            "supermarkets",
            "hypermarket",
            "provision store",
            "provision shop",
            "food store",
            "food market",
            "organic store",
            "organic food store",
            "indian grocery",
        ],
    },
};

function normalizeSearchText(value) {

    return String(value || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function singularizeWord(word) {

    const value =
        normalizeSearchText(word);

    if (!value) {
        return "";
    }

    if (
        value.endsWith("ies") &&
        value.length > 3
    ) {
        return value.slice(0, -3) + "y";
    }

    if (
        value.endsWith("sses") ||
        value.endsWith("shes") ||
        value.endsWith("ches") ||
        value.endsWith("xes") ||
        value.endsWith("zes")
    ) {
        return value.slice(0, -2);
    }

    if (
        value.endsWith("s") &&
        !value.endsWith("ss")
    ) {
        return value.slice(0, -1);
    }

    return value;
}

function getSearchTokens(value) {

    return normalizeSearchText(value)
        .split(" ")
        .map(singularizeWord)
        .filter(
            (word) =>
                word.length >= 2
        );
}

function getQueryTerms(keyword) {

    const normalizedKeyword =
        normalizeSearchText(keyword);

    const tokens =
        getSearchTokens(keyword);

    const terms =
        new Set();

    if (normalizedKeyword) {
        terms.add(normalizedKeyword);
    }

    for (const token of tokens) {
        terms.add(token);
    }

    /*
     * If the user's keyword matches
     * one of our known business categories,
     * expand it with related business terms.
     */

    for (const token of tokens) {

        const category =
            BUSINESS_CATEGORIES[token];

        if (!category) {
            continue;
        }

        for (
            const term
            of category.terms
        ) {
            terms.add(
                normalizeSearchText(term)
            );
        }
    }

    return Array.from(terms);
}

function getSearchableBusinessText(
    business
) {

    return normalizeSearchText(
        [
            business.business_name,
            business.category,
        ]
            .filter(Boolean)
            .join(" ")
    );
}

function calculateKeywordScore(
    business,
    keyword
) {

    const normalizedKeyword =
        normalizeSearchText(keyword);

    const businessName =
        normalizeSearchText(
            business.business_name
        );

    const category =
        normalizeSearchText(
            business.category
        );

    const searchableText =
        getSearchableBusinessText(
            business
        );

    if (!searchableText) {
        return 0;
    }

    let score = 0;

    /*
     * Exact business-name match.
     */

    if (
        normalizedKeyword &&
        businessName.includes(
            normalizedKeyword
        )
    ) {
        score += 50;
    }

    /*
     * Exact category match.
     */

    if (
        normalizedKeyword &&
        category.includes(
            normalizedKeyword
        )
    ) {
        score += 45;
    }

    /*
     * Related business category.
     */

    const queryTerms =
        getQueryTerms(keyword);

    const matchedTerms =
        queryTerms.filter(
            (term) =>
                searchableText.includes(term)
        );

    if (matchedTerms.length > 0) {

        score += Math.min(
            matchedTerms.length * 10,
            35
        );
    }

    return Math.min(score, 100);
}

function calculateLocationScore(
    business,
    location
) {

    const normalizedLocation =
        normalizeSearchText(location);

    if (!normalizedLocation) {
        return 0;
    }

    const address =
        normalizeSearchText(
            business.address
        );

    /*
     * Google Maps already performs the
     * geographic search. Missing address
     * should therefore not automatically
     * eliminate a candidate.
     */

    if (!address) {
        return 15;
    }

    if (
        address.includes(
            normalizedLocation
        )
    ) {
        return 30;
    }

    const locationTokens =
        getSearchTokens(location);

    const matchedTokens =
        locationTokens.filter(
            (token) =>
                address.includes(token)
        );

    if (
        matchedTokens.length ===
        locationTokens.length
    ) {
        return 30;
    }

    if (
        matchedTokens.length > 0
    ) {
        return 20;
    }

    /*
     * Don't immediately reject a result
     * because Google Maps sometimes returns
     * incomplete/malformed address text.
     */

    return 10;
}

function calculateBusinessQualityScore(
    business
) {

    let score = 0;

    if (business.business_name) {
        score += 10;
    }

    if (business.category) {
        score += 5;
    }

    if (business.address) {
        score += 5;
    }

    if (business.google_maps_link) {
        score += 5;
    }

    if (
        business.google_rating !== null &&
        business.google_rating !== undefined
    ) {
        score += 5;
    }

    return score;
}

function calculateRelevanceScore(
    business,
    keyword,
    location
) {

    const keywordScore =
        calculateKeywordScore(
            business,
            keyword
        );

    const locationScore =
        calculateLocationScore(
            business,
            location
        );

    const qualityScore =
        calculateBusinessQualityScore(
            business
        );

    return (
        keywordScore +
        locationScore +
        qualityScore
    );
}

class RelevanceService {

    scoreBusiness(
        business,
        keyword,
        location
    ) {

        return calculateRelevanceScore(
            business,
            keyword,
            location
        );
    }

    filterBusinesses(
        businesses,
        keyword,
        location
    ) {

        const scoredBusinesses =
            businesses
                .map((business) => ({
                    ...business,

                    relevance_score:
                        this.scoreBusiness(
                            business,
                            keyword,
                            location
                        ),
                }))
                .filter(
                    (business) =>
                        business.relevance_score >= 35
                )
                .sort(
                    (a, b) =>
                        b.relevance_score -
                        a.relevance_score
                );

        /*
         * Remove duplicate Google Maps URLs
         * after scoring.
         */

        const seen =
            new Set();

        return scoredBusinesses.filter(
            (business) => {

                const mapsLink =
                    normalizeSearchText(
                        business.google_maps_link
                    );

                if (
                    mapsLink &&
                    seen.has(mapsLink)
                ) {
                    return false;
                }

                if (mapsLink) {
                    seen.add(mapsLink);
                }

                return true;
            }
        );
    }
}

export default new RelevanceService();