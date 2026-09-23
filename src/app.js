import express from "express";
import { clerkMiddleware } from "@clerk/express";


import cors from "cors";

import errorMiddleware from "./middlewares/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import userRoutes from "./routes/user.routes.js";
import businessRoutes from "./routes/business.routes.js";

//testing
import websiteAnalysisRoutes from "./routes/websiteAnalysis.routes.js"
import digitalMarketingAnalysisRoutes from "./routes/digitalMarketingAnalysis.routes.js";
const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        "http://localhost:5173":true,
        credentials:true
    })
);
app.use(clerkMiddleware());


app.use(express.json());
app.use(express.urlencoded({ extended: true }));




app.use("/api/auth",authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/user", userRoutes);
app.use("/api/business",businessRoutes);

//testing
app.use(
    "/api/website-analysis",
    websiteAnalysisRoutes
);
app.use(
    "/api/digital-marketing-analysis",
    digitalMarketingAnalysisRoutes
);



app.use(errorMiddleware);

export default app;