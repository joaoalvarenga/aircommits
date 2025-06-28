const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const sequelize = require('./database');
const authRoutes = require('./routes/auth');
const signalRoutes = require('./routes/signals');
const airportRoutes = require('./routes/airports');

app.use('/auth', authRoutes);
app.use('/signals', signalRoutes);
app.use('/airports', airportRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('AirCommits server is running!');
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('a user connected');
  
  socket.on('join-airport', (airportCode) => {
    socket.join(`airport-${airportCode}`);
    console.log(`User joined airport: ${airportCode}`);
  });
  
  socket.on('join-flight', (flightNumber) => {
    socket.join(`flight-${flightNumber}`);
    console.log(`User joined flight: ${flightNumber}`);
  });
  
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Make io available to routes
app.set('io', io);

sequelize.sync({ alter: true }).then(() => {
  server.listen(PORT, () => {
    console.log(`AirCommits server listening on port ${PORT}`);
  });
}).catch(error => {
  console.error('Database sync error:', error);
});

