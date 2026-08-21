import express from "express";
import UserController from "../controllers/user.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
    "/profile",
    authMiddleware,
    UserController.getProfile
);
router.get(
    "/services",
    authMiddleware,
    UserController.getUserServices
);
router.post(
    "/services",
    authMiddleware,
    UserController.saveUserServices
);
export default router;