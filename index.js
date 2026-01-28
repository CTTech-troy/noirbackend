import dotenv from "dotenv";
import { onRequest } from "firebase-functions/https";
import express from "express";
import cors from "cors";
import vapiRoutes from "./src/routers/vapi.Routes.js";

// Load environment variables from .env file
dotenv.config();

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

/* ======================
   HEALTH CHECK ROUTE
====================== */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "restaurantAI-backend",
    timestamp: new Date().toISOString()
  });
});

/* ======================
   DEBUG ROUTE
====================== */
app.get("/debug", (req, res) => {
  res.status(200).json({
    message: "API Documentation",
    service: "restaurantAI-backend",
    endpoints: {
      "GET /": {
        description: "Health check root endpoint",
        status: 200
      },
      "GET /health": {
        description: "Health status check",
        status: 200,
        response: {
          status: "ok",
          service: "restaurantAI-backend",
          timestamp: "ISO timestamp"
        }
      },
      "POST /api/vapi-call-log": {
        description: "Save VAPI call log to Firestore",
        method: "POST",
        statusCodes: {
          200: "Success - Call log saved",
          400: "Bad Request - Missing callId",
          500: "Internal Server Error - Database error"
        },
        requestBody: {
          callId: "string (required)",
          duration: "number",
          transcript: "array",
          summary: "string",
          recordingUrl: "string",
          startedAt: "number",
          endedAt: "number",
          chatMessages: "array"
        }
      },
      "GET /api/vapi-call-logs": {
        description: "Retrieve all VAPI call logs",
        method: "GET",
        statusCodes: {
          200: "Success - Logs retrieved",
          500: "Internal Server Error - Database error"
        },
        queryParams: {
          limit: "number (default: 10)",
          offset: "number (default: 0)"
        }
      },
      "GET /api/vapi-call-log/:callId": {
        description: "Retrieve specific call log by ID",
        method: "GET",
        statusCodes: {
          200: "Success - Log retrieved",
          404: "Not Found - Call log not found",
          500: "Internal Server Error - Database error"
        },
        pathParams: {
          callId: "string (required)"
        }
      }
    },
    environment: {
      nodeVersion: process.version,
      projectId: process.env.GCLOUD_PROJECT || "Not set",
      nodeEnv: process.env.NODE_ENV || "Not set",
      port: 5000
    }
  });
});

/* ======================
   MAIN API ROUTES
====================== */
app.use("/api", vapiRoutes);

/* ======================
   ROOT
====================== */
app.get("/", (req, res) => {
  res.send("Backend running fine 🚀");
});

/* ======================
   EXPORT FIREBASE FUNCTION
====================== */
export const api = onRequest(app);

/* ======================
   EXPORT LOCAL SERVER
====================== */
app.listen(5000, () => {
  console.log("📍 Port: 5000");
  console.log("🔗 URL: http://localhost:5000");
  console.log("✅ Environment: " + process.env.NODE_ENV);
});