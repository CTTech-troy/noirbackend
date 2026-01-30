import express from "express";
import {
  processCardPaymentHandler,
  getBankTransferHandler,
  getCashAppHandler,
  confirmOfflinePaymentHandler,
  getPaymentStatusHandler,
  getPaymentMethodsHandler
} from "../controller/payment.Controller.js";

const router = express.Router();

// ==================== PAYMENT ROUTES ====================

/**
 * @route   GET /api/payment/methods
 * @desc    Get all available payment methods
 * @returns { success, paymentMethods[], bankDetails, cashAppTag }
 */
router.get("/methods", getPaymentMethodsHandler);

/**
 * @route   POST /api/payment/process-card
 * @desc    Process credit/debit card payment
 * @body    { reservationId, cardDetails: { cardNumber, expiryMonth, expiryYear, cvv, holderName }, amount, currency }
 * @returns { success, paymentId, transactionId, status }
 */
router.post("/process-card", processCardPaymentHandler);

/**
 * @route   GET /api/payment/bank-transfer/:reservationId
 * @desc    Get bank transfer details
 * @params  reservationId
 * @returns { success, bankDetails, instructions }
 */
router.get("/bank-transfer/:reservationId", getBankTransferHandler);

/**
 * @route   GET /api/payment/cashapp/:reservationId
 * @desc    Get CashApp payment details
 * @params  reservationId
 * @returns { success, cashAppTag, instructions }
 */
router.get("/cashapp/:reservationId", getCashAppHandler);

/**
 * @route   POST /api/payment/confirm-offline
 * @desc    Confirm offline payment (Bank Transfer / CashApp)
 * @body    { reservationId, method: "bank_transfer" | "cashapp", notes? }
 * @returns { success, paymentId, status: "pending_verification" }
 */
router.post("/confirm-offline", confirmOfflinePaymentHandler);

/**
 * @route   GET /api/payment/status/:paymentId
 * @desc    Get payment status (must be owner)
 * @params  paymentId
 * @returns { success, payment }
 */
router.get("/status/:paymentId", getPaymentStatusHandler);

export default router;
