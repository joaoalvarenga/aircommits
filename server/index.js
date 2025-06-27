
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

app.use('/auth', authRoutes);
app.use('/signals', signalRoutes);

const server = http.createServer(app);

const io = new Server(server);

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('AirCommits server is running!');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});


sequelize.sync().then(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});

