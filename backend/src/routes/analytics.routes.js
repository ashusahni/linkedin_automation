import { Router } from "express";
import { getDashboardAnalytics } from "../controllers/analytics.controller.js";

const router = Router();
router.get("/dashboard", getDashboardAnalytics);
export default router;
