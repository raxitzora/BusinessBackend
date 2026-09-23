import GoogleMapsSource from "./sources/googleMaps.source.js";

class DiscoveryService {

    constructor() {

        this.sources = {
            googleMaps:
                GoogleMapsSource,
        };
    }

    async search({
        keyword,
        location,
        sources = ["googleMaps"],
    }) {

        if (
            !keyword ||
            !keyword.trim()
        ) {
            throw new Error(
                "keyword is required"
            );
        }

        if (
            !location ||
            !location.trim()
        ) {
            throw new Error(
                "location is required"
            );
        }

        if (
            !Array.isArray(sources) ||
            sources.length === 0
        ) {
            throw new Error(
                "At least one discovery source is required"
            );
        }

        const results = [];

        for (
            const sourceName
            of sources
        ) {

            const source =
                this.sources[sourceName];

            if (!source) {

                throw new Error(
                    `Unsupported discovery source: ${sourceName}`
                );
            }

            const sourceResults =
                await source.search(
                    keyword.trim(),
                    location.trim()
                );

            if (
                Array.isArray(sourceResults)
            ) {

                results.push(
                    ...sourceResults
                );
            }
        }

        return results;
    }
}

export default new DiscoveryService();