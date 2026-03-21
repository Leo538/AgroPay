const mongoose = require('mongoose');

/**
 * Conecta a MongoDB. URI por defecto: base local `agropay`.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agropay';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });
  console.log('MongoDB conectado');
}

module.exports = connectDB;
