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
app.post("/validate-token", (req: any, res: any) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader.split(" ")[1];

    if (!token) {
        return res
            .status(401)
            .json({ message: "No token, authorization denied" });
    }
    console.log(token);
    try {
        const decoded = jwt.verify(token, JWT_SECRET!);
        res.json(decoded);
    } catch (error) {
        res.status(401).json({ message: "Token is not valid" });
    }
});

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

app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});
