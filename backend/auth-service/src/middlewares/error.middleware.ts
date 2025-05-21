// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { AppError, handleError, ErrorType } from "../utils/errorHandler";
import { logger } from "../utils/logger";
import { env } from "../config/environment";

/**
 * Process validation errors from request body
 */
export const validateRequest = (schema: any) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const validatedData = schema.parse(req.body);
            // Replace the request body with the validated data
            req.body = validatedData;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.errors.map((err) => ({
                    path: err.path.join("."),
                    message: err.message,
                }));

                res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: formattedErrors,
                });
            } else {
                next(error);
            }
        }
    };
};

/**
 * Global error handler
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
): void => {
    let appError: AppError;

    // Parse error to AppError format
    if (err instanceof AppError) {
        appError = err;
    } else if (err instanceof ZodError) {
        const formattedErrors = err.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ");
        appError = new AppError(
            `Validation error: ${formattedErrors}`,
            ErrorType.VALIDATION_ERROR,
            400
        );
    } else if (err instanceof mongoose.Error.ValidationError) {
        const formattedErrors = Object.values(err.errors)
            .map((e) => e.message)
            .join(", ");
        appError = new AppError(
            `Validation error: ${formattedErrors}`,
            ErrorType.VALIDATION_ERROR,
            400
        );
    } else if (err instanceof mongoose.Error.CastError) {
        appError = new AppError(
            `Invalid ${err.path}: ${err.value}`,
            ErrorType.VALIDATION_ERROR,
            400
        );
    } else {
        appError = new AppError(err.message || "Internal Server Error");
    }

    logger.error(`${appError.type}: ${appError.message}`, {
        path: req.path,
        method: req.method,
        statusCode: appError.statusCode,
        stack: env.NODE_ENV === "development" ? appError.stack : undefined,
    });

    // Send error response
    res.status(appError.statusCode).json({
        status: "error",
        type: appError.type,
        message: appError.message,
        ...(env.NODE_ENV === "development" && { stack: appError.stack }),
    });
};

/**
 * Catch 404 errors
 */
export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const error = new AppError(
        `Not Found - ${req.originalUrl}`,
        ErrorType.NOT_FOUND_ERROR,
        404
    );
    next(error);
};
