require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/product');
const marketRoutes = require('./routes/market');
const orderRoutes = require('./routes/order');
const farmerOrderRoutes = require('./routes/farmerOrders');

if (!process.env.JWT_SECRET) {
  console.error(
    '[AgroPay] Crea backend/.env con JWT_SECRET (copia de .env.example)'
  );
  process.exit(1);
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
// Límite alto para poder guardar imagen del producto (data URL / base64 en JSON).
app.use(express.json({ limit: '15mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/farmer/orders', farmerOrderRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Error' });
});

async function start() {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AgroPay API en http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
