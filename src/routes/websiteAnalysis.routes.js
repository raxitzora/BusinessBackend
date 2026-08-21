import express from "express";
import WebsiteAnalysis from "../services/analyzers/websiteAnalysis/websiteAnalysis.js";
import CommonWorkflowService from "../services/commonWorkflow/commonWorkflow.service.js";

const router = express.Router();

router.post("/", async (req, res) => {

    try {

        const { googleMapsLink } = req.body;

        if (!googleMapsLink) {

            return res.status(400).json({
                success: false,
                message: "Google Maps link is required."
            });

        }

        const contactInfo =
            await CommonWorkflowService.getBusinessContact(
                googleMapsLink
            );

        if (!contactInfo.website) {

            return res.status(400).json({
                success: false,
                message: "Website not found."
            });

        }

        const result =
            await WebsiteAnalysis.analyze(
                contactInfo.website
            );

        return res.json(result);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }

});

export default router;