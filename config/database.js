// config/database.js
import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📁 Database: ${conn.connection.name}`);
        
        return conn;
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        // Don't exit process in serverless environment
        throw error; // Let Vercel handle the error
    }
};

export default connectDB;