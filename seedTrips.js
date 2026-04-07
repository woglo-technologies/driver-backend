require('dotenv').config();
const mongoose = require('mongoose');
const Trip = require('./src/models/Trip');

const driverId = '69d11722ae806f85b9827ff6';

const tripsData = [
  {
    "title": "Kerala Backwaters Tour",
    "startLocation": "Kochi",
    "destination": "Alleppey",
    "date": "2024-07-01",
    "time": "9:00 AM",
    "customerName": "Rahul Sharma",
    "numberOfDays": 3,
    "stops": [
      { "place": "Fort Kochi", "type": "Sightseeing", "duration": "3 hours" },
      { "place": "Kumarakom", "type": "Backwaters", "duration": "4 hours" }
    ],
    "accommodation": [
      { "name": "Kumarakom Lake Resort", "type": "Resort", "checkIn": "2024-07-01", "checkOut": "2024-07-03" }
    ],
    "days": [
      {
        "label": "Day 1",
        "date": "1 July",
        "events": [
          { "type": "Car", "title": "From", "subtitle": "To", "details": "Kochi Airport\nFort Kochi", "time": "9:00 AM", "icon": "directions_car", "color": "blue" },
          { "type": "Hotel", "title": "Check-in", "time": "6:00 PM", "icon": "hotel", "color": "redAccent" }
        ]
      }
    ]
  },
  {
    "title": "Munnar Hill Station Tour",
    "startLocation": "Kochi",
    "destination": "Munnar",
    "date": "2024-07-05",
    "time": "8:00 AM",
    "customerName": "Priya Singh",
    "numberOfDays": 2,
    "stops": [
      { "place": "Cheeyappara Waterfalls", "type": "Sightseeing", "duration": "1 hour" }
    ],
    "accommodation": [
      { "name": "Windermere Estate", "type": "Resort", "checkIn": "2024-07-05", "checkOut": "2024-07-06" }
    ],
    "days": [
      {
        "label": "Day 1",
        "date": "5 July",
        "events": [
          { "type": "Car", "title": "From", "subtitle": "To", "details": "Kochi\nCheeyappara", "time": "8:00 AM", "icon": "directions_car", "color": "blue" }
        ]
      }
    ]
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing trips for this driver (optional, but good for clean seed)
    await Trip.deleteMany({ driver: driverId });
    console.log('Cleared existing trips for driver');

    const trips = tripsData.map(trip => ({
      ...trip,
      driver: driverId,
      status: 'upcoming'
    }));

    await Trip.insertMany(trips);
    console.log('Successfully seeded trips!');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding DB:', err);
    process.exit(1);
  }
};

seedDB();
