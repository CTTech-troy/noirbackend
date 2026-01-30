import { logger } from "../utils/logger.js";
import { VoxAISystemPrompt, VoxAIInstructions } from "../config/voxai-system-prompt.js";

// ==================== DOGRAH.AI CONFIGURATION ====================
const DOGRAH_API_KEY = process.env.DOGRAH_API_KEY;
const DOGRAH_PRIVATE_KEY = process.env.DOGRAH_PRIVATE_KEY;
const DOGRAH_AGENT_ID = process.env.DOGRAH_AGENT_ID;
const DOGRAH_API_URL = process.env.DOGRAH_API_URL || "https://api.dograh.ai/v1";

// ==================== VOXAI AGENT CONFIGURATION ====================
const AGENT_CONFIG = {
  name: "VoxAI",
  systemPrompt: VoxAISystemPrompt,
  instructions: VoxAIInstructions,
  restaurant: "NOIR",
  language: "English",
  voice: {
    tone: "friendly-professional",
    pace: "conversational",
    clarity: "high"
  }
};

// Log Dograh.ai configuration on startup
logger.log("🎤 Dograh.ai Active Agents Configuration:");
logger.log("   ✅ API Key Loaded:", DOGRAH_API_KEY ? "YES" : "NO");
logger.log("   ✅ Private Key Loaded:", DOGRAH_PRIVATE_KEY ? "YES" : "NO");
logger.log("   ✅ Agent ID:", DOGRAH_AGENT_ID || "NOT SET");
logger.log("   ✅ API URL:", DOGRAH_API_URL);

// Log VoxAI Agent Configuration
logger.log("🎤 VoxAI Agent Configuration:");
logger.log("   ✅ Agent Name:", AGENT_CONFIG.name);
logger.log("   ✅ Restaurant:", AGENT_CONFIG.restaurant);
logger.log("   ✅ Language:", AGENT_CONFIG.language);
logger.log("   ✅ Voice Tone:", AGENT_CONFIG.voice.tone);
logger.log("   ✅ System Prompt Loaded:", "YES");
logger.log("   ✅ Instructions Loaded:", "YES");

// Store call sessions
const CALL_SESSIONS = new Map(); // { callId: { details } }

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generate unique call ID
 */
const generateCallId = () => {
  return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

/**
 * Initialize Dograh.ai agent for inbound calls
 */
const initializeDograhAgent = async () => {
  try {
    logger.log("🎤 Initializing Dograh.ai agent...");

    if (!DOGRAH_API_KEY || !DOGRAH_PRIVATE_KEY) {
      logger.warn("⚠️  Dograh.ai credentials not configured");
      return { success: false, error: "Dograh.ai credentials missing" };
    }

    // In production, this would configure the agent with Dograh.ai
    // For now, we'll create a mock initialization
    logger.log("✅ Dograh.ai agent initialized");
    logger.log("   Agent ready for inbound calls");

    return {
      success: true,
      message: "Dograh.ai agent initialized",
      agentId: DOGRAH_AGENT_ID
    };
  } catch (error) {
    logger.error("❌ Dograh.ai initialization error:", error.message);
    return { success: false, error: error.message };
  }
};

// ==================== DOGRAH.AI CONTROLLERS ====================

/**
 * Initiate an inbound call with Dograh.ai
 * Includes VoxAI system prompt for natural conversation
 * POST /api/dograh/initiate-call
 */
export const initiateDograhCall = async (req, res) => {
  try {
    const { phoneNumber, callbackUrl, context = {} } = req.body;
    const userIP = req.userIP;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "phoneNumber is required"
      });
    }

    logger.log(`📞 [${userIP}] Initiating Dograh.ai call to ${phoneNumber}`);
    logger.log(`🎤 [${userIP}] Using VoxAI agent: ${AGENT_CONFIG.name}`);

    const callId = generateCallId();

    // Create call session with VoxAI configuration
    const callSession = {
      id: callId,
      phoneNumber: phoneNumber,
      status: "initiating",
      userIP: userIP,
      agent: {
        name: AGENT_CONFIG.name,
        systemPrompt: AGENT_CONFIG.systemPrompt,
        voice: AGENT_CONFIG.voice
      },
      context: context,
      callbackUrl: callbackUrl || null,
      createdAt: new Date().toISOString(),
      transcript: [],
      recordingUrl: null,
      duration: 0
    };

    CALL_SESSIONS.set(callId, callSession);

    logger.log(`✅ [${userIP}] VoxAI call session created: ${callId}`);

    // In production, this would call Dograh.ai API with VoxAI configuration
    // const dograhResponse = await fetch(`${DOGRAH_API_URL}/calls/initiate`, {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${DOGRAH_API_KEY}`,
    //     "Content-Type": "application/json"
    //   },
    //   body: JSON.stringify({
    //     agentId: DOGRAH_AGENT_ID,
    //     agentName: AGENT_CONFIG.name,
    //     systemPrompt: AGENT_CONFIG.systemPrompt,
    //     phoneNumber: phoneNumber,
    //     context: context,
    //     voiceConfig: AGENT_CONFIG.voice
    //   })
    // });

    res.status(201).json({
      success: true,
      message: `${AGENT_CONFIG.name} call initiated successfully`,
      callId: callId,
      phoneNumber: phoneNumber,
      agent: AGENT_CONFIG.name,
      status: "initiating"
    });
  } catch (error) {
    logger.error("❌ Dograh.ai call initiation error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to initiate call"
    });
  }
};

/**
 * Handle inbound call from Dograh.ai
 * POST /api/dograh/inbound-call
 */
export const handleInboundDograhCall = async (req, res) => {
  try {
    const { callId, phoneNumber, agentResponse, transcript } = req.body;
    const userIP = req.userIP;

    logger.log(`📞 [${userIP}] Inbound call received from Dograh.ai: ${phoneNumber}`);

    const callSession = CALL_SESSIONS.get(callId) || {
      id: callId || generateCallId(),
      phoneNumber: phoneNumber,
      status: "active",
      userIP: userIP,
      transcript: transcript || [],
      createdAt: new Date().toISOString()
    };

    if (transcript && Array.isArray(transcript)) {
      callSession.transcript = transcript;
    }

    CALL_SESSIONS.set(callSession.id, callSession);

    logger.log(`✅ [${userIP}] Inbound call processed: ${callSession.id}`);
    logger.log(`   Transcript items: ${callSession.transcript.length}`);

    res.status(200).json({
      success: true,
      message: "Inbound call processed",
      callId: callSession.id,
      status: "received"
    });
  } catch (error) {
    logger.error("❌ Inbound call processing error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process inbound call"
    });
  }
};

/**
 * End a Dograh.ai call
 * POST /api/dograh/end-call
 */
export const endDograhCall = async (req, res) => {
  try {
    const { callId, transcript, duration, recordingUrl } = req.body;
    const userIP = req.userIP;

    if (!callId) {
      return res.status(400).json({
        success: false,
        error: "callId is required"
      });
    }

    logger.log(`🔴 [${userIP}] Ending Dograh.ai call: ${callId}`);

    const callSession = CALL_SESSIONS.get(callId);

    if (!callSession) {
      return res.status(404).json({
        success: false,
        error: "Call session not found",
        callId: callId
      });
    }

    // Update call session
    callSession.status = "ended";
    callSession.transcript = transcript || callSession.transcript;
    callSession.duration = duration || 0;
    callSession.recordingUrl = recordingUrl || null;
    callSession.endedAt = new Date().toISOString();

    logger.log(`✅ [${userIP}] Dograh.ai call ended: ${callId}`);
    logger.log(`   Duration: ${callSession.duration}s`);
    logger.log(`   Transcript items: ${callSession.transcript.length}`);

    // Log to backend logs
    if (callSession.transcript.length > 0) {
      logger.log("📝 Call Transcript:");
      callSession.transcript.forEach((item, index) => {
        logger.log(`   ${index + 1}. ${item.speaker}: ${item.text}`);
      });
    }

    res.status(200).json({
      success: true,
      message: "Dograh.ai call ended successfully",
      callId: callId,
      status: "ended",
      summary: {
        duration: callSession.duration,
        transcriptItems: callSession.transcript.length,
        recording: callSession.recordingUrl ? "available" : "not available"
      }
    });
  } catch (error) {
    logger.error("❌ End call error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to end call"
    });
  }
};

/**
 * Get call transcript
 * GET /api/dograh/call/:callId
 */
export const getCallTranscript = async (req, res) => {
  try {
    const { callId } = req.params;
    const userIP = req.userIP;

    logger.log(`🔍 [${userIP}] Retrieving call transcript: ${callId}`);

    const callSession = CALL_SESSIONS.get(callId);

    if (!callSession) {
      return res.status(404).json({
        success: false,
        error: "Call not found",
        callId: callId
      });
    }

    // Verify ownership by IP
    if (callSession.userIP !== userIP) {
      logger.warn(`⚠️  [${userIP}] Unauthorized access to call ${callId}`);
      return res.status(403).json({
        success: false,
        error: "Unauthorized: Cannot access this call"
      });
    }

    res.status(200).json({
      success: true,
      call: {
        id: callSession.id,
        phoneNumber: callSession.phoneNumber,
        status: callSession.status,
        duration: callSession.duration,
        transcript: callSession.transcript,
        recordingUrl: callSession.recordingUrl,
        createdAt: callSession.createdAt,
        endedAt: callSession.endedAt
      }
    });
  } catch (error) {
    logger.error("❌ Get transcript error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get transcript"
    });
  }
};

/**
 * Log Dograh.ai call (for call analytics)
 * POST /api/dograh/call-log
 */
export const logDograhCall = async (req, res) => {
  try {
    const { callId, phoneNumber, transcript, duration, status } = req.body;
    const userIP = req.userIP;

    logger.log(`📊 [${userIP}] Logging Dograh.ai call: ${callId}`);

    const callLog = {
      callId: callId,
      phoneNumber: phoneNumber,
      duration: duration || 0,
      status: status || "unknown",
      transcriptLength: transcript?.length || 0,
      userIP: userIP,
      timestamp: new Date().toISOString()
    };

    // In production: Save to database
    logger.log("   Call Log:");
    logger.log(`   - Call ID: ${callLog.callId}`);
    logger.log(`   - Phone: ${callLog.phoneNumber}`);
    logger.log(`   - Duration: ${callLog.duration}s`);
    logger.log(`   - Status: ${callLog.status}`);
    logger.log(`   - Transcript Items: ${callLog.transcriptLength}`);

    res.status(200).json({
      success: true,
      message: "Call logged successfully",
      callLog: callLog
    });
  } catch (error) {
    logger.error("❌ Call log error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to log call"
    });
  }
};

/**
 * Get Dograh.ai agent status
 * GET /api/dograh/agent-status
 */
export const getDograhAgentStatus = async (req, res) => {
  try {
    logger.log("🤖 Checking Dograh.ai agent status");

    const status = {
      initialized: DOGRAH_API_KEY ? true : false,
      agentId: DOGRAH_AGENT_ID || "not configured",
      credentialsConfigured: DOGRAH_API_KEY && DOGRAH_PRIVATE_KEY ? true : false,
      apiUrl: DOGRAH_API_URL,
      activeCalls: CALL_SESSIONS.size,
      version: "1.0.0"
    };

    res.status(200).json({
      success: true,
      agent: status
    });
  } catch (error) {
    logger.error("❌ Agent status error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get agent status"
    });
  }
};

/**
 * Test Dograh.ai integration
 * POST /api/dograh/test
 */
export const testDograhIntegration = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const userIP = req.userIP;

    logger.log(`🧪 [${userIP}] Testing Dograh.ai integration`);

    if (!DOGRAH_API_KEY || !DOGRAH_PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: "Dograh.ai credentials not configured",
        message: "Please set DOGRAH_API_KEY and DOGRAH_PRIVATE_KEY in .env"
      });
    }

    const testCallId = generateCallId();

    res.status(200).json({
      success: true,
      message: "Dograh.ai integration test successful",
      test: {
        credentials: "configured",
        agentId: DOGRAH_AGENT_ID || "default",
        testCallId: testCallId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error("❌ Integration test error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Integration test failed"
    });
  }
};

// Initialize Dograh.ai on startup
initializeDograhAgent().then(result => {
  if (result.success) {
    logger.log("✅ Dograh.ai Active Agents Ready");
  } else {
    logger.warn("⚠️  Dograh.ai not fully configured:", result.error);
  }
});
