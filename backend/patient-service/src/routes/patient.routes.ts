// src/routes/patient.routes.ts
import { Router } from "express";
import { patientController } from "../controllers/patient.controller";
import { authenticateToken, hasRole } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/error.middleware";
import { patientSchema } from "../schemas/patient.schema";

const router = Router();

/**
 * @route   POST /patients
 * @desc    Create a patient profile
 * @access  Private
 */
router.post(
    "/",
    authenticateToken,
    validateRequest(patientSchema),
    patientController.createPatient
);

/**
 * @route   GET /patients/me
 * @desc    Get current patient profile
 * @access  Private - Patient role
 */
router.get(
    "/me",
    authenticateToken,
    hasRole("patient"),
    patientController.getMyProfile
);

/**
 * @route   PUT /patients/me
 * @desc    Update current patient profile
 * @access  Private - Patient role
 */
router.put(
    "/me",
    authenticateToken,
    hasRole("patient"),
    validateRequest(patientSchema.partial()),
    patientController.updateMyProfile
);

/**
 * @route   GET /patients/:id
 * @desc    Get patient by ID
 * @access  Private - Doctor role or same patient
 */
router.get("/:id", authenticateToken, patientController.getPatientById);

export const patientRoutes = router;
