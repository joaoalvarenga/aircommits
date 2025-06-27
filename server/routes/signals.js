
const router = require('express').Router();

router.get('/', (req, res) => {
  // Logic to get signals
  res.send('List of signals');
});

router.post('/', (req, res) => {
  // Logic to create a signal
  res.send('Signal created');
});

router.post('/:id/like', (req, res) => {
  // Logic to like a signal
  res.send(`Liked signal ${req.params.id}`);
});

module.exports = router;
