const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the current directory
app.use(express.static(__dirname));

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket logic for real-time synchronization
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Sync input fields
  socket.on('sync-input', (data) => {
    // data: { inputId: 'playlist-input-1', value: '...' }
    socket.broadcast.emit('sync-input', data);
  });

  // Sync Compare action
  socket.on('sync-start', (data) => {
    // data: { link1, link2 }
    socket.broadcast.emit('sync-start', data);
  });

  // Sync New Comparison action
  socket.on('sync-reset', () => {
    socket.broadcast.emit('sync-reset');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`To share this locally via internet, run: npm run share`);
});
