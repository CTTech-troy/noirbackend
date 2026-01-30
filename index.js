import dotenv from "dotenv";
import { onRequest } from "firebase-functions/https";
import express from "express";
import cors from "cors";
import vapiRoutes from "./src/routers/vapi.Routes.js";
import openaiRoutes from "./src/routers/openai.Routes.js";
import bookingRoutes from "./src/routers/booking.Routes.js";
import paymentRoutes from "./src/routers/payment.Routes.js";
import { logger } from "./src/utils/logger.js";

// Load environment variables from .env file
dotenv.config();

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

/* ======================
   MIDDLEWARE - IP EXTRACTION
====================== */
// Extract and track user IP for session isolation
app.use((req, res, next) => {
  const userIP = 
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket?.remoteAddress ||
    'unknown';
  
  req.userIP = userIP;
  logger.log(`🌐 [Request] ${req.method} ${req.path} from IP: ${userIP}`);
  next();
});

/* ======================
   SESSION STORAGE - IP BASED
====================== */
// Store user sessions by IP address (automatically isolated by IP)
const userSessionsByIP = new Map();

// Get or create session for user IP
const getOrCreateSession = (userIP) => {
  if (!userSessionsByIP.has(userIP)) {
    logger.log(`✨ [New Session] Creating session for IP: ${userIP}`);
    userSessionsByIP.set(userIP, {
      userIP: userIP,
      conversationHistory: [],
      connectedAt: new Date(),
      messageCount: 0,
      lastActiveAt: new Date()
    });
  } else {
    const session = userSessionsByIP.get(userIP);
    session.lastActiveAt = new Date();
    logger.log(`🔄 [Returning User] Session restored for IP: ${userIP}`);
  }
  
  return userSessionsByIP.get(userIP);
};

/* ======================
   HEALTH CHECK ROUTE
====================== */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "restaurantAI-backend",
    userIP: req.userIP,
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
    userIP: req.userIP,
    activeSessions: userSessionsByIP.size,
    endpoints: {
      "GET /": {
        description: "Health check root endpoint",
        status: 200
      },
      "GET /health": {
        description: "Health status check with IP",
        status: 200
      },
      "POST /api/vapi-call-log": {
        description: "Log VAPI voice call (voice recordings, transcripts)",
        body: { callId: "string", transcript: "array", duration: "number" },
        response: { success: true, message: "string" }
      },
      "POST /api/initiate-call": {
        description: "Initiate VAPI voice call",
        body: { userId: "string" },
        response: { success: true, callId: "string" }
      },
      "POST /api/end-call": {
        description: "End VAPI voice call",
        body: { callId: "string", transcript: "array" },
        response: { success: true, message: "string" }
      },
      "POST /api/openai/chat": {
        description: "Send a chat message (IP-based session isolation)",
        body: { message: "string", conversationHistory: "array (optional)" },
        response: { success: true, message: "string", sessionId: "string" }
      },
      "POST /api/openai/check-availability": {
        description: "Check table availability",
        body: { numGuests: "number", date: "string", time: "string" },
        response: { success: true, available: true, message: "string" }
      },
      "POST /api/openai/create-reservation": {
        description: "Create a table reservation",
        body: { customerName: "string", numGuests: "number", date: "string", time: "string" },
        response: { success: true, booking: "object" }
      },
      "GET /api/openai/health": {
        description: "Check OpenRouter API health",
        response: { configured: true, apiWorking: true }
      },
      "POST /api/booking/check-availability": {
        description: "Check available tables",
        body: { numGuests: "number", date: "string (YYYY-MM-DD)", time: "string (HH:MM)" },
        response: { success: true, available: true, tables: "array", message: "string" }
      },
      "POST /api/booking/create-reservation": {
        description: "Create a new table reservation",
        body: { customerName: "string", numGuests: "number", date: "string", time: "string", email: "string?", phone: "string?" },
        response: { success: true, reservation: "object", confirmationDetails: "object" }
      },
      "GET /api/booking/reservation/:reservationId": {
        description: "Get reservation details (requires ownership by IP)",
        params: { reservationId: "string" },
        response: { success: true, reservation: "object" }
      },
      "PUT /api/booking/modify-reservation/:reservationId": {
        description: "Modify reservation date/time/guests",
        body: { date: "string?", time: "string?", numGuests: "number?" },
        response: { success: true, reservation: "object" }
      },
      "DELETE /api/booking/cancel-reservation/:reservationId": {
        description: "Cancel a reservation",
        response: { success: true, reservation: "object" }
      },
      "GET /api/booking/tables-status": {
        description: "Get all tables status and availability",
        response: { success: true, availability: "object" }
      },
      "GET /api/booking/restaurant-info": {
        description: "Get restaurant information (hours, capacity, cuisine)",
        response: { success: true, restaurant: "object" }
      },
      "GET /api/payment/methods": {
        description: "Get available payment methods",
        response: { success: true, paymentMethods: "array" }
      },
      "POST /api/payment/process-card": {
        description: "Process credit/debit card payment",
        body: { reservationId: "string", cardDetails: "object", amount: "number" },
        response: { success: true, paymentId: "string", transactionId: "string" }
      },
      "GET /api/payment/bank-transfer/:reservationId": {
        description: "Get bank transfer payment details",
        response: { success: true, details: "object", instructions: "array" }
      },
      "GET /api/payment/cashapp/:reservationId": {
        description: "Get CashApp payment details",
        response: { success: true, details: "object", instructions: "array" }
      },
      "POST /api/payment/confirm-offline": {
        description: "Confirm offline payment (bank transfer/cashapp)",
        body: { reservationId: "string", method: "string" },
        response: { success: true, paymentId: "string", status: "string" }
      },
      "GET /api/payment/status/:paymentId": {
        description: "Get payment status",
        response: { success: true, payment: "object" }
      },
      "POST /api/dograh/initiate-call": {
        description: "Initiate a voice call via Dograh.ai Active Agents",
        body: { phoneNumber: "string", callbackUrl: "string?", context: "object?" },
        response: { success: true, callId: "string", status: "string" }
      },
      "POST /api/dograh/inbound-call": {
        description: "Handle inbound call from Dograh.ai webhook",
        body: { callId: "string", phoneNumber: "string", transcript: "array" },
        response: { success: true, message: "string" }
      },
      "POST /api/dograh/end-call": {
        description: "End a Dograh.ai voice call",
        body: { callId: "string", transcript: "array", duration: "number" },
        response: { success: true, message: "string" }
      },
      "GET /api/dograh/call/:callId": {
        description: "Get call transcript and details (IP-verified)",
        response: { success: true, call: "object" }
      },
      "POST /api/dograh/call-log": {
        description: "Log call for analytics",
        body: { callId: "string", phoneNumber: "string", transcript: "array", duration: "number" },
        response: { success: true, message: "string" }
      },
      "GET /api/dograh/agent-status": {
        description: "Get Dograh.ai agent status and configuration",
        response: { success: true, agent: "object" }
      },
      "POST /api/dograh/test": {
        description: "Test Dograh.ai integration and credentials",
        body: { phoneNumber: "string?" },
        response: { success: true, message: "string" }
      },
      "GET /api/dograh/health": {
        description: "Health check for Dograh.ai routes",
        response: { status: "ok", service: "string" }
      }
    }
  });
});

/* ======================
   MAIN API ROUTES
====================== */
app.use("/api", vapiRoutes);
app.use("/api/openai", openaiRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/payment", paymentRoutes);

/* ======================
   ROOT
====================== */
app.get("/", (req, res) => {
  res.send("Backend running fine 🚀");
});

/* ======================
   EXPORT FIREBASE FUNCTION (optional)
====================== */
// export const api = onRequest(app); // Uncomment when deploying to Firebase

/* ======================
   EXPORT LOCAL SERVER
====================== */
app.listen(5000, () => {
  logger.log("🚀 Server running (HTTP mode with IP-based session isolation)");
  logger.log("📍 Port: 5000");
  logger.log("🔗 URL: http://localhost:5000");
  logger.log("✅ Environment: " + process.env.NODE_ENV);
  logger.log("🌐 Session tracking: IP-based (no WebSocket needed)");
});
