import { getAuth } from "@clerk/express";
import BusinessModel from "../models/business.model.js";
import CommonWorkflowService from "../services/commonWorkflow/commonWorkflow.service.js";
import UserModel from "../models/user.model.js";


class BusinessController {

    // Search Businesses
    async searchBusinesses(req, res) {

        try {

            const { keyword, location } = req.body;

            if (!keyword || !location) {

                return res.status(400).json({
                    success: false,
                    message: "keyword and location are required."
                });

            }

             const { userId } =
            getAuth(req);

           if (!userId) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });

            }

             const user =
            await UserModel.getUserByClerkId(
                userId
            );

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }
            // Common Workflow — scrapes Google Maps, returns discovery data
            const businesses =
                await CommonWorkflowService.searchBusinesses(
                    keyword,
                    location
                );

            // Save Businesses — ONE bulk upsert instead of looping
            // createBusiness() per row. Looping meant 40-60 separate DB
            // round-trips per search AND would throw once the unique
            // constraint exists (since createBusiness's ON CONFLICT
            // path is still correct per-row, the bulk version is just
            // far more efficient for "many businesses at once").
            const businessesWithUserId = businesses.map((business) => ({
                user_id: user.id,
                ...business
            }));


           console.time("Database Save");

const savedBusinesses =
    await BusinessModel.createBusinesses(
        businessesWithUserId
    );

    await BusinessModel.createSearchHistory(
    user.id,
    keyword.trim(),
    location.trim(),
    savedBusinesses.length
);
  

console.timeEnd("Database Save");
            return res.status(200).json({
                success: true,
                count: savedBusinesses.length,
                businesses: savedBusinesses
            });

        } catch (error) {

            console.error("Search Businesses Error:", error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error."
            });

        }

    }

    // Get all businesses
    async getBusinesses(req, res) {

    try {

        const { userId } =
            getAuth(req);

        if (!userId) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });

        }

        const user =
            await UserModel.getUserByClerkId(
                userId
            );

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }

        const page =
            Number(req.query.page) || 1;

        const limit =
            Number(req.query.limit) || 20;

        const businesses =
            await BusinessModel.getBusinesses(
                user.id,
                page,
                limit
            );

        return res.status(200).json({
            success: true,
            count: businesses.length,
            businesses
        });

    } catch (error) {

        console.error(
            "Get Businesses Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal Server Error."
        });

    }

}

    // Get Single Business
 async getBusiness(req, res) {

    try {

        const { businessId } =
            req.params;

        const { userId } =
            getAuth(req);

        if (!userId) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });

        }

        const user =
            await UserModel.getUserByClerkId(
                userId
            );

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }

        const business =
            await BusinessModel.getBusinessById(
                businessId,
                user.id
            );

        if (!business) {

            return res.status(404).json({
                success: false,
                message:
                    "Business not found."
            });

        }

        return res.status(200).json({
            success: true,
            business
        });

    } catch (error) {

        console.error(
            "Get Business Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal Server Error."
        });

    }

}

    // Enrich a single business with contact info (phone/email/socials).
    // Called when the user clicks into one business from search results.
    // This is the Stage 2 step — separate from search because crawling
    // every result's website upfront would make every search take a
    // minute or more.
    async enrichBusiness(req, res) {

    try {

        const { businessId } =
            req.params;

        const { userId } =
            getAuth(req);

        if (!userId) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });

        }

        const user =
            await UserModel.getUserByClerkId(
                userId
            );

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }

        const business =
            await BusinessModel.getBusinessById(
                businessId,
                user.id
            );

        if (!business) {

            return res.status(404).json({
                success: false,
                message:
                    "Business not found."
            });

        }

        if (!business.google_maps_link) {

            return res.status(400).json({
                success: false,
                message:
                    "This business has no Google Maps link to enrich from."
            });

        }

        const contactInfo =
            await CommonWorkflowService.getBusinessContact(
                business.google_maps_link
            );

        const updatedBusiness =
            await BusinessModel.updateBusinessContact(
                businessId,
                contactInfo
            );

        return res.status(200).json({
            success: true,
            business: updatedBusiness
        });

    } catch (error) {

        console.error(
            "Enrich Business Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal Server Error."
        });

    }

}

// ================================
// Save Lead
// ================================
async saveLead(req, res) {

    try {

        const { businessId } = req.params;

        const { userId } = getAuth(req);

        if (!userId) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });

        }

        const user =
            await UserModel.getUserByClerkId(
                userId
            );

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }

        // Make sure this business belongs
        // to the authenticated user.
        const business =
            await BusinessModel.getBusinessById(
                businessId,
                user.id
            );

        if (!business) {

            return res.status(404).json({
                success: false,
                message: "Business not found."
            });

        }

        const savedLead =
            await BusinessModel.saveLead(
                user.id,
                businessId
            );

        return res.status(200).json({
            success: true,
            message: "Lead saved successfully.",
            saved: true,
            savedLead
        });

    } catch (error) {

        console.error(
            "Save Lead Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error."
        });

    }

}


// ================================
// Get Saved Leads
// ================================
async getSavedLeads(req, res) {

    try {

        const { userId } = getAuth(req);

        if (!userId) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });

        }

        const user =
            await UserModel.getUserByClerkId(
                userId
            );

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }

        const leads =
            await BusinessModel.getSavedLeads(
                user.id
            );

        return res.status(200).json({
            success: true,
            count: leads.length,
            businesses: leads
        });

    } catch (error) {

        console.error(
            "Get Saved Leads Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error."
        });

    }

}


// ================================
// Remove Saved Lead
// ================================
async removeSavedLead(req, res) {

    try {

        const { businessId } = req.params;

        const { userId } = getAuth(req);

        if (!userId) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });

        }

        const user =
            await UserModel.getUserByClerkId(
                userId
            );

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }

        await BusinessModel.removeSavedLead(
            user.id,
            businessId
        );

        return res.status(200).json({
            success: true,
            message: "Lead removed successfully.",
            saved: false
        });

    } catch (error) {

        console.error(
            "Remove Saved Lead Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error."
        });

    }

}

// ================================
// Get Search History
// ================================
async getSearchHistory(req, res) {

    try {

        const { userId } = getAuth(req);

        if (!userId) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });

        }

        const user =
            await UserModel.getUserByClerkId(
                userId
            );

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }

        const history =
            await BusinessModel.getSearchHistory(
                user.id
            );

        const total =
            await BusinessModel.getSearchHistoryCount(
                user.id
            );

        return res.status(200).json({
            success: true,
            count: total,
            history
        });

    } catch (error) {

        console.error(
            "Get Search History Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error."
        });

    }

}

}

export default new BusinessController();