
import UserModel from "../models/user.model.js";

class UserController {
    async getProfile(req, res) {
        try {
            const user = await UserModel.getUserByClerkId(req.userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found.",
                });
            }

            return res.status(200).json({
                success: true,
                user,
            });
        } catch (error) {
            console.error("Get Profile Error:", error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error.",
            });
        }
    }
}

export default new UserController();
