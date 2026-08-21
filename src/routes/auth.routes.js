import express from "express";


import AuthController from "../controllers/auth.controller.js";

const router = express.Router();

router.post(
    "/sync",
    AuthController.syncUser
);

export default router;