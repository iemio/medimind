import axios from "axios";
import { AppError, ErrorType } from "../utils/errorHandler";
import { logger } from "../utils/logger";

const AUTH_SERVICE_URL =
    process.env.AUTH_SERVICE_URL || "http://localhost:3001";

export class AuthService {
    public async getServiceToken(): Promise<string | null> {
        try {
            const response = await axios.post(
                `${AUTH_SERVICE_URL}/service-token`,
                {
                    serviceId: process.env.SERVICE_ID,
                    serviceSecret: process.env.SERVICE_SECRET,
                }
            );
            return response.data.token;
        } catch (error) {
            logger.error("Error getting service token:", error);
            return null;
        }
    }

    public async validateToken(token: string): Promise<any> {
        try {
            const response = await axios.post(
                `${AUTH_SERVICE_URL}/validate-token`,
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
                "Token is not valid",
                ErrorType.AUTHENTICATION_ERROR,
                401
            );
        }
    }
}

export const authService = new AuthService();
