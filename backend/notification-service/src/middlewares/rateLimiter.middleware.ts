import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { logger } from "../utils/logger";

/**
 * Rate limiter configurations for different types of requests
 */
export const rateLimiter = {
    // Standard rate limiting for regular users
    standard: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: {
            success: false,
            message: "Too many requests from this IP, please try again later.",
            retryAfter: 15 * 60 * 1000, // 15 minutes in milliseconds
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        handler: (req: Request, res: Response) => {
            logger.warn("Standard rate limit exceeded", {
                ip: req.ip,
                userAgent: req.get("User-Agent"),
                path: req.path,
                method: req.method,
            });
            res.status(429).json({
                success: false,
                message:
                    "Too many requests from this IP, please try again later.",
                retryAfter: 15 * 60 * 1000,
            });
        },
    }),

    // Higher rate limiting for admin users
    admin: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 500, // Higher limit for admin users
        message: {
            success: false,
            message:
                "Too many admin requests from this IP, please try again later.",
            retryAfter: 15 * 60 * 1000,
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req: Request, res: Response) => {
            logger.warn("Admin rate limit exceeded", {
                ip: req.ip,
                userAgent: req.get("User-Agent"),
                path: req.path,
                method: req.method,
            });
            res.status(429).json({
                success: false,
                message:
                    "Too many admin requests from this IP, please try again later.",
                retryAfter: 15 * 60 * 1000,
            });
        },
    }),

    // Rate limiting for webhook endpoints
    webhook: rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 50, // Allow 50 webhook requests per minute
        message: {
            success: false,
            message:
                "Too many webhook requests from this IP, please try again later.",
            retryAfter: 1 * 60 * 1000,
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req: Request, res: Response) => {
            logger.warn("Webhook rate limit exceeded", {
                ip: req.ip,
                userAgent: req.get("User-Agent"),
                path: req.path,
                method: req.method,
            });
            res.status(429).json({
                success: false,
                message:
                    "Too many webhook requests from this IP, please try again later.",
                retryAfter: 1 * 60 * 1000,
            });
        },
    }),
};
