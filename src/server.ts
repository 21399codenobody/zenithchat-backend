import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from '@/config/db.js';

// রুট ইমপোর্টস (@/ পাথ অ্যালিয়াস সহ)
import authRouter from '@/routes/authRoutes.js';
import chatRouter from '@/routes/chatRoutes.js';
import messageRouter from '@/routes/messageRoutes.js';
import userRouter from '@/routes/userRoutes.js';
import searchRouter from '@/routes/searchRoutes.js';
import storyRouter from '@/routes/storyRoutes.js';
import groupRouter from '@/routes/groupRoutes.js';
import channelRouter from '@/routes/channelRoutes.js';
import inviteLinkRouter from '@/routes/inviteLinkRoutes.js';
import { initSocket } from '@/socket/socketHandler.js';

// এনভায়রনমেন্ট ভেরিয়েবল লোড
dotenv.config();

// ডাটাবেজ কানেকশন
connectDB();

const app: Application = express();

// ক্লাউড / রিভার্স প্রক্সি সাপোর্ট (Rate limiter ও IP সুরক্ষার জন্য)
app.set('trust proxy', 1);

// CORS কনফিগারেশন
const allowedOrigins = process.env.CLIENT_URL ? [process.env.CLIENT_URL] : ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
    origin: (origin, callback) => {
        // মোবাইল অ্যাপ বা সার্ভার-টু-সার্ভার রিকোয়েস্টে origin undefined হতে পারে
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by CORS policy'));
        }
    },
    credentials: true
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        app: "Zenith Chat API",
        status: "Online",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});


app.use('/api/auth', authRouter);
app.use('/api/chats', chatRouter);
app.use('/api/messages', messageRouter);
app.use('/api/users', userRouter);
app.use('/api/search', searchRouter);
app.use('/api/stories', storyRouter);
app.use('/api/groups', groupRouter);
app.use('/api/channels', channelRouter);
app.use('/api/invites', inviteLinkRouter);


app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.originalUrl} not found on Zenith Server.`
    });
});


app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled Error:", err.stack || err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error occurred."
    });
});


const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});


initSocket(io);


const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 Zenith Server running on Port: ${PORT}`);
    console.log(`📡 Real-Time Socket.io Gateway Active`);
    console.log(`===============================================`);
});