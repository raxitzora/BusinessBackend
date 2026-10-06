import express from "express";
import { getAuth } from "@clerk/express";

import SEOAnalysis from "../services/analyzers/seoAnalysis/seoAnalysis.js";
import CommonWorkflowService from "../services/commonWorkflow/commonWorkflow.service.js";

import UserModel from "../models/user.model.js";
import BusinessModel from "../models/business.model.js";
import AnalysisModel from "../models/analysis.model.js";

const router = express.Router();

router.post("/", async (req, res) => {

    try {

        const { userId: clerkUserId } =
            getAuth(req);

        if (!clerkUserId) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });

        }

        const { googleMapsLink } =
            req.body;

        if (!googleMapsLink) {

            return res.status(400).json({
                success: false,
                message:
                    "Google Maps link is required.",
            });

        }

        const user =
            await UserModel.getUserByClerkId(
                clerkUserId
            );

        if (!user) {

            return res.status(404).json({
                success: false,
                message:
                    "User not found.",
            });

        }

        const business =
            await BusinessModel.getBusinessByGoogleMapsLink(
                googleMapsLink,
                user.id
            );

        if (!business) {

            return res.status(404).json({
                success: false,
                message:
                    "Business not found.",
            });

        }

        const contactInfo =
            await CommonWorkflowService.getBusinessContact(
                googleMapsLink
            );

        if (!contactInfo?.website) {

            return res.status(400).json({
                success: false,
                message:
                    "Website not found.",
            });

        }

        const result =
            await SEOAnalysis.analyze(
                contactInfo.website
            );

        if (!result.success) {

            return res.status(500).json({
                success: false,
                message:
                    result.message ||
                    "SEO analysis failed.",
                ...result,
            });

        }

        const analysis =
            await AnalysisModel.createAnalysis(
                user.id,
                business.id,
                result
            );

        return res.status(200).json({
            ...result,
            analysisId: analysis.id,
            businessId: analysis.business_id,
        });

    } catch (error) {

        console.error(
            "SEO Analysis Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Internal Server Error.",
        });

    }

});

export default router;