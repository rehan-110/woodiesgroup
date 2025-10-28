// controllers/messageController.js
import Message from '../models/Message.js';
import GroupMember from '../models/GroupMember.js';
import Group from '../models/Group.js';

/**
 * Utility functions
 */

// Validate user membership in group
const validateGroupMembership = async (userId, groupId) => {
    const membership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        isActive: true
    });

    if (!membership) {
        throw new Error('You are not a member of this group');
    }

    return membership;
};

// Validate message content
const validateMessageContent = (content) => {
    if (!content || content.trim().length === 0) {
        throw new Error('Message content cannot be empty');
    }

    if (content.length > 1000) {
        throw new Error('Message cannot exceed 1000 characters');
    }

    return content.trim();
};

// Validate message type
const validateMessageType = (messageType) => {
    const validTypes = ['text', 'image', 'file', 'system'];
    if (!validTypes.includes(messageType)) {
        throw new Error('Invalid message type');
    }
    return messageType;
};

// Get messages with pagination
const getMessagesWithPagination = async (groupId, page = 1, limit = 50) => {
    const skip = (page - 1) * limit;
    
    const [messages, totalCount] = await Promise.all([
        Message.find({ group: groupId })
            .populate('sender', 'name email')
            .sort({ createdAt: -1 }) // Newest first for pagination
            .skip(skip)
            .limit(limit)
            .lean(),
        Message.countDocuments({ group: groupId })
    ]);

    // Reverse for chronological order (oldest first for display)
    const chronologicalMessages = messages.reverse();

    return {
        messages: chronologicalMessages,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalMessages: totalCount,
            hasNext: page < Math.ceil(totalCount / limit),
            hasPrev: page > 1
        }
    };
};

// Mark message as read for user
const markMessageAsRead = async (messageId, userId) => {
    await Message.findByIdAndUpdate(
        messageId,
        {
            $addToSet: {
                readBy: {
                    user: userId,
                    readAt: new Date()
                }
            }
        },
        { new: true }
    );
};

/**
 * Send a message to group
 */
export const sendMessage = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { content, messageType = 'text' } = req.body;
        const userId = req.user._id;

        console.log('💬 Sending message to group:', groupId);

        // Validate inputs
        const validatedContent = validateMessageContent(content);
        const validatedMessageType = validateMessageType(messageType);
        
        // Check group membership
        await validateGroupMembership(userId, groupId);

        // Verify group exists and is accessible
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Create and save the message
        const message = await Message.create({
            content: validatedContent,
            sender: userId,
            group: groupId,
            messageType: validatedMessageType
        });

        console.log('✅ Message created:', message._id);

        // Populate the sender information
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name email')
            .lean();

        // Mark message as read by sender immediately
        await markMessageAsRead(message._id, userId);

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: {
                ...populatedMessage,
                readBy: [{ user: userId, readAt: new Date() }]
            }
        });

    } catch (error) {
        console.error('❌ Send message error:', error);
        
        // Handle validation errors
        if (error.message.includes('Message content cannot be empty') ||
            error.message.includes('Message cannot exceed') ||
            error.message.includes('Invalid message type')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // Handle membership errors
        if (error.message.includes('not a member')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        // Handle database errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));
            
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error sending message',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * Get messages from a group with pagination
 */
export const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        console.log(`📨 Fetching messages for group: ${groupId}, page: ${page}, limit: ${limit}`);

        // Validate pagination parameters
        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: 'Invalid pagination parameters. Page must be >= 1, limit between 1-100'
            });
        }

        // Check group membership
        await validateGroupMembership(userId, groupId);

        // Verify group exists
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Get messages with pagination
        const { messages, pagination } = await getMessagesWithPagination(groupId, page, limit);

        console.log(`✅ Found ${messages.length} messages for group ${groupId}`);

        // Mark all fetched messages as read by current user
        const markReadPromises = messages.map(message => 
            markMessageAsRead(message._id, userId)
        );
        await Promise.all(markReadPromises);

        res.status(200).json({
            success: true,
            data: {
                messages,
                pagination
            }
        });

    } catch (error) {
        console.error('❌ Get messages error:', error);
        
        // Handle membership errors
        if (error.message.includes('not a member')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error fetching messages',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * Get unread message count for user in a group
 */
export const getUnreadMessageCount = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        console.log(`🔔 Getting unread count for user ${userId} in group ${groupId}`);

        // Check group membership
        await validateGroupMembership(userId, groupId);

        // Count messages not read by current user
        const unreadCount = await Message.countDocuments({
            group: groupId,
            'readBy.user': { $ne: userId },
            sender: { $ne: userId } // Don't count user's own messages
        });

        res.status(200).json({
            success: true,
            data: {
                unreadCount,
                groupId,
                userId
            }
        });

    } catch (error) {
        console.error('❌ Get unread count error:', error);
        
        if (error.message.includes('not a member')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error fetching unread message count',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * Mark messages as read in bulk
 */
export const markMessagesAsRead = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { messageIds } = req.body;
        const userId = req.user._id;

        console.log(`📖 Marking ${messageIds?.length || 0} messages as read in group ${groupId}`);

        if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message IDs array is required'
            });
        }

        // Check group membership
        await validateGroupMembership(userId, groupId);

        // Mark all specified messages as read
        const markReadPromises = messageIds.map(messageId =>
            markMessageAsRead(messageId, userId)
        );

        await Promise.all(markReadPromises);

        res.status(200).json({
            success: true,
            message: `${messageIds.length} messages marked as read`,
            data: {
                markedCount: messageIds.length,
                groupId,
                userId
            }
        });

    } catch (error) {
        console.error('❌ Mark messages as read error:', error);
        
        if (error.message.includes('not a member')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error marking messages as read',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * Delete a message (only by sender or admin)
 */
export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        console.log(`🗑️ Deleting message: ${messageId}`);

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Check if user is the sender or group admin
        const isSender = message.sender.toString() === userId.toString();
        
        if (!isSender) {
            // Check if user is group admin
            const adminMembership = await GroupMember.findOne({
                user: userId,
                group: message.group,
                role: 'admin',
                isActive: true
            });

            if (!adminMembership) {
                return res.status(403).json({
                    success: false,
                    message: 'Only message sender or group admin can delete messages'
                });
            }
        }

        await Message.findByIdAndDelete(messageId);

        console.log('✅ Message deleted:', messageId);

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete message error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting message',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * Edit a message (only by sender)
 */
export const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;

        console.log(`✏️ Editing message: ${messageId}`);

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Check if user is the sender
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only message sender can edit messages'
            });
        }

        // Validate new content
        const validatedContent = validateMessageContent(content);

        // Update message
        const updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            { 
                content: validatedContent,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).populate('sender', 'name email');

        console.log('✅ Message edited:', messageId);

        res.status(200).json({
            success: true,
            message: 'Message updated successfully',
            data: updatedMessage
        });

    } catch (error) {
        console.error('❌ Edit message error:', error);
        
        if (error.message.includes('Message content cannot be empty') ||
            error.message.includes('Message cannot exceed')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error editing message',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};