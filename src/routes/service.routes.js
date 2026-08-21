import express from "express";
import ServiceController from "../controllers/service.controller.js";

const router = express.Router();

router.get("/", ServiceController.getAllServices);

export default router;