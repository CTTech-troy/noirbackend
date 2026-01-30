import express from "express";
import {
  initiateDograhCall,
  handleInboundDograhCall,
  endDograhCall,
  getCallTranscript,
  logDograhCall,
  getDograhAgentStatus,
  testDograhIntegration
} from "../controller/dograh.Controller.js";

const router = express.Router();

/**
 * DOGRAH.AI INBOUND CALL ROUTES
 * 
 * These endpoints handle:
 * - Initiating outbound calls via Dograh.ai Active Agents
 * - Receiving & processing inbound calls
 * - Managing call transcripts
 * - Call logging & analytics
 */

// ==================== CALL MANAGEMENT ====================

/**
 * Initiate a call via Dograh.ai
 * POST /api/dograh/initiate-call
 * 
 * Body:
 * {
 *   "phoneNumber": "+1234567890",
 *   "callbackUrl": "https://yourdomain.com/callback",
 *   "context": { "reservationId": "123", "message": "Your reservation..." }
 * }
 */
router.post("/initiate-call", initiateDograhCall);

/**
 * Handle inbound call from Dograh.ai
 * POST /api/dograh/inbound-call
 * 
 * Received from Dograh.ai webhook when call comes in
 * Body:
 * {
 *   "callId": "call_xyz",
 *   "phoneNumber": "+1234567890",
 *   "agentResponse": "...",
 *   "transcript": [{ "speaker": "agent", "text": "Hello" }, ...]
 * }
 */
router.post("/inbound-call", handleInboundDograhCall);

/**
 * End a Dograh.ai call
 * POST /api/dograh/end-call
 * 
 * Body:
 * {
 *   "callId": "call_xyz",
 *   "transcript": [...],
 *   "duration": 125,
 *   "recordingUrl": "https://..."
 * }
 */
router.post("/end-call", endDograhCall);

// ==================== TRANSCRIPT & HISTORY ====================

/**
 * Get call transcript & details
 * GET /api/dograh/call/:callId
 * 
 * Returns:
 * {
 *   "call": {
 *     "id": "call_xyz",
 *     "status": "ended",
 *     "transcript": [...],
 *     "duration": 125
 *   }
 * }
 */
router.get("/call/:callId", getCallTranscript);

/**
 * Log call for analytics
 * POST /api/dograh/call-log
 * 
 * Body:
 * {
 *   "callId": "call_xyz",
 *   "phoneNumber": "+1234567890",
 *   "transcript": [...],
 *   "duration": 125,
 *   "status": "completed"
 * }
 */
router.post("/call-log", logDograhCall);

// ==================== AGENT STATUS ====================

/**
 * Get Dograh.ai agent status
 * GET /api/dograh/agent-status
 * 
 * Returns:
 * {
 *   "agent": {
 *     "initialized": true,
 *     "agentId": "agent_xyz",
 *     "activeCalls": 2
 *   }
 * }
 */
router.get("/agent-status", getDograhAgentStatus);

// ==================== TESTING ====================

/**
 * Test Dograh.ai integration
 * POST /api/dograh/test
 * 
 * Verifies that Dograh.ai is properly configured
 * 
 * Body:
 * {
 *   "phoneNumber": "+1234567890" (optional)
 * }
 */
router.post("/test", testDograhIntegration);

// ==================== HEALTH CHECK ====================

/**
 * Health check for Dograh.ai routes
 * GET /api/dograh/health
 */
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Dograh.ai Active Agents",
    timestamp: new Date().toISOString()
  });
});

export default router;
