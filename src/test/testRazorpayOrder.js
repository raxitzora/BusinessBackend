import "dotenv/config";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

const credentials = Buffer
    .from(`${keyId}:${keySecret}`)
    .toString("base64");

try {
    const response = await fetch(
        "https://api.razorpay.com/v1/orders",
        {
            method: "POST",
            headers: {
                "Authorization": `Basic ${credentials}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                amount: 500,
                currency: "INR",
                receipt: `test_${Date.now()}`,
            }),
        }
    );

    const data = await response.json();

    console.log("HTTP Status:", response.status);
    console.log("Response:", data);
} catch (error) {
    console.error(error);
}