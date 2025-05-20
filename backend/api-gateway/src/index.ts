import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Service URLs
const AUTH_SERVICE_URL =
    process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const DOCTOR_SERVICE_URL =
    process.env.DOCTOR_SERVICE_URL || "http://localhost:3002";
const PATIENT_SERVICE_URL =
    process.env.PATIENT_SERVICE_URL || "http://localhost:3003";

app.use(express.json());
app.use(cors());

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
    // Skip authentication for login and register routes
    if (req.path === "/auth/login" || req.path === "/auth/register") {
        return next();
    }

    const token = req.header("x-auth-token");

    if (!token) {
        return res
            .status(401)
            .json({ message: "No token, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET!);
        console.log(decoded);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

// Middleware to check for doctor role
const doctorRoleRequired = (req, res, next) => {
    if (!req.user || !req.user.roles.includes("doctor")) {
        return res
            .status(403)
            .json({ message: "Access denied. Doctor role required." });
    }
    next();
};

// Middleware to check for patient role
const patientRoleRequired = (req, res, next) => {
    if (!req.user || !req.user.roles.includes("patient")) {
        return res
            .status(403)
            .json({ message: "Access denied. Patient role required." });
    }
    next();
};

// Apply authentication middleware
app.use(authenticateToken);

// Auth Service Proxy
app.use(
    "/auth",
    createProxyMiddleware({
        target: AUTH_SERVICE_URL,
        changeOrigin: true,
        pathRewrite: {
            "^/auth": "", // Remove /auth prefix when forwarding
        },
        // @ts-ignore
        onProxyReq: (proxyReq, req) => {
            // Pass the user token if available
            if (req.user) {
                proxyReq.setHeader("x-auth-token", req.header("x-auth-token"));
            }
        },
    })
);

// Doctor Service Proxy with role-based access control
app.use(
    "/doctors",
    (req, res, next) => {
        // Allow public access to GET /doctors (list all doctors)
        if (
            req.method === "GET" &&
            (req.path === "/" || req.path.match(/^\/[a-f\d]{24}$/))
        ) {
            next();
            return;
        }

        // For doctor-specific operations, require doctor role
        if (req.path === "/me" || req.method !== "GET") {
            doctorRoleRequired(req, res, next);
            return;
        }

        next();
    },
    createProxyMiddleware({
        target: DOCTOR_SERVICE_URL,
        changeOrigin: true,
        pathRewrite: {
            "^/doctors": "/doctors", // Keep /doctors prefix
        },
        // @ts-ignore
        onProxyReq: (proxyReq, req) => {
            // Pass the user token if available
            if (req.user) {
                proxyReq.setHeader("x-auth-token", req.header("x-auth-token"));
            }
        },
    })
);

// Patient Service Proxy with role-based access control
app.use(
    "/patients",
    (req, res, next) => {
        // For patient-specific operations, require patient role
        if (req.path === "/me") {
            patientRoleRequired(req, res, next);
            return;
        }

        // For accessing other patients' data, require doctor role
        // (except when a patient is accessing their own data, which is handled by the patient service)
        if (req.method === "GET" && req.path.match(/^\/[a-f\d]{24}$/)) {
            // Allow request to proceed - the patient service will check permissions
            next();
            return;
        }

        // For creating/updating patient profiles
        if (req.method === "POST" || req.method === "PUT") {
            next();
            return;
        }

        res.status(403).json({ message: "Access denied" });
    },
    createProxyMiddleware({
        target: PATIENT_SERVICE_URL,
        changeOrigin: true,
        pathRewrite: {
            "^/patients": "/patients", // Keep /patients prefix
        },
        // @ts-ignore
        onProxyReq: (proxyReq, req) => {
            // Pass the user token if available
            if (req.user) {
                proxyReq.setHeader("x-auth-token", req.header("x-auth-token"));
            }
        },
    })
);

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong!" });
});

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
