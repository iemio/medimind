import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { authenticateToken, hasRole } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import { rateLimiter } from "../middlewares/rateLimiter.middleware";
import { updatePreferenceSchema } from "../schemas/notification.schema";

const router = Router();

/**
 * Public Routes (Webhooks)
 */

// Webhook endpoint for appointment events
router.post(
    "/webhook",
    rateLimiter.webhook,
    notificationController.handleWebhook
);

// Twilio SMS status webhook
// router.post(
//     "/twilio/sms-status",
//     rateLimiter.webhook,
//     notificationController.handleSMSStatusWebhook
// );

// Twilio Voice status webhook
// router.post(
//     "/twilio/voice-status",
//     rateLimiter.webhook,
//     notificationController.handleVoiceStatusWebhook
// );

/**
 * Protected Routes (Require Authentication)
 */

// Get notification preferences for current user
router.get(
    "/preferences",
    authenticateToken,
    rateLimiter.standard,
    notificationController.getPreferences
);

// Update notification preferences for current user
router.put(
    "/preferences",
    authenticateToken,
    rateLimiter.standard,
    validateRequest(updatePreferenceSchema),
    notificationController.updatePreferences
);

// Get notifications for current user
router.get(
    "/",
    authenticateToken,
    rateLimiter.standard,
    notificationController.getNotifications
);

// Mark specific notification as read
router.put(
    "/:id/read",
    authenticateToken,
    rateLimiter.standard,
    notificationController.markAsRead
);

// Mark all notifications as read for current user
router.put(
    "/read-all",
    authenticateToken,
    rateLimiter.standard,
    notificationController.markAllAsRead
);

// Get notification statistics for current user
// router.get(
//     "/statistics",
//     authenticateToken,
//     rateLimiter.standard,
//     notificationController.getStatistics
// );

/**
 * Admin-only Routes
 */

// Resend failed notifications (Admin only)
// router.post(
//     "/resend-failed",
//     authenticateToken,
//     hasRole("admin"),
//     rateLimiter.admin,
//     notificationController.resendFailedNotifications
// );

// Test notification channels (Admin only)
// router.post(
//     "/test",
//     authenticateToken,
//     hasRole("admin"),
//     rateLimiter.admin,
//     notificationController.testNotificationChannels
// );

/**
 * Health Check Routes
 */

// Check notification service health
router.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Notification service is healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

export { router as notificationRoutes };
