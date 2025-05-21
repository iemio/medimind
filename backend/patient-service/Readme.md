# Patient Service

A microservice for managing patient data in a healthcare system, built with TypeScript, Express, MongoDB, and Zod for schema validation.

## Project Structure

```
src/
├── config/              # Configuration files
├── models/              # Mongoose models and type definitions
├── controllers/         # Controller functions for handling API requests
├── services/            # Business logic layer
├── middlewares/         # Express middlewares
├── routes/              # API route definitions
├── utils/               # Utility functions like logging and error handling
├── schemas/             # Zod validation schemas
├── app.ts               # Express app setup
└── index.ts             # Entry point
```

## Features

-   TypeScript for type safety
-   Zod for schema validation
-   MongoDB with Mongoose for data persistence
-   JWT-based authentication with role-based access control
-   Microservice architecture with communication to an Auth Service
-   Comprehensive error handling and logging
-   Clean code organization with separation of concerns

## Prerequisites

-   Node.js (v14+)
-   MongoDB
-   Auth Service running (for authentication)

## Installation

1. Clone the repository
2. Install dependencies:
    ```bash
    pnpm install
    ```
3. Create a `.env` file using the `.env.example` as template
4. Build the project:
    ```bash
    pnpm run build
    ```

## Running the Service

### Development Mode

```bash
pnpm run dev
```

### Production Mode

```bash
pnpm run build
pnpm start
```

## API Endpoints

-   `POST /patients` - Create a patient profile
-   `GET /patients/me` - Get current patient's profile
-   `PUT /patients/me` - Update current patient's profile
-   `GET /patients/:id` - Get a specific patient's profile (doctor role required)

## License

MIT
