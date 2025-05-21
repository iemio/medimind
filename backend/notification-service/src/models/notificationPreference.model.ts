import mongoose, { Document, Schema } from "mongoose";
import { DoNotDisturb } from "../schemas/notification.schema";

export interface INotificationPreference extends Document {
    userId: string;
    role: "patient" | "doctor";
    email: boolean;
    sms: boolean;
    voice: boolean;
    voiceType: "recorded" | "text_to_speech" | "both";
    push: boolean;
    language: string;
    doNotDisturb: DoNotDisturb;
    updatedAt: Date;
}

const notificationPreferenceSchema = new Schema<INotificationPreference>(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
        },
        role: {
            type: String,
            enum: ["patient", "doctor"],
            required: true,
        },
        email: {
            type: Boolean,
            default: true,
        },
        sms: {
            type: Boolean,
            default: false,
        },
        voice: {
            type: Boolean,
            default: false,
        },
        voiceType: {
            type: String,
            enum: ["recorded", "text_to_speech", "both"],
            default: "text_to_speech",
        },
        push: {
            type: Boolean,
            default: true,
        },
        language: {
            type: String,
            default: "en",
        },
        doNotDisturb: {
            enabled: {
                type: Boolean,
                default: false,
            },
            from: {
                type: String,
                default: "22:00",
            },
            to: {
                type: String,
                default: "07:00",
            },
        },
    },
    {
        timestamps: true,
    }
);

export const NotificationPreference = mongoose.model<INotificationPreference>(
    "NotificationPreference",
    notificationPreferenceSchema
);
