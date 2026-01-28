import dotenv from "dotenv";
import admin from "firebase-admin";
import { decryptPayload } from "../utils/encryption.js";

// Load env vars immediately
dotenv.config();

// ==================== FIREBASE INITIALIZATION ====================
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
    
    if (!serviceAccount.project_id) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT missing or invalid - no project_id found");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log("🔥 Firebase Admin SDK initialized successfully");
    console.log("📍 Project ID:", serviceAccount.project_id);
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error.message);
    process.exit(1);
  }
} else {
  console.log("🔥 Firebase already initialized");
}

const db = admin.firestore();
console.log("📊 Firestore connected and ready"); 

// ==================== VAPI API CONFIGURATION ====================
const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
const VAPI_API_BASE_URL = "https://api.vapi.ai";

console.log("📋 VAPI Configuration Loaded:");
console.log("🔑 VAPI_API_KEY:", VAPI_API_KEY ? `${VAPI_API_KEY.substring(0, 8)}...` : "❌ MISSING");
console.log("🤖 VAPI_ASSISTANT_ID:", VAPI_ASSISTANT_ID ? `${VAPI_ASSISTANT_ID.substring(0, 8)}...` : "❌ MISSING");

/**
 * Helper function to make VAPI API calls
 * @param {string} endpoint - VAPI API endpoint
 * @param {string} method - HTTP method (GET, POST, DELETE, etc.)
 * @param {object} body - Request body (optional)
 * @returns {Promise<object>} - API response
 */
const callVapiAPI = async (endpoint, method = "GET", body = null) => {
  try {
    const options = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VAPI_API_KEY}`
      }
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${VAPI_API_BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ VAPI API Error (${response.status}):`, data);
      throw new Error(data.message || `VAPI API returned ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`❌ VAPI API Call Failed:`, error.message);
    throw error;
  }
};

const validateVapiConfig = () => {
  if (!VAPI_API_KEY) {
    console.warn("⚠️  VAPI_API_KEY not found in environment variables");
    return false;
  }
  if (!VAPI_ASSISTANT_ID) {
    console.warn("⚠️  VAPI_ASSISTANT_ID not found in environment variables");
    return false;
  }
  console.log("✅ VAPI Configuration Valid");
  console.log("🤖 Assistant ID:", `${VAPI_ASSISTANT_ID.substring(0, 8)}...`);
  return true;
};

// Validate VAPI config on startup
validateVapiConfig();

// ==================== MAKE VAPI CALL (Frontend -> Backend -> Vapi) ====================
/**
 * POST /api/vapi/make-call
 * Make a Vapi call through the backend (secure - uses private key)
 * 
 * Request Body:
 * {
 *   userId: string (optional),
 *   timestamp: string (optional)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   callId: string,
 *   timestamp: string
 * }
 */
export const makeVapiCall = async (req, res) => {
  try {
    console.log("📞 [Make Call] Request received from frontend");

    if (!validateVapiConfig()) {
      return res.status(400).json({
        success: false,
        error: "VAPI configuration is incomplete"
      });
    }

    const { userId = "web-user" } = req.body;

    // Make the API call to Vapi
const vapiResponse = await fetch("https://api.vapi.ai/call/web", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${VAPI_PRIVATE_API_KEY}`
  },
  body: JSON.stringify({
    assistantId: VAPI_ASSISTANT_ID,
    customer: {
      name: userId
    }
  })
});

const data = await vapiResponse.json();
console.log("Vapi call started:", data);


    console.log("✅ [Make Call] Vapi call initiated successfully");
    console.log("📊 Call ID:", vapiResponse.callId || "N/A");

    res.status(200).json({
      success: true,
      callId: vapiResponse.callId || `call_${Date.now()}`,
      timestamp: new Date().toISOString(),
      vapiResponse: vapiResponse
    });

  } catch (error) {
    console.error("❌ [Make Call] Error initiating call:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to initiate call"
    });
  }
};

// ==================== VAPI CALL INITIATION ====================
/**
 * POST /api/vapi/initiate-call
 * Initiate a VAPI voice call from frontend
 * 
 * Request Body:
 * {
 *   userId: string (optional),
 *   assistantOverride: string (optional - override default assistant)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   callId: string,
 *   status: string,
 *   assistantId: string,
 *   timestamp: string
 * }
 */
export const initiateVapiCall = async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`\n[${timestamp}] ==================== VAPI CALL INITIATION ====================`);
    console.log(`[${timestamp}] 📥 POST /api/vapi/initiate-call`);
    
    const { userId, assistantOverride } = req.body;
    const assistantId = assistantOverride || VAPI_ASSISTANT_ID;
    
    if (!assistantId) {
      console.warn(`[${timestamp}] ⚠️  Configuration Error: Missing VAPI_ASSISTANT_ID`);
      return res.status(400).json({
        success: false,
        error: "Configuration Error",
        message: "VAPI Assistant ID not configured on server",
        code: "MISSING_ASSISTANT_CONFIG",
        timestamp: timestamp
      });
    }

    console.log(`[${timestamp}] 👤 User ID: ${userId || "anonymous"}`);
    console.log(`[${timestamp}] 🤖 Assistant ID: ${assistantId.substring(0, 12)}...`);
    
    // Generate unique call ID
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${timestamp}] 📞 Generated Call ID: ${callId}`);
    
    // Log call session to database
    await db.collection("vapi_calls").doc(callId).set({
      callId: callId,
      userId: userId || "anonymous",
      assistantId: assistantId,
      status: "initiated",
      startedAt: timestamp,
      initiatedFrom: "web-frontend",
      microphone: {
        checked: false,
        allowed: false
      },
      transcript: [],
      summary: null,
      recordingUrl: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[${timestamp}] ✅ Call initiated successfully`);
    console.log(`[${timestamp}] 💾 Call session saved to Firestore`);
    
    return res.status(200).json({
      success: true,
      callId: callId,
      status: "initiated",
      assistantId: assistantId,
      message: "VAPI call initiated successfully",
      timestamp: timestamp
    });

  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ERROR: Call initiation failed`);
    console.error(`[${timestamp}] 🔴 Details:`, error.message);
    
    return res.status(500).json({
      success: false,
      error: "Server Error",
      message: "Failed to initiate VAPI call",
      code: "CALL_INITIATION_ERROR",
      details: error.message,
      timestamp: timestamp
    });
  }
};

// ==================== VAPI CALL STATUS MONITORING ====================
/**
 * POST /api/vapi/update-call-status
 * Update call status and metadata during active call
 * 
 * Request Body:
 * {
 *   callId: string (required),
 *   status: string (required - "connecting", "connected", "failed", "ended"),
 *   microphone: object (optional),
 *   metadata: object (optional)
 * }
 */
export const updateCallStatus = async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const { callId, status, microphone, metadata } = req.body;
    
    if (!callId || !status) {
      console.warn(`[${timestamp}] ⚠️  Invalid request: Missing callId or status`);
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "callId and status are required",
        timestamp: timestamp
      });
    }

    console.log(`[${timestamp}] 📊 VAPI Call Status Update`);
    console.log(`[${timestamp}] 📞 Call ID: ${callId}`);
    console.log(`[${timestamp}] 🔄 Status: ${status}`);
    
    const updateData = {
      status: status,
      lastUpdated: timestamp
    };

    if (microphone) {
      updateData.microphone = microphone;
      console.log(`[${timestamp}] 🎤 Microphone: ${microphone.allowed ? "✅ Allowed" : "❌ Denied"}`);
    }

    if (metadata) {
      updateData.metadata = metadata;
    }

    // Update call record in Firestore
    await db.collection("vapi_calls").doc(callId).update(updateData);
    
    console.log(`[${timestamp}] ✅ Call status updated successfully`);
    
    return res.status(200).json({
      success: true,
      callId: callId,
      status: status,
      message: "Call status updated",
      timestamp: timestamp
    });

  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ERROR: Status update failed`);
    console.error(`[${timestamp}] 🔴 Details:`, error.message);
    
    return res.status(500).json({
      success: false,
      error: "Server Error",
      message: "Failed to update call status",
      code: "STATUS_UPDATE_ERROR",
      details: error.message,
      timestamp: timestamp
    });
  }
};

// ==================== VAPI CALL TERMINATION ====================
/**
 * POST /api/vapi/end-call
 * End an active VAPI call and save session data
 * 
 * Request Body:
 * {
 *   callId: string (required),
 *   transcript: array (optional),
 *   summary: string (optional),
 *   recordingUrl: string (optional),
 *   duration: number (optional)
 * }
 */
export const endVapiCall = async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`\n[${timestamp}] ==================== VAPI CALL TERMINATION ====================`);
    console.log(`[${timestamp}] 📥 POST /api/vapi/end-call`);
    
    const { callId, transcript, summary, recordingUrl, duration } = req.body;
    
    if (!callId) {
      console.warn(`[${timestamp}] ⚠️  Invalid request: Missing callId`);
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "callId is required",
        timestamp: timestamp
      });
    }

    console.log(`[${timestamp}] 📞 Call ID: ${callId}`);
    console.log(`[${timestamp}] ⏱️  Duration: ${duration ? duration + "s" : "unknown"}`);
    console.log(`[${timestamp}] 📝 Transcript lines: ${transcript ? transcript.length : 0}`);
    console.log(`[${timestamp}] 🎙️  Recording: ${recordingUrl ? "✅ Available" : "❌ No recording"}`);
    
    const endData = {
      status: "ended",
      endedAt: timestamp,
      transcript: transcript || [],
      summary: summary || null,
      recordingUrl: recordingUrl || null,
      duration: duration || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Update call record with final data - use merge to create if doesn't exist
    await db.collection("vapi_calls").doc(callId).set(endData, { merge: true });
    
    console.log(`[${timestamp}] ✅ Call terminated successfully`);
    console.log(`[${timestamp}] 💾 Call session updated in Firestore`);
    
    return res.status(200).json({
      success: true,
      callId: callId,
      status: "ended",
      message: "VAPI call ended and session saved",
      timestamp: timestamp
    });

  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ERROR: Call termination failed`);
    console.error(`[${timestamp}] 🔴 Details:`, error.message);
    
    return res.status(500).json({
      success: false,
      error: "Server Error",
      message: "Failed to end VAPI call",
      code: "CALL_TERMINATION_ERROR",
      details: error.message,
      timestamp: timestamp
    });
  }
};

// ==================== VAPI CALL LOG PERSISTENCE ====================
/**
 * POST /api/vapi-call-log
 * Save VAPI call log to Firestore (encrypted)
 * 
 * Request Body:
 * {
 *   callId: string (required),
 *   duration: number,
 *   transcript: array,
 *   summary: string,
 *   recordingUrl: string,
 *   startedAt: number,
 *   endedAt: number,
 *   chatMessages: array,
 *   encrypted: boolean,
 *   encryptedData: string,
 *   iv: string,
 *   signature: string
 * }
 * 
 * Responses:
 * - 200 OK: Successfully saved call log
 * - 400 Bad Request: Missing required fields or decryption failed
 * - 401 Unauthorized: Signature mismatch
 * - 403 Forbidden: Replay attack detected
 * - 500 Internal Server Error: Database error
 */
export const saveVapiCallLog = async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`\n[${timestamp}] ==================== VAPI CALL LOG PERSISTENCE ====================`);
    console.log(`[${timestamp}] 📥 POST /api/vapi-call-log - Received encrypted request`);
    
    const requestBody = req.body;
    
    // ===== CHECK IF ENCRYPTED =====
    if (!requestBody.encrypted) {
      console.warn(`[${timestamp}] ⚠️  SECURITY WARNING: Unencrypted payload received`);
      return res.status(400).json({
        error: "Bad Request",
        message: "Payload must be encrypted using AES-256-CBC",
        code: "UNENCRYPTED_DATA",
        timestamp: timestamp
      });
    }

    // ===== DECRYPT PAYLOAD =====
    console.log(`[${timestamp}] 🔓 Decrypting AES-256-CBC encrypted payload...`);
    const decryptionResult = decryptPayload(requestBody);

    if (!decryptionResult.success) {
      console.error(`[${timestamp}] ❌ DECRYPTION FAILED: ${decryptionResult.error}`);
      const statusCode = decryptionResult.code === 'SIGNATURE_MISMATCH' ? 401 : 
                        decryptionResult.code === 'REPLAY_ATTACK_DETECTED' ? 403 : 400;
      
      return res.status(statusCode).json({
        error: "Decryption Failed",
        message: decryptionResult.error,
        code: decryptionResult.code,
        timestamp: timestamp
      });
    }

    const payload = decryptionResult.data;
    console.log(`[${timestamp}] ✅ DECRYPTION SUCCESSFUL`);
    console.log(`[${timestamp}] 📦 Decrypted Payload:`, {
      callId: payload.callId,
      duration: payload.duration,
      transcriptLength: payload.transcript?.length || 0,
      hasRecording: !!payload.recordingUrl
    });

    // ===== VALIDATION =====
    if (!payload.callId) {
      console.warn(`[${timestamp}] ⚠️  VALIDATION ERROR: Missing callId`);
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required field: callId",
        code: "MISSING_CALL_ID",
        timestamp: timestamp
      });
    }

    // ===== SAVING TO FIRESTORE =====
    console.log(`[${timestamp}] 💾 Saving to Firestore collection: vapiCallLogs`);
    
    await db.collection("vapiCallLogs").doc(payload.callId).set({
      ...payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      savedAt: timestamp,
      encryptionMetadata: {
        encrypted: true,
        algorithm: "AES-256-CBC",
        verified: true,
        decryptedAt: timestamp
      }
    });

    // ===== SUCCESS =====
    console.log(`[${timestamp}] ✅ SUCCESS: Encrypted call log saved securely`);
    console.log(`[${timestamp}] 📊 Document ID: ${payload.callId}`);
    console.log(`[${timestamp}] 🔐 Encryption: AES-256-CBC with PBKDF2 key derivation`);
    
    return res.status(200).json({
      success: true,
      code: "CALL_LOG_SAVED_ENCRYPTED",
      message: "Encrypted call log stored securely in Firestore",
      data: {
        callId: payload.callId,
        duration: payload.duration,
        encrypted: true,
        encryptionAlgorithm: "AES-256-CBC",
        savedAt: timestamp
      },
      timestamp: timestamp
    });

  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ SERVER ERROR: Operation failed`);
    console.error(`[${timestamp}] 🔴 Error Details:`, {
      message: error.message,
      code: error.code
    });
    
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to process encrypted call log",
      code: "SERVER_ERROR",
      details: error.message,
      timestamp: timestamp
    });
  }
};

// ==================== VAPI CALL LOG RETRIEVAL ====================
/**
 * GET /api/vapi-call-logs
 * Retrieve all VAPI call logs from Firestore
 * 
 * Query Parameters:
 * - limit: number (default: 10)
 * - offset: number (default: 0)
 * 
 * Responses:
 * - 200 OK: Successfully retrieved logs
 * - 500 Internal Server Error: Database error
 */
export const getVapiCallLogs = async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`\n[${timestamp}] 📥 GET /api/vapi-call-logs - Retrieve call logs`);
    
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    console.log(`[${timestamp}] 🔍 Query: limit=${limit}, offset=${offset}`);

    const snapshot = await db.collection("vapiCallLogs")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .offset(offset)
      .get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`[${timestamp}] ✅ SUCCESS: Retrieved ${logs.length} call logs`);

    return res.status(200).json({
      success: true,
      code: "LOGS_RETRIEVED",
      message: "Call logs retrieved successfully",
      data: {
        count: logs.length,
        logs: logs
      },
      timestamp: timestamp
    });

  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ SERVER ERROR: Failed to retrieve logs`);
    console.error(`[${timestamp}] 🔴 Error Details:`, error.message);

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve call logs",
      code: "DATABASE_ERROR",
      details: error.message,
      timestamp: timestamp
    });
  }
};

/**
 * GET /api/vapi-call-log/:callId
 * Retrieve specific VAPI call log by ID
 * 
 * Path Parameters:
 * - callId: string (required)
 * 
 * Responses:
 * - 200 OK: Successfully retrieved log
 * - 404 Not Found: Call log not found
 * - 500 Internal Server Error: Database error
 */
export const getVapiCallLogById = async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const { callId } = req.params;
    
    console.log(`\n[${timestamp}] 📥 GET /api/vapi-call-log/:callId - Retrieve: ${callId}`);

    const doc = await db.collection("vapiCallLogs").doc(callId).get();

    // ===== NOT FOUND =====
    if (!doc.exists) {
      console.warn(`[${timestamp}] ⚠️  NOT FOUND: No log for callId: ${callId}`);
      return res.status(404).json({
        error: "Not Found",
        message: "Call log not found",
        code: "LOG_NOT_FOUND",
        callId: callId,
        timestamp: timestamp
      });
    }

    // ===== SUCCESS =====
    console.log(`[${timestamp}] ✅ SUCCESS: Log retrieved for callId: ${callId}`);

    return res.status(200).json({
      success: true,
      code: "LOG_RETRIEVED",
      message: "Call log retrieved successfully",
      data: {
        id: doc.id,
        ...doc.data()
      },
      timestamp: timestamp
    });

  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ SERVER ERROR: Failed to retrieve log`);
    console.error(`[${timestamp}] 🔴 Error Details:`, error.message);

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve call log",
      code: "DATABASE_ERROR",
      details: error.message,
      timestamp: timestamp
    });
  }
};

// ==================== FRONTEND LOGGING ====================
/**
 * POST /api/logs
 * Receive and display frontend logs in backend terminal
 * 
 * Request Body:
 * {
 *   level: string ("info", "error", "warn"),
 *   message: string,
 *   args: array (optional),
 *   timestamp: string
 * }
 */
export const receiveLogs = (req, res) => {
  try {
    const { level, message, args, timestamp } = req.body;
    
    // Map log levels to emoji prefixes
    const prefix = {
      'info': '📱 [FRONTEND]',
      'error': '❌ [FRONTEND]',
      'warn': '⚠️  [FRONTEND]'
    }[level] || '📱 [FRONTEND]';

    // Print to backend terminal
    if (args && args.length > 0) {
      console.log(`${prefix} [${timestamp}] ${message}`, ...args);
    } else {
      console.log(`${prefix} [${timestamp}] ${message}`);
    }

    return res.status(200).json({ 
      success: true,
      code: "LOG_RECEIVED",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ERROR: Failed to process frontend log:', error.message);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to process log',
      details: error.message
    });
  }
};
