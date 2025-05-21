// src/services/auth.service.ts
import axios from "axios";
import { env } from "../config/environment";
import { logger } from "../utils/logger";
import { AppError, ErrorType } from "../utils/errorHandler";
import { UserPayload } from "../models/types";

export class AuthService {
    private authServiceUrl: string;

    constructor() {
        this.authServiceUrl = env.AUTH_SERVICE_URL;
    }

    /**
     * Validate a token with the auth service
     * @param token The token to validate
     * @returns The user data if the token is valid
     */
    public async validateToken(token: string): Promise<UserPayload> {
        try {
            const response = await axios.post(
                `${this.authServiceUrl}/validate-token`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            return response.data;
        } catch (error) {
            logger.error("Token validation error:", error);
            throw new AppError(
                "Invalid token",
                ErrorType.AUTHENTICATION_ERROR,
                401
            );
        }
    }

    /**
     * Update user roles
     * @param userId The user ID
     * @param roles The roles to add
     * @param authToken The authentication token
     */
    public async updateUserRoles(
        userId: string,
        roles: string[],
        authToken: string
    ): Promise<void> {
        try {
            await axios.put(
                `${this.authServiceUrl}/users/${userId}/roles`,
                { roles },
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                }
            );
        } catch (error) {
            logger.error("Error updating user roles:", error);
            throw new AppError(
                "Failed to update user roles",
                ErrorType.INTERNAL_SERVER_ERROR,
                500
            );
        }
    }
}

export const authService = new AuthService();
