import "dotenv/config";
import razorpay from "../config/razorpay.js";

console.log("Key ID loaded:", process.env.RAZORPAY_KEY_ID);
console.log(
    "Secret loaded:",
    process.env.RAZORPAY_KEY_SECRET
        ? "YES"
        : "NO"
);

const createRazorpayPlans = async () => {
    try {
        const starterPlan = await razorpay.plans.create({
            period: "monthly",
            interval: 1,
            item: {
                name: "Starter",
                amount: 99900,
                currency: "INR",
                description: "Starter plan - 30 searches per month",
            },
        });

        console.log("Starter plan created:", starterPlan.id);
    } catch (error) {
        console.error("❌ Razorpay error");
        console.error("Status:", error?.statusCode);
        console.error("Message:", error?.message);
        console.error("Error:", error?.error);
        console.error("Description:", error?.error?.description);
    }
};

createRazorpayPlans();