const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const VendorRequest = require('../models/VendorRequest');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Support = require('../models/Support');

// @desc    Get driver profile
// @route   GET /api/v1/driver/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id).select('-password');
    if (driver) {
      res.json(driver);
    } else {
      res.status(404);
      throw new Error('Driver not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update driver profile
// @route   PUT /api/v1/driver/account/profile
// @access  Private
exports.updateAccountProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id);

    if (driver) {
      driver.name = req.body.name || driver.name;
      if (req.body.phone && req.body.phone !== driver.phone) {
        const phoneExists = await Driver.findOne({ phone: req.body.phone, _id: { $ne: driver._id } });
        if (phoneExists) {
          res.status(400);
          throw new Error('This phone number is already in use by another account');
        }
        driver.phone = req.body.phone;
      }

      if (req.body.password) {
        driver.password = req.body.password;
      }

      const updatedDriver = await driver.save();

      res.json({
        _id: updatedDriver._id,
        driverId: updatedDriver.driverId,
        name: updatedDriver.name,
        email: updatedDriver.email,
        phone: updatedDriver.phone,
        isVerified: updatedDriver.isVerified
      });
    } else {
      res.status(404);
      throw new Error('Driver not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get driver dashboard data
// @route   GET /api/v1/driver/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const totalTrips = await Ride.countDocuments({ driver: req.driver._id, status: 'completed' });
    
    const earningsData = await Ride.aggregate([
      { $match: { driver: req.driver._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$fare' } } }
    ]);
    const totalEarnings = earningsData.length > 0 ? earningsData[0].total : 0;

    const activeTrips = await Ride.countDocuments({ 
      driver: req.driver._id, 
      status: { $in: ['accepted', 'in-progress'] } 
    });

    const pendingRequests = await VendorRequest.countDocuments({ 
      driver: req.driver._id, 
      status: 'pending' 
    });

    const unreadNotifications = await Notification.countDocuments({ 
      driver: req.driver._id, 
      isRead: false 
    });

    res.json({
      totalTrips,
      totalEarnings,
      activeTrips,
      pendingRequests,
      unreadNotifications,
      rating: req.driver.rating || 0
    });
  } catch (error) {
    next(error);
  }
};
exports.getAccountProfile = async (req, res) => { res.json({ message: 'Get driver account profile endpoint' }); };

// @desc    Get all vendor requests for the driver
// @route   GET /api/v1/driver/vendor-requests
// @access  Private
exports.getVendorRequests = async (req, res, next) => {
  try {
    const requests = await VendorRequest.find({ driver: req.driver._id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    next(error);
  }
};

// @desc    Respond to a vendor request (accept/decline)
// @route   PUT /api/v1/driver/vendor-requests/:id/respond
// @access  Private
exports.respondToVendorRequest = async (req, res, next) => {
  try {
    const { status } = req.body; // 'accepted' or 'declined'
    
    if (!['accepted', 'declined'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status. Must be accepted or declined.');
    }

    const request = await VendorRequest.findOne({ _id: req.params.id, driver: req.driver._id });
    
    if (!request) {
      res.status(404);
      throw new Error('Vendor request not found');
    }

    if (request.status !== 'pending') {
      res.status(400);
      throw new Error('Request has already been evaluated.');
    }

    request.status = status;
    const updatedRequest = await request.save();

    // The crucial logic: if accepted, securely extract vehicle and map to driver.
    if (status === 'accepted') {
      const vDetails = request.vehicleDetails;
      await Vehicle.create({
        driver: req.driver._id,
        make: vDetails.make,
        model: vDetails.model,
        year: vDetails.year,
        licensePlate: vDetails.licensePlate,
        color: vDetails.color,
        isApproved: true // Implicit trust since vendor provided it
      });
    }

    res.json(updatedRequest);
  } catch (error) {
    next(error);
  }
};

// @desc    MOCK: Generate a vendor request (For internal testing)
// @route   POST /api/v1/driver/vendor-requests/mock-send
// @access  Private
exports.mockCreateVendorRequest = async (req, res, next) => {
  try {
    const mockRequest = await VendorRequest.create({
      vendorId: `VND-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorName: req.body.vendorName || "Mock Travel Agency",
      agencyName: req.body.agencyName || "Mock Travel Co.",
      workLocation: req.body.workLocation || "Delhi NCR",
      description: req.body.description || "Looking for a reliable driver.",
      driver: req.driver._id,
      vehicleDetails: {
        make: req.body.vehicleMake || "Toyota",
        model: req.body.vehicleModel || "Innova Crysta",
        year: req.body.vehicleYear || 2022,
        licensePlate: req.body.licensePlate || `DL-${Math.floor(1000 + Math.random() * 9000)}`,
        color: req.body.vehicleColor || "White"
      }
    });
    res.status(201).json(mockRequest);
  } catch (error) {
    next(error);
  }
};

// @desc    Get driver vehicles
// @route   GET /api/v1/driver/my-vehicles
// @access  Private
exports.getMyVehicles = async (req, res, next) => {
  try {
    // Note: Vehicles are populated based on accepted vendor requests in another flow
    const vehicles = await Vehicle.find({ driver: req.driver._id });
    res.json(vehicles);
  } catch (error) {
    next(error);
  }
};

// @desc    Get driver requests
// @route   GET /api/v1/driver/requests
// @access  Private
exports.getRequests = async (req, res, next) => {
  try {
    const rides = await Ride.find({ driver: req.driver._id }).sort({ createdAt: -1 });
    res.json(rides);
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending driver requests
// @route   GET /api/v1/driver/requests/pending
// @access  Private
exports.getPendingRequests = async (req, res, next) => {
  try {
    const rides = await Ride.find({ driver: req.driver._id, status: 'pending' }).sort({ createdAt: -1 });
    res.json(rides);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all messages/inbox
// @route   GET /api/v1/driver/inbox
// @access  Private
exports.getInbox = async (req, res, next) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.driver._id, senderModel: 'Driver' },
        { receiver: req.driver._id, receiverModel: 'Driver' }
      ]
    }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message
// @route   POST /api/v1/driver/inbox/send-message
// @access  Private
exports.sendInboxMessage = async (req, res, next) => {
  try {
    const { receiverId, receiverModel, content } = req.body;

    if (!receiverId || !receiverModel || !content) {
      res.status(400);
      throw new Error('Please provide receiverId, receiverModel, and content');
    }

    const message = await Message.create({
      sender: req.driver._id,
      senderModel: 'Driver',
      receiver: receiverId,
      receiverModel,
      content,
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};
// @desc    Get support FAQs
// @route   GET /api/v1/driver/help/support-info
// @access  Private
exports.getSupportInfo = async (req, res, next) => {
  try {
    const supportDocs = await Support.find().sort({ order: 1 });
    res.json(supportDocs);
  } catch (error) {
    next(error);
  }
};

// @desc    Get support categories
// @route   GET /api/v1/driver/help/support-types
// @access  Private
exports.getSupportTypes = async (req, res, next) => {
  try {
    const categories = await Support.distinct('category');
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

// @desc    Upload profile picture
// @route   POST /api/v1/driver/profile-picture
// @access  Private
exports.uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an image');
    }

    const driver = await Driver.findById(req.driver._id);
    driver.profilePicture = `/uploads/profiles/${req.file.filename}`;
    await driver.save();

    res.json({
      success: true,
      message: 'Profile picture updated',
      profilePicture: driver.profilePicture
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current day's calendar status
// @route   GET /api/v1/driver/calendar/current
// @access  Private
exports.getCurrentCalendar = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight

    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 1);

    const event = await Event.findOne({ 
      driver: req.driver._id, 
      date: { $gte: today, $lt: nextDay } 
    });

    if (event) {
      res.json(event);
    } else {
      // By default, assume available if no override exists
      res.json({
        driver: req.driver._id,
        type: 'available',
        date: today,
        description: 'Default Availability'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all calendar events
// @route   GET /api/v1/driver/calendar
// @access  Private
exports.getCalendar = async (req, res, next) => {
  try {
    const events = await Event.find({ driver: req.driver._id }).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    next(error);
  }
};

// @desc    Get availability specific view
// @route   GET /api/v1/driver/calendar/availability
// @access  Private
exports.getCalendarAvailability = async (req, res, next) => {
  try {
    // Return days specifically marked, the frontend will assume all other non-marked days are available
    const events = await Event.find({ driver: req.driver._id });
    res.json(events);
  } catch (error) {
    next(error);
  }
};

// @desc    Update driver calendar status (mark as 'leave' or 'available')
// @route   POST /api/v1/driver/calendar/update-status
// @access  Private
exports.updateCalendarStatus = async (req, res, next) => {
  try {
    const { date, status, reason } = req.body;
    
    if (!['available', 'leave'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status. Must be available or leave.');
    }

    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(eventDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Find if an event already exists for this day (to override it)
    let event = await Event.findOne({
      driver: req.driver._id,
      date: { $gte: eventDate, $lt: nextDay }
    });

    if (event) {
      // Don't modify 'booked' dates via manual driver overrides
      if (event.type === 'booked') {
        res.status(400);
        throw new Error('Cannot update status for a booked day. Resolve the trip first.');
      }
      
      event.type = status;
      event.description = reason || '';
      await event.save();
    } else {
      event = await Event.create({
        driver: req.driver._id,
        type: status,
        date: eventDate,
        description: reason || ''
      });
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all notifications for the driver
// @route   GET /api/v1/driver/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ driver: req.driver._id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread notification count
// @route   GET /api/v1/driver/notifications/unread-count
// @access  Private
exports.getUnreadNotificationCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ driver: req.driver._id, isRead: false });
    res.json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/v1/driver/notifications/mark-all-read
// @access  Private
exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ driver: req.driver._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get past completed/cancelled rides
// @route   GET /api/v1/driver/past-rides
// @access  Private
exports.getPastRides = async (req, res, next) => {
  try {
    const rides = await Ride.find({ 
      driver: req.driver._id, 
      status: { $in: ['completed', 'cancelled', 'rejected'] } 
    }).sort({ createdAt: -1 });
    res.json(rides);
  } catch (error) {
    next(error);
  }
};

// @desc    Update ride status (accept/reject)
// @route   PUT /api/v1/driver/requests/:id/status
// @access  Private
exports.updateRideStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['accepted', 'rejected', 'in-progress', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      res.status(400);
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const ride = await Ride.findOne({ _id: req.params.id, driver: req.driver._id });

    if (!ride) {
      res.status(404);
      throw new Error('Ride request not found');
    }

    ride.status = status;
    const updatedRide = await ride.save();

    // If accepted, automatically mark the day as booked in the calendar
    if (status === 'accepted') {
      const eventDate = new Date(ride.date);
      eventDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(eventDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Check if event already exists
      let event = await Event.findOne({
        driver: req.driver._id,
        date: { $gte: eventDate, $lt: nextDay }
      });

      if (event) {
        event.type = 'booked';
        event.tripId = ride._id;
        event.description = `Booked for ride with ${ride.customerName}`;
        await event.save();
      } else {
        await Event.create({
          driver: req.driver._id,
          type: 'booked',
          date: eventDate,
          tripId: ride._id,
          description: `Booked for ride with ${ride.customerName}`
        });
      }
    }

    res.json(updatedRide);
  } catch (error) {
    next(error);
  }
};
