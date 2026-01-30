import { logger } from "../utils/logger.js";
import { sendPaymentConfirmation } from "./email.Controller.js";

// ==================== MOCK PAYMENT PROCESSOR ====================
// In production: Stripe, Razorpay, PayPal, Square integration

const PAYMENT_CONFIG = {
  bankTransfer: {
    accountName: "NOIR Fine Dining Restaurant",
    accountNumber: "1234567890",
    routingNumber: "021000021",
    bankName: "International Bank",
    swift: "IBUSUSBB"
  },
  cashApp: {
    tag: "$noir-restaurant",
    displayName: "NOIR Restaurant"
  }
};

// Store all payments (in production: use database)
const PAYMENTS = new Map(); // { paymentId: { details } }

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generate unique payment ID
 */
const generatePaymentId = () => {
  return `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

/**
 * Validate card details
 */
const validateCardDetails = (card) => {
  const { cardNumber, expiryMonth, expiryYear, cvv, holderName } = card;

  // Remove spaces from card number
  const cleanCardNumber = cardNumber.replace(/\s/g, "");

  // Validate card number length (standard credit cards: 13-19 digits)
  if (!/^\d{13,19}$/.test(cleanCardNumber)) {
    return { valid: false, error: "Invalid card number format" };
  }

  // Validate expiry
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const expYear = parseInt(expiryYear);
  const expMonth = parseInt(expiryMonth);

  if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
    return { valid: false, error: "Card has expired" };
  }

  // Validate CVV (3 or 4 digits)
  if (!/^\d{3,4}$/.test(cvv)) {
    return { valid: false, error: "Invalid CVV format" };
  }

  // Validate holder name
  if (!holderName || holderName.trim().length < 3) {
    return { valid: false, error: "Invalid cardholder name" };
  }

  return { valid: true };
};

/**
 * Process card payment
 */
const processCardPayment = async (cardDetails, amount) => {
  const validation = validateCardDetails(cardDetails);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Mock payment processing (in production: call Stripe/PayPal API)
  logger.log(`💳 Processing card payment: ${amount} for ${cardDetails.holderName}`);

  // Simulate payment success (90% success rate for demo)
  const isSuccess = Math.random() < 0.9;

  if (isSuccess) {
    return {
      success: true,
      transactionId: `TXN-${Date.now()}`,
      status: "completed",
      message: `✅ Payment of $${amount} processed successfully`,
      maskedCard: `**** **** **** ${cardDetails.cardNumber.slice(-4)}`,
      amount: amount
    };
  } else {
    return {
      success: false,
      error: "Card declined. Please try again or use a different payment method.",
      status: "failed"
    };
  }
};

/**
 * Get bank transfer details
 */
const getBankTransferDetails = () => {
  return {
    success: true,
    method: "Bank Transfer",
    details: PAYMENT_CONFIG.bankTransfer,
    instructions: [
      "1. Transfer the amount to the bank account details provided",
      "2. Use your reservation ID as the reference/memo",
      "3. We'll confirm your reservation once payment is received",
      "4. This usually takes 1-3 business days"
    ]
  };
};

/**
 * Get CashApp details
 */
const getCashAppDetails = () => {
  return {
    success: true,
    method: "CashApp",
    details: PAYMENT_CONFIG.cashApp,
    instructions: [
      `1. Open CashApp and search for ${PAYMENT_CONFIG.cashApp.tag}`,
      "2. Send the payment amount",
      "3. Include your reservation ID in the message",
      "4. Payment confirmation will be instant"
    ]
  };
};

// ==================== PAYMENT CONTROLLERS ====================

/**
 * Process card payment
 * POST /api/payment/process-card
 */
export const processCardPaymentHandler = async (req, res) => {
  try {
    const { reservationId, cardDetails, amount, currency = "USD", email } = req.body;
    const userIP = req.userIP;

    // Validate input
    if (!reservationId || !cardDetails || !amount) {
      return res.status(400).json({
        success: false,
        error: "reservationId, cardDetails, and amount are required"
      });
    }

    logger.log(
      `💳 [${userIP}] Card payment attempt for reservation ${reservationId}`
    );

    // Process payment
    const paymentResult = await processCardPayment(cardDetails, amount);

    if (paymentResult.success) {
      const paymentId = generatePaymentId();

      // Store payment record
      PAYMENTS.set(paymentId, {
        id: paymentId,
        reservationId: reservationId,
        method: "card",
        amount: amount,
        currency: currency,
        status: "completed",
        maskedCard: paymentResult.maskedCard,
        transactionId: paymentResult.transactionId,
        userIP: userIP,
        createdAt: new Date().toISOString()
      });

      logger.log(`✅ [${userIP}] Card payment successful: ${paymentId}`);

      // Send payment confirmation email if email provided
      if (email) {
        logger.log(`📧 Sending payment confirmation to ${email}`);
        
        // Create a mock reservation object for email (in production, fetch from database)
        const reservationForEmail = {
          id: reservationId,
          email: email,
          customerName: "Guest",
          tableId: "TBD",
          tableLocation: "TBD",
          date: new Date().toISOString(),
          time: "TBD",
          numGuests: 0,
          status: "confirmed",
          createdAt: new Date().toISOString()
        };

        const paymentInfo = {
          method: "card",
          amount: amount,
          transactionId: paymentResult.transactionId,
          status: "completed"
        };

        await sendPaymentConfirmation(reservationForEmail, paymentInfo);
      }

      return res.status(201).json({
        success: true,
        message: "Payment processed successfully" + (email ? " - Confirmation email sent" : ""),
        paymentId: paymentId,
        transactionId: paymentResult.transactionId,
        amount: amount,
        currency: currency,
        maskedCard: paymentResult.maskedCard,
        status: "completed"
      });
    } else {
      logger.warn(`❌ [${userIP}] Card payment failed: ${paymentResult.error}`);

      return res.status(402).json({
        success: false,
        error: paymentResult.error,
        status: "failed"
      });
    }
  } catch (error) {
    logger.error("❌ Card payment error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process card payment"
    });
  }
};

/**
 * Get bank transfer details
 * GET /api/payment/bank-transfer/:reservationId
 */
export const getBankTransferHandler = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const userIP = req.userIP;

    logger.log(`🏦 [${userIP}] Requesting bank transfer details for ${reservationId}`);

    const details = getBankTransferDetails();

    res.status(200).json({
      success: true,
      reservationId: reservationId,
      paymentMethod: "bank_transfer",
      ...details
    });
  } catch (error) {
    logger.error("❌ Bank transfer error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get bank transfer details"
    });
  }
};

/**
 * Get CashApp details
 * GET /api/payment/cashapp/:reservationId
 */
export const getCashAppHandler = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const userIP = req.userIP;

    logger.log(`💰 [${userIP}] Requesting CashApp details for ${reservationId}`);

    const details = getCashAppDetails();

    res.status(200).json({
      success: true,
      reservationId: reservationId,
      paymentMethod: "cashapp",
      ...details
    });
  } catch (error) {
    logger.error("❌ CashApp error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get CashApp details"
    });
  }
};

/**
 * Confirm offline payment (Bank Transfer / CashApp)
 * POST /api/payment/confirm-offline
 */
export const confirmOfflinePaymentHandler = async (req, res) => {
  try {
    const { reservationId, method, notes } = req.body;
    const userIP = req.userIP;

    // Validate input
    if (!reservationId || !method) {
      return res.status(400).json({
        success: false,
        error: "reservationId and method are required"
      });
    }

    if (!["bank_transfer", "cashapp"].includes(method)) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment method. Use 'bank_transfer' or 'cashapp'"
      });
    }

    logger.log(
      `📝 [${userIP}] Confirming ${method} payment for ${reservationId}`
    );

    const paymentId = generatePaymentId();

    // Store payment record
    PAYMENTS.set(paymentId, {
      id: paymentId,
      reservationId: reservationId,
      method: method,
      status: "pending_verification",
      notes: notes || "",
      userIP: userIP,
      createdAt: new Date().toISOString(),
      verifiedAt: null
    });

    logger.log(`✅ [${userIP}] Offline payment recorded: ${paymentId}`);

    res.status(201).json({
      success: true,
      message: `${method === "bank_transfer" ? "Bank transfer" : "CashApp"} payment recorded. We'll verify and confirm your reservation within 24 hours.`,
      paymentId: paymentId,
      reservationId: reservationId,
      method: method,
      status: "pending_verification"
    });
  } catch (error) {
    logger.error("❌ Offline payment error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to record offline payment"
    });
  }
};

/**
 * Get payment status
 * GET /api/payment/status/:paymentId
 */
export const getPaymentStatusHandler = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userIP = req.userIP;

    logger.log(`🔍 [${userIP}] Checking payment status: ${paymentId}`);

    const payment = PAYMENTS.get(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: "Payment not found",
        paymentId: paymentId
      });
    }

    // Verify ownership by IP
    if (payment.userIP !== userIP) {
      logger.warn(`⚠️  [${userIP}] Unauthorized access to payment ${paymentId}`);
      return res.status(403).json({
        success: false,
        error: "Unauthorized: Cannot access this payment"
      });
    }

    res.status(200).json({
      success: true,
      payment: payment
    });
  } catch (error) {
    logger.error("❌ Get payment status error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get payment status"
    });
  }
};

/**
 * Get payment methods info
 * GET /api/payment/methods
 */
export const getPaymentMethodsHandler = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      paymentMethods: [
        {
          id: "card",
          name: "Credit/Debit Card",
          icon: "💳",
          description: "Process payment immediately with your card",
          instantPayment: true
        },
        {
          id: "cashapp",
          name: "CashApp",
          icon: "💰",
          description: `Send to ${PAYMENT_CONFIG.cashApp.tag}`,
          instantPayment: true
        },
        {
          id: "bank_transfer",
          name: "Bank Transfer",
          icon: "🏦",
          description: "Transfer to our bank account",
          instantPayment: false,
          estimatedTime: "1-3 business days"
        }
      ],
      bankDetails: PAYMENT_CONFIG.bankTransfer,
      cashAppTag: PAYMENT_CONFIG.cashApp.tag
    });
  } catch (error) {
    logger.error("❌ Get payment methods error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get payment methods"
    });
  }
};
