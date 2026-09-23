import "dotenv/config";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

const credentials = Buffer
    .from(`${keyId}:${keySecret}`)
    .toString("base64");

const response = await fetch(
    "https://api.razorpay.com/v1/plans",
    {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            period: "monthly",
            interval: 1,
            item: {
                name: "Starter Test",
                amount: 99900,
                currency: "INR",
                description: "Starter test plan",
            },
        }),
    }
);

const data = await response.json();

console.log("HTTP Status:", response.status);
console.log("Response:", data);