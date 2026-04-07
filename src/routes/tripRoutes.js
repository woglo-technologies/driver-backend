const express = require('express');
const router = express.Router();
const { getTrips, getTrip, addReview, updateTripStatus } = require('../controllers/tripController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect); // Protect all routes

router.route('/')
  .get(getTrips);

router.route('/:id')
  .get(getTrip);

router.route('/:id/review')
  .post(addReview);

router.route('/:id/status')
  .put(updateTripStatus);

module.exports = router;
