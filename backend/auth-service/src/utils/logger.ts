// src/utils/logger.ts
import { env } from "../config/environment";

enum LogLevel {
    ERROR = "ERROR",
    WARN = "WARN",
    INFO = "INFO",
    DEBUG = "DEBUG",
}

class Logger {
    private getTimestamp(): string {
        return new Date().toISOString();
    }

    private log(level: LogLevel, message: string, ...meta: any[]): void {
        // In production, we might want to use a more sophisticated logging service
        const timestamp = this.getTimestamp();
        const metaString = meta.length ? JSON.stringify(meta) : "";

        console.log(`[${timestamp}] [${level}] ${message} ${metaString}`);
    }

    public error(message: string, ...meta: any[]): void {
        this.log(LogLevel.ERROR, message, ...meta);
    }

    public warn(message: string, ...meta: any[]): void {
        this.log(LogLevel.WARN, message, ...meta);
    }

    public info(message: string, ...meta: any[]): void {
        this.log(LogLevel.INFO, message, ...meta);
    }

    public debug(message: string, ...meta: any[]): void {
        // Only log debug in development
        if (env.NODE_ENV === "development") {
            this.log(LogLevel.DEBUG, message, ...meta);
        }
    }
}

export const logger = new Logger();
