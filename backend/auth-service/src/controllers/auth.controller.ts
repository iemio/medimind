import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { RequestWithUser } from "../models/types";
import { AppError, ErrorType } from "../utils/errorHandler";
import { logger } from "../utils/logger";

export class AuthController {
    /**
     * Register a new user
     */
    public async registerUser(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const result = await authService.registerUser(req.body);

            res.status(201).json({
                status: "success",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Login a user
     */
    public async loginUser(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const result = await authService.loginUser(req.body);

            res.status(200).json({
                status: "success",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update user roles
     */
    public async updateUserRoles(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userId = req.params.id;
            const { roles } = req.body;

            const result = await authService.updateUserRoles(userId, roles);

            res.status(200).json({
                status: "success",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Validate token
     */
    public async validateToken(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
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

            const decoded = authService.validateToken(token);
            res.status(200).json(decoded);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get current user
     */
    public async getCurrentUser(
        req: RequestWithUser,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user?.id) {
                throw new AppError(
                    "User ID not found",
                    ErrorType.AUTHENTICATION_ERROR,
                    401
                );
            }

            const user = await authService.getUserById(req.user.id);

            res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Register a new service
     */
    public async registerService(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const result = await authService.registerService(req.body);

            res.status(201).json({
                status: "success",
                data: {
                    message: "Service registered successfully",
                    serviceId: result.serviceId,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Generate service token
     */
    public async generateServiceToken(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const result = await authService.generateServiceToken(req.body);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();
