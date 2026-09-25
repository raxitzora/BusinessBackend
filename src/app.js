import express from "express";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";

import errorMiddleware from "./middlewares/error.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import userRoutes from "./routes/user.routes.js";
import businessRoutes from "./routes/business.routes.js";

// Testing
import websiteAnalysisRoutes from "./routes/websiteAnalysis.routes.js";
import digitalMarketingAnalysisRoutes from "./routes/digitalMarketingAnalysis.routes.js";

const app = express();

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
    "http://localhost:5173",
    "https://leadflow-murex-six.vercel.app",
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests without an Origin header
            // such as server-to-server requests or Postman.
            if (!origin) {
                callback(null, true);
                return;
            }

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error(`CORS blocked origin: ${origin}`));
        },

        credentials: true,

        methods: [
            "GET",
            "HEAD",
            "PUT",
            "PATCH",
            "POST",
            "DELETE",
            "OPTIONS",
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization",
        ],
    })
);

/*
|--------------------------------------------------------------------------
| Clerk
|--------------------------------------------------------------------------
*/

app.use(clerkMiddleware());

/*
|--------------------------------------------------------------------------
| Body Parsers
|--------------------------------------------------------------------------
*/

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/services",
    serviceRoutes
);

app.use(
    "/api/user",
    userRoutes
);

app.use(
    "/api/business",
    businessRoutes
);

/*
|--------------------------------------------------------------------------
| Analysis Routes
|--------------------------------------------------------------------------
*/

app.use(
    "/api/website-analysis",
    websiteAnalysisRoutes
);

app.use(
    "/api/digital-marketing-analysis",
    digitalMarketingAnalysisRoutes
);

/*
|--------------------------------------------------------------------------
| Error Middleware
|--------------------------------------------------------------------------
*/

app.use(errorMiddleware);

export default app;