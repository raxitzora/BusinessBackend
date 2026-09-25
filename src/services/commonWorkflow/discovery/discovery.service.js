import GoogleMapsSource from "./sources/googleMaps.source.js";

class DiscoveryService {

    constructor() {

        this.sources = {
            googleMaps:
                GoogleMapsSource,
        };

        this.maxAreas = 3;
    }

    async search({
        keyword,
        location,
        areas = [],
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

        if (
            !Array.isArray(areas)
        ) {
            throw new Error(
                "areas must be an array"
            );
        }

        const cleanKeyword =
            keyword.trim();

        const cleanLocation =
            location.trim();

        const cleanAreas =
            areas
                .map((area) =>
                    typeof area === "string"
                        ? area.trim()
                        : ""
                )
                .filter(Boolean);

        if (
            cleanAreas.length >
            this.maxAreas
        ) {
            throw new Error(
                `A maximum of ${this.maxAreas} areas can be searched at once`
            );
        }

        /*
         * ------------------------------------------------------------
         * Build discovery targets
         * ------------------------------------------------------------
         *
         * No areas:
         *   garages in Ahmedabad
         *
         * Areas:
         *   garages in Bopal, Ahmedabad
         *   garages in Satellite, Ahmedabad
         *   garages in Gota, Ahmedabad
         *
         * Keeping this logic here means the Google Maps source itself
         * does not need to know anything about manual area selection.
         * ------------------------------------------------------------
         */

        const targets =
            cleanAreas.length > 0
                ? cleanAreas.map((area) => ({
                    location:
                        `${area}, ${cleanLocation}`,
                    area,
                }))
                : [
                    {
                        location:
                            cleanLocation,
                        area: null,
                    },
                ];

        const results = [];

        for (
            const target
            of targets
        ) {

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
                        cleanKeyword,
                        target.location
                    );

                if (
                    !Array.isArray(
                        sourceResults
                    )
                ) {
                    continue;
                }

                /*
                 * Attach the manually selected area to every
                 * business discovered from this target.
                 *
                 * When no area was provided, area remains null.
                 */
                const resultsWithArea =
                    sourceResults.map(
                        (business) => ({
                            ...business,
                            area:
                                target.area,
                        })
                    );

                results.push(
                    ...resultsWithArea
                );
            }
        }

        return results;
    }
}

export default new DiscoveryService();