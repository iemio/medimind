import { Request, Response, NextFunction } from "express";
import { notificationService } from "../services/notification.service";
import { RequestWithUser } from "../models/types";
import { AppError, ErrorType } from "../utils/errorHandler";
import { logger } from "../utils/logger";
import {
    updatePreferenceSchema,
    NotificationType,
    UserType,
} from "../schemas/notification.schema";

export class NotificationController {
    /**
     * Webhook endpoint for appointment events
     */
    public async handleWebhook(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { eventType, appointmentData } = req.body;

            if (!eventType || !appointmentData) {
                throw new AppError(
                    "Missing required fields: eventType and appointmentData",
                    ErrorType.VALIDATION_ERROR,
                    400
                );
            }

            // Verify webhook secret
            const webhookSecret = req.headers["x-webhook-secret"];
            if (
                !webhookSecret ||
                webhookSecret !== process.env.WEBHOOK_SECRET
            ) {
                throw new AppError(
                    "Unauthorized webhook call",
                    ErrorType.AUTHENTICATION_ERROR,
                    401
                );
            }

            // Validate event type
            const validEventTypes: NotificationType[] = [
                "appointment_requested",
                "appointment_scheduled",
                "appointment_confirmed",
                "appointment_cancelled",
                "appointment_completed",
                "appointment_reminder",
                "appointment_rescheduled",
            ];

            if (!validEventTypes.includes(eventType)) {
                throw new AppError(
                    "Invalid event type",
                    ErrorType.VALIDATION_ERROR,
                    400
                );
            }

            await notificationService.createNotification(
                eventType,
                appointmentData
            );

            logger.info(
                `Webhook processed successfully for event: ${eventType}`,
                {
                    eventType,
                    appointmentId: appointmentData._id || appointmentData,
                }
            );

            res.status(201).json({
                success: true,
                message: "Notification created successfully",
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get notification preferences for current user
     */
    public async getPreferences(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userType = req.user!.roles[0];
            const preferences = await notificationService.getUserPreferences(
                req.user!.id,
                userType as UserType
            );

            res.json({
                success: true,
                data: preferences,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update notification preferences for current user
     */
    public async updatePreferences(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userType = req.user!.roles[0];

            // Validate request body
            const validatedData = updatePreferenceSchema.parse(req.body);

            const updatedPreferences =
                await notificationService.updateUserPreferences(
                    req.user!.id,
                    userType as UserType,
                    validatedData
                );

            logger.info(`Preferences updated for user: ${req.user!.id}`, {
                userId: req.user!.id,
                userType,
            });

            res.json({
                success: true,
                message: "Preferences updated successfully",
                data: updatedPreferences,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get notifications for current user
     */
    public async getNotifications(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userType = req.user!.roles[0];
            // const { page = 1, limit = 20, status } = req.query;  ... will add this later ss- pagination

            const notifications =
                await notificationService.getUserNotifications(
                    req.user!.id,
                    userType as UserType
                );

            res.json({
                success: true,
                data: notifications,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mark notification as read
     */
    public async markAsRead(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                throw new AppError(
                    "Notification ID is required",
                    ErrorType.VALIDATION_ERROR,
                    400
                );
            }

            const notification =
                await notificationService.markNotificationAsRead(
                    id,
                    req.user!.id
                );

            logger.info(`Notification marked as read: ${id}`, {
                notificationId: id,
                userId: req.user!.id,
            });

            res.json({
                success: true,
                message: "Notification marked as read",
                data: notification,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mark all notifications as read for current user
     */
    public async markAllAsRead(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userType = req.user!.roles[0];

            await notificationService.markAllNotificationsAsRead(
                req.user!.id,
                userType as UserType
            );

            logger.info(
                `All notifications marked as read for user: ${req.user!.id}`,
                {
                    userId: req.user!.id,
                    userType,
                }
            );

            res.json({
                success: true,
                message: "All notifications marked as read",
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get notification statistics for current user
     */
    // public async getStatistics(
    //     req: RequestWithUser,
    //     res: Response,
    //     next: NextFunction
    // ): Promise<void> {
    //     try {
    //         const userType = req.user!.roles[0];
    //         const statistics =
    //             await notificationService.getNotificationStatistics(
    //                 req.user!.id,
    //                 userType
    //             );

    //         res.json({
    //             success: true,
    //             data: statistics,
    //         });
    //     } catch (error) {
    //         next(error);
    //     }
    // }

    /**
     * Resend failed notifications (Admin only)
     */
    // public async resendFailedNotifications(
    //     req: RequestWithUser,
    //     res: Response,
    //     next: NextFunction
    // ): Promise<void> {
    //     try {
    //         const { notificationIds } = req.body;

    //         if (
    //             !Array.isArray(notificationIds) ||
    //             notificationIds.length === 0
    //         ) {
    //             throw new AppError(
    //                 "Notification IDs array is required",
    //                 ErrorType.VALIDATION_ERROR,
    //                 400
    //             );
    //         }

    //         const result = await notificationService.resendFailedNotifications(
    //             notificationIds
    //         );

    //         logger.info("Failed notifications resend attempted", {
    //             notificationIds,
    //             adminId: req.user!.id,
    //         });

    //         res.json({
    //             success: true,
    //             message: "Failed notifications queued for resending",
    //             data: result,
    //         });
    //     } catch (error) {
    //         next(error);
    //     }
    // }

    /**
     * Handle Twilio SMS status webhook
     */
    // public async handleSMSStatusWebhook(
    //     req: Request,
    //     res: Response,
    //     next: NextFunction
    // ): Promise<void> {
    //     try {
    //         const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } =
    //             req.body;

    //         await notificationService.updateSMSStatus(
    //             MessageSid,
    //             MessageStatus,
    //             ErrorCode,
    //             ErrorMessage
    //         );

    //         res.status(200).send("OK");
    //     } catch (error) {
    //         logger.error("Error handling SMS status webhook:", error);
    //         res.status(500).send("Error");
    //     }
    // }

    /**
     * Handle Twilio Voice status webhook
     */
    // public async handleVoiceStatusWebhook(
    //     req: Request,
    //     res: Response,
    //     next: NextFunction
    // ): Promise<void> {
    //     try {
    //         const { CallSid, CallStatus, CallDuration } = req.body;

    //         await notificationService.updateVoiceStatus(
    //             CallSid,
    //             CallStatus,
    //             CallDuration
    //         );

    //         res.status(200).send("OK");
    //     } catch (error) {
    //         logger.error("Error handling voice status webhook:", error);
    //         res.status(500).send("Error");
    //     }
    // }

    /**
     * Test notification channels (Admin only)
     */
    // public async testNotificationChannels(
    //     req: RequestWithUser,
    //     res: Response,
    //     next: NextFunction
    // ): Promise<void> {
    //     try {
    //         const { userId, channels, message } = req.body;

    //         if (!userId || !channels || !message) {
    //             throw new AppError(
    //                 "userId, channels, and message are required",
    //                 ErrorType.VALIDATION_ERROR,
    //                 400
    //             );
    //         }

    //         const result = await notificationService.testNotificationChannels(
    //             userId,
    //             channels,
    //             message
    //         );

    //         logger.info("Test notification sent", {
    //             userId,
    //             channels,
    //             adminId: req.user!.id,
    //         });

    //         res.json({
    //             success: true,
    //             message: "Test notification sent",
    //             data: result,
    //         });
    //     } catch (error) {
    //         next(error);
    //     }
    // }
}

export const notificationController = new NotificationController();
