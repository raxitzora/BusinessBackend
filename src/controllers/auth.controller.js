import { createClerkClient } from "@clerk/backend";
import { getAuth } from "@clerk/express";
import UserModel from "../models/user.model.js";

const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
});

class AuthController {

    async syncUser(req, res) {

        try {
            console.log("Authorization:", req.headers.authorization);

            const auth = getAuth(req);

console.log("Auth Object:", auth);

const { userId } = auth;

if (!userId) {
    return res.status(401).json({
        success: false,
        message: "Unauthorized."
    });
}

            const clerkUser = await clerkClient.users.getUser(userId);

            const clerk_id = clerkUser.id;

            const full_name =
                `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
                clerkUser.username ||
                "User";

            const email = clerkUser.emailAddresses[0]?.emailAddress;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: "No email found for authenticated user."
                });
            }

            const user = await UserModel.createOrUpdateUser(
                clerk_id,
                full_name,
                email
            );

            return res.status(200).json({
                success: true,
                message: "User synchronized successfully.",
                user,
            });

        } catch (error) {

            console.error("Auth Sync Error:", error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error."
            });

        }

    }

}

export default new AuthController();