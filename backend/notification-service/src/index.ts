// notification-service/index.js (updated)
import express from "express";
import mongoose from "mongoose";
import axios from "axios";
import cors from "cors";
import "dotenv/config";
import nodemailer from "nodemailer";
import cron from "node-cron";

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
    emailSent: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    readAt: {
        type: Date,
    },
});

const Notification = mongoose.model("Notification", notificationSchema);

// Email configuration
const transporter = nodemailer.createTransport({
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

// Helper function to fetch user email by ID and type
const getUserEmail = async (userId, userType) => {
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

        return response.data.email;
    } catch (error) {
        console.error(`Error fetching ${userType} email:`, error);
        return null;
    }
};

// Helper function to send email notification
const sendEmailNotification = async (to, subject, text) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || "healthcare@example.com",
            to,
            subject,
            text,
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
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
                    doctorMessage = `New appointment scheduled with patient ID ${appointment.patientId} for ${date} at ${time}.`;
                    break;
                case "appointment_confirmed":
                    doctorMessage = `Appointment with patient ID ${appointment.patientId} for ${date} at ${time} has been confirmed by the patient.`;
                    break;
                case "appointment_cancelled":
                    doctorMessage = `Appointment with patient ID ${appointment.patientId} for ${date} at ${time} has been cancelled.`;
                    break;
                case "appointment_reminder":
                    doctorMessage = `Reminder: You have an appointment with patient ID ${appointment.patientId} tomorrow on ${date} at ${time}.`;
                    break;
                case "appointment_rescheduled":
                    doctorMessage = `Appointment with patient ID ${appointment.patientId} has been rescheduled to ${date} at ${time}.`;
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

// Webhook endpoint for appointment events
app.post("/notifications/webhook", async (req, res) => {
    try {
        const { eventType, appointmentData } = req.body;

        if (!eventType || !appointmentData) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // We'll authenticate webhook calls using a secret header instead of in the body
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

// Get unread notifications for current user
app.get("/notifications", authenticateToken, async (req, res) => {
    try {
        // Find user's role to determine userType
        const userType = req.user.roles[0]; // Assuming the first role is the primary one

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

        // Ensure user can only mark their own notifications as read
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
        // Find user's role to determine userType
        const userType = req.user.roles[0]; // Assuming the first role is the primary one

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

// Send pending email notifications (worker function)
const sendPendingEmailNotifications = async () => {
    try {
        // Find notifications that haven't been emailed yet
        const pendingNotifications = await Notification.find({
            emailSent: false,
            status: { $ne: "read" },
        });

        for (const notification of pendingNotifications) {
            // Get user email
            const userEmail = await getUserEmail(
                notification.userId,
                notification.userType
            );

            if (!userEmail) {
                continue;
            }

            // Determine email subject based on notification type
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

            // Send email
            const emailSent = await sendEmailNotification(
                userEmail,
                subject,
                notification.message
            );

            if (emailSent) {
                notification.emailSent = true;
                notification.status = "sent";
                await notification.save();
            }
        }
    } catch (error) {
        console.error("Error sending pending email notifications:", error);
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

        // Get tomorrow's date range
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(23, 59, 59, 999);

        // Get all confirmed and scheduled appointments for tomorrow
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

        // Create reminder notifications for each appointment
        for (const appointment of appointments) {
            // Check if reminder already sent
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

// Run scheduled tasks
// Send emails every 5 minutes
cron.schedule("*/5 * * * *", sendPendingEmailNotifications);

// Schedule reminders at 8 AM daily
cron.schedule("0 8 * * *", scheduleAppointmentReminders);

app.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});
