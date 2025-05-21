import { Notification, INotification } from "../models/notification.model";
import {
    NotificationPreference,
    INotificationPreference,
} from "../models/notificationPreference.model";
import { externalService } from "./external.service";
import { communicationService } from "./communication.service";
import {
    NotificationType,
    UserType,
    NotificationPreferenceData,
} from "../schemas/notification.schema";
import { AppError, ErrorType } from "../utils/errorHandler";
import { logger } from "../utils/logger";

export class NotificationService {
    public async createNotification(
        type: NotificationType,
        appointmentData: any
    ): Promise<boolean> {
        try {
            // Get appointment details if only ID is provided
            let appointment = appointmentData;
            if (typeof appointmentData === "string") {
                appointment = await externalService.getAppointmentDetails(
                    appointmentData
                );
            }

            // Format appointment date and time for messages
            const date = new Date(
                appointment.appointmentDate
            ).toLocaleDateString();
            const time = appointment.timeSlot;

            // Create patient notification
            const patientMessage = this.generateMessage(
                type,
                date,
                time,
                "patient"
            );
            const patientNotification = new Notification({
                userId: appointment.patientId,
                userType: "patient",
                appointmentId: appointment._id,
                type,
                message: patientMessage,
            });
            await patientNotification.save();

            // Create doctor notification (except for requested appointments)
            if (type !== "appointment_requested") {
                const doctorMessage = this.generateMessage(
                    type,
                    date,
                    time,
                    "doctor"
                );
                if (doctorMessage) {
                    const doctorNotification = new Notification({
                        userId: appointment.doctorId,
                        userType: "doctor",
                        appointmentId: appointment._id,
                        type,
                        message: doctorMessage,
                    });
                    await doctorNotification.save();
                }
            }

            return true;
        } catch (error) {
            logger.error("Error creating notification:", error);
            return false;
        }
    }

    private generateMessage(
        type: NotificationType,
        date: string,
        time: string,
        userType: UserType
    ): string {
        const isPatient = userType === "patient";

        switch (type) {
            case "appointment_requested":
                return isPatient
                    ? `Your appointment request for ${date} at ${time} has been submitted successfully. We'll notify you once it's scheduled.`
                    : "";
            case "appointment_scheduled":
                return isPatient
                    ? `Your appointment has been scheduled for ${date} at ${time}. Please confirm this appointment.`
                    : `New appointment scheduled with patient for ${date} at ${time}.`;
            case "appointment_confirmed":
                return isPatient
                    ? `Your appointment for ${date} at ${time} has been confirmed. We look forward to seeing you.`
                    : `Appointment with patient for ${date} at ${time} has been confirmed by the patient.`;
            case "appointment_cancelled":
                return isPatient
                    ? `Your appointment for ${date} at ${time} has been cancelled.`
                    : `Appointment with patient for ${date} at ${time} has been cancelled.`;
            case "appointment_completed":
                return isPatient
                    ? `Your appointment on ${date} at ${time} has been marked as completed. Thank you for your visit.`
                    : "";
            case "appointment_reminder":
                return isPatient
                    ? `Reminder: You have an appointment scheduled tomorrow on ${date} at ${time}.`
                    : `Reminder: You have an appointment with patient tomorrow on ${date} at ${time}.`;
            case "appointment_rescheduled":
                return isPatient
                    ? `Your appointment has been rescheduled to ${date} at ${time}. Please confirm the new time.`
                    : `Appointment with patient has been rescheduled to ${date} at ${time}.`;
            default:
                return "";
        }
    }

    public async getUserPreferences(
        userId: string,
        userType: UserType
    ): Promise<INotificationPreference> {
        try {
            let preferences = await NotificationPreference.findOne({ userId });

            if (!preferences) {
                // Create default preferences
                preferences = new NotificationPreference({
                    userId,
                    role: userType === "admin" ? "doctor" : userType,
                });
                await preferences.save();
            }

            return preferences;
        } catch (error) {
            logger.error("Error fetching user preferences:", error);
            throw new AppError(
                "Failed to fetch user preferences",
                ErrorType.INTERNAL_SERVER_ERROR,
                500
            );
        }
    }

    public async updateUserPreferences(
        userId: string,
        userType: UserType,
        preferenceData: Partial<NotificationPreferenceData>
    ): Promise<INotificationPreference> {
        try {
            let preferences = await NotificationPreference.findOne({ userId });

            if (!preferences) {
                preferences = new NotificationPreference({
                    userId,
                    role: userType === "admin" ? "doctor" : userType,
                });
            }

            // Update preferences
            Object.assign(preferences, preferenceData);
            preferences.updatedAt = new Date();
            await preferences.save();

            return preferences;
        } catch (error) {
            logger.error("Error updating preferences:", error);
            throw new AppError(
                "Failed to update preferences",
                ErrorType.INTERNAL_SERVER_ERROR,
                500
            );
        }
    }

    public async getUserNotifications(
        userId: string,
        userType: UserType
    ): Promise<INotification[]> {
        try {
            const notifications = await Notification.find({
                userId,
                userType,
                status: { $ne: "read" },
            }).sort({ createdAt: -1 });

            return notifications;
        } catch (error) {
            logger.error("Error fetching notifications:", error);
            throw new AppError(
                "Failed to fetch notifications",
                ErrorType.INTERNAL_SERVER_ERROR,
                500
            );
        }
    }

    public async markNotificationAsRead(
        notificationId: string,
        userId: string
    ): Promise<INotification> {
        try {
            const notification = await Notification.findById(notificationId);

            if (!notification) {
                throw new AppError(
                    "Notification not found",
                    ErrorType.NOT_FOUND_ERROR,
                    404
                );
            }

            if (notification.userId !== userId) {
                throw new AppError(
                    "You don't have permission to update this notification",
                    ErrorType.AUTHORIZATION_ERROR,
                    403
                );
            }

            notification.status = "read";
            notification.readAt = new Date();
            await notification.save();

            return notification;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error("Error updating notification:", error);
            throw new AppError(
                "Failed to update notification",
                ErrorType.INTERNAL_SERVER_ERROR,
                500
            );
        }
    }

    public async markAllNotificationsAsRead(
        userId: string,
        userType: UserType
    ): Promise<void> {
        try {
            await Notification.updateMany(
                {
                    userId,
                    userType,
                    status: { $ne: "read" },
                },
                {
                    $set: {
                        status: "read",
                        readAt: new Date(),
                    },
                }
            );
        } catch (error) {
            logger.error("Error updating notifications:", error);
            throw new AppError(
                "Failed to update notifications",
                ErrorType.INTERNAL_SERVER_ERROR,
                500
            );
        }
    }

    public async sendNotificationChannels(
        notification: INotification
    ): Promise<void> {
        try {
            const userDetails = await externalService.getUserDetails(
                notification.userId,
                notification.userType
            );
            const preferences = await this.getUserPreferences(
                notification.userId,
                notification.userType
            );

            if (!userDetails || !preferences) {
                logger.error("Failed to get user details or preferences");
                return;
            }

            // Check do not disturb settings
            const isDNDTime = this.isDoNotDisturbTime(preferences.doNotDisturb);

            // Skip non-urgent notifications during DND (except reminders)
            if (isDNDTime && notification.type !== "appointment_reminder") {
                logger.info(
                    `Skipping notification for user ${notification.userId} due to Do Not Disturb`
                );
                return;
            }

            const subject = this.getEmailSubject(notification.type);

            // Send through enabled channels
            await communicationService.sendThroughChannels(
                notification,
                userDetails,
                preferences,
                subject
            );

            // Update notification status
            const hasSuccessfulChannel =
                notification.channels.email.sent ||
                notification.channels.sms.sent ||
                notification.channels.voice.sent ||
                notification.channels.push.sent;

            notification.status = hasSuccessfulChannel ? "sent" : "failed";
            await notification.save();
        } catch (error) {
            logger.error("Error sending notification channels:", error);
            notification.status = "failed";
            await notification.save();
        }
    }

    private isDoNotDisturbTime(doNotDisturb: any): boolean {
        if (!doNotDisturb.enabled) return false;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [fromHour, fromMin] = doNotDisturb.from.split(":").map(Number);
        const [toHour, toMin] = doNotDisturb.to.split(":").map(Number);

        const fromTime = fromHour * 60 + fromMin;
        const toTime = toHour * 60 + toMin;

        // Handle overnight periods (e.g., 22:00 to 07:00)
        if (fromTime > toTime) {
            return currentTime >= fromTime || currentTime <= toTime;
        }

        return currentTime >= fromTime && currentTime <= toTime;
    }

    private getEmailSubject(type: NotificationType): string {
        switch (type) {
            case "appointment_requested":
                return "Appointment Request Submitted";
            case "appointment_scheduled":
                return "Appointment Scheduled";
            case "appointment_confirmed":
                return "Appointment Confirmed";
            case "appointment_cancelled":
                return "Appointment Cancelled";
            case "appointment_completed":
                return "Appointment Completed";
            case "appointment_reminder":
                return "Appointment Reminder";
            case "appointment_rescheduled":
                return "Appointment Rescheduled";
            default:
                return "Healthcare Notification";
        }
    }

    public async getPendingNotifications(): Promise<INotification[]> {
        try {
            return await Notification.find({ status: "pending" });
        } catch (error) {
            logger.error("Error fetching pending notifications:", error);
            return [];
        }
    }

    public async scheduleAppointmentReminders(): Promise<void> {
        try {
            const appointments =
                await externalService.getTomorrowAppointments();

            for (const appointment of appointments) {
                const existingReminder = await Notification.findOne({
                    appointmentId: appointment._id,
                    type: "appointment_reminder",
                });

                if (!existingReminder) {
                    await this.createNotification(
                        "appointment_reminder",
                        appointment
                    );
                }
            }
        } catch (error) {
            logger.error("Error scheduling appointment reminders:", error);
        }
    }
}

export const notificationService = new NotificationService();
