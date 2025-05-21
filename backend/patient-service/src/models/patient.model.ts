// src/models/patient.model.ts
import mongoose, { Document, Schema } from "mongoose";
import {
    ContactDetails,
    MedicalHistory,
    InsuranceInfo,
} from "../schemas/patient.schema";

export interface IPatient extends Document {
    userId: string;
    fullName: string;
    dateOfBirth: Date;
    gender: "Male" | "Female" | "Other";
    bloodGroup?: string;
    contactDetails: ContactDetails;
    medicalHistory: MedicalHistory;
    insuranceInfo: InsuranceInfo;
    createdAt: Date;
    updatedAt: Date;
}

const patientSchema = new Schema<IPatient>(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
        },
        fullName: {
            type: String,
            required: true,
        },
        dateOfBirth: {
            type: Date,
            required: true,
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            required: true,
        },
        bloodGroup: {
            type: String,
        },
        contactDetails: {
            phone: String,
            email: String,
            address: String,
            emergencyContact: {
                name: String,
                relationship: String,
                phone: String,
            },
        },
        medicalHistory: {
            allergies: [String],
            chronicConditions: [String],
            currentMedications: [String],
            pastSurgeries: [
                {
                    name: String,
                    date: Date,
                    notes: String,
                },
            ],
        },
        insuranceInfo: {
            provider: String,
            policyNumber: String,
            expiryDate: Date,
        },
    },
    {
        timestamps: true,
    }
);

export const Patient = mongoose.model<IPatient>("Patient", patientSchema);
