const mongoose = require('mongoose');

// Connecting once at startup works for a long-running server but not for a
// serverless function: every cold start begins with no connection, and a
// request can arrive before one is established. Worse, if that single
// attempt fails, nothing ever retries — the container stays warm with a
// dead connection and every later request just buffers until it times out.
//
// So: cache the attempt and await it per request, and throw away a failed
// attempt so the next request tries again instead of inheriting the failure.
let connectionPromise = null;

function connectDb() {
  // 1 = connected. Already good, nothing to wait for.
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGO_URI, {
        // Fail in a few seconds rather than sitting on a request for the
        // full default while the driver hunts for a reachable server.
        serverSelectionTimeoutMS: 8000,
      })
      .catch(err => {
        connectionPromise = null;
        throw err;
      });
  }

  return connectionPromise;
}

module.exports = { connectDb };
