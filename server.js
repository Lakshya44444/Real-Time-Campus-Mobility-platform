const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = parseInt(process.env.PORT || '8080', 10);
// Local Windows dev binds to 127.0.0.1 (avoids EACCES); cloud hosts need 0.0.0.0.
const host = process.env.HOST || (dev ? '127.0.0.1' : '0.0.0.0');

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO and expose it on globalThis so Next.js API routes
  // (which run in the same Node process) can emit through the same instance.
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });
  globalThis.__io = io;

  // /rides namespace: passenger <-> driver ride updates
  const ridesNs = io.of('/rides');
  ridesNs.on('connection', (socket) => {
    // Each user joins a personal room so we can target them directly.
    socket.on('register', (userId) => {
      if (userId) socket.join(`user-${userId}`);
    });
    // Join a specific ride room to follow its lifecycle.
    socket.on('join-ride', (rideId) => {
      if (rideId) socket.join(`ride-${rideId}`);
    });
    socket.on('leave-ride', (rideId) => {
      if (rideId) socket.leave(`ride-${rideId}`);
    });
  });

  // /drivers namespace: availability + live location
  const driversNs = io.of('/drivers');
  driversNs.on('connection', (socket) => {
    socket.on('update-location', (data) => {
      socket.broadcast.emit('driver:location_updated', data);
    });
  });

  httpServer.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}`);
    console.log('Socket.IO ready on namespaces /rides and /drivers');
  });
});
