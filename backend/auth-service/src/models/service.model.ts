import mongoose, { Document, Schema } from "mongoose";

export interface IService extends Document {
    serviceId: string;
    serviceSecret: string;
    description?: string;
    createdAt: Date;
}

const serviceSchema = new Schema({
    serviceId: {
        type: String,
        required: true,
        unique: true,
    },
    serviceSecret: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export const Service = mongoose.model<IService>("Service", serviceSchema);
