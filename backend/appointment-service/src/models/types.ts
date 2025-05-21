import { Request } from "express";

export interface UserData {
    id: string;
    email?: string;
    name?: string;
    roles: string[];
}

export interface RequestWithUser extends Request {
    user?: UserData;
}
