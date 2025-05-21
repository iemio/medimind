// src/schemas/patient.schema.ts
import { z } from "zod";

// Schema for surgery
const surgerySchema = z.object({
    name: z.string(),
    date: z.string().or(z.date()),
    notes: z.string().optional(),
});

// Schema for emergency contact
const emergencyContactSchema = z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
});

// Schema for contact details
const contactDetailsSchema = z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    emergencyContact: emergencyContactSchema.optional(),
});

// Schema for medical history
const medicalHistorySchema = z.object({
    allergies: z.array(z.string()).optional().default([]),
    chronicConditions: z.array(z.string()).optional().default([]),
    currentMedications: z.array(z.string()).optional().default([]),
    pastSurgeries: z.array(surgerySchema).optional().default([]),
});

// Schema for insurance info
const insuranceInfoSchema = z.object({
    provider: z.string().optional(),
    policyNumber: z.string().optional(),
    expiryDate: z.string().or(z.date()).optional(),
});

// Schema for creating/updating patient
export const patientSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    dateOfBirth: z.string().or(z.date()),
    gender: z.enum(["Male", "Female", "Other"]),
    bloodGroup: z.string().optional(),
    contactDetails: contactDetailsSchema.optional().default({}),
    medicalHistory: medicalHistorySchema.optional().default({}),
    insuranceInfo: insuranceInfoSchema.optional().default({}),
});

// Types derived from the schemas
export type Surgery = z.infer<typeof surgerySchema>;
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type ContactDetails = z.infer<typeof contactDetailsSchema>;
export type MedicalHistory = z.infer<typeof medicalHistorySchema>;
export type InsuranceInfo = z.infer<typeof insuranceInfoSchema>;
export type PatientData = z.infer<typeof patientSchema>;
