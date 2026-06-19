import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

pool.on('connect', (client) => {
  client.query('SET search_path TO oitworkspace, public').catch(console.error);
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

// โหลด Passport Strategy หลังจากประกาศ PrismaClient
import './auth/passport';
import authRoutes from './routes/auth.routes';
import spaceRoutes from './routes/space.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import folderRoutes from './routes/folder.routes';
import dashboardRoutes from './routes/dashboard.routes';
import userRoutes from './routes/user.routes';
import notificationRoutes from './routes/notification.routes';
import searchRoutes from './routes/search.routes';

const app = express();
const port = process.env.PORT || 5525;

// อนุญาตให้ Frontend เรียกใช้งาน API และส่ง Cookie Session มาได้
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://workspace.northbkk.ac.th',
];
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (e.g. curl, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json());

const isProduction = process.env.NODE_ENV === 'production';
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'nbu_oit_workspace_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,       // HTTPS only in production
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'OIT WorkSpace API is running' });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
