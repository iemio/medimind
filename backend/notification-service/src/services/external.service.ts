import axios from "axios";
import { authService } from "./auth.service";
import { AppError, ErrorType } from "../utils/errorHandler";
import { logger } from "../utils/logger";

const DOCTOR_SERVICE_URL =
    process.env.DOCTOR_SERVICE_URL || "http://localhost:3002";
const PATIENT_SERVICE_URL =
    process.env.PATIENT_SERVICE_URL || "http://localhost:3003";
const APPOINTMENT_SERVICE_URL =
    process.env.APPOINTMENT_SERVICE_URL || "http://localhost:3004";
const AUTH_SERVICE_URL =
    process.env.AUTH_SERVICE_URL || "http://localhost:3001";

export interface UserDetails {
    email: string;
    phone: string;
    name: string;
}

export class ExternalService {
    public async getUserDetails(
        userId: string,
        userType: string
    ): Promise<UserDetails | null> {
        try {
            const serviceToken = await authService.getServiceToken();
            if (!serviceToken) {
                logger.error("Failed to get service token");
                return null;
            }

            let serviceUrl: string;
            let endpoint: string;

            if (userType === "patient") {
                serviceUrl = PATIENT_SERVICE_URL;
                endpoint = "patients";
            } else if (userType === "doctor") {
                serviceUrl = DOCTOR_SERVICE_URL;
                endpoint = "doctors";
            } else {
                // For admin users
                serviceUrl = AUTH_SERVICE_URL;
                endpoint = "users";
            }

            const response = await axios.get(
                `${serviceUrl}/${endpoint}/${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${serviceToken}`,
                    },
                }
            );

            return {
                email: response.data.email,
                phone: response.data.phone,
                name:
                    response.data.name ||
                    response.data.firstName + " " + response.data.lastName,
            };
        } catch (error) {
            logger.error(`Error fetching ${userType} details:`, error);
            return null;
        }
    }

    public async getAppointmentDetails(appointmentId: string): Promise<any> {
        try {
            const serviceToken = await authService.getServiceToken();
            if (!serviceToken) {
                throw new AppError(
                    "Failed to get service token",
                    ErrorType.INTERNAL_SERVER_ERROR,
                    500
                );
            }

            const response = await axios.get(
                `${APPOINTMENT_SERVICE_URL}/appointments/${appointmentId}`,
                {
                    headers: {
                        Authorization: `Bearer ${serviceToken}`,
                    },
                }
            );

            return response.data;
        } catch (error) {
            logger.error("Error fetching appointment details:", error);
            throw new AppError(
                "Failed to fetch appointment details",
                ErrorType.INTERNAL_SERVER_ERROR,
                500
            );
        }
    }

    public async getTomorrowAppointments(): Promise<any[]> {
        try {
            const serviceToken = await authService.getServiceToken();
            if (!serviceToken) {
                logger.error(
                    "Failed to get service token for scheduling reminders"
                );
                return [];
            }

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const response = await axios.get(
                `${APPOINTMENT_SERVICE_URL}/appointments`,
                {
                    headers: {
                        Authorization: `Bearer ${serviceToken}`,
                    },
                    params: {
                        date: tomorrow.toISOString().split("T")[0],
                        status: ["confirmed", "scheduled"],
                    },
                }
            );

            return response.data;
        } catch (error) {
            logger.error("Error fetching tomorrow's appointments:", error);
            return [];
        }
    }
}

export const externalService = new ExternalService();
