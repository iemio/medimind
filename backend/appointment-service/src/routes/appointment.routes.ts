import { Router } from "express";
import { appointmentController } from "../controllers/appointment.controller";
import { authenticateToken, hasRole } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/error.middleware";
import {
    createAppointmentSchema,
    updateAppointmentSchema,
    completeAppointmentSchema,
} from "../schemas/appointment.schema";

const router = Router();

// Request a new appointment (Patients only)
router.post(
    "/request",
    authenticateToken,
    hasRole("patient"),
    validateRequest(createAppointmentSchema),
    appointmentController.requestAppointment
);

// Get all appointments for logged-in patient
router.get(
    "/patient",
    authenticateToken,
    hasRole("patient"),
    appointmentController.getPatientAppointments
);

// Get all appointments for logged-in doctor
router.get(
    "/doctor",
    authenticateToken,
    hasRole("doctor"),
    appointmentController.getDoctorAppointments
);

// Get all appointments (Admin only)
router.get(
    "/",
    authenticateToken,
    hasRole("admin"),
    appointmentController.getAllAppointments
);

// Get a specific appointment
router.get("/:id", authenticateToken, appointmentController.getAppointmentById);

// Schedule or reschedule an appointment (Admin only)
router.put(
    "/:id/schedule",
    authenticateToken,
    hasRole("admin"),
    validateRequest(updateAppointmentSchema),
    appointmentController.scheduleAppointment
);

// Cancel an appointment
router.put(
    "/:id/cancel",
    authenticateToken,
    appointmentController.cancelAppointment
);

// Complete an appointment (Doctor only)
router.put(
    "/:id/complete",
    authenticateToken,
    hasRole("doctor"),
    validateRequest(completeAppointmentSchema),
    appointmentController.completeAppointment
);

// Confirm an appointment (Patient only)
router.put(
    "/:id/confirm",
    authenticateToken,
    hasRole("patient"),
    appointmentController.confirmAppointment
);

export const appointmentRoutes = router;
