import { Request, Response, NextFunction } from "express";
import { appointmentService } from "../services/appointment.service";
import { RequestWithUser } from "../models/types";
import { AppError, ErrorType } from "../utils/errorHandler";
import { logger } from "../utils/logger";

export class AppointmentController {
    /**
     * Request a new appointment (Patients only)
     */
    public async requestAppointment(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user?.id) {
                throw new AppError(
                    "User ID not found",
                    ErrorType.AUTHENTICATION_ERROR,
                    401
                );
            }

            const appointment =
                await appointmentService.createAppointmentRequest(
                    req.user.id,
                    req.body
                );

            res.status(201).json({
                status: "success",
                message: "Appointment request submitted successfully",
                data: appointment,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all appointments for logged-in patient
     */
    public async getPatientAppointments(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user?.id) {
                throw new AppError(
                    "User ID not found",
                    ErrorType.AUTHENTICATION_ERROR,
                    401
                );
            }

            const appointments =
                await appointmentService.getAppointmentsByPatient(req.user.id);

            res.status(200).json({
                status: "success",
                data: appointments,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all appointments for logged-in doctor
     */
    public async getDoctorAppointments(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user?.id) {
                throw new AppError(
                    "User ID not found",
                    ErrorType.AUTHENTICATION_ERROR,
                    401
                );
            }

            const appointments =
                await appointmentService.getAppointmentsByDoctor(req.user.id);

            res.status(200).json({
                status: "success",
                data: appointments,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all appointments (Admin only)
     */
    public async getAllAppointments(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { status, date, doctorId, patientId } = req.query;

            const appointments = await appointmentService.getAllAppointments({
                status: status as string,
                date: date as string,
                doctorId: doctorId as string,
                patientId: patientId as string,
            });

            res.status(200).json({
                status: "success",
                data: appointments,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get a specific appointment
     */
    public async getAppointmentById(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user) {
                throw new AppError(
                    "Unauthorized",
                    ErrorType.AUTHENTICATION_ERROR,
                    401
                );
            }

            const appointment = await appointmentService.getAppointmentById(
                req.params.id
            );

            // Check if user has permission to view
            if (
                req.user.id !== appointment.patientId &&
                req.user.id !== appointment.doctorId &&
                !req.user.roles.includes("admin")
            ) {
                logger.warn("Unauthorized access attempt to appointment", {
                    userId: req.user.id,
                    appointmentId: req.params.id,
                });
                throw new AppError(
                    "You don't have permission to view this appointment",
                    ErrorType.AUTHORIZATION_ERROR,
                    403
                );
            }

            res.status(200).json({
                status: "success",
                data: appointment,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Schedule or reschedule an appointment (Admin only)
     */
    public async scheduleAppointment(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user?.id) {
                throw new AppError(
                    "User ID not found",
                    ErrorType.AUTHENTICATION_ERROR,
                    401
                );
            }

            const token = req.headers.authorization?.split(" ")[1] || "";
            const appointment = await appointmentService.scheduleAppointment(
                req.params.id,
                req.user.id,
                req.body,
                token
            );

            const statusMessage =
                appointment.status === "rescheduled"
                    ? "Appointment rescheduled successfully"
                    : "Appointment scheduled successfully";

            res.status(200).json({
                status: "success",
                message: statusMessage,
                data: appointment,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel an appointment
     */
    public async cancelAppointment(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user?.id || !req.user?.roles) {
                throw new AppError(
                    "User ID not found",
                    ErrorType.AUTHENTICATION_ERROR,
                    401
                );
            }

            const appointment = await appointmentService.cancelAppointment(
                req.params.id,
                req.user.id,
                req.user.roles
            );

            res.status(200).json({
                status: "success",
                message: "Appointment cancelled successfully",
                data: appointment,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Complete an appointment (Doctor only)
     */
    public async completeAppointment(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user?.id) {
                throw new AppError(
                    "User ID not found",
                    ErrorType.AUTHENTICATION_ERROR,
                    401
                );
            }

            const appointment = await appointmentService.completeAppointment(
                req.params.id,
                req.user.id,
                req.body
            );

            res.status(200).json({
                status: "success",
                message: "Appointment marked as completed",
                data: appointment,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Confirm an appointment (Patient only)
     */
    public async confirmAppointment(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user?.id) {
                throw new AppError(
                    "User ID not found",
                    ErrorType.AUTHENTICATION_ERROR,
                    401
                );
            }

            const appointment = await appointmentService.confirmAppointment(
                req.params.id,
                req.user.id
            );

            res.status(200).json({
                status: "success",
                message: "Appointment confirmed successfully",
                data: appointment,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const appointmentController = new AppointmentController();
