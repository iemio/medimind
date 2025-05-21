// src/controllers/patient.controller.ts
import { Request, Response, NextFunction } from "express";
import { patientService } from "../services/patient.service";
import { RequestWithUser } from "../models/types";
import { AppError, ErrorType } from "../utils/errorHandler";
import { logger } from "../utils/logger";

export class PatientController {
    /**
     * Create a new patient profile
     */
    public async createPatient(
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
            const patient = await patientService.createPatient(
                req.user.id,
                req.body,
                token
            );

            res.status(201).json({
                status: "success",
                data: patient,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get the current patient profile
     */
    public async getMyProfile(
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

            const patient = await patientService.getPatientByUserId(
                req.user.id
            );

            res.status(200).json({
                status: "success",
                data: patient,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update the current patient profile
     */
    public async updateMyProfile(
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

            const patient = await patientService.updatePatient(
                req.user.id,
                req.body
            );

            res.status(200).json({
                status: "success",
                data: patient,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get a patient by ID
     */
    public async getPatientById(
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

            const patientId = req.params.id;

            // Only doctors or the patient themselves can access patient records
            const patient = await patientService.getPatientById(patientId);

            // Check authorization
            if (
                !req.user.roles.includes("doctor") &&
                patient.userId !== req.user.id
            ) {
                logger.warn("Unauthorized access attempt to patient record", {
                    userId: req.user.id,
                    patientId,
                });
                throw new AppError(
                    "Access denied. You can only view your own records.",
                    ErrorType.AUTHORIZATION_ERROR,
                    403
                );
            }

            res.status(200).json({
                status: "success",
                data: patient,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const patientController = new PatientController();
