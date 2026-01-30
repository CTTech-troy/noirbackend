import { logger } from "../utils/logger.js";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Log API key status on startup
logger.log("🔑 OpenRouter Configuration Check:");
logger.log("   ✅ API Key Loaded:", OPENROUTER_API_KEY ? "YES" : "NO");
logger.log("   ✅ Key Format:", OPENROUTER_API_KEY?.startsWith("sk-") ? "VALID (sk-)" : "CUSTOM KEY");
logger.log("   ✅ Key Length:", OPENROUTER_API_KEY?.length || 0, "characters");
logger.log("   ✅ API URL:", OPENROUTER_API_URL);

// Restaurant context for the AI
// Mock table availability data (in production, query your database)
const RESTAURANT_TABLES = {
  tables: [
    { id: 1, seats: 2, available: true },
    { id: 2, seats: 2, available: true },
    { id: 3, seats: 4, available: true },
    { id: 4, seats: 4, available: false },
    { id: 5, seats: 6, available: true },
    { id: 6, seats: 8, available: true }
  ]
};

// Check table availability
const checkTableAvailability = (numGuests, date, time) => {
  // In production: Query Firebase/database for real availability
  const availableTables = RESTAURANT_TABLES.tables.filter(
    table => table.seats >= numGuests && table.available
  );
  
  return {
    available: availableTables.length > 0,
    tables: availableTables,
    date: date,
    time: time,
    message: availableTables.length > 0 
      ? `✅ We have ${availableTables.length} table(s) available for ${numGuests} guest(s) on ${date} at ${time}`
      : `❌ Unfortunately, we don't have availability for ${numGuests} guest(s) on ${date} at ${time}. Would you like to try another time?`
  };
};

const RESTAURANT_CONTEXT = `You are a friendly, professional restaurant front-desk assistant for NOIR, an upscale fine dining restaurant.

Your main role is to help customers:
- Book a table
- Check table availability
- Manage reservations

🍽️ NOIR Restaurant Details:
- Cuisine: Fine Dining (Contemporary French)
- Hours: 11 AM - 11 PM, Closed Mondays
- Location: Downtown District
- Specialty: Contemporary French cuisine with modern twists
- Atmosphere: Upscale, elegant, perfect for special occasions

Conversation rules:
1. Greet the customer politely and briefly.
2. Ask for the required booking details step-by-step:
   - Customer name
   - Number of seats (guests)
   - Date of reservation
   - Time of reservation
3. Before confirming a booking, you MUST check if a table is available for the requested number of seats, date, and time.
4. If tables are available:
   - Confirm availability
   - Ask the customer to confirm the booking
   - Once confirmed, provide a booking confirmation with date, time, and party size
5. If tables are NOT available:
   - Politely inform the customer
   - Suggest alternative times or dates (e.g., "We have availability at 7:30 PM or 8:15 PM")
6. Always confirm the final booking details clearly before ending the conversation.
7. Keep responses short, friendly, and easy to understand.
8. If the user gives incomplete information, ask only for what is missing.
9. For questions about menu, special dietary needs, or restaurant info - provide helpful, concise answers.

Tone & style:
- Warm, polite, and professional
- Simple language
- No technical explanations
- Match NOIR's upscale brand

You are NOT allowed to:
- Confirm bookings without checking availability first
- Ask unnecessary questions
- Provide false availability information
- Make up menu items`;

/**
 * Generate a response using OpenAI GPT-4
 * @param {string} userMessage - User's message
 * @param {array} conversationHistory - Previous messages for context
 * @returns {Promise<string>} - AI response
 */
export const generateAIResponse = async (userMessage, conversationHistory = []) => {
  try {
    if (!OPENROUTER_API_KEY) {
      logger.error("❌ OPENROUTER_API_KEY is not configured");
      throw new Error("OpenRouter API key not configured");
    }

    logger.log("🤖 [OpenRouter] Processing message:", userMessage.substring(0, 50) + "...");
    logger.log("🤖 [OpenRouter] API Key status: ✅ Loaded");

    // Build conversation messages
    const messages = [
      {
        role: "system",
        content: RESTAURANT_CONTEXT
      },
      ...conversationHistory.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      {
        role: "user",
        content: userMessage
      }
    ];

    logger.log("🤖 [OpenRouter] Message count:", messages.length);
    logger.log("🤖 [OpenRouter] Model: gpt-3.5-turbo (via OpenRouter)");
    logger.log("🤖 [OpenRouter] Sending to:", OPENROUTER_API_URL);

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "NOIR Restaurant Chatbot"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.9
      })
    });

    logger.log("🤖 [OpenRouter] Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json();
      logger.error("🤖 [OpenRouter] ❌ API Error Status:", response.status);
      logger.error("🤖 [OpenRouter] ❌ Error Message:", errorData.error?.message);
      logger.error("🤖 [OpenRouter] ❌ Full Error:", errorData);
      throw new Error(errorData.error?.message || "OpenRouter API error");
    }

    const data = await response.json();
    
    // Debug: Log full response structure
    logger.log("🤖 [OpenRouter] Full response:", JSON.stringify(data, null, 2));
    
    const aiMessage = data.choices?.[0]?.message?.content;

    if (!aiMessage) {
      logger.error("🤖 [OpenRouter] ❌ No response content received");
      logger.error("🤖 [OpenRouter] ❌ Response structure:", JSON.stringify(data));
      logger.error("🤖 [OpenRouter] ❌ Choices:", data.choices);
      
      // Fallback response
      const fallbackMessage = "I apologize, but I'm having trouble processing your request. Please try again.";
      logger.log("🤖 [OpenRouter] ℹ️ Using fallback response");
      return fallbackMessage;
    }

    logger.log("🤖 [OpenRouter] ✅ Response received:", aiMessage.substring(0, 50) + "...");
    logger.log("🤖 [OpenRouter] ✅ Model used:", data.model);
    logger.log("🤖 [OpenRouter] ✅ Tokens - Input:", data.usage?.prompt_tokens, "Output:", data.usage?.completion_tokens);
    return aiMessage;

  } catch (error) {
    logger.error("🤖 [OpenRouter] ❌ Error generating AI response:", error.message);
    logger.error("🤖 [OpenRouter] ❌ Full error:", error);
    throw error;
  }
};

/**
 * Chat endpoint handler with IP-based session isolation
 */
export const chatWithAI = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const userIP = req.userIP; // From middleware

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: "Message is required and must be a string"
      });
    }

    logger.log(`💬 [${userIP}] Processing chat message:`, message.substring(0, 50) + "...");

    // Generate response using OpenRouter
    const aiResponse = await generateAIResponse(message, conversationHistory);

    logger.log(`✅ [${userIP}] Response generated`);

    res.status(200).json({
      success: true,
      message: aiResponse,
      sessionId: userIP, // Return IP as session identifier
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error("❌ Chat error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process chat message"
    });
  }
};

/**
 * Check table availability for booking
 */
export const checkAvailability = async (req, res) => {
  try {
    const { numGuests, date, time } = req.body;

    if (!numGuests || !date || !time) {
      return res.status(400).json({
        success: false,
        error: "numGuests, date, and time are required"
      });
    }

    logger.log("📅 [Availability Check] Checking tables for:", { numGuests, date, time });

    const availability = checkTableAvailability(numGuests, date, time);

    logger.log("📅 [Availability Check] Result:", availability.message);

    res.status(200).json({
      success: true,
      available: availability.available,
      message: availability.message,
      availableTables: availability.tables.length,
      details: availability
    });

  } catch (error) {
    logger.error("❌ Availability check error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to check availability"
    });
  }
};

/**
 * Create a reservation
 */
export const createReservation = async (req, res) => {
  try {
    const { customerName, numGuests, date, time, email, phone } = req.body;

    if (!customerName || !numGuests || !date || !time) {
      return res.status(400).json({
        success: false,
        error: "customerName, numGuests, date, and time are required"
      });
    }

    // Check availability first
    const availability = checkTableAvailability(numGuests, date, time);

    if (!availability.available) {
      return res.status(400).json({
        success: false,
        error: "No tables available for the requested date and time",
        suggested: "Please try different time slots"
      });
    }

    // Create booking (in production, save to Firebase)
    const reservationId = `RES-${Date.now()}`;
    const booking = {
      id: reservationId,
      customerName,
      numGuests,
      date,
      time,
      email,
      phone,
      status: "confirmed",
      createdAt: new Date().toISOString()
    };

    logger.log("✅ [Reservation] Booking confirmed:", booking);

    res.status(201).json({
      success: true,
      message: `Reservation confirmed! Booking ID: ${reservationId}`,
      booking: booking
    });

  } catch (error) {
    logger.error("❌ Reservation error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create reservation"
    });
  }
};

/**
 * Health check for OpenRouter integration
 */
export const checkOpenAIHealth = async (req, res) => {
  try {
    logger.log("🏥 [OpenRouter Health Check] Starting...");
    
    const isConfigured = !!OPENROUTER_API_KEY;
    logger.log("🏥 [OpenRouter Health Check] API Key configured:", isConfigured ? "✅ YES" : "❌ NO");
    
    const status = {
      configured: isConfigured,
      apiKey: isConfigured ? "✅ Loaded" : "❌ Missing",
      service: "OpenRouter",
      timestamp: new Date().toISOString()
    };

    if (isConfigured) {
      logger.log("🏥 [OpenRouter Health Check] Testing API connection...");
      // Test the API with a simple request
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "NOIR Restaurant Chatbot"
        },
        body: JSON.stringify({
          model: "openrouter/auto",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 10
        })
      });

      logger.log("🏥 [OpenRouter Health Check] Response status:", response.status, response.statusText);
      
      status.apiWorking = response.ok;
      status.apiStatus = response.ok ? "✅ Connected" : "❌ Connection failed";
      status.responseStatus = response.status;
      
      if (!response.ok) {
        const errorData = await response.json();
        status.error = errorData.error?.message;
        logger.error("🏥 [OpenRouter Health Check] ❌ Connection failed:", errorData.error?.message);
      } else {
        const data = await response.json();
        status.modelUsed = data.model;
        logger.log("🏥 [OpenRouter Health Check] ✅ API is working correctly");
        logger.log("🏥 [OpenRouter Health Check] ✅ Model used:", data.model);
      }
    }

    logger.log("🏥 [OpenRouter Health Check] Status:", status);
    res.status(200).json(status);

  } catch (error) {
    logger.error("🏥 [OpenRouter Health Check] ❌ Error:", error.message);
    res.status(500).json({
      configured: false,
      service: "OpenRouter",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
