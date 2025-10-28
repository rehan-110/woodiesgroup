// app.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import database connection
import connectDB from './config/database.js';

// Import models
import './models/User.js';
import './models/Group.js';
import './models/Message.js';
import './models/GroupMember.js';
import './models/Status.js';

// Import routes
import statusRoutes from './routes/statusRoutes.js';
import authRoutes from './routes/authRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import groupMemberRoutes from './routes/groupMemberRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Import models for direct use
import User from './models/User.js';
import Group from './models/Group.js';

const app = express();

// Simple CORS - ALLOW EVERYTHING
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api', statusRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/group-members', groupMemberRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint (important for Vercel)
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚀 Group Chat API is running',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// Activity endpoints (keep your existing ones)
app.post('/api/activity/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByIdAndUpdate(
            userId,
            { 
                lastActive: new Date(),
                isOnline: true
            },
            { new: true }
        ).select('-password');

        if (user) {
            res.json({
                success: true,
                message: 'Activity updated',
                data: user
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Activity update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating activity'
        });
    }
});

app.post('/api/user/:userId/offline', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByIdAndUpdate(
            userId,
            { isOnline: false },
            { new: true }
        ).select('-password');

        if (user) {
            res.json({
                success: true,
                message: 'User set to offline',
                data: user
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Set offline error:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting user offline'
        });
    }
});

app.get('/api/online-users', async (req, res) => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const [onlineUsersCount, totalUsersCount, onlineUsers] = await Promise.all([
            User.countDocuments({ lastActive: { $gte: fiveMinutesAgo } }),
            User.countDocuments(),
            User.find({ lastActive: { $gte: fiveMinutesAgo } })
                .select('name email lastActive')
                .sort({ lastActive: -1 })
                .limit(20)
                .lean()
        ]);

        res.json({
            success: true,
            data: {
                onlineCount: onlineUsersCount,
                totalCount: totalUsersCount,
                onlinePercentage: totalUsersCount > 0 ? Math.round((onlineUsersCount / totalUsersCount) * 100) : 0,
                onlineUsers
            }
        });
    } catch (error) {
        console.error('Get online users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching online users'
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

// Initialize database (serverless compatible)
const initializeDB = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await connectDB();
        
        // Create admin user if not exists
        const existingAdmin = await User.findOne({ email: 'admin@example.com' });
        if (!existingAdmin) {
            await User.create({
                name: 'System Administrator',
                email: 'admin@example.com',
                password: 'admin123',
                role: 'super_admin'
            });
            console.log('✅ Admin user created');
        } else {
            console.log('✅ Admin user already exists');
        }
        
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        // Don't throw error in serverless - let it continue
    }
};

// Initialize database on cold start
initializeDB();

// Export for Vercel serverless
export default app;