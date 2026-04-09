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
      if (req.body.phone && Driver.normalizePhone(req.body.phone) !== driver.phone) {
        const normalizedPhone = Driver.normalizePhone(req.body.phone);
        const phoneExists = await Driver.findOne({ phone: normalizedPhone, _id: { $ne: driver._id } });
        if (phoneExists) {
          res.status(400);
          throw new Error('This phone number is already in use by another account');
        }
        driver.phone = normalizedPhone;
      }

      if (req.body.password) {
        driver.password = req.body.password;
      }

      // Update all new profile fields
      if (req.body.dob) driver.dob = req.body.dob;
      if (req.body.address) {
        driver.address = {
          line1: req.body.address.line1 || driver.address?.line1,
          city: req.body.address.city || driver.address?.city,
          state: req.body.address.state || driver.address?.state,
          country: req.body.address.country || driver.address?.country,
          pinCode: req.body.address.pinCode || driver.address?.pinCode
        };
      }
      if (req.body.license) {
        driver.license = {
          number: req.body.license.number || driver.license?.number,
          validTill: req.body.license.validTill || driver.license?.validTill,
          types: req.body.license.types || driver.license?.types
        };
      }
      if (req.body.documents) {
        driver.documents = {
          aadharNumber: req.body.documents.aadharNumber || driver.documents?.aadharNumber,
          panCardNumber: req.body.documents.panCardNumber || driver.documents?.panCardNumber
        };
      }
      if (req.body.bankDetails) {
        driver.bankDetails = {
          bankName: req.body.bankDetails.bankName || driver.bankDetails?.bankName,
          accountNumber: req.body.bankDetails.accountNumber || driver.bankDetails?.accountNumber,
          ifscCode: req.body.bankDetails.ifscCode || driver.bankDetails?.ifscCode
        };
      }

      const updatedDriver = await driver.save();

      res.json({
        _id: updatedDriver._id,
        driverId: updatedDriver.driverId,
        name: updatedDriver.name,
        email: updatedDriver.email,
        phone: updatedDriver.phone,
        isVerified: updatedDriver.isVerified,
        dob: updatedDriver.dob,
        address: updatedDriver.address,
        license: updatedDriver.license,
        documents: updatedDriver.documents,
        bankDetails: updatedDriver.bankDetails
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

// @desc    Get all driver documents (KYC)
// @route   GET /api/v1/driver/documents
// @access  Private
exports.getDocuments = async (req, res, next) => {
  try {
    const Kyc = require('../models/Kyc'); // Require here to avoid circular deps if any, or put it at the top
    const documents = await Kyc.find({ driver: req.driver._id }).sort({ createdAt: -1 });
    
    // Map to frontend DriverDocument model format
    const mappedDocs = documents.map(d => ({
      id: d._id,
      name: d.type,
      type: d.type,
      urlFront: d.fileUrlFront,
      urlBack: d.fileUrlBack || '',
      status: d.status,
      uploadedAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString()
    }));

    res.json(mappedDocs);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all vendor requests for the driver
// @route   GET /api/v1/driver/vendor-requests
// @access  Private
exports.getVendorRequests = async (req, res, next) => {
  try {
    const requests = await VendorRequest.find({ driver: req.driver._id }).sort({ createdAt: -1 });
    
    // Map to frontend VendorRequest model format
    const mappedRequests = requests.map(r => ({
      id: r._id,
      vendorName: r.vendorName,
      agencyName: r.agencyName,
      workLocation: r.workLocation,
      description: r.description,
      requestDate: r.createdAt.toISOString(),
      status: r.status,
      contactNumber: r.vehicleDetails?.contactNumber, // If available
      email: r.vehicleDetails?.email, // If available
      vehicleType: r.vehicleDetails?.make,
      vehicleModel: r.vehicleDetails?.model,
      vehicleNumber: r.vehicleDetails?.licensePlate
    }));

    res.json(mappedRequests);
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
        isApproved: true, // Implicit trust since vendor provided it
        vendorName: request.vendorName,
        agencyName: request.agencyName,
        workLocation: request.workLocation,
        description: request.description,
        partnershipDate: new Date()
      });
    }

    res.json({
      id: updatedRequest._id,
      status: updatedRequest.status,
      vendorName: updatedRequest.vendorName,
      requestDate: updatedRequest.createdAt.toISOString()
    });
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
      vendorName: req.body.vendorName || "Global Travels",
      agencyName: req.body.agencyName || "Premium Tourism Services",
      workLocation: req.body.workLocation || "Delhi, NCR",
      description: req.body.description || "Partnered for long-term airport transfer services.",
      driver: req.driver._id,
      vehicleDetails: {
        make: req.body.vehicleMake || "Toyota",
        model: req.body.vehicleModel || "Innova Crysta",
        year: req.body.vehicleYear || 2023,
        licensePlate: req.body.licensePlate || `DL-01-AB-${Math.floor(1000 + Math.random() * 9000)}`,
        color: req.body.vehicleColor || "Metallic White"
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
    const vehicles = await Vehicle.find({ driver: req.driver._id });
    
    // Map to frontend DriverVehicle model format
    const mappedVehicles = vehicles.map(v => ({
      id: v._id,
      vehicleNumber: v.licensePlate,
      vehicleType: v.make, // Assuming make/model or type needs mapping
      vehicleModel: v.model,
      vehicleBrand: v.make,
      color: v.color || '',
      yearOfManufacture: v.year || 0,
      status: v.isApproved ? 'ACTIVE' : 'PENDING_APPROVAL',
      vendorName: v.vendorName,
      agencyName: v.agencyName,
      workLocation: v.workLocation,
      description: v.description,
      partnershipDate: v.partnershipDate ? v.partnershipDate.toISOString() : v.createdAt.toISOString()
    }));

    res.json(mappedVehicles);
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
    
    // Map to frontend CalendarEvent format
    const mappedEvents = events.map(e => ({
      id: e._id,
      type: e.type,
      date: e.date.toISOString(),
      description: e.description || '',
      tripId: e.tripId,
      status: 'confirmed', // Events in DB are considered confirmed
      createdAt: e.createdAt.toISOString()
    }));

    res.json(mappedEvents);
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
    
    const mappedEvents = events.map(e => ({
      id: e._id,
      type: e.type,
      date: e.date.toISOString(),
      description: e.description || '',
      tripId: e.tripId,
      status: 'confirmed',
      createdAt: e.createdAt.toISOString()
    }));

    res.json(mappedEvents);
  } catch (error) {
    next(error);
  }
};

// @desc    Update driver calendar status (mark as 'leave' or 'available' or 'booked')
// @route   POST /api/v1/driver/calendar/update-status
// @access  Private
exports.updateCalendarStatus = async (req, res, next) => {
  try {
    const { date, status, reason } = req.body;
    
    if (!['available', 'leave', 'booked'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status. Must be available, leave, or booked.');
    }

    // Parse the incoming 'YYYY-MM-DD' as exact UTC midnight to prevent time zone shifts
    const [year, month, day] = date.split('T')[0].split('-');
    const eventDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    const nextDay = new Date(eventDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    // Find if an event already exists for this day (to override it)
    let event = await Event.findOne({
      driver: req.driver._id,
      date: { $gte: eventDate, $lt: nextDay }
    });

    if (event) {
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

    res.json({
      id: event._id,
      type: event.type,
      date: event.date.toISOString(),
      description: event.description || '',
      status: 'confirmed',
      createdAt: event.createdAt.toISOString()
    });
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
    
    // Map to frontend Notification model format
    const mappedNotifications = notifications.map(n => ({
      id: n._id,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      type: n.type || 'GENERAL',
      createdAt: n.createdAt.toISOString()
    }));

    res.json(mappedNotifications);
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
    if (!driver) {
      res.status(404);
      throw new Error('Driver not found');
    }

    // Save relative path (e.g., uploads/profiles/filename.png)
    driver.profilePicture = `/${req.file.path.replace(/\\/g, '/')}`;
    await driver.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      profilePicture: driver.profilePicture,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete driver account and all associated data
// @route   DELETE /api/v1/driver/account
// @access  Private
exports.deleteAccount = async (req, res, next) => {
  try {
    const driverId = req.driver._id;

    // Delete associated data first
    await Vehicle.deleteMany({ owner: driverId });
    await Ride.deleteMany({ driver: driverId });
    await Event.deleteMany({ driver: driverId });
    await Notification.deleteMany({ recipient: driverId });
    await Message.deleteMany({ $or: [{ senderId: driverId }, { receiverId: driverId }] });
    
    // Finally delete the driver
    const driver = await Driver.findByIdAndDelete(driverId);

    if (!driver) {
      res.status(404);
      throw new Error('Driver not found');
    }

    res.status(200).json({
      success: true,
      message: 'Account and all associated data deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
