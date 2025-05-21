import express, { Application } from "express";
import cors from "cors";
import { authRoutes } from "./routes/auth.routes";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { logger } from "./utils/logger";

class App {
    public app: Application;

    constructor() {
        this.app = express();
        this.setupMiddlewares();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private setupMiddlewares(): void {
        // Enable JSON request body parsing
        this.app.use(express.json());

        // Enable URL-encoded request body parsing (for forms)
        this.app.use(express.urlencoded({ extended: true }));

        // Enable CORS
        this.app.use(cors());

        // Request logging middleware
        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.path}`);
            next();
        });
    }

    private setupRoutes(): void {
        // Health check route
        this.app.get("/health", (req, res) => {
            res.status(200).json({ status: "ok" });
        });

        // API routes
        this.app.use("/auth", authRoutes);
    }

    private setupErrorHandling(): void {
        // 404 handler for undefined routes
        this.app.use(notFoundHandler);

        // Global error handler
        this.app.use(errorHandler);
    }
}

export default new App().app;
