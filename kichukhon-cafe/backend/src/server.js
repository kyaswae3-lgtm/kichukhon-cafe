import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import api from './routes/api.js';
import { notFound, errorHandler } from './middleware/errors.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: 'https://literate-space-lamp-4qr4w7qv7xp6hqv6v-5173.app.github.dev',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300
}));

app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log('Kichukhon Cafe API listening on ' + port);
});
