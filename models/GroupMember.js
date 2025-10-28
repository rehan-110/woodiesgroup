// models/GroupMember.js
import mongoose from 'mongoose';

const groupMemberSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'moderator', 'member'],
        default: 'member'
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index to ensure unique membership
groupMemberSchema.index({ user: 1, group: 1 }, { unique: true });

// Export the model
export default mongoose.models.GroupMember || mongoose.model('GroupMember', groupMemberSchema);