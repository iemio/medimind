// notification-service/index.js (enhanced with preferences and Twilio)
import express from "express";
import mongoose from "mongoose";
import axios from "axios";
import cors from "cors";
import "dotenv/config";
import nodemailer from "nodemailer";
import cron from "node-cron";
import twilio from "twilio";

const app = express();
const PORT = process.env.PORT || 3005;
const AUTH_SERVICE_URL =
    process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const DOCTOR_SERVICE_URL =
    process.env.DOCTOR_SERVICE_URL || "http://localhost:3002";
const PATIENT_SERVICE_URL =
    process.env.PATIENT_SERVICE_URL || "http://localhost:3003";
const APPOINTMENT_SERVICE_URL =
    process.env.APPOINTMENT_SERVICE_URL || "http://localhost:3004";

app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log(err));

// Twilio Configuration
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Notification Schema
const notificationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    userType: {
        type: String,
        enum: ["patient", "doctor", "admin"],
        required: true,
    },
    appointmentId: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: [
            "appointment_requested",
            "appointment_scheduled",
            "appointment_confirmed",
            "appointment_cancelled",
            "appointment_completed",
            "appointment_reminder",
            "appointment_rescheduled",
        ],
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "sent", "failed", "read"],
        default: "pending",
    },
    channels: {
        email: {
            sent: { type: Boolean, default: false },
            status: {
                type: String,
                enum: ["pending", "sent", "failed"],
                default: "pending",
            },
            sentAt: Date,
            error: String,
        },
        sms: {
            sent: { type: Boolean, default: false },
            status: {
                type: String,
                enum: ["pending", "sent", "failed"],
                default: "pending",
            },
            sentAt: Date,
            twilioSid: String,
            error: String,
        },
        voice: {
            sent: { type: Boolean, default: false },
            status: {
                type: String,
                enum: ["pending", "sent", "failed"],
                default: "pending",
            },
            sentAt: Date,
            twilioSid: String,
            error: String,
        },
        push: {
            sent: { type: Boolean, default: false },
            status: {
                type: String,
                enum: ["pending", "sent", "failed"],
                default: "pending",
            },
            sentAt: Date,
            error: String,
        },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    readAt: {
        type: Date,
    },
});

// Notification Preference Schema
const notificationPreferenceSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
    },
    role: {
        type: String,
        enum: ["patient", "doctor"],
        required: true,
    },
    email: {
        type: Boolean,
        default: true,
    },
    sms: {
        type: Boolean,
        default: false,
    },
    voice: {
        type: Boolean,
        default: false,
    },
    voiceType: {
        type: String,
        enum: ["recorded", "text_to_speech", "both"],
        default: "text_to_speech",
    },
    push: {
        type: Boolean,
        default: true,
    },
    language: {
        type: String,
        default: "en",
    },
    doNotDisturb: {
        enabled: {
            type: Boolean,
            default: false,
        },
        from: {
            type: String,
            default: "22:00",
        },
        to: {
            type: String,
            default: "07:00",
        },
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

const Notification = mongoose.model("Notification", notificationSchema);
const NotificationPreference = mongoose.model(
    "NotificationPreference",
    notificationPreferenceSchema
);

// Email configuration
const transporter = nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Helper function to get service token
const getServiceToken = async () => {
    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/service-token`, {
            serviceId: process.env.SERVICE_ID,
            serviceSecret: process.env.SERVICE_SECRET,
        });
        return response.data.token;
    } catch (error) {
        console.error("Error getting service token:", error);
        return null;
    }
};

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader) {
            return res
                .status(401)
                .json({ message: "No token, authorization denied" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res
                .status(401)
                .json({ message: "No token, authorization denied" });
        }

        // Validate token with Auth Service
        const response = await axios.post(
            `${AUTH_SERVICE_URL}/validate-token`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        req.user = response.data;
        next();
    } catch (error) {
        console.error("Authentication error:", error.message);
        return res.status(401).json({ message: "Token is not valid" });
    }
};

// Helper function to check if current time is within do not disturb hours
const isDoNotDisturbTime = (doNotDisturb) => {
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
};

// Helper function to fetch user details (email and phone)
const getUserDetails = async (userId, userType) => {
    try {
        const serviceToken = await getServiceToken();
        if (!serviceToken) {
            console.error("Failed to get service token");
            return null;
        }

        let serviceUrl;
        let endpoint;

        if (userType === "patient") {
            serviceUrl = PATIENT_SERVICE_URL;
            endpoint = "patients";
        } else if (userType === "doctor") {
            serviceUrl = DOCTOR_SERVICE_URL;
            endpoint = "doctors";
        } else {
            // For admin users
            serviceUrl = AUTH_SERVICE_URL;
            endpoint = "users";
        }

        const response = await axios.get(
            `${serviceUrl}/${endpoint}/${userId}`,
            {
                headers: {
                    Authorization: `Bearer ${serviceToken}`,
                },
            }
        );

        return {
            email: response.data.email,
            phone: response.data.phone,
            name:
                response.data.name ||
                response.data.firstName + " " + response.data.lastName,
        };
    } catch (error) {
        console.error(`Error fetching ${userType} details:`, error);
        return null;
    }
};

// Helper function to get user preferences
const getUserPreferences = async (userId, userType) => {
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
        console.error("Error fetching user preferences:", error);
        return null;
    }
};

// Helper function to send email notification
const sendEmailNotification = async (to, subject, text, language = "en") => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || "healthcare@example.com",
            to,
            subject,
            text,
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error: error.message };
    }
};

// Helper function to send SMS notification
const sendSMSNotification = async (to, message, language = "en") => {
    try {
        const result = await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to,
        });

        return { success: true, sid: result.sid };
    } catch (error) {
        console.error("Error sending SMS:", error);
        return { success: false, error: error.message };
    }
};

// Helper function to send voice notification
const sendVoiceNotification = async (
    to,
    message,
    voiceType = "text_to_speech",
    language = "en"
) => {
    try {
        let twiml;

        if (voiceType === "recorded" || voiceType === "both") {
            // Use recorded message if available
            const recordingUrl =
                process.env.RECORDING_BASE_URL + `/recording_${language}.mp3`;
            twiml = `
                <Response>
                    <Play>${recordingUrl}</Play>
                    ${
                        voiceType === "both"
                            ? `<Say voice="alice" language="${language}">${message}</Say>`
                            : ""
                    }
                </Response>
            `;
        } else {
            // Text to speech
            twiml = `
                <Response>
                    <Say voice="alice" language="${language}">${message}</Say>
                </Response>
            `;
        }

        const result = await twilioClient.calls.create({
            twiml: twiml,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to,
        });

        return { success: true, sid: result.sid };
    } catch (error) {
        console.error("Error sending voice notification:", error);
        return { success: false, error: error.message };
    }
};

// Helper function to send push notification (placeholder)
const sendPushNotification = async (userId, title, body, language = "en") => {
    try {
        // Implement your push notification service here (Firebase, OneSignal, etc.)
        console.log(`Push notification sent to ${userId}: ${title} - ${body}`);
        return { success: true };
    } catch (error) {
        console.error("Error sending push notification:", error);
        return { success: false, error: error.message };
    }
};

// Create notification for appointment events
const createNotification = async (type, appointmentData) => {
    try {
        const serviceToken = await getServiceToken();
        if (!serviceToken) {
            console.error("Failed to get service token");
            return false;
        }

        // Get appointment details if only ID is provided
        let appointment = appointmentData;
        if (typeof appointmentData === "string") {
            const response = await axios.get(
                `${APPOINTMENT_SERVICE_URL}/appointments/${appointmentData}`,
                {
                    headers: {
                        Authorization: `Bearer ${serviceToken}`,
                    },
                }
            );
            appointment = response.data;
        }

        // Format appointment date and time for messages
        const date = new Date(appointment.appointmentDate).toLocaleDateString();
        const time = appointment.timeSlot;

        // Create patient notification
        let patientMessage = "";
        switch (type) {
            case "appointment_requested":
                patientMessage = `Your appointment request for ${date} at ${time} has been submitted successfully. We'll notify you once it's scheduled.`;
                break;
            case "appointment_scheduled":
                patientMessage = `Your appointment has been scheduled for ${date} at ${time}. Please confirm this appointment.`;
                break;
            case "appointment_confirmed":
                patientMessage = `Your appointment for ${date} at ${time} has been confirmed. We look forward to seeing you.`;
                break;
            case "appointment_cancelled":
                patientMessage = `Your appointment for ${date} at ${time} has been cancelled.`;
                break;
            case "appointment_completed":
                patientMessage = `Your appointment on ${date} at ${time} has been marked as completed. Thank you for your visit.`;
                break;
            case "appointment_reminder":
                patientMessage = `Reminder: You have an appointment scheduled tomorrow on ${date} at ${time}.`;
                break;
            case "appointment_rescheduled":
                patientMessage = `Your appointment has been rescheduled to ${date} at ${time}. Please confirm the new time.`;
                break;
        }

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
            let doctorMessage = "";
            switch (type) {
                case "appointment_scheduled":
                    doctorMessage = `New appointment scheduled with patient for ${date} at ${time}.`;
                    break;
                case "appointment_confirmed":
                    doctorMessage = `Appointment with patient for ${date} at ${time} has been confirmed by the patient.`;
                    break;
                case "appointment_cancelled":
                    doctorMessage = `Appointment with patient for ${date} at ${time} has been cancelled.`;
                    break;
                case "appointment_reminder":
                    doctorMessage = `Reminder: You have an appointment with patient tomorrow on ${date} at ${time}.`;
                    break;
                case "appointment_rescheduled":
                    doctorMessage = `Appointment with patient has been rescheduled to ${date} at ${time}.`;
                    break;
            }

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
        console.error("Error creating notification:", error);
        return false;
    }
};

// Send notification through multiple channels based on preferences
const sendNotificationChannels = async (notification) => {
    try {
        const userDetails = await getUserDetails(
            notification.userId,
            notification.userType
        );
        const preferences = await getUserPreferences(
            notification.userId,
            notification.userType
        );

        if (!userDetails || !preferences) {
            console.error("Failed to get user details or preferences");
            return;
        }

        // Check do not disturb settings
        const isDNDTime = isDoNotDisturbTime(preferences.doNotDisturb);

        // Skip non-urgent notifications during DND (except reminders)
        if (isDNDTime && notification.type !== "appointment_reminder") {
            console.log(
                `Skipping notification for user ${notification.userId} due to Do Not Disturb`
            );
            return;
        }

        // Determine email subject
        let subject = "Healthcare Notification";
        switch (notification.type) {
            case "appointment_requested":
                subject = "Appointment Request Submitted";
                break;
            case "appointment_scheduled":
                subject = "Appointment Scheduled";
                break;
            case "appointment_confirmed":
                subject = "Appointment Confirmed";
                break;
            case "appointment_cancelled":
                subject = "Appointment Cancelled";
                break;
            case "appointment_completed":
                subject = "Appointment Completed";
                break;
            case "appointment_reminder":
                subject = "Appointment Reminder";
                break;
            case "appointment_rescheduled":
                subject = "Appointment Rescheduled";
                break;
        }

        // Send Email
        if (preferences.email && userDetails.email) {
            const emailResult = await sendEmailNotification(
                userDetails.email,
                subject,
                notification.message,
                preferences.language
            );

            notification.channels.email.sent = emailResult.success;
            notification.channels.email.status = emailResult.success
                ? "sent"
                : "failed";
            notification.channels.email.sentAt = new Date();
            if (!emailResult.success) {
                notification.channels.email.error = emailResult.error;
            }
        }

        // Send SMS
        if (preferences.sms && userDetails.phone) {
            const smsResult = await sendSMSNotification(
                userDetails.phone,
                notification.message,
                preferences.language
            );

            notification.channels.sms.sent = smsResult.success;
            notification.channels.sms.status = smsResult.success
                ? "sent"
                : "failed";
            notification.channels.sms.sentAt = new Date();
            notification.channels.sms.twilioSid = smsResult.sid;
            if (!smsResult.success) {
                notification.channels.sms.error = smsResult.error;
            }
        }

        // Send Voice Call
        if (preferences.voice && userDetails.phone) {
            const voiceResult = await sendVoiceNotification(
                userDetails.phone,
                notification.message,
                preferences.voiceType,
                preferences.language
            );

            notification.channels.voice.sent = voiceResult.success;
            notification.channels.voice.status = voiceResult.success
                ? "sent"
                : "failed";
            notification.channels.voice.sentAt = new Date();
            notification.channels.voice.twilioSid = voiceResult.sid;
            if (!voiceResult.success) {
                notification.channels.voice.error = voiceResult.error;
            }
        }

        // Send Push Notification
        if (preferences.push) {
            const pushResult = await sendPushNotification(
                notification.userId,
                subject,
                notification.message,
                preferences.language
            );

            notification.channels.push.sent = pushResult.success;
            notification.channels.push.status = pushResult.success
                ? "sent"
                : "failed";
            notification.channels.push.sentAt = new Date();
            if (!pushResult.success) {
                notification.channels.push.error = pushResult.error;
            }
        }

        // Update notification status
        const hasSuccessfulChannel =
            notification.channels.email.sent ||
            notification.channels.sms.sent ||
            notification.channels.voice.sent ||
            notification.channels.push.sent;

        notification.status = hasSuccessfulChannel ? "sent" : "failed";
        await notification.save();
    } catch (error) {
        console.error("Error sending notification channels:", error);
        notification.status = "failed";
        await notification.save();
    }
};

// Webhook endpoint for appointment events
app.post("/notifications/webhook", async (req, res) => {
    try {
        const { eventType, appointmentData } = req.body;

        if (!eventType || !appointmentData) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const webhookSecret = req.headers["x-webhook-secret"];
        if (!webhookSecret || webhookSecret !== process.env.WEBHOOK_SECRET) {
            return res
                .status(401)
                .json({ message: "Unauthorized webhook call" });
        }

        await createNotification(eventType, appointmentData);
        res.status(201).json({ message: "Notification created successfully" });
    } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Get notification preferences
app.get("/notifications/preferences", authenticateToken, async (req, res) => {
    try {
        const userType = req.user.roles[0];
        let preferences = await NotificationPreference.findOne({
            userId: req.user.id,
        });

        if (!preferences) {
            preferences = new NotificationPreference({
                userId: req.user.id,
                role: userType === "admin" ? "doctor" : userType,
            });
            await preferences.save();
        }

        res.json(preferences);
    } catch (error) {
        console.error("Error fetching preferences:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Update notification preferences
app.put("/notifications/preferences", authenticateToken, async (req, res) => {
    try {
        const userType = req.user.roles[0];
        const { email, sms, voice, voiceType, push, language, doNotDisturb } =
            req.body;

        let preferences = await NotificationPreference.findOne({
            userId: req.user.id,
        });

        if (!preferences) {
            preferences = new NotificationPreference({
                userId: req.user.id,
                role: userType === "admin" ? "doctor" : userType,
            });
        }

        // Update preferences
        if (email !== undefined) preferences.email = email;
        if (sms !== undefined) preferences.sms = sms;
        if (voice !== undefined) preferences.voice = voice;
        if (voiceType !== undefined) preferences.voiceType = voiceType;
        if (push !== undefined) preferences.push = push;
        if (language !== undefined) preferences.language = language;
        if (doNotDisturb !== undefined) preferences.doNotDisturb = doNotDisturb;

        preferences.updatedAt = new Date();
        await preferences.save();

        res.json({
            message: "Preferences updated successfully",
            preferences,
        });
    } catch (error) {
        console.error("Error updating preferences:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Get unread notifications for current user
app.get("/notifications", authenticateToken, async (req, res) => {
    try {
        const userType = req.user.roles[0];

        const notifications = await Notification.find({
            userId: req.user.id,
            userType,
            status: { $ne: "read" },
        }).sort({ createdAt: -1 });

        res.json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Mark notification as read
app.put("/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        if (notification.userId !== req.user.id) {
            return res.status(403).json({
                message:
                    "You don't have permission to update this notification",
            });
        }

        notification.status = "read";
        notification.readAt = new Date();
        await notification.save();

        res.json({
            message: "Notification marked as read",
            notification,
        });
    } catch (error) {
        console.error("Error updating notification:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Mark all notifications as read
app.put("/notifications/read-all", authenticateToken, async (req, res) => {
    try {
        const userType = req.user.roles[0];

        await Notification.updateMany(
            {
                userId: req.user.id,
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

        res.json({
            message: "All notifications marked as read",
        });
    } catch (error) {
        console.error("Error updating notifications:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Send pending notifications (worker function)
const sendPendingNotifications = async () => {
    try {
        const pendingNotifications = await Notification.find({
            status: "pending",
        });

        for (const notification of pendingNotifications) {
            await sendNotificationChannels(notification);
        }
    } catch (error) {
        console.error("Error sending pending notifications:", error);
    }
};

// Schedule appointment reminders (worker function)
const scheduleAppointmentReminders = async () => {
    try {
        const serviceToken = await getServiceToken();
        if (!serviceToken) {
            console.error(
                "Failed to get service token for scheduling reminders"
            );
            return;
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(23, 59, 59, 999);

        const response = await axios.get(
            `${APPOINTMENT_SERVICE_URL}/appointments`,
            {
                headers: {
                    Authorization: `Bearer ${serviceToken}`,
                },
                params: {
                    date: tomorrow.toISOString().split("T")[0],
                    status: ["confirmed", "scheduled"],
                },
            }
        );

        const appointments = response.data;

        for (const appointment of appointments) {
            const existingReminder = await Notification.findOne({
                appointmentId: appointment._id,
                type: "appointment_reminder",
            });

            if (!existingReminder) {
                await createNotification("appointment_reminder", appointment);
            }
        }
    } catch (error) {
        console.error("Error scheduling appointment reminders:", error);
    }
};

// Twilio webhook for handling voice call status
app.post(
    "/notifications/twilio/voice-status",
    express.raw({ type: "application/x-www-form-urlencoded" }),
    async (req, res) => {
        try {
            const params = new URLSearchParams(req.body.toString());
            const callSid = params.get("CallSid");
            const callStatus = params.get("CallStatus");

            // Update notification with call status
            await Notification.updateOne(
                { "channels.voice.twilioSid": callSid },
                {
                    $set: {
                        "channels.voice.status":
                            callStatus === "completed" ? "sent" : "failed",
                    },
                }
            );

            res.status(200).send("OK");
        } catch (error) {
            console.error("Error handling voice status webhook:", error);
            res.status(500).send("Error");
        }
    }
);

// Twilio webhook for handling SMS status
app.post(
    "/notifications/twilio/sms-status",
    express.raw({ type: "application/x-www-form-urlencoded" }),
    async (req, res) => {
        try {
            const params = new URLSearchParams(req.body.toString());
            const messageSid = params.get("MessageSid");
            const messageStatus = params.get("MessageStatus");

            // Update notification with SMS status
            await Notification.updateOne(
                { "channels.sms.twilioSid": messageSid },
                {
                    $set: {
                        "channels.sms.status": ["delivered", "sent"].includes(
                            messageStatus
                        )
                            ? "sent"
                            : "failed",
                    },
                }
            );

            res.status(200).send("OK");
        } catch (error) {
            console.error("Error handling SMS status webhook:", error);
            res.status(500).send("Error");
        }
    }
);

// Run scheduled tasks
// Send notifications every 2 minutes
cron.schedule("*/2 * * * *", sendPendingNotifications);

// Schedule reminders at 8 AM daily
cron.schedule("0 8 * * *", scheduleAppointmentReminders);

app.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});
