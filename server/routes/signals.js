const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Signal = require('../models/Signal');
const User = require('../models/User');
const Airport = require('../models/Airport');

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get signals with optional filters
router.get('/', async (req, res) => {
  try {
    const { airport, flight, limit = 50 } = req.query;
    
    const whereClause = {};
    if (airport) {
      whereClause.airport = { [Op.like]: `%${airport}%` };
    }
    if (flight) {
      whereClause.flight = { [Op.like]: `%${flight}%` };
    }

    const signals = await Signal.findAll({
      where: whereClause,
      include: [{
        model: User,
        attributes: ['id', 'username', 'avatar']
      }],
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit)
    });

    const formattedSignals = signals.map(signal => ({
      id: signal.id,
      userId: signal.User.id,
      username: signal.User.username,
      userAvatar: signal.User.avatar,
      airport: signal.airport,
      flight: signal.flight,
      location: signal.latitude && signal.longitude ? {
        latitude: parseFloat(signal.latitude),
        longitude: parseFloat(signal.longitude)
      } : undefined,
      timestamp: signal.timestamp,
      message: signal.message
    }));

    res.json(formattedSignals);
  } catch (error) {
    console.error('Error getting signals:', error);
    res.status(500).json({ error: 'Failed to get signals' });
  }
});

// Create a new signal
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { airport, flight, message, latitude, longitude } = req.body;
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const signal = await Signal.create({
      UserId: user.id,
      airport,
      flight,
      message,
      latitude,
      longitude,
      timestamp: new Date()
    });

    // Return the created signal with user info
    const signalWithUser = await Signal.findByPk(signal.id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'avatar']
      }]
    });

    const formattedSignal = {
      id: signalWithUser.id,
      userId: signalWithUser.User.id,
      username: signalWithUser.User.username,
      userAvatar: signalWithUser.User.avatar,
      airport: signalWithUser.airport,
      flight: signalWithUser.flight,
      location: signalWithUser.latitude && signalWithUser.longitude ? {
        latitude: parseFloat(signalWithUser.latitude),
        longitude: parseFloat(signalWithUser.longitude)
      } : undefined,
      timestamp: signalWithUser.timestamp,
      message: signalWithUser.message
    };

    res.status(201).json(formattedSignal);
  } catch (error) {
    console.error('Error creating signal:', error);
    res.status(500).json({ error: 'Failed to create signal' });
  }
});

// Get nearby airports
router.get('/airports/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Simple distance calculation (Haversine formula would be better for production)
    const airports = await Airport.findAll({
      where: {
        latitude: {
          [Op.between]: [parseFloat(lat) - 1, parseFloat(lat) + 1]
        },
        longitude: {
          [Op.between]: [parseFloat(lng) - 1, parseFloat(lng) + 1]
        }
      },
      limit: 10
    });

    res.json({ airports });
  } catch (error) {
    console.error('Error getting nearby airports:', error);
    res.status(500).json({ error: 'Failed to get nearby airports' });
  }
});

module.exports = router;
