// src/services/patient.service.ts
import { Patient, IPatient } from "../models/patient.model";
import { PatientData } from "../schemas/patient.schema";
import { authService } from "./auth.service";
import { AppError, ErrorType } from "../utils/errorHandler";
import { logger } from "../utils/logger";

export class PatientService {
    /**
     * Create a new patient profile
     * @param userId The user ID
     * @param patientData The patient data
     * @param token The auth token
     */
    public async createPatient(
        userId: string,
        patientData: PatientData,
        token: string
    ): Promise<IPatient> {
        logger.debug("Creating patient profile", { userId });

        // Check if patient profile already exists
        const existingPatient = await Patient.findOne({ userId });
        if (existingPatient) {
            throw new AppError(
                "Patient profile already exists",
                ErrorType.CONFLICT_ERROR,
                409
            );
        }

        // Update user role to include patient if it doesn't already
        try {
            await authService.updateUserRoles(userId, ["patient"], token);
        } catch (error) {
            logger.error("Error updating user role:", error);
            throw new AppError(
                "Error updating user role",
                ErrorType.INTERNAL_SERVER_ERROR,
                500
            );
        }

        // Create patient profile
        const patient = new Patient({
            userId,
            ...patientData,
        });

        await patient.save();
        return patient;
    }

    /**
     * Get a patient by user ID
     * @param userId The user ID
     */
    public async getPatientByUserId(userId: string): Promise<IPatient> {
        logger.debug("Getting patient by user ID", { userId });

        const patient = await Patient.findOne({ userId });
        if (!patient) {
            throw new AppError(
                "Patient profile not found",
                ErrorType.NOT_FOUND_ERROR,
                404
            );
        }

        return patient;
    }

    /**
     * Get a patient by ID
     * @param patientId The patient ID
     */
    public async getPatientById(patientId: string): Promise<IPatient> {
        logger.debug("Getting patient by ID", { patientId });

        const patient = await Patient.findById(patientId);
        if (!patient) {
            throw new AppError(
                "Patient not found",
                ErrorType.NOT_FOUND_ERROR,
                404
            );
        }

        return patient;
    }

    /**
     * Update a patient profile
     * @param userId The user ID
     * @param patientData The patient data
     */
    public async updatePatient(
        userId: string,
        patientData: Partial<PatientData>
    ): Promise<IPatient> {
        logger.debug("Updating patient profile", { userId });

        const patient = await Patient.findOneAndUpdate(
            { userId },
            patientData,
            { new: true }
        );

        if (!patient) {
            throw new AppError(
                "Patient profile not found",
                ErrorType.NOT_FOUND_ERROR,
                404
            );
        }

        return patient;
    }
}

export const patientService = new PatientService();
