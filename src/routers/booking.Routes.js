import express from "express";
import {
  checkAvailability,
  createReservation,
  getReservation,
  cancelReservation,
  modifyReservation,
  getTablesStatus,
  getRestaurantInfo
} from "../controller/booking.Controller.js";

const router = express.Router();

// ==================== BOOKING ROUTES ====================

/**
 * @route   POST /api/booking/check-availability
 * @desc    Check available tables for given date/time/party size
 * @body    { numGuests, date, time }
 * @returns { success, available, tables[], message }
 */
router.post("/check-availability", checkAvailability);

/**
 * @route   POST /api/booking/create-reservation
 * @desc    Create a new table reservation
 * @body    { customerName, numGuests, date, time, email?, phone?, notes? }
 * @returns { success, reservation, confirmationDetails }
 */
router.post("/create-reservation", createReservation);

/**
 * @route   GET /api/booking/reservation/:reservationId
 * @desc    Get specific reservation details (must be owner)
 * @params  reservationId
 * @returns { success, reservation }
 */
router.get("/reservation/:reservationId", getReservation);

/**
 * @route   PUT /api/booking/modify-reservation/:reservationId
 * @desc    Modify an existing reservation (date/time/guests)
 * @params  reservationId
 * @body    { date?, time?, numGuests? }
 * @returns { success, reservation }
 */
router.put("/modify-reservation/:reservationId", modifyReservation);

/**
 * @route   DELETE /api/booking/cancel-reservation/:reservationId
 * @desc    Cancel an existing reservation
 * @params  reservationId
 * @returns { success, reservation }
 */
router.delete("/cancel-reservation/:reservationId", cancelReservation);

/**
 * @route   GET /api/booking/tables-status
 * @desc    Get current status of all tables
 * @returns { success, availability: { total, available, booked, tables[] } }
 */
router.get("/tables-status", getTablesStatus);

/**
 * @route   GET /api/booking/restaurant-info
 * @desc    Get restaurant information (hours, capacity, cuisine, etc.)
 * @returns { success, restaurant: { name, hours, capacity, ... } }
 */
router.get("/restaurant-info", getRestaurantInfo);

export default router;
