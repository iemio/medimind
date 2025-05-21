import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User, IUser } from "../models/user.model";
import { Service, IService } from "../models/service.model";
import {
    UserRegistrationData,
    UserLoginData,
    RoleUpdateData,
    ServiceRegistrationData,
    ServiceAuthData,
} from "../schemas/user.schema";
import { AppError, ErrorType } from "../utils/errorHandler";
import { logger } from "../utils/logger";
import { env } from "../config/environment";
import { UserPayload } from "../models/types";

export class AuthService {
    /**
     * Register a new user
     * @param userData The user registration data
     */
    public async registerUser(
        userData: UserRegistrationData
    ): Promise<{ user: any; token: string }> {
        logger.debug("Registering new user", { email: userData.email });

        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            throw new AppError(
                "User already exists",
                ErrorType.CONFLICT_ERROR,
                400
            );
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Create new user
        const user = new User({
            username: userData.username,
            email: userData.email,
            password: hashedPassword,
            roles: [userData.role || "patient"], // Default to patient if no role provided
        });

        await user.save();

        // Generate JWT
        const token = this.generateToken({
            id: user._id!.toString(),
            roles: user.roles,
            email: user.email,
        });

        // Return user data without password
        const userWithoutPassword = {
            id: user._id,
            username: user.username,
            email: user.email,
            roles: user.roles,
        };

        return { user: userWithoutPassword, token };
    }

    /**
     * Login a user
     * @param loginData The user login data
     */
    public async loginUser(
        loginData: UserLoginData
    ): Promise<{ user: any; token: string }> {
        logger.debug("Logging in user", { email: loginData.email });

        // Check if user exists
        const user = await User.findOne({ email: loginData.email });
        if (!user) {
            throw new AppError(
                "Invalid credentials",
                ErrorType.AUTHENTICATION_ERROR,
                400
            );
        }

        // Validate password
        const isMatch = await bcrypt.compare(loginData.password, user.password);
        if (!isMatch) {
            throw new AppError(
                "Invalid credentials",
                ErrorType.AUTHENTICATION_ERROR,
                400
            );
        }

        // Generate JWT
        const token = this.generateToken({
            id: user._id!.toString(),
            roles: user.roles,
            email: user.email,
        });

        // Return user data without password
        const userWithoutPassword = {
            id: user._id,
            username: user.username,
            email: user.email,
            roles: user.roles,
        };

        return { user: userWithoutPassword, token };
    }

    /**
     * Update user roles
     * @param userId The user ID
     * @param roles The roles to add
     * @param token The auth token (optional for service-to-service calls)
     */
    public async updateUserRoles(
        userId: string,
        roles: string[],
        token?: string
    ): Promise<{ user: any; token: string }> {
        logger.debug("Updating user roles", { userId, roles });

        // Verify token if provided (for service-to-service calls)
        if (token) {
            try {
                jwt.verify(token, env.JWT_SECRET);
            } catch (error) {
                throw new AppError(
                    "Invalid token",
                    ErrorType.AUTHENTICATION_ERROR,
                    401
                );
            }
        }

        // Find and update user with new roles
        const user = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { roles: { $each: roles } } }, // Add roles without duplicates
            { new: true }
        );

        if (!user) {
            throw new AppError(
                "User not found",
                ErrorType.NOT_FOUND_ERROR,
                404
            );
        }

        // Generate new JWT with updated roles
        const newToken = this.generateToken({
            id: user._id!.toString(),
            roles: user.roles,
            email: user.email,
        });

        // Return user data without password
        const userWithoutPassword = {
            id: user._id,
            username: user.username,
            email: user.email,
            roles: user.roles,
        };

        return { user: userWithoutPassword, token: newToken };
    }

    /**
     * Validate a token
     * @param token The JWT token
     */
    public validateToken(token: string): UserPayload {
        logger.debug("Validating token");

        try {
            const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
            return decoded;
        } catch (error) {
            throw new AppError(
                "Token is not valid",
                ErrorType.AUTHENTICATION_ERROR,
                401
            );
        }
    }

    /**
     * Get user by ID
     * @param userId The user ID
     */
    public async getUserById(userId: string): Promise<any> {
        logger.debug("Getting user by ID", { userId });

        const user = await User.findById(userId).select("-password");
        if (!user) {
            throw new AppError(
                "User not found",
                ErrorType.NOT_FOUND_ERROR,
                404
            );
        }

        return user;
    }

    /**
     * Register a new service
     * @param serviceData The service registration data
     */
    public async registerService(
        serviceData: ServiceRegistrationData
    ): Promise<{ serviceId: string }> {
        logger.debug("Registering new service", {
            serviceId: serviceData.serviceId,
        });

        // Check if service already exists
        const existingService = await Service.findOne({
            serviceId: serviceData.serviceId,
        });
        if (existingService) {
            throw new AppError(
                "Service already registered",
                ErrorType.CONFLICT_ERROR,
                400
            );
        }

        // Hash service secret
        const salt = await bcrypt.genSalt(10);
        const hashedSecret = await bcrypt.hash(serviceData.serviceSecret, 12);

        // Create new service
        const service = new Service({
            serviceId: serviceData.serviceId,
            serviceSecret: hashedSecret,
            description: serviceData.description,
        });

        await service.save();

        return { serviceId: service.serviceId };
    }

    /**
     * Generate service token for inter-service communication
     * @param serviceAuthData The service authentication data
     */
    public async generateServiceToken(
        serviceAuthData: ServiceAuthData
    ): Promise<{ token: string; serviceId: string }> {
        logger.debug("Generating service token", {
            serviceId: serviceAuthData.serviceId,
        });

        // Validate required fields
        if (!serviceAuthData.serviceId || !serviceAuthData.serviceSecret) {
            throw new AppError(
                "Service ID and secret required",
                ErrorType.VALIDATION_ERROR,
                400
            );
        }

        // Find service
        const service = await Service.findOne({
            serviceId: serviceAuthData.serviceId,
        });
        if (!service) {
            throw new AppError(
                "Invalid service credentials",
                ErrorType.AUTHENTICATION_ERROR,
                401
            );
        }

        // Verify service secret
        const isMatch = await bcrypt.compare(
            serviceAuthData.serviceSecret,
            service.serviceSecret
        );
        if (!isMatch) {
            throw new AppError(
                "Invalid service credentials",
                ErrorType.AUTHENTICATION_ERROR,
                401
            );
        }

        // Generate service JWT with elevated privileges
        const token = jwt.sign(
            {
                id: service._id!.toString(),
                serviceId: service.serviceId,
                isService: true,
                roles: ["service", "admin"], // Services get admin privileges for cross-service operations
            },
            env.JWT_SECRET,
            { expiresIn: "24h" } // Longer expiry for services
        );

        return { token, serviceId: service.serviceId };
    }

    /**
     * Generate JWT token
     * @param payload The token payload
     */
    private generateToken(payload: UserPayload): string {
        return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "1h" });
    }
}

export const authService = new AuthService();
