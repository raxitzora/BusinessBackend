import express from "express";

import DigitalMarketingAnalysis from "../services/analyzers/digitalMarketingAnalysis/digitalMarketingAnalysis.js";
const router = express.Router();

router.post(
    "/",
    async (req, res) => {

        try {

            const { websiteUrl } = req.body;

            if (!websiteUrl) {

                return res.status(400).json({

                    success: false,

                    message: "Website URL is required.",

                });

            }

            const analysis =
                await DigitalMarketingAnalysis.analyze(
                    websiteUrl
                );

            return res.status(200).json({

                success: true,

                analysis,

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,

                message: "Internal Server Error.",

            });

        }

    }
);

export default router;