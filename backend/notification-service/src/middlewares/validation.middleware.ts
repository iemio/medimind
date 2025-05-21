import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { AppError, ErrorType } from "../utils/errorHandler";
import { logger } from "../utils/logger";

/**
 * Middleware to validate request body against a Zod schema
 */
export const validateRequest = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            // Parse and validate the request body
            const validatedData = schema.parse(req.body);

            // Replace request body with validated data
            req.body = validatedData;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // Format Zod validation errors
                const formattedErrors = error.errors.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                    code: err.code,
                }));

                logger.warn("Request validation failed", {
                    errors: formattedErrors,
                    path: req.path,
                    method: req.method,
                });

                next(
                    new AppError(
                        "Validation failed",
                        ErrorType.VALIDATION_ERROR
                    )
                );
            } else {
                next(error);
            }
        }
    };
};

/**
 * Middleware to validate query parameters against a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            // Parse and validate the query parameters
            const validatedQuery = schema.parse(req.query);

            // Replace request query with validated data
            req.query = validatedQuery;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // Format Zod validation errors
                const formattedErrors = error.errors.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                    code: err.code,
                }));

                logger.warn("Query validation failed", {
                    errors: formattedErrors,
                    path: req.path,
                    method: req.method,
                });

                next(
                    new AppError(
                        "Query validation failed",
                        ErrorType.VALIDATION_ERROR
                    )
                );
            } else {
                next(error);
            }
        }
    };
};

/**
 * Middleware to validate request parameters against a Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            // Parse and validate the request parameters
            const validatedParams = schema.parse(req.params);

            // Replace request params with validated data
            req.params = validatedParams;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // Format Zod validation errors
                const formattedErrors = error.errors.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                    code: err.code,
                }));

                logger.warn("Parameter validation failed", {
                    errors: formattedErrors,
                    path: req.path,
                    method: req.method,
                });

                // next(
                //     new AppError(
                //         "Parameter validation failed",
                //         ErrorType.VALIDATION_ERROR,
                //         400,
                //         formattedErrors
                //     )
                // );
                next(
                    new AppError(
                        "Parameter validation failed",
                        ErrorType.VALIDATION_ERROR
                    )
                );
            } else {
                next(error);
            }
        }
    };
};

/**
 * Middleware to sanitize input data
 */
export const sanitizeInput = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Basic XSS protection by escaping HTML characters
    const sanitizeString = (str: string): string => {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#x27;")
            .replace(/\//g, "&#x2F;");
    };

    const sanitizeObject = (obj: any): any => {
        if (typeof obj === "string") {
            return sanitizeString(obj);
        } else if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        } else if (obj !== null && typeof obj === "object") {
            const sanitized: any = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    sanitized[key] = sanitizeObject(obj[key]);
                }
            }
            return sanitized;
        }
        return obj;
    };

    // Sanitize request body
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }

    next();
};
