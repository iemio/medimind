import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";

const router = Router();

// Public routes
router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/validate-token", authController.validateToken);

// Protected routes
router.get("/me", authenticate, authController.getCurrentUser);
router.put(
    "/users/:id/roles",
    authenticate,
    authorize(["admin"]),
    authController.updateUserRoles
);

// Service routes (admin only)
router.post(
    "/services/register",
    authenticate,
    authorize(["admin"]),
    authController.registerService
);
router.post("/service-token", authController.generateServiceToken);

export const authRoutes = router;
