import express from "express";
import {
  chatWithAI,
  checkOpenAIHealth,
  checkAvailability,
  createReservation
} from "../controller/openai.Controller.js";

const router = express.Router();

/**
 * @route POST /api/openai/chat
 * @description Chat with OpenAI powered by restaurant context
 * @body { message: string, conversationHistory: array }
 * @returns { success: boolean, message: string, timestamp: string }
 */
router.post("/chat", chatWithAI);

/**
 * @route POST /api/openai/check-availability
 * @description Check table availability
 * @body { numGuests: number, date: string, time: string }
 * @returns { success: boolean, available: boolean, message: string }
 */
router.post("/check-availability", checkAvailability);

/**
 * @route POST /api/openai/create-reservation
 * @description Create a table reservation
 * @body { customerName: string, numGuests: number, date: string, time: string, email?: string, phone?: string }
 * @returns { success: boolean, booking: object }
 */
router.post("/create-reservation", createReservation);

/**
 * @route GET /api/openai/health
 * @description Check OpenRouter API health
 * @returns { configured: boolean, apiWorking: boolean }
 */
router.get("/health", checkOpenAIHealth);

export default router;
