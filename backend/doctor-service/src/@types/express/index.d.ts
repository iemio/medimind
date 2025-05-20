// types/express/index.d.ts
import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";
declare global {
    namespace Express {
        interface User {
            id: string;
            username: string;
            roles: string[];
        }

        interface Request {
            user?: User | JwtPayload;
        }
    }
}
