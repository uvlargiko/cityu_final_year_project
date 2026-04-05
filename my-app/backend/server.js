const express = require('express');
const cors = require('cors');
const dbConfig = require('./db'); // ensure this connects and logs on success/failure
const goodRoute = require('./routes/goodRoute');
const orderRoute = require('./routes/orderRoute');
const userRoute = require('./routes/userRoute');
const chatRoute = require('./routes/chatRoute');
const feedbackRoute = require('./routes/feedbackRoute');
const recommdationRoute = require('./routes/recommdationRoute');

const app = express();

app.use(express.json());

const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];

function normalizeOrigin(origin) {
  if (typeof origin === 'string') {
    return origin.replace(/\/$/, '');
  }
  return origin;
}

function isAllowedOrigin(origin) {
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.includes(normalized)) return true;

  // Allow localhost/127.0.0.1 with any dev port.
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized);
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use('/api/goods', goodRoute);
app.use('/api/orders', orderRoute);
app.use('/api/users', userRoute);
app.use('/api/chat', chatRoute);
app.use('/api/feedback', feedbackRoute);
app.use('/api/recommendations', recommdationRoute);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});