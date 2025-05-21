import { z } from "zod";

// User registration schema
export const userRegistrationSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.string().optional(),
});

// User login schema
export const userLoginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});

// Role update schema
export const roleUpdateSchema = z.object({
    roles: z.array(z.string()),
});

// Service registration schema
export const serviceRegistrationSchema = z.object({
    serviceId: z.string().min(3, "Service ID must be at least 3 characters"),
    serviceSecret: z
        .string()
        .min(8, "Service secret must be at least 8 characters"),
    description: z.string().optional(),
});

// Service authentication schema
export const serviceAuthSchema = z.object({
    serviceId: z.string(),
    serviceSecret: z.string(),
});

// Types derived from schemas
export type UserRegistrationData = z.infer<typeof userRegistrationSchema>;
export type UserLoginData = z.infer<typeof userLoginSchema>;
export type RoleUpdateData = z.infer<typeof roleUpdateSchema>;
export type ServiceRegistrationData = z.infer<typeof serviceRegistrationSchema>;
export type ServiceAuthData = z.infer<typeof serviceAuthSchema>;
