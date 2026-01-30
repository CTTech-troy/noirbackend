import { logger } from "../utils/logger.js";
import { sendReservationConfirmation, sendPaymentConfirmation } from "./email.Controller.js";

// ==================== RESTAURANT TABLE DATA ====================
// Mock database - In production, use Firebase/Database
const RESTAURANT_TABLES = {
  tables: [
    { id: 1, seats: 2, location: "Window", available: true },
    { id: 2, seats: 2, location: "Bar", available: true },
    { id: 3, seats: 4, location: "Center", available: true },
    { id: 4, seats: 4, location: "Corner", available: false },
    { id: 5, seats: 6, location: "Private", available: true },
    { id: 6, seats: 8, location: "Patio", available: true }
  ],
  operatingHours: {
    open: "11:00",
    close: "23:00",
    closedOn: ["Monday"]
  }
};

// Store all reservations (in production: Firebase)
const RESERVATIONS = new Map(); // { reservationId: { details } }

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if restaurant is open on given date/time
 */
const isRestaurantOpen = (date, time) => {
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Check if closed on that day
  if (RESTAURANT_TABLES.operatingHours.closedOn.includes(dayName)) {
    return {
      open: false,
      reason: `Restaurant is closed on ${dayName}s`
    };
  }
  
  // Check if time is within operating hours
  const [openHour, openMin] = RESTAURANT_TABLES.operatingHours.open.split(':').map(Number);
  const [closeHour, closeMin] = RESTAURANT_TABLES.operatingHours.close.split(':').map(Number);
  const [reqHour, reqMin] = time.split(':').map(Number);
  
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;
  const requestTime = reqHour * 60 + reqMin;
  
  if (requestTime < openTime || requestTime > closeTime) {
    return {
      open: false,
      reason: `Restaurant is open ${RESTAURANT_TABLES.operatingHours.open} - ${RESTAURANT_TABLES.operatingHours.close}`,
      hours: RESTAURANT_TABLES.operatingHours
    };
  }
  
  return { open: true };
};

/**
 * Get available tables for given criteria
 */
const getAvailableTables = (numGuests, date, time) => {
  // First check if restaurant is open
  const openStatus = isRestaurantOpen(date, time);
  if (!openStatus.open) {
    return {
      available: false,
      reason: openStatus.reason,
      tables: []
    };
  }
  
  // Find tables that fit the party size
  const suitableTables = RESTAURANT_TABLES.tables.filter(
    table => table.seats >= numGuests && table.available
  );
  
  return {
    available: suitableTables.length > 0,
    tables: suitableTables,
    message: suitableTables.length > 0
      ? `✅ Found ${suitableTables.length} available table(s) for ${numGuests} guest(s)`
      : `❌ No tables available for ${numGuests} guest(s) at ${time}`
  };
};

/**
 * Generate unique reservation ID
 */
const generateReservationId = () => {
  return `RES-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

// ==================== BOOKING CONTROLLERS ====================

/**
 * Check table availability
 * POST /api/booking/check-availability
 */
export const checkAvailability = async (req, res) => {
  try {
    const { numGuests, date, time } = req.body;
    const userIP = req.userIP;

    // Validate input
    if (!numGuests || !date || !time) {
      return res.status(400).json({
        success: false,
        error: "numGuests, date, and time are required",
        example: { numGuests: 4, date: "2026-02-14", time: "19:00" }
      });
    }

    // Validate numGuests
    if (numGuests < 1 || numGuests > 20) {
      return res.status(400).json({
        success: false,
        error: "Party size must be between 1 and 20 guests"
      });
    }

    logger.log(`🍽️  [${userIP}] Checking availability for ${numGuests} guests on ${date} at ${time}`);

    const availability = getAvailableTables(numGuests, date, time);

    res.status(200).json({
      success: true,
      available: availability.available,
      message: availability.message,
      availableTableCount: availability.tables.length,
      tables: availability.tables,
      numGuests: numGuests,
      date: date,
      time: time,
      reason: availability.reason
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
 * Create a new reservation
 * POST /api/booking/create-reservation
 */
export const createReservation = async (req, res) => {
  try {
    const { customerName, numGuests, date, time, email, phone, notes } = req.body;
    const userIP = req.userIP;

    // Validate required fields
    if (!customerName || !numGuests || !date || !time) {
      return res.status(400).json({
        success: false,
        error: "customerName, numGuests, date, and time are required",
        example: {
          customerName: "John Doe",
          numGuests: 4,
          date: "2026-02-14",
          time: "19:00",
          email: "john@example.com",
          phone: "+1234567890"
        }
      });
    }

    logger.log(`📅 [${userIP}] Creating reservation for ${customerName}`);

    // Check availability
    const availability = getAvailableTables(numGuests, date, time);
    
    if (!availability.available) {
      return res.status(400).json({
        success: false,
        error: "No tables available for your requested date and time",
        reason: availability.reason,
        message: availability.message
      });
    }

    // Generate reservation ID
    const reservationId = generateReservationId();
    
    // Select a table (pick smallest suitable table for better space management)
    const selectedTable = availability.tables.sort((a, b) => a.seats - b.seats)[0];
    
    // Create reservation object
    const reservation = {
      id: reservationId,
      customerName: customerName,
      email: email || null,
      phone: phone || null,
      numGuests: numGuests,
      date: date,
      time: time,
      tableId: selectedTable.id,
      tableLocation: selectedTable.location,
      notes: notes || "",
      status: "confirmed",
      userIP: userIP,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store reservation
    RESERVATIONS.set(reservationId, reservation);
    
    // Mark table as unavailable (in production: update in database)
    const table = RESTAURANT_TABLES.tables.find(t => t.id === selectedTable.id);
    if (table) {
      table.available = false;
    }

    logger.log(`✅ [${userIP}] Reservation created: ${reservationId}`);
    logger.log(`📍 Table ${selectedTable.id} (${selectedTable.location}) reserved for ${customerName}`);

    // Send confirmation email if email provided
    if (email) {
      logger.log(`📧 Sending confirmation email to ${email}`);
      const emailResult = await sendReservationConfirmation(reservation);
      if (emailResult.success) {
        logger.log("✅ Confirmation email sent successfully");
      } else {
        logger.warn("⚠️  Failed to send confirmation email:", emailResult.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `Reservation confirmed! Your booking ID is ${reservationId}${email ? ' - Confirmation email sent to ' + email : ''}`,
      reservation: reservation,
      confirmationDetails: {
        reservationId: reservationId,
        customerName: customerName,
        guests: numGuests,
        date: date,
        time: time,
        table: selectedTable.id,
        location: selectedTable.location
      }
    });

  } catch (error) {
    logger.error("❌ Reservation creation error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create reservation"
    });
  }
};

/**
 * Get reservation details
 * GET /api/booking/reservation/:reservationId
 */
export const getReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const userIP = req.userIP;

    logger.log(`🔍 [${userIP}] Retrieving reservation: ${reservationId}`);

    const reservation = RESERVATIONS.get(reservationId);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: "Reservation not found",
        reservationId: reservationId
      });
    }

    // Verify ownership by IP (security check)
    if (reservation.userIP !== userIP) {
      logger.warn(`⚠️  [${userIP}] Unauthorized access attempt to reservation ${reservationId}`);
      return res.status(403).json({
        success: false,
        error: "Unauthorized: Cannot access this reservation"
      });
    }

    res.status(200).json({
      success: true,
      reservation: reservation
    });

  } catch (error) {
    logger.error("❌ Get reservation error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve reservation"
    });
  }
};

/**
 * Cancel a reservation
 * DELETE /api/booking/cancel-reservation/:reservationId
 */
export const cancelReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const userIP = req.userIP;

    logger.log(`❌ [${userIP}] Cancelling reservation: ${reservationId}`);

    const reservation = RESERVATIONS.get(reservationId);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: "Reservation not found",
        reservationId: reservationId
      });
    }

    // Verify ownership by IP
    if (reservation.userIP !== userIP) {
      logger.warn(`⚠️  [${userIP}] Unauthorized cancellation attempt for ${reservationId}`);
      return res.status(403).json({
        success: false,
        error: "Unauthorized: Cannot cancel this reservation"
      });
    }

    // Check if reservation can be cancelled (e.g., not in the past)
    const reservationDate = new Date(reservation.date);
    const today = new Date();
    if (reservationDate < today) {
      return res.status(400).json({
        success: false,
        error: "Cannot cancel past reservations"
      });
    }

    // Update reservation status
    reservation.status = "cancelled";
    reservation.updatedAt = new Date().toISOString();

    // Free up the table
    const table = RESTAURANT_TABLES.tables.find(t => t.id === reservation.tableId);
    if (table) {
      table.available = true;
    }

    logger.log(`✅ [${userIP}] Reservation cancelled: ${reservationId}`);

    res.status(200).json({
      success: true,
      message: "Reservation cancelled successfully",
      reservation: reservation
    });

  } catch (error) {
    logger.error("❌ Cancellation error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to cancel reservation"
    });
  }
};

/**
 * Modify a reservation
 * PUT /api/booking/modify-reservation/:reservationId
 */
export const modifyReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { date, time, numGuests } = req.body;
    const userIP = req.userIP;

    logger.log(`✏️  [${userIP}] Modifying reservation: ${reservationId}`);

    const reservation = RESERVATIONS.get(reservationId);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: "Reservation not found"
      });
    }

    // Verify ownership
    if (reservation.userIP !== userIP) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized: Cannot modify this reservation"
      });
    }

    // Check new availability if date/time/guests changed
    if (date || time || numGuests) {
      const newDate = date || reservation.date;
      const newTime = time || reservation.time;
      const newGuests = numGuests || reservation.numGuests;

      const availability = getAvailableTables(newGuests, newDate, newTime);
      if (!availability.available) {
        return res.status(400).json({
          success: false,
          error: "New date/time/party size not available",
          reason: availability.reason
        });
      }

      // Free up old table
      const oldTable = RESTAURANT_TABLES.tables.find(t => t.id === reservation.tableId);
      if (oldTable) {
        oldTable.available = true;
      }

      // Assign new table
      const newTable = availability.tables.sort((a, b) => a.seats - b.seats)[0];
      newTable.available = false;

      // Update reservation
      if (date) reservation.date = date;
      if (time) reservation.time = time;
      if (numGuests) reservation.numGuests = numGuests;
      reservation.tableId = newTable.id;
      reservation.tableLocation = newTable.location;
    }

    reservation.updatedAt = new Date().toISOString();

    logger.log(`✅ [${userIP}] Reservation modified: ${reservationId}`);

    res.status(200).json({
      success: true,
      message: "Reservation updated successfully",
      reservation: reservation
    });

  } catch (error) {
    logger.error("❌ Modification error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to modify reservation"
    });
  }
};

/**
 * Get all tables status
 * GET /api/booking/tables-status
 */
export const getTablesStatus = async (req, res) => {
  try {
    const userIP = req.userIP;

    logger.log(`📊 [${userIP}] Fetching tables status`);

    const tableStatus = RESTAURANT_TABLES.tables.map(table => ({
      id: table.id,
      seats: table.seats,
      location: table.location,
      available: table.available,
      status: table.available ? "🟢 Available" : "🔴 Booked"
    }));

    const availability = {
      total: tableStatus.length,
      available: tableStatus.filter(t => t.available).length,
      booked: tableStatus.filter(t => !t.available).length,
      tables: tableStatus,
      hours: RESTAURANT_TABLES.operatingHours
    };

    res.status(200).json({
      success: true,
      availability: availability
    });

  } catch (error) {
    logger.error("❌ Tables status error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get tables status"
    });
  }
};

/**
 * Get restaurant info (hours, location, etc.)
 * GET /api/booking/restaurant-info
 */
export const getRestaurantInfo = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      restaurant: {
        name: "NOIR",
        cuisine: "Fine Dining - Contemporary French",
        location: "Downtown District",
        phone: "+1 (555) 123-4567",
        email: "reservations@noir-restaurant.com",
        hours: RESTAURANT_TABLES.operatingHours,
        capacity: {
          minPartySize: 1,
          maxPartySize: 20,
          totalTables: RESTAURANT_TABLES.tables.length,
          totalSeats: RESTAURANT_TABLES.tables.reduce((sum, t) => sum + t.seats, 0)
        },
        specialties: [
          "French Cuisine",
          "Fine Dining Experience",
          "Private Events",
          "Wine Pairing"
        ]
      }
    });

  } catch (error) {
    logger.error("❌ Restaurant info error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get restaurant info"
    });
  }
};
