// src/config/database.ts
import mongoose from "mongoose";
import { env } from "./environment";
import { logger } from "../utils/logger";

export const connectDatabase = async (): Promise<void> => {
    try {
        await mongoose.connect(env.MONGO_URI);
        logger.info("MongoDB connected successfully");
    } catch (error) {
        logger.error("MongoDB connection error:", error);
        process.exit(1);
    }
};
