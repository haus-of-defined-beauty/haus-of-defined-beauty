const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

// The other side of adminOnly: the customer's own booking and payment pages.
// An artist signing in with an email that is also a customer account was
// handed the booking flow, and their admin id was then written into the
// booking as the customer — so the appointment belonged to nobody the
// customer side could find, reports counted an artist as a client, and
// paying for it failed with "Booking not found".
const customerOnly = (req, res, next) => {
  if (req.user?.role === 'admin') {
    return res.status(403).json({
      code: 'ADMIN_CANNOT_BOOK',
      message: 'You are signed in as an artist. Bookings are made from a customer account.',
    });
  }
  next();
};

module.exports = { protect, adminOnly, customerOnly };
