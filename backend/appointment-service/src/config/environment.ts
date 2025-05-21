// src/config/environment.ts
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    PORT: z.string().default("3003"),
    MONGO_URI: z.string(),
    AUTH_SERVICE_URL: z.string().default("http://localhost:3001/auth"),
});

// Validate environment variables against the schema
const validateEnv = (): z.infer<typeof envSchema> => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.errors.map((e) => e.path.join("."));
            throw new Error(
                `Missing environment variables: ${missingVars.join(", ")}`
            );
        }
        throw error;
    }
};

export const env = validateEnv();
