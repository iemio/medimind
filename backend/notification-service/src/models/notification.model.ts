import mongoose, { Document, Schema } from "mongoose";
import {
    NotificationChannels,
    NotificationType,
    UserType,
    NotificationStatus,
} from "../schemas/notification.schema";

export interface INotification extends Document {
    userId: string;
    userType: UserType;
    appointmentId: string;
    type: NotificationType;
    message: string;
    status: NotificationStatus;
    channels: NotificationChannels;
    createdAt: Date;
    readAt?: Date;
}

const channelStatusSchema = new Schema(
    {
        sent: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ["pending", "sent", "failed"],
            default: "pending",
        },
        sentAt: Date,
        error: String,
    },
    { _id: false }
);

const smsChannelSchema = new Schema(
    {
        ...channelStatusSchema.obj,
        twilioSid: String,
    },
    { _id: false }
);

const voiceChannelSchema = new Schema(
    {
        ...channelStatusSchema.obj,
        twilioSid: String,
    },
    { _id: false }
);

const notificationSchema = new Schema<INotification>(
    {
        userId: {
            type: String,
            required: true,
        },
        userType: {
            type: String,
            enum: ["patient", "doctor", "admin"],
            required: true,
        },
        appointmentId: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: [
                "appointment_requested",
                "appointment_scheduled",
                "appointment_confirmed",
                "appointment_cancelled",
                "appointment_completed",
                "appointment_reminder",
                "appointment_rescheduled",
            ],
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "sent", "failed", "read"],
            default: "pending",
        },
        channels: {
            email: channelStatusSchema,
            sms: smsChannelSchema,
            voice: voiceChannelSchema,
            push: channelStatusSchema,
        },
        readAt: Date,
    },
    {
        timestamps: true,
    }
);

export const Notification = mongoose.model<INotification>(
    "Notification",
    notificationSchema
);
