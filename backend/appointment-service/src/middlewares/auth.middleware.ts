// import { Request, Response, NextFunction } from "express";
// import { RequestWithUser } from "../models/types";
// import { AppError, ErrorType } from "../utils/errorHandler";
// import { logger } from "../utils/logger";
// import { authService } from "../services/auth.service";

// /**
//  * Authentication middleware
//  */
// export const authenticate = (
//     req: RequestWithUser,
//     res: Response,
//     next: NextFunction
// ): void => {
//     try {
//         const authHeader = req.headers.authorization;
//         if (!authHeader) {
//             throw new AppError(
//                 "No authorization header provided",
//                 ErrorType.AUTHENTICATION_ERROR,
//                 401
//             );
//         }

//         const token = authHeader.split(" ")[1];
//         if (!token) {
//             throw new AppError(
//                 "No token provided",
//                 ErrorType.AUTHENTICATION_ERROR,
//                 401
//             );
//         }

//         // Validate token
//         const decoded = authService.validateToken(token);

//         // Attach user to request
//         req.user = decoded;

//         next();
//     } catch (error) {
//         next(error);
//     }
// };

// /**
//  * Role-based authorization middleware
//  * @param roles The roles allowed to access the resource
//  */
// export const authorize = (roles: string[]) => {
//     return (req: RequestWithUser, res: Response, next: NextFunction): void => {
//         try {
//             if (!req.user) {
//                 throw new AppError(
//                     "User not authenticated",
//                     ErrorType.AUTHENTICATION_ERROR,
//                     401
//                 );
//             }

//             const hasRole = req.user.roles.some((role) => roles.includes(role));
//             if (!hasRole) {
//                 logger.warn("Unauthorized access attempt", {
//                     userId: req.user.id,
//                     requiredRoles: roles,
//                     userRoles: req.user.roles,
//                 });

//                 throw new AppError(
//                     "Not authorized to access this resource",
//                     ErrorType.AUTHORIZATION_ERROR,
//                     403
//                 );
//             }

//             next();
//         } catch (error) {
//             next(error);
//         }
//     };
// };

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
