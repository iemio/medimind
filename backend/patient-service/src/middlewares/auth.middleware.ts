// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { AppError, ErrorType } from "../utils/errorHandler";
import { RequestWithUser } from "../models/types";
import { logger } from "../utils/logger";

/**
 * Authentication middleware to validate the token and set the user in the request
 */
export const authenticateToken = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AppError(
                "No token, authorization denied",
                ErrorType.AUTHENTICATION_ERROR,
                401
            );
        }

        const token = authHeader.split(" ")[1];
        console.log(token);
        // Validate token with Auth Service
        const userData = await authService.validateToken(token);

        // Attach user data to request
        req.user = userData;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Authorization middleware to check if the user has the required role
 * @param role The required role
 */
export const hasRole = (role: string) => {
    return (req: RequestWithUser, res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(
                new AppError(
                    "Unauthorized - user not found in request",
                    ErrorType.AUTHENTICATION_ERROR,
                    401
                )
            );
            return;
        }
        if (!req.user.roles.includes(role)) {
            logger.warn(`Access denied. ${role} role required.`, {
                userId: req.user.id,
            });
            next(
                new AppError(
                    `Access denied. ${role} role required.`,
                    ErrorType.AUTHORIZATION_ERROR,
                    403
                )
            );
            return;
        }

        next();
    };
};
