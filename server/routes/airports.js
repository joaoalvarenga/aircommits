const router = require('express').Router();
const { Op } = require('sequelize');
const Airport = require('../models/Airport');

// Get all airports
router.get('/', async (req, res) => {
  try {
    const airports = await Airport.findAll({
      order: [['name', 'ASC']],
      limit: 100
    });
    
    res.json(airports);
  } catch (error) {
    console.error('Error getting airports:', error);
    res.status(500).json({ error: 'Failed to get airports' });
  }
});

// Search airports
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const airports = await Airport.findAll({
      where: {
        [Op.or]: [
          { code: { [Op.like]: `%${q}%` } },
          { name: { [Op.like]: `%${q}%` } },
          { city: { [Op.like]: `%${q}%` } }
        ]
      },
      order: [['name', 'ASC']],
      limit: 10
    });
    
    res.json(airports);
  } catch (error) {
    console.error('Error searching airports:', error);
    res.status(500).json({ error: 'Failed to search airports' });
  }
});

// Get nearby airports
router.get('/nearby', async (req, res) => {
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
      order: [['name', 'ASC']],
      limit: 10
    });

    res.json({ airports });
  } catch (error) {
    console.error('Error getting nearby airports:', error);
    res.status(500).json({ error: 'Failed to get nearby airports' });
  }
});

module.exports = router; 