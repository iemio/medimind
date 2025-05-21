// src/services/auth.service.ts
import axios from "axios";
import { env } from "../config/environment";
import { logger } from "../utils/logger";
import { AppError, ErrorType } from "../utils/errorHandler";
import { UserData } from "../models/types";

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
    public async validateToken(token: string): Promise<UserData> {
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
}

export const authService = new AuthService();
