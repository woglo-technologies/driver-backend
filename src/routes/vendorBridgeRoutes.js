/**
 * Vendor Bridge Routes
 * Secured by x-vendor-api-key header.
 * Called by the VENDOR BACKEND, not directly by mobile apps.
 */
const express = require('express');
const router = express.Router();
const vendorBridgeController = require('../controllers/vendorBridgeController');

// ── API Key Middleware ──────────────────────────────────────────────
const requireVendorApiKey = (req, res, next) => {
  const apiKey = req.headers['x-vendor-api-key'];
  const expectedKey = process.env.VENDOR_DRIVER_API_KEY;

  if (!expectedKey) {
    console.error('[VendorBridge] VENDOR_DRIVER_API_KEY not set in .env!');
    return res.status(500).json({ success: false, error: 'Server misconfiguration' });
  }

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized: invalid vendor API key' });
  }

  next();
};

// Apply API key check to all vendor bridge routes
router.use(requireVendorApiKey);

// ── Routes ─────────────────────────────────────────────────────────
// GET /api/v1/vendor/drivers?search=query
router.get('/drivers', vendorBridgeController.getAvailableDrivers);

// POST /api/v1/vendor/send-request
router.post('/send-request', vendorBridgeController.sendVendorRequest);

// GET /api/v1/vendor/driver-calendar/:driverId
router.get('/driver-calendar/:driverId', vendorBridgeController.getDriverCalendar);

// POST /api/v1/vendor/assign-vehicle
router.post('/assign-vehicle', vendorBridgeController.assignVehicle);

module.exports = router;
