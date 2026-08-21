import UserModel from "../models/user.model.js";
import UserServiceModel from "../models/userService.model.js";

class UserController {

    async getProfile(req, res) {

        try {

            const clerkId = req.userId;

            const user =
                await UserModel.getUserByClerkId(clerkId);

            if (!user) {

                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });

            }

            return res.status(200).json({
                success: true,
                user
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error."
            });

        }

    }


    async getUserServices(req, res) {

        try {

            const clerkId = req.userId;

            const user =
                await UserModel.getUserByClerkId(clerkId);

            if (!user) {

                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });

            }

            const services =
                await UserServiceModel.getUserServices(user.id);

            return res.status(200).json({
                success: true,
                services
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error."
            });

        }

    }


    async saveUserServices(req, res) {

        try {

            const clerkId = req.userId;

            const { services } = req.body;

            if (!Array.isArray(services)) {

                return res.status(400).json({
                    success: false,
                    message: "Services are required."
                });

            }

            if (services.length === 0) {

                return res.status(400).json({
                    success: false,
                    message: "Please select at least one service."
                });

            }

            const user =
                await UserModel.getUserByClerkId(clerkId);

            if (!user) {

                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });

            }

            await UserServiceModel.removeUserServices(
                user.id
            );

            for (const serviceId of services) {

                await UserServiceModel.assignService(
                    user.id,
                    serviceId
                );

            }

            return res.status(200).json({
                success: true,
                message: "Services saved successfully."
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error."
            });

        }

    }

}

export default new UserController();