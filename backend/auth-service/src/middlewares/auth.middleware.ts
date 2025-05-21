import { Request, Response, NextFunction } from "express";
import { RequestWithUser } from "../models/types";
import { authService } from "../services/auth.service";
import { AppError, ErrorType } from "../utils/errorHandler";
import { logger } from "../utils/logger";

/**
 * Authentication middleware
 */
export const authenticate = (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new AppError(
                "No authorization header provided",
                ErrorType.AUTHENTICATION_ERROR,
                401
            );
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            throw new AppError(
                "No token provided",
                ErrorType.AUTHENTICATION_ERROR,
                401
            );
        }

        // Validate token
        const decoded = authService.validateToken(token);

        // Attach user to request
        req.user = decoded;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Role-based authorization middleware
 * @param roles The roles allowed to access the resource
 */
export const authorize = (roles: string[]) => {
    return (req: RequestWithUser, res: Response, next: NextFunction): void => {
        try {
            if (!req.user) {
                throw new AppError(
                    "User not authenticated",
                    ErrorType.AUTHENTICATION_ERROR,
                    401
                );
            }

            const hasRole = req.user.roles.some((role) => roles.includes(role));
            if (!hasRole) {
                logger.warn("Unauthorized access attempt", {
                    userId: req.user.id,
                    requiredRoles: roles,
                    userRoles: req.user.roles,
                });

                throw new AppError(
                    "Not authorized to access this resource",
                    ErrorType.AUTHORIZATION_ERROR,
                    403
                );
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};
