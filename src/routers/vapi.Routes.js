import express from "express";
import { 
  // VAPI Call Management
  makeVapiCall,
  initiateVapiCall,
  updateCallStatus,
  endVapiCall,
  
  // VAPI Call Log Persistence
  saveVapiCallLog,
  getVapiCallLogs,
  getVapiCallLogById,
  
  // Frontend Logging
  receiveLogs
} from "../controller/vapi.Controller.js";

const router = express.Router();

// ==================== VAPI CALL MANAGEMENT ENDPOINTS ====================

// POST - Make a Vapi call (frontend -> backend -> Vapi)
// Status: 200 (Success), 400 (Configuration Error), 500 (Server Error)
router.post("/vapi/make-call", makeVapiCall);

// POST - Initiate a new VAPI call
// Status: 200 (Success), 400 (Configuration Error), 500 (Server Error)
router.post("/vapi/initiate-call", initiateVapiCall);

// POST - Update call status during active call
// Status: 200 (Success), 400 (Bad Request), 500 (Server Error)
router.post("/vapi/update-call-status", updateCallStatus);

// POST - End an active VAPI call and save session
// Status: 200 (Success), 400 (Bad Request), 500 (Server Error)
router.post("/vapi/end-call", endVapiCall);

// ==================== VAPI CALL LOG PERSISTENCE ENDPOINTS ====================

// POST - Save encrypted VAPI call log
// Status: 200 (Success), 400 (Validation Error), 401 (Auth Error), 403 (Replay Attack), 500 (Server Error)
router.post("/vapi-call-log", saveVapiCallLog);

// GET - Retrieve all VAPI call logs
// Status: 200 (Success), 500 (Server Error)
// Query Params: limit (default: 10), offset (default: 0)
router.get("/vapi-call-logs", getVapiCallLogs);

// GET - Retrieve specific VAPI call log by ID
// Status: 200 (Success), 404 (Not Found), 500 (Server Error)
router.get("/vapi-call-log/:callId", getVapiCallLogById);

// ==================== FRONTEND LOGGING ENDPOINT ====================

// POST - Receive frontend logs and display in backend terminal
router.post("/logs", receiveLogs);

export default router;
