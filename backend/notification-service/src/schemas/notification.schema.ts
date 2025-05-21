// src/schemas/notification.schema.ts
import { z } from "zod";

// Schema for notification channels
const channelStatusSchema = z.object({
    sent: z.boolean().default(false),
    status: z.enum(["pending", "sent", "failed"]).default("pending"),
    sentAt: z.date().optional(),
    error: z.string().optional(),
});

const smsChannelSchema = channelStatusSchema.extend({
    twilioSid: z.string().optional(),
});

const voiceChannelSchema = channelStatusSchema.extend({
    twilioSid: z.string().optional(),
});

const notificationChannelsSchema = z.object({
    email: channelStatusSchema.default({}),
    sms: smsChannelSchema.default({}),
    voice: voiceChannelSchema.default({}),
    push: channelStatusSchema.default({}),
});

// Schema for Do Not Disturb settings
const doNotDisturbSchema = z.object({
    enabled: z.boolean().default(false),
    from: z.string().default("22:00"),
    to: z.string().default("07:00"),
});

// Schema for notification preferences
export const notificationPreferenceSchema = z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    voice: z.boolean().default(false),
    voiceType: z
        .enum(["recorded", "text_to_speech", "both"])
        .default("text_to_speech"),
    push: z.boolean().default(true),
    language: z.string().default("en"),
    doNotDisturb: doNotDisturbSchema.default({}),
});

// Schema for updating notification preferences (partial update)
export const updatePreferenceSchema = notificationPreferenceSchema.partial();

// Schema for creating notifications
export const createNotificationSchema = z.object({
    eventType: z.enum([
        "appointment_requested",
        "appointment_scheduled",
        "appointment_confirmed",
        "appointment_cancelled",
        "appointment_completed",
        "appointment_reminder",
        "appointment_rescheduled",
    ]),
    appointmentData: z.any(), // Can be appointment object or ID string
});

// Schema for webhook payload
export const webhookSchema = z.object({
    eventType: z.string(),
    appointmentData: z.any(),
});

// Types derived from schemas
export type NotificationChannels = z.infer<typeof notificationChannelsSchema>;
export type DoNotDisturb = z.infer<typeof doNotDisturbSchema>;
export type NotificationPreferenceData = z.infer<
    typeof notificationPreferenceSchema
>;
export type CreateNotificationData = z.infer<typeof createNotificationSchema>;
export type WebhookData = z.infer<typeof webhookSchema>;

export type NotificationType =
    | "appointment_requested"
    | "appointment_scheduled"
    | "appointment_confirmed"
    | "appointment_cancelled"
    | "appointment_completed"
    | "appointment_reminder"
    | "appointment_rescheduled";

export type UserType = "patient" | "doctor" | "admin";
export type NotificationStatus = "pending" | "sent" | "failed" | "read";
