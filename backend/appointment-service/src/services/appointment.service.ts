import axios from "axios";
import { Appointment, IAppointment } from "../models/appointment.model";
import {
    CreateAppointmentData,
    UpdateAppointmentData,
    CompleteAppointmentData,
} from "../schemas/appointment.schema";
import { AppError, ErrorType } from "../utils/errorHandler";
import { logger } from "../utils/logger";

export class AppointmentService {
    private DOCTOR_SERVICE_URL =
        process.env.DOCTOR_SERVICE_URL || "http://localhost:3002";
    private NOTIFICATION_SERVICE_URL =
        process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3005";
    private WEBHOOK_SECRET =
        process.env.WEBHOOK_SECRET || "your-webhook-secret";

    /**
     * Create a new appointment request
     * @param patientId The patient ID
     * @param appointmentData The appointment data
     * @returns The created appointment
     */
    public async createAppointmentRequest(
        patientId: string,
        appointmentData: CreateAppointmentData
    ): Promise<IAppointment> {
        logger.debug("Creating appointment request", { patientId });

        // Validate date is in the future
        const appointmentDate = new Date(appointmentData.appointmentDate);
        if (appointmentDate < new Date()) {
            throw new AppError(
                "Appointment date must be in the future",
                ErrorType.VALIDATION_ERROR,
                400
            );
        }

        // Create appointment
        const appointment = new Appointment({
            patientId,
            doctorId: appointmentData.doctorId,
            appointmentDate,
            timeSlot: appointmentData.timeSlot,
            status: "requested",
            reason: appointmentData.reason,
            notes: appointmentData.notes,
            createdBy: patientId,
        });

        await appointment.save();

        // Send notification
        await this.sendNotification(
            "appointment_requested",
            appointment._id!.toString()
        );

        return appointment;
    }

    /**
     * Get appointments by patient ID
     * @param patientId The patient ID
     * @returns The list of appointments
     */
    public async getAppointmentsByPatient(
        patientId: string
    ): Promise<IAppointment[]> {
        logger.debug("Getting appointments for patient", { patientId });

        return Appointment.find({ patientId }).sort({ appointmentDate: 1 });
    }

    /**
     * Get appointments by doctor ID
     * @param doctorId The doctor ID
     * @returns The list of appointments
     */
    public async getAppointmentsByDoctor(
        doctorId: string
    ): Promise<IAppointment[]> {
        logger.debug("Getting appointments for doctor", { doctorId });

        return Appointment.find({ doctorId }).sort({ appointmentDate: 1 });
    }

    /**
     * Get all appointments with optional filters
     * @param filters Optional filters for appointments
     * @returns The list of appointments
     */
    public async getAllAppointments(filters: {
        status?: string;
        date?: string;
        doctorId?: string;
        patientId?: string;
    }): Promise<IAppointment[]> {
        logger.debug("Getting all appointments with filters", filters);

        const query: any = {};

        // Apply filters if provided
        if (filters.status) query.status = filters.status;
        if (filters.doctorId) query.doctorId = filters.doctorId;
        if (filters.patientId) query.patientId = filters.patientId;

        // Date filter
        if (filters.date) {
            const filterDate = new Date(filters.date);
            query.appointmentDate = {
                $gte: new Date(filterDate.setHours(0, 0, 0)),
                $lt: new Date(filterDate.setHours(23, 59, 59)),
            };
        }

        return Appointment.find(query).sort({ appointmentDate: 1 });
    }

    /**
     * Get appointment by ID
     * @param appointmentId The appointment ID
     * @returns The appointment
     */
    public async getAppointmentById(
        appointmentId: string
    ): Promise<IAppointment> {
        logger.debug("Getting appointment by ID", { appointmentId });

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            throw new AppError(
                "Appointment not found",
                ErrorType.NOT_FOUND_ERROR,
                404
            );
        }

        return appointment;
    }

    /**
     * Schedule or reschedule an appointment
     * @param appointmentId The appointment ID
     * @param adminId The admin ID making the change
     * @param data The update data
     * @param token The authorization token
     * @returns The updated appointment
     */
    public async scheduleAppointment(
        appointmentId: string,
        adminId: string,
        data: UpdateAppointmentData,
        token: string
    ): Promise<IAppointment> {
        logger.debug("Scheduling/rescheduling appointment", { appointmentId });

        const appointment = await this.getAppointmentById(appointmentId);

        // Check doctor availability for new timeslot
        const availabilityCheck = await this.checkDoctorAvailability(
            appointment.doctorId,
            data.appointmentDate || appointment.appointmentDate,
            data.timeSlot || appointment.timeSlot,
            token,
            appointmentId // Exclude current appointment when checking availability
        );

        if (!availabilityCheck.available) {
            throw new AppError(
                availabilityCheck.message ||
                    "Doctor not available for this time slot",
                ErrorType.VALIDATION_ERROR,
                400
            );
        }

        // Update appointment
        appointment.appointmentDate = data.appointmentDate
            ? new Date(data.appointmentDate)
            : appointment.appointmentDate;
        appointment.timeSlot = data.timeSlot || appointment.timeSlot;
        appointment.status = data.status || "scheduled";
        if (data.notes) appointment.notes = data.notes;
        appointment.updatedBy = adminId;
        appointment.updatedAt = new Date();

        await appointment.save();

        // Send notification
        const notificationType =
            appointment.status === "rescheduled"
                ? "appointment_rescheduled"
                : "appointment_scheduled";
        await this.sendNotification(
            notificationType,
            appointment._id!.toString()
        );

        return appointment;
    }

    /**
     * Cancel an appointment
     * @param appointmentId The appointment ID
     * @param userId The user ID cancelling the appointment
     * @param userRoles The user's roles
     * @returns The cancelled appointment
     */
    public async cancelAppointment(
        appointmentId: string,
        userId: string,
        userRoles: string[]
    ): Promise<IAppointment> {
        logger.debug("Cancelling appointment", { appointmentId, userId });

        const appointment = await this.getAppointmentById(appointmentId);

        // Check if user has permission to cancel
        if (
            userId !== appointment.patientId &&
            userId !== appointment.doctorId &&
            !userRoles.includes("admin")
        ) {
            throw new AppError(
                "You don't have permission to cancel this appointment",
                ErrorType.AUTHORIZATION_ERROR,
                403
            );
        }

        // Update appointment
        appointment.status = "cancelled";
        appointment.updatedBy = userId;
        appointment.updatedAt = new Date();
        appointment.notes = appointment.notes
            ? `${appointment.notes}\nCancelled by ${userRoles.join(", ")}`
            : `Cancelled by ${userRoles.join(", ")}`;

        await appointment.save();

        // Send notification
        await this.sendNotification(
            "appointment_cancelled",
            appointment._id!.toString()
        );

        return appointment;
    }

    /**
     * Complete an appointment
     * @param appointmentId The appointment ID
     * @param doctorId The doctor ID
     * @param data The completion data
     * @returns The completed appointment
     */
    public async completeAppointment(
        appointmentId: string,
        doctorId: string,
        data: CompleteAppointmentData
    ): Promise<IAppointment> {
        logger.debug("Completing appointment", { appointmentId, doctorId });

        const appointment = await this.getAppointmentById(appointmentId);

        // Check if user is the doctor for this appointment
        if (doctorId !== appointment.doctorId) {
            throw new AppError(
                "You don't have permission to complete this appointment",
                ErrorType.AUTHORIZATION_ERROR,
                403
            );
        }

        // Update appointment
        appointment.status = "completed";
        appointment.updatedBy = doctorId;
        appointment.updatedAt = new Date();
        if (data.notes) {
            appointment.notes = appointment.notes
                ? `${appointment.notes}\n${data.notes}`
                : data.notes;
        }

        await appointment.save();

        // Send notification
        await this.sendNotification(
            "appointment_completed",
            appointment._id!.toString()
        );

        return appointment;
    }

    /**
     * Confirm an appointment
     * @param appointmentId The appointment ID
     * @param patientId The patient ID
     * @returns The confirmed appointment
     */
    public async confirmAppointment(
        appointmentId: string,
        patientId: string
    ): Promise<IAppointment> {
        logger.debug("Confirming appointment", { appointmentId, patientId });

        const appointment = await this.getAppointmentById(appointmentId);

        // Check if user is the patient for this appointment
        if (patientId !== appointment.patientId) {
            throw new AppError(
                "You don't have permission to confirm this appointment",
                ErrorType.AUTHORIZATION_ERROR,
                403
            );
        }

        // Check if appointment is in a confirmable state
        if (appointment.status !== "scheduled") {
            throw new AppError(
                "Only scheduled appointments can be confirmed",
                ErrorType.VALIDATION_ERROR,
                400
            );
        }

        // Update appointment
        appointment.status = "confirmed";
        appointment.updatedBy = patientId;
        appointment.updatedAt = new Date();

        await appointment.save();

        // Send notification
        await this.sendNotification(
            "appointment_confirmed",
            appointment._id!.toString()
        );

        return appointment;
    }

    /**
     * Check doctor availability for a time slot
     * @param doctorId The doctor ID
     * @param appointmentDate The appointment date
     * @param timeSlot The time slot
     * @param token The authorization token
     * @param excludeAppointmentId Optional ID to exclude from conflict check
     * @returns Availability check result
     */
    private async checkDoctorAvailability(
        doctorId: string,
        appointmentDate: Date | string,
        timeSlot: string,
        token: string,
        excludeAppointmentId?: string
    ): Promise<{ available: boolean; message?: string }> {
        try {
            // First get the doctor details to check availability
            const doctorResponse = await axios.get(
                `${this.DOCTOR_SERVICE_URL}/doctors/${doctorId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const doctor = doctorResponse.data;
            const date = new Date(appointmentDate);
            const dayOfWeek = date
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

            // Create a query to check for conflicts
            const conflictQuery: any = {
                doctorId,
                appointmentDate: {
                    $gte: new Date(new Date(date).setHours(0, 0, 0)),
                    $lt: new Date(new Date(date).setHours(23, 59, 59)),
                },
                timeSlot,
                status: { $in: ["scheduled", "confirmed"] },
            };

            // If excluding an appointment (e.g., when rescheduling), add it to the query
            if (excludeAppointmentId) {
                conflictQuery._id = { $ne: excludeAppointmentId };
            }

            // Check if there's any existing appointment for this doctor at the same time
            const existingAppointment = await Appointment.findOne(
                conflictQuery
            );

            if (existingAppointment) {
                return {
                    available: false,
                    message: "This time slot is already booked",
                };
            }

            return { available: true };
        } catch (error) {
            logger.error("Error checking doctor availability:", error);
            throw new AppError(
                "Error checking doctor availability",
                ErrorType.INTERNAL_SERVER_ERROR,
                500
            );
        }
    }

    /**
     * Send notification via webhook
     * @param eventType The event type
     * @param appointmentId The appointment ID
     */
    private async sendNotification(
        eventType: string,
        appointmentId: string
    ): Promise<void> {
        try {
            await axios.post(
                `${this.NOTIFICATION_SERVICE_URL}/notifications/webhook`,
                {
                    eventType,
                    appointmentData: appointmentId,
                },
                {
                    headers: {
                        "x-webhook-secret": this.WEBHOOK_SECRET,
                    },
                }
            );
            logger.debug("Notification sent successfully", {
                eventType,
                appointmentId,
            });
        } catch (error) {
            logger.error("Error sending notification webhook:", error);
            // Don't throw an error - notification failure shouldn't break the main flow
        }
    }
}

export const appointmentService = new AppointmentService();
