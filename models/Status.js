// models/Status.js
import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Export the model
export default mongoose.models.Status || mongoose.model('Status', statusSchema);