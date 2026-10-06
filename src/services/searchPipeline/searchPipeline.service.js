import BusinessModel from "../../models/business.model.js";
import CommonWorkflowService
    from "../commonWorkflow/commonWorkflow.service.js";

const CONCURRENCY = 8;

class SearchPipelineService {

    async processSearch(searchId) {

        try {

            const businesses =
                await BusinessModel
                    .getBusinessesForSearchProcessing(
                        searchId
                    );

            await BusinessModel.startSearchProcessing(
                searchId,
                businesses.length
            );

            let checked = 0;

            for (
                let i = 0;
                i < businesses.length;
                i += CONCURRENCY
            ) {

                const batch =
                    businesses.slice(
                        i,
                        i + CONCURRENCY
                    );

                await Promise.all(
                    batch.map(
                        (business) =>
                            this.processBusiness(
                                business
                            )
                    )
                );

                checked += batch.length;

                await BusinessModel.updateSearchProgress(
                    searchId,
                    checked
                );

            }

            await BusinessModel.completeSearchProcessing(
                searchId
            );

            console.log(
                `[SearchPipeline] Search ${searchId} completed.`
            );

        } catch (error) {

            console.error(
                `[SearchPipeline] Search ${searchId} failed:`,
                error
            );

            await BusinessModel.failSearchProcessing(
                searchId,
                error.message
            );

        }

    }


    async processBusiness(business) {

        try {

            await BusinessModel.markWebsiteChecking(
                business.id
            );

            const contact =
                await CommonWorkflowService
                    .getBusinessContact(
                        business.google_maps_link
                    );

            await BusinessModel.updateBusinessContact(
                business.id,
                contact
            );

        } catch (error) {

            console.error(
                `[SearchPipeline] Failed business ${business.id}:`,
                error.message
            );

            await BusinessModel.markWebsiteCheckFailed(
                business.id
            );

        }

    }

}

export default new SearchPipelineService();