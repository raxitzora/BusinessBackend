import "dotenv/config";

import razorpay from "../config/razorpay.js";

const testRazorpay = async () => {

    try {

        const plans = await razorpay.plans.all({
            count: 1,
        });

        console.log("✅ Razorpay API connection successful.");

        console.log(
            `Plans accessible: ${plans.items.length}`
        );

    } catch (error) {

        console.error("❌ Razorpay API connection failed.");

        console.error("Error name:", error?.name);
        console.error("Error message:", error?.message);
        console.error("Error status:", error?.statusCode);
        console.error("Error description:", error?.error?.description);
        console.error("Full error:", error);

        process.exitCode = 1;
    }
};

testRazorpay();