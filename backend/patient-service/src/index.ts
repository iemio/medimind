import express from "express";
import mongoose from "mongoose";
import axios from "axios";
import cors from "cors";
// patient-service/index.js

const app = express();
const PORT = process.env.PORT || 3003;
const AUTH_SERVICE_URL =
    process.env.AUTH_SERVICE_URL || "http://localhost:3001";

app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI!)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log(err));

// Patient Schema
const patientSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    dateOfBirth: {
        type: Date,
        required: true,
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: true,
    },
    bloodGroup: {
        type: String,
    },
    contactDetails: {
        phone: String,
        email: String,
        address: String,
        emergencyContact: {
            name: String,
            relationship: String,
            phone: String,
        },
    },
    medicalHistory: {
        allergies: [String],
        chronicConditions: [String],
        currentMedications: [String],
        pastSurgeries: [
            {
                name: String,
                date: Date,
                notes: String,
            },
        ],
    },
    insuranceInfo: {
        provider: String,
        policyNumber: String,
        expiryDate: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Patient = mongoose.model("Patient", patientSchema);

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
    const token = req.header("x-auth-token");

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
                    "x-auth-token": token,
                },
            }
        );

        req.user = response.data;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token is not valid" });
    }
};

// Middleware to check if user has patient role
const isPatientRole = (req, res, next) => {
    if (!req.user.roles.includes("patient")) {
        return res
            .status(403)
            .json({ message: "Access denied. Patient role required." });
    }
    next();
};

// @ts-ignore
app.post("/patients", authenticateToken, async (req, res) => {
    try {
        const {
            fullName,
            dateOfBirth,
            gender,
            bloodGroup,
            contactDetails,
            medicalHistory,
            insuranceInfo,
        } = req.body;

        // Update user role to include patient if it doesn't already
        if (!req.user?.roles.includes("patient")) {
            try {
                await axios.put(
                    `${AUTH_SERVICE_URL}/users/${req.user?.id}/roles`,
                    {
                        roles: ["patient"],
                    },
                    {
                        headers: {
                            "x-auth-token": req.header("x-auth-token"),
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

        // Check if patient profile already exists
        let patient = await Patient.findOne({ userId: req.user?.id });
        if (patient) {
            return res
                .status(400)
                .json({ message: "Patient profile already exists" });
        }

        // Create patient profile
        patient = new Patient({
            userId: req.user?.id,
            fullName,
            dateOfBirth,
            gender,
            bloodGroup,
            contactDetails,
            medicalHistory,
            insuranceInfo,
        });

        await patient.save();

        res.status(201).json(patient);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @ts-ignore
app.get("/patients/me", authenticateToken, isPatientRole, async (req, res) => {
    try {
        const patient = await Patient.findOne({ userId: req.user?.id });

        if (!patient) {
            return res
                .status(404)
                .json({ message: "Patient profile not found" });
        }

        res.json(patient);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @ts-ignore
app.put("/patients/me", authenticateToken, isPatientRole, async (req, res) => {
    try {
        const {
            fullName,
            dateOfBirth,
            gender,
            bloodGroup,
            contactDetails,
            medicalHistory,
            insuranceInfo,
        } = req.body;

        const patient = await Patient.findOneAndUpdate(
            { userId: req.user?.id },
            {
                fullName,
                dateOfBirth,
                gender,
                bloodGroup,
                contactDetails,
                medicalHistory,
                insuranceInfo,
            },
            { new: true }
        );

        if (!patient) {
            return res
                .status(404)
                .json({ message: "Patient profile not found" });
        }

        res.json(patient);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @ts-ignore
app.get("/patients/:id", authenticateToken, async (req, res) => {
    try {
        // Only doctors can access other patients' records
        if (
            !req.user?.roles.includes("doctor") &&
            req.user?.id !== req.params.id
        ) {
            return res.status(403).json({
                message: "Access denied. You can only view your own records.",
            });
        }

        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        res.json(patient);
    } catch (error) {
        console.error(error);
        if (error.kind === "ObjectId") {
            return res.status(404).json({ message: "Patient not found" });
        }
        res.status(500).json({ message: "Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Patient Service running on port ${PORT}`);
});
