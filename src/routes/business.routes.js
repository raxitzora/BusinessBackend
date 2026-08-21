import express from "express";
import BusinessController from "../controllers/business.controller.js";

const router = express.Router();

router.post(
    "/search",
    BusinessController.searchBusinesses
);
router.get(
    "/details/:businessId",
    BusinessController.getBusiness
);

router.get(
    "/history",
    BusinessController.getSearchHistory
);
router.get(
    "/",
    BusinessController.getBusinesses
);
router.post(
    "/enrich/:businessId",
    BusinessController.enrichBusiness
);

router.post(
    "/save/:businessId",
    BusinessController.saveLead
);

router.get(
    "/saved",
    BusinessController.getSavedLeads
);

router.delete(
    "/saved/:businessId",
    BusinessController.removeSavedLead
);


export default router;