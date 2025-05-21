// doctor-service/index.js
import mongoose from "mongoose";
import axios from "axios";
import cors from "cors";
import express from "express";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3002;
const AUTH_SERVICE_URL =
    process.env.AUTH_SERVICE_URL || "http://localhost:3001";

app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI!)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log(err));

// Doctor Schema
const doctorSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    specialization: {
        type: String,
        required: true,
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true,
    },
    experience: {
        type: Number,
        default: 0,
    },
    contactDetails: {
        phone: String,
        email: String,
        address: String,
    },
    availability: {
        type: Map,
        of: [String], // Each day has array of time slots
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Doctor = mongoose.model("Doctor", doctorSchema);

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader.split(" ")[1];

    if (!token) {
        return res
            .status(401)
            .json({ message: "No token, authorization denied" });
    }

    try {
        // Validate token with Auth Service
        const response = await axios.post(
            `${AUTH_SERVICE_URL}/validate-token`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        req.user = response.data;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token is not valid" });
    }
};

// Middleware to check if user has doctor role
const isDoctorRole = (req, res, next) => {
    if (!req.user.roles.includes("doctor")) {
        return res
            .status(403)
            .json({ message: "Access denied. Doctor role required." });
    }
    next();
};

// @ts-ignore
app.post("/doctors", authenticateToken, async (req, res) => {
    try {
        const {
            fullName,
            specialization,
            licenseNumber,
            experience,
            contactDetails,
            availability,
        } = req.body;

        // Update user role to include doctor if it doesn't already
        if (!req.user?.roles.includes("doctor")) {
            try {
                await axios.put(
                    `${AUTH_SERVICE_URL}/users/${req.user?.id}/roles`,
                    {
                        roles: ["doctor"],
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${
                                req.header("authorization")?.split(" ")[1]
                            }`,
                        },
                    }
                );
            } catch (error) {
                console.error("Error updating user role:", error);
                return res
                    .status(500)
                    .json({ message: "Error updating user role" });
            }
        }

        // Check if doctor profile already exists
        let doctor = await Doctor.findOne({ userId: req.user?.id });
        if (doctor) {
            return res
                .status(400)
                .json({ message: "Doctor profile already exists" });
        }

        // Create doctor profile
        doctor = new Doctor({
            userId: req.user?.id,
            fullName,
            specialization,
            licenseNumber,
            experience,
            contactDetails,
            availability,
        });

        await doctor.save();

        res.status(201).json(doctor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @ts-ignore
app.get("/doctors/me", authenticateToken, isDoctorRole, async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user?.id });

        if (!doctor) {
            return res
                .status(404)
                .json({ message: "Doctor profile not found" });
        }

        res.json(doctor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @ts-ignore
app.put("/doctors/me", authenticateToken, isDoctorRole, async (req, res) => {
    try {
        const {
            fullName,
            specialization,
            licenseNumber,
            experience,
            contactDetails,
            availability,
        } = req.body;

        const doctor = await Doctor.findOneAndUpdate(
            { userId: req.user?.id },
            {
                fullName,
                specialization,
                licenseNumber,
                experience,
                contactDetails,
                availability,
            },
            { new: true }
        );

        if (!doctor) {
            return res
                .status(404)
                .json({ message: "Doctor profile not found" });
        }

        res.json(doctor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Get all doctors (public endpoint)
app.get("/doctors", async (req, res) => {
    try {
        const doctors = await Doctor.find().select("-__v");
        res.json(doctors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @ts-ignore
app.get("/doctors/:id", async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);

        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        res.json(doctor);
    } catch (error) {
        console.error(error);
        if (error.kind === "ObjectId") {
            return res.status(404).json({ message: "Doctor not found" });
        }
        res.status(500).json({ message: "Server Error" });
    }
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "admin-service" });
});

app.listen(PORT, () => {
    console.log(`Doctor Service running on port ${PORT}`);
});
