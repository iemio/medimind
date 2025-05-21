import mongoose, { Document, Schema } from "mongoose";

export interface IAppointment extends Document {
    patientId: string;
    doctorId: string;
    appointmentDate: Date;
    timeSlot: string;
    status:
        | "requested"
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "rescheduled";
    reason: string;
    notes?: string;
    createdBy: string;
    updatedBy?: string;
    createdAt: Date;
    updatedAt?: Date;
}

const appointmentSchema = new Schema<IAppointment>(
    {
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
            required: true,
        },
        updatedBy: {
            type: String,
        },
        updatedAt: {
            type: Date,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // Only set createdAt automatically
    }
);

export const Appointment = mongoose.model<IAppointment>(
    "Appointment",
    appointmentSchema
);
