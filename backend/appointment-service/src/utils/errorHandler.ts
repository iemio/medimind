// src/utils/errorHandler.ts
import { ZodError } from "zod";
import { logger } from "./logger";

export enum ErrorType {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
    NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
    CONFLICT_ERROR = "CONFLICT_ERROR",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

export class AppError extends Error {
    public readonly type: ErrorType;
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        type: ErrorType = ErrorType.INTERNAL_SERVER_ERROR,
        statusCode: number = 500,
        isOperational: boolean = true
    ) {
        super(message);
        this.type = type;
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Capturing the stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}

export const handleError = (err: Error): AppError => {
    logger.error(err.message, { stack: err.stack });

    if (err instanceof AppError) {
        return err;
    }

    if (err instanceof ZodError) {
        const message = `Validation error: ${err.errors
            .map((e) => `${e.path.join(".")} - ${e.message}`)
            .join(", ")}`;
        return new AppError(message, ErrorType.VALIDATION_ERROR, 400);
    }

    if (err instanceof mongoose.Error.ValidationError) {
        const message = Object.values(err.errors)
            .map((e) => e.message)
            .join(", ");
        return new AppError(
            `Validation error: ${message}`,
            ErrorType.VALIDATION_ERROR,
            400
        );
    }

    if (err instanceof mongoose.Error.CastError) {
        return new AppError(
            `Invalid ${err.path}: ${err.value}`,
            ErrorType.VALIDATION_ERROR,
            400
        );
    }

    return new AppError(err.message || "Internal Server Error");
};

// This is just a helper import from mongoose to avoid TS errors in the error handler
import mongoose from "mongoose";
