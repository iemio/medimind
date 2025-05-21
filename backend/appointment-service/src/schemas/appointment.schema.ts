import { z } from "zod";

// Schema for creating a new appointment
export const createAppointmentSchema = z.object({
    doctorId: z.string().nonempty("Doctor ID is required"),
    appointmentDate: z
        .string()
        .or(z.date())
        .refine(
            (date) => new Date(date) > new Date(),
            "Appointment date must be in the future"
        ),
    timeSlot: z.string().nonempty("Time slot is required"),
    reason: z.string().nonempty("Reason is required"),
    notes: z.string().optional(),
});

// Schema for updating an appointment
export const updateAppointmentSchema = z.object({
    appointmentDate: z.string().or(z.date()).optional(),
    timeSlot: z.string().optional(),
    status: z
        .enum([
            "requested",
            "scheduled",
            "confirmed",
            "completed",
            "cancelled",
            "rescheduled",
        ])
        .optional(),
    notes: z.string().optional(),
});

// Schema for completing an appointment
export const completeAppointmentSchema = z.object({
    notes: z.string().optional(),
});

// Types derived from the schemas
export type CreateAppointmentData = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentData = z.infer<typeof updateAppointmentSchema>;
export type CompleteAppointmentData = z.infer<typeof completeAppointmentSchema>;
