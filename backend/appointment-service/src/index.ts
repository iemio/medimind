// appointment-service/index.js
import express from "express";
import mongoose from "mongoose";
import axios from "axios";
import cors from "cors";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3004;
const AUTH_SERVICE_URL =
    process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const DOCTOR_SERVICE_URL =
    process.env.DOCTOR_SERVICE_URL || "http://localhost:3002";
const PATIENT_SERVICE_URL =
    process.env.PATIENT_SERVICE_URL || "http://localhost:3003";

const NOTIFICATION_SERVICE_URL =
    process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3005";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "your-webhook-secret"; // Should match in notification service

app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI!)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log(err));

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
    patientId: {
        type: String,
        required: true,
    },
    doctorId: {
        type: String,
        required: true,
    },
    appointmentDate: {
        type: Date,
        required: true,
    },
    timeSlot: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: [
            "requested",
            "scheduled",
            "confirmed",
            "completed",
            "cancelled",
            "rescheduled",
        ],
        default: "requested",
    },
    reason: {
        type: String,
        required: true,
    },
    notes: {
        type: String,
    },
    createdBy: {
        type: String,
        required: true, // User ID who created the appointment
    },
    updatedBy: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
    },
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

// Add this helper function to send notifications
const sendNotification = async (eventType, appointmentId) => {
    try {
        await axios.post(
            `${NOTIFICATION_SERVICE_URL}/notifications/webhook`,
            {
                eventType,
                appointmentData: appointmentId,
            },
            {
                headers: {
                    "x-webhook-secret": WEBHOOK_SECRET,
                },
            }
        );
    } catch (error) {
        console.error("Error sending notification webhook:", error);
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

// Check if user has patient role
const isPatientRole = (req, res, next) => {
    if (!req.user.roles.includes("patient")) {
        return res
            .status(403)
            .json({ message: "Access denied. Patient role required." });
    }
    next();
};

// Check if user has doctor role
const isDoctorRole = (req, res, next) => {
    if (!req.user.roles.includes("doctor")) {
        return res
            .status(403)
            .json({ message: "Access denied. Doctor role required." });
    }
    next();
};

// Check if user has admin role
const isAdminRole = (req, res, next) => {
    if (!req.user.roles.includes("admin")) {
        return res
            .status(403)
            .json({ message: "Access denied. Admin role required." });
    }
    next();
};

// Helper function to check doctor availability
const checkDoctorAvailability = async (
    doctorId,
    appointmentDate,
    timeSlot,
    token
) => {
    try {
        // First get the doctor details to check availability
        const doctorResponse = await axios.get(
            `${DOCTOR_SERVICE_URL}/doctors/${doctorId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const doctor = doctorResponse.data;
        const dayOfWeek = new Date(appointmentDate)
            .toLocaleDateString("en-US", { weekday: "long" })
            .toLowerCase();

        // Check if doctor has availability for this day and timeslot
        if (
            !doctor.availability ||
            !doctor.availability[dayOfWeek] ||
            !doctor.availability[dayOfWeek].includes(timeSlot)
        ) {
            return {
                available: false,
                message: "Doctor is not available for this time slot",
            };
        }

        // Check if there's any existing appointment for this doctor at the same time
        const existingAppointment = await Appointment.findOne({
            doctorId,
            appointmentDate: {
                $gte: new Date(new Date(appointmentDate).setHours(0, 0, 0)),
                $lt: new Date(new Date(appointmentDate).setHours(23, 59, 59)),
            },
            timeSlot,
            status: { $in: ["scheduled", "confirmed"] },
        });

        if (existingAppointment) {
            return {
                available: false,
                message: "This time slot is already booked",
            };
        }

        return { available: true };
    } catch (error) {
        console.error("Error checking doctor availability:", error);
        return {
            available: false,
            message: "Error checking doctor availability",
        };
    }
};

// Request a new appointment (Patients can request)
app.post(
    "/appointments/request",
    authenticateToken,
    isPatientRole,
    async (req, res) => {
        try {
            const { doctorId, appointmentDate, timeSlot, reason, notes } =
                req.body;

            if (!doctorId || !appointmentDate || !timeSlot || !reason) {
                return res.status(400).json({
                    message: "Missing required fields",
                });
            }

            // Validate date is in the future
            if (new Date(appointmentDate) < new Date()) {
                return res.status(400).json({
                    message: "Appointment date must be in the future",
                });
            }

            // Create appointment request
            const appointment = new Appointment({
                patientId: req.user.id,
                doctorId,
                appointmentDate,
                timeSlot,
                status: "requested",
                reason,
                notes,
                createdBy: req.user.id,
            });

            await appointment.save();

            // Send notification webhook
            await sendNotification("appointment_requested", appointment._id);

            res.status(201).json({
                message: "Appointment request submitted successfully",
                appointment,
            });
        } catch (error) {
            console.error("Error creating appointment request:", error);
            res.status(500).json({ message: "Server Error" });
        }
    }
);

// Get all appointments for logged-in patient
app.get(
    "/appointments/patient",
    authenticateToken,
    isPatientRole,
    async (req, res) => {
        try {
            const appointments = await Appointment.find({
                patientId: req.user.id,
            }).sort({ appointmentDate: 1 });

            res.json(appointments);
        } catch (error) {
            console.error("Error fetching patient appointments:", error);
            res.status(500).json({ message: "Server Error" });
        }
    }
);

// Get all appointments for logged-in doctor
app.get(
    "/appointments/doctor",
    authenticateToken,
    isDoctorRole,
    async (req, res) => {
        try {
            const appointments = await Appointment.find({
                doctorId: req.user.id,
            }).sort({ appointmentDate: 1 });

            res.json(appointments);
        } catch (error) {
            console.error("Error fetching doctor appointments:", error);
            res.status(500).json({ message: "Server Error" });
        }
    }
);

// Schedule or reschedule an appointment (Admin only)
app.put(
    "/appointments/:id/schedule",
    authenticateToken,
    isAdminRole,
    async (req, res) => {
        try {
            const { appointmentDate, timeSlot, status, notes } = req.body;

            if (!appointmentDate || !timeSlot || !status) {
                return res
                    .status(400)
                    .json({ message: "Missing required fields" });
            }

            const appointment = await Appointment.findById(req.params.id);

            if (!appointment) {
                return res
                    .status(404)
                    .json({ message: "Appointment not found" });
            }

            // Check doctor availability for new timeslot
            const token = req.headers.authorization?.split(" ")[1];
            const availabilityCheck = await checkDoctorAvailability(
                appointment.doctorId,
                appointmentDate,
                timeSlot,
                token
            );

            if (!availabilityCheck.available) {
                return res
                    .status(400)
                    .json({ message: availabilityCheck.message });
            }

            // Update appointment
            appointment.appointmentDate = appointmentDate;
            appointment.timeSlot = timeSlot;
            appointment.status = status;
            if (notes) appointment.notes = notes;
            appointment.updatedBy = req.user.id;
            appointment.updatedAt = new Date();

            await appointment.save();

            // Send notification webhook
            const notificationType =
                status === "rescheduled"
                    ? "appointment_rescheduled"
                    : "appointment_scheduled";
            await sendNotification(notificationType, appointment._id);

            res.json({
                message: `Appointment ${
                    status === "rescheduled" ? "rescheduled" : "scheduled"
                } successfully`,
                appointment,
            });
        } catch (error) {
            console.error("Error scheduling appointment:", error);
            res.status(500).json({ message: "Server Error" });
        }
    }
);

// Cancel an appointment
app.put("/appointments/:id/cancel", authenticateToken, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        // Check if user has permission to cancel
        if (
            req.user.id !== appointment.patientId &&
            req.user.id !== appointment.doctorId &&
            !req.user.roles.includes("admin")
        ) {
            return res.status(403).json({
                message: "You don't have permission to cancel this appointment",
            });
        }

        // Update appointment
        appointment.status = "cancelled";
        appointment.updatedBy = req.user.id;
        appointment.updatedAt = new Date();
        appointment.notes = appointment.notes
            ? `${appointment.notes}\nCancelled by ${req.user.roles.join(", ")}`
            : `Cancelled by ${req.user.roles.join(", ")}`;

        await appointment.save();

        // Send notification webhook
        await sendNotification("appointment_cancelled", appointment._id);

        res.json({
            message: "Appointment cancelled successfully",
            appointment,
        });
    } catch (error) {
        console.error("Error cancelling appointment:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Get all appointments (Admin only)
app.get("/appointments", authenticateToken, isAdminRole, async (req, res) => {
    try {
        const { status, date, doctorId, patientId } = req.query;
        const query = {};

        // Apply filters if provided
        if (status) query.status = status;
        if (doctorId) query.doctorId = doctorId;
        if (patientId) query.patientId = patientId;

        // Date filter
        if (date) {
            const filterDate = new Date(date);
            query.appointmentDate = {
                $gte: new Date(filterDate.setHours(0, 0, 0)),
                $lt: new Date(filterDate.setHours(23, 59, 59)),
            };
        }

        const appointments = await Appointment.find(query).sort({
            appointmentDate: 1,
        });

        res.json(appointments);
    } catch (error) {
        console.error("Error fetching appointments:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Get a specific appointment
app.get("/appointments/:id", authenticateToken, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        // Check if user has permission to view
        if (
            req.user.id !== appointment.patientId &&
            req.user.id !== appointment.doctorId &&
            !req.user.roles.includes("admin")
        ) {
            return res.status(403).json({
                message: "You don't have permission to view this appointment",
            });
        }

        res.json(appointment);
    } catch (error) {
        console.error("Error fetching appointment:", error);
        if (error.kind === "ObjectId") {
            return res.status(404).json({ message: "Appointment not found" });
        }
        res.status(500).json({ message: "Server Error" });
    }
});

// Mark appointment as completed (Doctor only)
app.put(
    "/appointments/:id/complete",
    authenticateToken,
    isDoctorRole,
    async (req, res) => {
        try {
            const appointment = await Appointment.findById(req.params.id);

            if (!appointment) {
                return res
                    .status(404)
                    .json({ message: "Appointment not found" });
            }

            // Check if user is the doctor for this appointment
            if (req.user.id !== appointment.doctorId) {
                return res.status(403).json({
                    message:
                        "You don't have permission to complete this appointment",
                });
            }

            // Update appointment
            appointment.status = "completed";
            appointment.updatedBy = req.user.id;
            appointment.updatedAt = new Date();
            if (req.body.notes) {
                appointment.notes = appointment.notes
                    ? `${appointment.notes}\n${req.body.notes}`
                    : req.body.notes;
            }

            await appointment.save();

            res.json({
                message: "Appointment marked as completed",
                appointment,
            });
        } catch (error) {
            console.error("Error completing appointment:", error);
            res.status(500).json({ message: "Server Error" });
        }
    }
);

// Confirm an appointment (Patient can confirm)
app.put(
    "/appointments/:id/confirm",
    authenticateToken,
    isPatientRole,
    async (req, res) => {
        try {
            const appointment = await Appointment.findById(req.params.id);

            if (!appointment) {
                return res
                    .status(404)
                    .json({ message: "Appointment not found" });
            }

            // Check if user is the patient for this appointment
            if (req.user.id !== appointment.patientId) {
                return res.status(403).json({
                    message:
                        "You don't have permission to confirm this appointment",
                });
            }

            // Check if appointment is in a confirmable state
            if (appointment.status !== "scheduled") {
                return res.status(400).json({
                    message: "Only scheduled appointments can be confirmed",
                });
            }

            // Update appointment
            appointment.status = "confirmed";
            appointment.updatedBy = req.user.id;
            appointment.updatedAt = new Date();

            await appointment.save();

            res.json({
                message: "Appointment confirmed successfully",
                appointment,
            });
        } catch (error) {
            console.error("Error confirming appointment:", error);
            res.status(500).json({ message: "Server Error" });
        }
    }
);

app.listen(PORT, () => {
    console.log(`Appointment Service running on port ${PORT}`);
});
