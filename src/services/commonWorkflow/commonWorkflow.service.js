import DiscoveryService from "./discovery/discovery.service.js";
import RelevanceService from "./relevance/relevance.service.js";
import EnrichmentService from "./enrichment/enrichment.service.js";
import SEOAnalysis from "../analyzers/seoAnalysis/seoAnalysis.js";


class CommonWorkflowService {


    async searchBusinesses(
        keyword,
        location,
        areas = []
    ) {

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

        console.time(
            "[CommonWorkflow] Business Search"
        );

        try {

            const discoveredBusinesses =
                await DiscoveryService.search({
                    keyword:
                        cleanKeyword,

                    location:
                        cleanLocation,

                    areas:
                        cleanAreas,
                });

            console.log(
                `[CommonWorkflow] Discovered ${discoveredBusinesses.length} businesses.`
            );

            /*
             * Keep the existing relevance engine.
             *
             * The discovery layer is responsible for finding
             * businesses and attaching their selected area.
             *
             * The relevance layer remains responsible for
             * deciding whether those businesses match the search.
             */
            const relevantBusinesses =
                RelevanceService.filterBusinesses(
                    discoveredBusinesses,
                    cleanKeyword,
                    cleanLocation
                );

            console.log(
                `[CommonWorkflow] ${relevantBusinesses.length} businesses remained after relevance filtering.`
            );

            return relevantBusinesses;

        } finally {

            console.timeEnd(
                "[CommonWorkflow] Business Search"
            );
        }
    }

    async getBusinessContact(
        googleMapsLink
    ) {

        if (
            !googleMapsLink ||
            !googleMapsLink.trim()
        ) {
            throw new Error(
                "googleMapsLink is required"
            );
        }

        return EnrichmentService.getBusinessContact(
            googleMapsLink.trim()
        );
    }
    
}


export default new CommonWorkflowService();