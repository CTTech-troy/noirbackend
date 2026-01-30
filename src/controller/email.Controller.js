import nodemailer from "nodemailer";
import { logger } from "../utils/logger.js";

// ==================== EMAIL CONFIGURATION ====================
const EMAIL_CONFIG = {
  service: process.env.SMTP_SERVICE || "gmail",
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true" || false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  },
  from: process.env.SMTP_FROM || "noreply@noir-restaurant.com"
};

// Initialize transporter
let transporter = null;

const initializeTransporter = () => {
  if (transporter) return transporter;

  if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
    logger.warn("⚠️  SMTP credentials not configured. Email service disabled.");
    logger.warn("   Set SMTP_USER and SMTP_PASSWORD in .env file");
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      service: EMAIL_CONFIG.service,
      host: EMAIL_CONFIG.host,
      port: EMAIL_CONFIG.port,
      secure: EMAIL_CONFIG.secure,
      auth: EMAIL_CONFIG.auth
    });

    logger.log("✅ Email transporter initialized");
    logger.log("   Service:", EMAIL_CONFIG.service);
    logger.log("   From:", EMAIL_CONFIG.from);

    return transporter;
  } catch (error) {
    logger.error("❌ Email transporter initialization failed:", error.message);
    return null;
  }
};

// ==================== EMAIL TEMPLATES ====================

/**
 * Generate reservation confirmation HTML email
 */
const getReservationConfirmationTemplate = (reservation, paymentInfo) => {
  const confirmationDate = new Date(reservation.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const reservationDate = new Date(reservation.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          }
          .header {
            background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%);
            padding: 40px 20px;
            text-align: center;
            color: white;
          }
          .header h1 {
            font-size: 36px;
            font-weight: 300;
            letter-spacing: 4px;
            margin-bottom: 10px;
          }
          .header p {
            font-size: 14px;
            opacity: 0.9;
            letter-spacing: 2px;
          }
          .content {
            padding: 40px;
          }
          .greeting {
            font-size: 18px;
            color: #1a1a1a;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .confirmation-message {
            background: #f0f8ff;
            border-left: 4px solid #d4a574;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
            color: #333;
          }
          .reservation-details {
            margin: 30px 0;
            border-top: 2px solid #f0f0f0;
            border-bottom: 2px solid #f0f0f0;
            padding: 30px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 15px 0;
            font-size: 15px;
          }
          .detail-label {
            color: #666;
            font-weight: 600;
          }
          .detail-value {
            color: #1a1a1a;
            font-weight: 500;
          }
          .reservation-id {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 16px;
            border-radius: 6px;
            margin: 20px 0;
            text-align: center;
          }
          .reservation-id .label {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
          }
          .reservation-id .code {
            font-size: 20px;
            font-weight: bold;
            color: #d4a574;
            font-family: 'Courier New', monospace;
          }
          .table-info {
            background: #f9f9f9;
            padding: 16px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .table-info p {
            margin: 8px 0;
            font-size: 14px;
          }
          .table-number {
            font-size: 28px;
            font-weight: bold;
            color: #d4a574;
            margin: 10px 0;
          }
          .location {
            color: #666;
            font-size: 14px;
          }
          .payment-status {
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .payment-status.pending {
            background: #fff8e1;
            border-left-color: #ffc107;
          }
          .payment-status h3 {
            color: #2e7d32;
            margin-bottom: 8px;
            font-size: 16px;
          }
          .payment-status.pending h3 {
            color: #f57f17;
          }
          .payment-status p {
            font-size: 14px;
            color: #555;
          }
          .instructions {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 6px;
            margin: 30px 0;
          }
          .instructions h3 {
            color: #1a1a1a;
            margin-bottom: 15px;
            font-size: 16px;
          }
          .instructions ol {
            margin-left: 20px;
          }
          .instructions li {
            margin: 10px 0;
            color: #555;
            font-size: 14px;
            line-height: 1.6;
          }
          .footer {
            background: #f9f9f9;
            padding: 30px 40px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
          }
          .footer-text {
            font-size: 13px;
            color: #999;
            line-height: 1.8;
          }
          .restaurant-info {
            margin: 20px 0;
            padding: 15px;
            background: #fafafa;
            border-radius: 6px;
            font-size: 13px;
            color: #666;
          }
          .cta-button {
            display: inline-block;
            background: #d4a574;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
            font-size: 14px;
          }
          .cta-button:hover {
            background: #b8860b;
            text-decoration: none;
          }
          .divider {
            height: 1px;
            background: #e0e0e0;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>NOIR</h1>
            <p>FINE DINING EXPERIENCE</p>
          </div>

          <!-- Content -->
          <div class="content">
            <p class="greeting">Hello ${reservation.customerName},</p>

            <div class="confirmation-message">
              ✅ Your reservation at NOIR has been confirmed! We're delighted to have you join us.
            </div>

            <!-- Reservation Details -->
            <div class="reservation-details">
              <div class="detail-row">
                <span class="detail-label">📅 Date</span>
                <span class="detail-value">${reservationDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">⏰ Time</span>
                <span class="detail-value">${reservation.time}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">👥 Party Size</span>
                <span class="detail-value">${reservation.numGuests} Guest${reservation.numGuests > 1 ? 's' : ''}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📍 Location</span>
                <span class="detail-value">${reservation.tableLocation}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📋 Status</span>
                <span class="detail-value">${reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}</span>
              </div>
            </div>

            <!-- Reservation ID -->
            <div class="reservation-id">
              <div class="label">YOUR RESERVATION ID</div>
              <div class="code">${reservation.id}</div>
              <div class="label" style="font-size: 11px; margin-top: 8px;">Please mention this ID upon arrival</div>
            </div>

            <!-- Table Information -->
            <div class="table-info">
              <p style="color: #999; font-weight: 600;">Your Reserved Table</p>
              <div class="table-number">Table #${reservation.tableId}</div>
              <div class="location">${reservation.tableLocation} Area • ${reservation.tableLocation === 'Window' ? '🪟 Window View' : reservation.tableLocation === 'Patio' ? '🌳 Outdoor Seating' : reservation.tableLocation === 'Private' ? '🔒 Private Dining' : '🍽️ Dining Area'}</div>
            </div>

            <!-- Payment Status -->
            ${paymentInfo?.status === 'completed' ? `
              <div class="payment-status">
                <h3>✅ Payment Received</h3>
                <p>Thank you! Your payment of $${paymentInfo.amount} has been processed successfully.</p>
                <p style="margin-top: 8px; font-size: 12px;">Transaction ID: <strong>${paymentInfo.transactionId}</strong></p>
              </div>
            ` : paymentInfo ? `
              <div class="payment-status pending">
                <h3>⏳ Payment Pending Verification</h3>
                <p>We received your ${paymentInfo.method === 'bank_transfer' ? 'bank transfer payment details' : 'CashApp payment confirmation'}. We will verify and confirm within 24 hours.</p>
              </div>
            ` : ''}

            <!-- Instructions -->
            <div class="instructions">
              <h3>📌 Important Information</h3>
              <ol>
                <li><strong>Arrival Time:</strong> Please arrive 10-15 minutes before your reservation time.</li>
                <li><strong>Cancellation:</strong> To cancel or modify your reservation, please contact us at least 24 hours in advance.</li>
                <li><strong>Dress Code:</strong> Business casual to elegant attire required.</li>
                <li><strong>Special Requests:</strong> If you have any dietary restrictions or special occasions, please let us know.</li>
                <li><strong>Contact:</strong> In case of any issues, reach out to us immediately.</li>
              </ol>
            </div>

            <!-- Restaurant Info -->
            <div class="restaurant-info">
              <strong>NOIR Fine Dining Restaurant</strong><br>
              📍 Downtown District<br>
              📞 +1 (555) 123-4567<br>
              📧 reservations@noir-restaurant.com<br>
              🌐 www.noir-restaurant.com
            </div>

            <!-- Call to Action -->
            <div style="text-align: center;">
              <a href="http://localhost:5173" class="cta-button">View Reservation Online</a>
            </div>

            <p style="color: #999; font-size: 13px; text-align: center; margin-top: 30px;">
              We look forward to providing you with an unforgettable fine dining experience at NOIR.
            </p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">
              This is an automated confirmation email. Please do not reply to this email.<br>
              For reservations or inquiries, contact: reservations@noir-restaurant.com<br>
              <br>
              © 2026 NOIR Fine Dining. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// ==================== EMAIL CONTROLLERS ====================

/**
 * Send reservation confirmation email
 */
export const sendReservationConfirmation = async (reservation, paymentInfo = null) => {
  try {
    const emailTransporter = initializeTransporter();

    if (!emailTransporter) {
      logger.warn("⚠️  Email service not available. Skipping email notification.");
      return { success: false, message: "Email service not configured" };
    }

    if (!reservation.email) {
      logger.warn("⚠️  No email provided for reservation:", reservation.id);
      return { success: false, message: "No email address provided" };
    }

    logger.log(`📧 Sending confirmation email to: ${reservation.email}`);

    const htmlContent = getReservationConfirmationTemplate(reservation, paymentInfo);

    const mailOptions = {
      from: EMAIL_CONFIG.from,
      to: reservation.email,
      subject: `🎉 Reservation Confirmed - NOIR Restaurant | ID: ${reservation.id}`,
      html: htmlContent,
      replyTo: "reservations@noir-restaurant.com"
    };

    const info = await emailTransporter.sendMail(mailOptions);

    logger.log("✅ Confirmation email sent successfully");
    logger.log("   Message ID:", info.messageId);
    logger.log("   To:", reservation.email);

    return {
      success: true,
      message: "Confirmation email sent",
      messageId: info.messageId
    };
  } catch (error) {
    logger.error("❌ Failed to send confirmation email:", error.message);
    logger.error("   Error details:", error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

/**
 * Send payment confirmation email
 */
export const sendPaymentConfirmation = async (reservation, paymentInfo) => {
  try {
    const emailTransporter = initializeTransporter();

    if (!emailTransporter) {
      logger.warn("⚠️  Email service not available. Skipping payment email.");
      return { success: false, message: "Email service not configured" };
    }

    if (!reservation.email) {
      logger.warn("⚠️  No email provided for payment notification:", reservation.id);
      return { success: false, message: "No email address provided" };
    }

    logger.log(`📧 Sending payment confirmation to: ${reservation.email}`);

    const htmlContent = getReservationConfirmationTemplate(reservation, paymentInfo);

    const mailOptions = {
      from: EMAIL_CONFIG.from,
      to: reservation.email,
      subject: `💳 Payment Confirmed - NOIR Restaurant | ID: ${reservation.id}`,
      html: htmlContent,
      replyTo: "reservations@noir-restaurant.com"
    };

    const info = await emailTransporter.sendMail(mailOptions);

    logger.log("✅ Payment confirmation email sent");
    logger.log("   To:", reservation.email);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error("❌ Failed to send payment email:", error.message);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Send cancellation email
 */
export const sendCancellationEmail = async (reservation) => {
  try {
    const emailTransporter = initializeTransporter();

    if (!emailTransporter) {
      return { success: false, message: "Email service not configured" };
    }

    if (!reservation.email) {
      return { success: false, message: "No email address provided" };
    }

    logger.log(`📧 Sending cancellation email to: ${reservation.email}`);

    const cancellationHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%); padding: 40px 20px; text-align: center; color: white; }
            .header h1 { font-size: 36px; font-weight: 300; letter-spacing: 4px; margin-bottom: 10px; }
            .content { padding: 40px; }
            .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 20px 0; border-radius: 4px; }
            .footer { background: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 1px solid #e0e0e0; font-size: 13px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>NOIR</h1>
              <p>FINE DINING EXPERIENCE</p>
            </div>
            <div class="content">
              <h2>Reservation Cancelled</h2>
              <p>Dear ${reservation.customerName},</p>
              <div class="alert">
                Your reservation (ID: <strong>${reservation.id}</strong>) has been cancelled as requested.
              </div>
              <p>We would love to welcome you to NOIR in the future. Feel free to make another reservation anytime.</p>
              <p>If you have any questions, please contact us at reservations@noir-restaurant.com</p>
            </div>
            <div class="footer">
              <p>© 2026 NOIR Fine Dining. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: EMAIL_CONFIG.from,
      to: reservation.email,
      subject: `Reservation Cancelled - NOIR Restaurant | ID: ${reservation.id}`,
      html: cancellationHtml,
      replyTo: "reservations@noir-restaurant.com"
    };

    const info = await emailTransporter.sendMail(mailOptions);

    logger.log("✅ Cancellation email sent");
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error("❌ Failed to send cancellation email:", error.message);
    return { success: false, message: error.message };
  }
};
