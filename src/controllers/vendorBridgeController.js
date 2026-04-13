/**
 * Vendor Bridge Controller
 * These endpoints are called by the VENDOR BACKEND, not directly by the apps.
 * They are secured by a shared API key (VENDOR_DRIVER_API_KEY).
 *
 * Routes (all under /api/v1/vendor):
 *   GET  /drivers              - List all registered drivers for vendor to browse
 *   POST /send-request         - Create a VendorRequest for a specific driver
 *   GET  /driver-calendar/:id  - Read a driver's availability calendar
 *   POST /assign-vehicle       - Update a driver's vehicle record with assignment details
 */
const Driver = require('../models/Driver');
const VendorRequest = require('../models/VendorRequest');
const Vehicle = require('../models/Vehicle');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

// ──────────────────────────────────────────────────────────────────
// GET /api/v1/vendor/drivers
// Returns all registered driver app users (name, phone, rating, etc.)
// ──────────────────────────────────────────────────────────────────
exports.getAvailableDrivers = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { name: regex },
          { phone: regex },
          { driverId: regex },
        ],
      };
    }

    const drivers = await Driver.find(query).select('-password').lean();

    const mapped = drivers.map(d => ({
      id: d._id,
      driverId: d.driverId,
      fullName: d.name || '',
      phone: d.phone || '',
      age: d.dob
        ? Math.floor((Date.now() - new Date(d.dob)) / (365.25 * 24 * 60 * 60 * 1000))
        : 0,
      address: d.address
        ? [d.address.line1, d.address.city, d.address.state].filter(Boolean).join(', ')
        : '',
      licenseNumber: d.license?.number || '',
      licenseTypes: d.license?.types || [],
      aadhaarNumber: d.documents?.aadharNumber || '',
      panNumber: d.documents?.panCardNumber || '',
      photoUrl: d.profilePicture || null,
      rating: d.rating || 0,
      isVerified: d.isVerified || false,
      experience: null,
      totalTrips: null,
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────
// POST /api/v1/vendor/send-request
// Body: { driverId, vendorId, vendorName, agencyName, workLocation,
//         description, contactNumber, email, vehicleDetails }
// Creates a VendorRequest + notification for the driver
// ──────────────────────────────────────────────────────────────────
exports.sendVendorRequest = async (req, res, next) => {
  try {
    const {
      driverId,
      vendorId,
      vendorName,
      agencyName,
      workLocation,
      description,
      contactNumber,
      email,
      vehicleDetails,
    } = req.body;

    if (!driverId || !vendorId || !vendorName) {
      return res.status(400).json({
        success: false,
        error: 'driverId, vendorId and vendorName are required',
      });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    // Check if there's already a pending request from this vendor to this driver
    const existingRequest = await VendorRequest.findOne({
      driver: driverId,
      vendorId,
      status: 'pending',
    });
    if (existingRequest) {
      return res.status(409).json({
        success: false,
        error: 'A pending request from this vendor already exists for this driver',
      });
    }

    const request = await VendorRequest.create({
      vendorId,
      vendorName,
      agencyName,
      workLocation,
      description,
      contactNumber,
      email,
      driver: driverId,
      vehicleDetails: vehicleDetails || {},
    });

    // Push an in-app notification to the driver
    await Notification.create({
      driver: driverId,
      title: 'New Vendor Request',
      message: `${vendorName} has sent you a partnership request. Check Vendor Requests section.`,
      type: 'VENDOR_REQUEST',
      isRead: false,
    });

    res.status(201).json({
      success: true,
      data: {
        requestId: request._id,
        status: request.status,
        vendorName: request.vendorName,
        driverId: request.driver,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────
// GET /api/v1/vendor/driver-calendar/:driverId
// Returns the driver's upcoming calendar events so vendor can see
// which dates the driver is available / on leave / booked
// ──────────────────────────────────────────────────────────────────
exports.getDriverCalendar = async (req, res, next) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId).select('_id name');
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    // Get events from today onwards (next 90 days)
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 90);

    const events = await Event.find({
      driver: driverId,
      date: { $gte: from, $lte: to },
    }).sort({ date: 1 });

    const mapped = events.map(e => ({
      id: e._id,
      type: e.type,           // 'available' | 'leave' | 'booked'
      date: e.date.toISOString().split('T')[0], // YYYY-MM-DD
      description: e.description || '',
    }));

    res.json({ success: true, driverId, driverName: driver.name, events: mapped });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────
// POST /api/v1/vendor/assign-vehicle
// Body: { driverId, vendorId, vendorName, agencyName, workLocation,
//         vehicleDetails: { make, model, licensePlate, color, vehicleType, seatingCapacity },
//         fromDate, toDate, contactNumber, email }
// Creates or updates the Vehicle record in the driver backend and
// marks those calendar days as 'booked'
// ──────────────────────────────────────────────────────────────────
exports.assignVehicle = async (req, res, next) => {
  try {
    const {
      driverId,
      vendorId,
      vendorName,
      agencyName,
      workLocation,
      contactNumber,
      email,
      vehicleDetails,
      fromDate,
      toDate,
    } = req.body;

    if (!driverId || !vehicleDetails?.licensePlate) {
      return res.status(400).json({
        success: false,
        error: 'driverId and vehicleDetails.licensePlate are required',
      });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    const fromDateObj = fromDate ? new Date(fromDate) : new Date();
    const toDateObj = toDate ? new Date(toDate) : null;

    // Upsert vehicle by licensePlate + driver
    let vehicle = await Vehicle.findOne({
      driver: driverId,
      licensePlate: vehicleDetails.licensePlate,
    });

    if (vehicle) {
      // Update existing
      vehicle.vendorId = vendorId;
      vehicle.vendorName = vendorName;
      vehicle.vendorContactNumber = contactNumber;
      vehicle.vendorEmail = email;
      vehicle.agencyName = agencyName;
      vehicle.workLocation = workLocation;
      vehicle.vehicleType = vehicleDetails.vehicleType;
      vehicle.seatingCapacity = vehicleDetails.seatingCapacity;
      vehicle.make = vehicleDetails.make || vehicle.make;
      vehicle.model = vehicleDetails.model || vehicle.model;
      vehicle.color = vehicleDetails.color || vehicle.color;
      vehicle.year = vehicleDetails.year || vehicle.year;
      vehicle.assignedFromDate = fromDateObj;
      vehicle.assignedToDate = toDateObj;
      vehicle.isApproved = true;
      await vehicle.save();
    } else {
      vehicle = await Vehicle.create({
        driver: driverId,
        make: vehicleDetails.make || 'Unknown',
        model: vehicleDetails.model || 'Unknown',
        year: vehicleDetails.year,
        licensePlate: vehicleDetails.licensePlate,
        color: vehicleDetails.color,
        vehicleType: vehicleDetails.vehicleType,
        seatingCapacity: vehicleDetails.seatingCapacity,
        isApproved: true,
        vendorId,
        vendorName,
        vendorContactNumber: contactNumber,
        vendorEmail: email,
        agencyName,
        workLocation,
        assignedFromDate: fromDateObj,
        assignedToDate: toDateObj,
        partnershipDate: fromDateObj,
      });
    }

    // Mark calendar days as 'booked' for the date range
    if (fromDateObj && toDateObj) {
      const cursor = new Date(fromDateObj);
      cursor.setHours(0, 0, 0, 0);
      const end = new Date(toDateObj);
      end.setHours(0, 0, 0, 0);

      while (cursor <= end) {
        const nextDay = new Date(cursor);
        nextDay.setDate(nextDay.getDate() + 1);

        const existing = await Event.findOne({
          driver: driverId,
          date: { $gte: cursor, $lt: nextDay },
        });

        const eventData = {
          type: 'booked',
          description: `Assigned to ${vendorName} - ${vehicleDetails.licensePlate}`,
        };

        if (existing) {
          // Don't overwrite leave with booked — vendor should not assign on leave days
          if (existing.type !== 'leave') {
            await Event.updateOne({ _id: existing._id }, eventData);
          }
        } else {
          await Event.create({
            driver: driverId,
            date: new Date(cursor),
            ...eventData,
          });
        }

        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // Notify driver of vehicle assignment
    await Notification.create({
      driver: driverId,
      title: 'Vehicle Assigned',
      message: `${vendorName} has assigned vehicle ${vehicleDetails.licensePlate} to you${
        fromDate ? ` from ${new Date(fromDate).toLocaleDateString('en-IN')}` : ''
      }${toDate ? ` to ${new Date(toDate).toLocaleDateString('en-IN')}` : ''}.`,
      type: 'VEHICLE_ASSIGNED',
      isRead: false,
    });

    res.json({
      success: true,
      data: {
        vehicleId: vehicle._id,
        licensePlate: vehicle.licensePlate,
        vendorName: vehicle.vendorName,
        assignedFromDate: vehicle.assignedFromDate,
        assignedToDate: vehicle.assignedToDate,
      },
    });
  } catch (error) {
    next(error);
  }
};
// ──────────────────────────────────────────────────────────────────
// GET /api/v1/vendor/partnered-drivers/:vendorId
// Returns all drivers currently associated with a specific vendor
// (Drivers who have an active vehicle assignment from that vendor)
// ──────────────────────────────────────────────────────────────────
exports.getPartneredDrivers = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({ success: false, error: 'vendorId is required' });
    }

    // 1. Find all vehicles associated with this vendor
    const vehicles = await Vehicle.find({ vendorId }).populate('driver').lean();

    // 2. Find all accepted requests (handles drivers who accepted but aren't assigned a vehicle yet)
    const acceptedRequests = await VendorRequest.find({ vendorId, status: 'accepted' }).populate('driver').lean();

    const driverMap = new Map();

    // Process accepted requests first (baseline)
    acceptedRequests.forEach(r => {
      if (r.driver) {
        const d = r.driver;
        driverMap.set(d._id.toString(), {
          id: d._id,
          driverId: d.driverId,
          fullName: d.name || '',
          phone: d.phone || '',
          age: d.dob
            ? Math.floor((Date.now() - new Date(d.dob)) / (365.25 * 24 * 60 * 60 * 1000))
            : 0,
          photoUrl: d.profilePicture || null,
          rating: d.rating || 0,
          isVerified: d.isVerified || false,
          invitationStatus: 'accepted',
          assignedVehicleNumber: null,
          assignedFromDate: r.assignedFromDate || null,
          assignedToDate: r.assignedToDate || null,
        });
      }
    });

    // Process vehicles (overwrites/completes the request data)
    vehicles.forEach(v => {
      if (v.driver) {
        const d = v.driver;
        driverMap.set(d._id.toString(), {
          id: d._id,
          driverId: d.driverId,
          fullName: d.name || '',
          phone: d.phone || '',
          age: d.dob
            ? Math.floor((Date.now() - new Date(d.dob)) / (365.25 * 24 * 60 * 60 * 1000))
            : 0,
          photoUrl: d.profilePicture || null,
          rating: d.rating || 0,
          isVerified: d.isVerified || false,
          invitationStatus: 'accepted',
          assignedVehicleNumber: v.licensePlate,
          assignedFromDate: v.assignedFromDate,
          assignedToDate: v.assignedToDate,
        });
      }
    });

    const mapped = Array.from(driverMap.values());

    res.json({ success: true, count: mapped.length, data: mapped });
  } catch (error) {
    next(error);
  }
};
