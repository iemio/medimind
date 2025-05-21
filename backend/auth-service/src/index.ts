// src/index.ts
import app from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/environment";
import { logger } from "./utils/logger";

const PORT = env.PORT;

// Connect to MongoDB
connectDatabase()
    .then(() => {
        // Start the server
        app.listen(PORT, () => {
            logger.info(`Auth Service running on port ${PORT}`);
        });
    })
    .catch((error) => {
        logger.error("Failed to start server:", error);
        process.exit(1);
    });
