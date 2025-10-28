// controllers/statusController.js
import Status from '../models/Status.js';

const getStatus = async (req, res) => {
    try {
        // Save status to database
        const status = new Status({
            message: 'API is running and connected to MongoDB successfully'
        });
        await status.save();

        res.status(200).json({
            success: true,
            message: 'API is running successfully!',
            database: 'Connected to MongoDB',
            port: process.env.PORT,
            timestamp: new Date(),
            storedMessage: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error connecting to database',
            error: error.message
        });
    }
};

const getDatabaseStatus = async (req, res) => {
    try {
        // Test database connection by counting documents
        const count = await Status.countDocuments();
        
        res.status(200).json({
            success: true,
            message: 'Database connection successful',
            documentCount: count,
            database: 'MongoDB',
            status: 'Connected'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
};

const getAllStatusMessages = async (req, res) => {
    try {
        const messages = await Status.find().sort({ timestamp: -1 });
        
        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching messages',
            error: error.message
        });
    }
};

export {
    getStatus,
    getDatabaseStatus,
    getAllStatusMessages
};