// src/models/types.ts
export interface UserPayload {
    id: string;
    roles: string[];
    email?: string;
}

export interface RequestWithUser extends Request {
    user?: UserPayload;
}

// This is needed because we're extending the Express Request interface
import { Request } from "express";
