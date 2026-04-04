// db.js
const mongoose = require("mongoose");

const mongoURL = 'mongodb+srv://dbuser1:dbuser1@server.8bhjedn.mongodb.net/selling_goods';

mongoose.connect(mongoURL)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
  });

const connection = mongoose.connection;

connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

connection.on('error', (err) => {
  console.error('Mongoose connection error:', err.message);
});

connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

module.exports = mongoose;