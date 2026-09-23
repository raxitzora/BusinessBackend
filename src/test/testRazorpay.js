import "dotenv/config";
import razorpay from "../config/razorpay.js";

const testRazorpay = async () => {
    try {
        const result = await razorpay.plans.all({
            count: 1,
        });

        console.log("✅ Razorpay authentication successful.");
        console.log("Plans found:", result.items.length);
    } catch (error) {
        console.error("❌ Razorpay authentication failed.");
        console.error("Status:", error?.statusCode);
        console.error("Message:", error?.message);
        console.error("Error:", error?.error);
    }
};

testRazorpay();