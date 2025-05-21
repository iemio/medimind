// auth-service/index.js
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import cors from "cors";
import { Request, Response } from "express";
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
import "dotenv/config";
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI!)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log(err));

// User Schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    roles: {
        type: [String],
        default: ["patient"],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const User = mongoose.model("User", userSchema);

const serviceSchema = new mongoose.Schema({
    serviceId: {
        type: String,
        required: true,
        unique: true,
    },
    serviceSecret: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Service = mongoose.model("Service", serviceSchema);

// @ts-ignore
app.post("/register", async (req: any, res: any) => {
    try {
        const { username, email, password, role } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user
        user = new User({
            username,
            email,
            password: hashedPassword,
            roles: [role || "patient"], // Default to patient if no role provided
        });

        await user.save();

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, username: user.username, roles: user.roles },
            JWT_SECRET!,
            { expiresIn: "1h" }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                roles: user.roles,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @ts-ignore
app.post("/login", async (req: any, res: any) => {
    try {
        console.log("aaa");
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, username: user.username, roles: user.roles },
            JWT_SECRET!,
            { expiresIn: "1h" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                roles: user.roles,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @ts-ignore
app.put("/users/:id/roles", async (req: any, res: any) => {
    try {
        const { roles } = req.body;

        // Find and update user with new roles
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { roles: { $each: roles } } }, // Add roles without duplicates
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate new JWT with updated roles
        const token = jwt.sign(
            { id: user._id, username: user.username, roles: user.roles },
            JWT_SECRET!,
            { expiresIn: "1h" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                roles: user.roles,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @ts-ignore
// app.post("/validate-token", (req: any, res: any) => {
//     const authHeader = req.headers["authorization"];
//     const token = authHeader.split(" ")[1];

//     if (!token) {
//         return res
//             .status(401)
//             .json({ message: "No token, authorization denied" });
//     }
//     console.log(token);
//     try {
//         const decoded = jwt.verify(token, JWT_SECRET!);
//         res.json(decoded);
//     } catch (error) {
//         res.status(401).json({ message: "Token is not valid" });
//     }
// });

// @ts-ignore
const auth = (req, res, next) => {
    const token = req.header("x-auth-token");

    if (!token) {
        return res
            .status(401)
            .json({ message: "No token, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET!);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

app.get("/user", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user?.id).select("-password");
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});
//inter service started
// Create service authentication credentials
// This is an admin-only route that should be properly secured in production
app.post("/services/register", async (req, res) => {
    try {
        const { serviceId, serviceSecret, description } = req.body;

        // Check if service already exists
        let service = await Service.findOne({ serviceId });
        if (service) {
            return res
                .status(400)
                .json({ message: "Service already registered" });
        }

        // Hash service secret
        const salt = await bcrypt.genSalt(10);
        const hashedSecret = await bcrypt.hash(serviceSecret, 12);

        // Create new service
        service = new Service({
            serviceId,
            serviceSecret: hashedSecret,
            description,
        });

        await service.save();

        res.status(201).json({
            message: "Service registered successfully",
            serviceId: service.serviceId,
        });
    } catch (error) {
        console.error("Error registering service:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Generate service token for inter-service communication
app.post("/service-token", async (req, res) => {
    try {
        const { serviceId, serviceSecret } = req.body;

        // Validate required fields
        if (!serviceId || !serviceSecret) {
            return res
                .status(400)
                .json({ message: "Service ID and secret required" });
        }

        // Find service
        const service = await Service.findOne({ serviceId });
        if (!service) {
            return res
                .status(401)
                .json({ message: "Invalid service credentials" });
        }

        // Verify service secret
        const isMatch = await bcrypt.compare(
            serviceSecret,
            service.serviceSecret
        );
        if (!isMatch) {
            return res
                .status(401)
                .json({ message: "Invalid service credentials" });
        }

        // Generate service JWT with elevated privileges
        // Service tokens have a longer expiry and special service role
        const token = jwt.sign(
            {
                id: service._id,
                serviceId: service.serviceId,
                isService: true,
                roles: ["service", "admin"], // Services get admin privileges for cross-service operations
            },
            JWT_SECRET!,
            { expiresIn: "24h" } // Longer expiry for services
        );

        res.json({
            token,
            service: {
                serviceId: service.serviceId,
            },
        });
    } catch (error) {
        console.error("Error generating service token:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Update the validate-token endpoint to handle service tokens
app.post("/validate-token", (req, res) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res
            .status(401)
            .json({ message: "No token, authorization denied" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res
            .status(401)
            .json({ message: "No token, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET!);
        res.json(decoded);
    } catch (error) {
        res.status(401).json({ message: "Token is not valid" });
    }
});

// Add a route to get user by ID (for notification service to fetch user emails)
app.get("/users/:id", async (req, res) => {
    try {
        // Get token from authorization header
        const authHeader = req.headers["authorization"];
        if (!authHeader) {
            return res
                .status(401)
                .json({ message: "No token, authorization denied" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res
                .status(401)
                .json({ message: "No token, authorization denied" });
        }

        // Verify token
        try {
            const decoded = jwt.verify(token, JWT_SECRET!);

            // Only allow access if token is from a service or the user themselves
            if (
                !decoded.isService &&
                decoded.id !== req.params.id &&
                !decoded.roles.includes("admin")
            ) {
                return res.status(403).json({
                    message: "Not authorized to access this resource",
                });
            }
        } catch (error) {
            return res.status(401).json({ message: "Token is not valid" });
        }

        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});
