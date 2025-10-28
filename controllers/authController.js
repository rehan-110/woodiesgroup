// controllers/authController.js
import User from '../models/User.js';
import Group from '../models/Group.js';
import GroupMember from '../models/GroupMember.js';
import Message from '../models/Message.js';
import generateToken from '../utils/generateToken.js';

/**
 * Utility function to find or create Main Chat group
 */
const getMainChatGroup = async (creatorId = null) => {
    let mainChat = await Group.findOne({ name: 'Main Chat', isPublic: true });
    
    if (!mainChat) {
        mainChat = await Group.create({
            name: 'Main Chat',
            description: 'Welcome to the main chat room!',
            isPublic: true,
            maxMembers: 1000,
            createdBy: creatorId
        });
        console.log('✅ Main Chat group created');
    }
    
    return mainChat;
};

/**
 * Ensure user is member of a group
 */
const ensureGroupMembership = async (userId, groupId) => {
    const existingMembership = await GroupMember.findOne({
        user: userId,
        group: groupId
    });

    if (!existingMembership) {
        await GroupMember.create({
            user: userId,
            group: groupId,
            role: 'member'
        });
        console.log(`✅ User ${userId} added to group ${groupId}`);
    }
    
    return true;
};

/**
 * Get group data with messages and member count
 */
const getGroupData = async (groupId, limit = 50) => {
    const [group, messages, memberCount] = await Promise.all([
        Group.findById(groupId).lean(),
        Message.find({ group: groupId })
            .populate('sender', 'name email')
            .sort({ createdAt: 1 }) // Oldest first for proper chat display
            .limit(limit)
            .lean(),
        GroupMember.countDocuments({ group: groupId, isActive: true })
    ]);

    return {
        group: { ...group, memberCount },
        messages
    };
};

/**
 * Validate password strength
 */
const validatePasswordStrength = (password) => {
    if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
    }
    // Add more password strength rules if needed
};

/**
 * User Signup Controller
 */
export const signup = async (req, res) => {
    try {
        const { name, email, password, role, assignedGroup } = req.body;

        console.log('👤 Signup attempt for:', email);

        // Validate input
        validatePasswordStrength(password);

        // Check for existing user
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User already exists with this email address'
            });
        }

        // Validate assigned group if provided
        let targetGroup = null;
        if (assignedGroup) {
            targetGroup = await Group.findById(assignedGroup);
            if (!targetGroup) {
                return res.status(404).json({
                    success: false,
                    message: 'Assigned group not found'
                });
            }
        }

        // Create new user
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            role: role || 'user',
            assignedGroup: assignedGroup || null
        });

        console.log('✅ User created:', user._id);

        // Determine target group
        let finalGroup = targetGroup;
        if (!finalGroup) {
            finalGroup = await getMainChatGroup(user._id);
        }

        // Ensure user is member of the group
        await ensureGroupMembership(user._id, finalGroup._id);

        // Add welcome message if it's a new group or Main Chat
        if (!assignedGroup || finalGroup.name === 'Main Chat') {
            await Message.create({
                content: `🎉 Welcome ${user.name} to ${finalGroup.name}!`,
                sender: user._id,
                group: finalGroup._id,
                messageType: 'system'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        // Get group data
        const groupData = await getGroupData(finalGroup._id);

        // Prepare user response
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            assignedGroup: user.assignedGroup,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            token,
            data: {
                user: userResponse,
                ...groupData
            }
        });

    } catch (error) {
        console.error('❌ Signup error:', error);
        
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'User already exists with this email address'
            });
        }

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

        // Handle password validation error
        if (error.message.includes('Password must be')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error during signup',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * User Login Controller
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 Login attempt for:', email);

        // Find user with password
        const user = await User.findOne({ email: email.toLowerCase().trim() })
            .select('+password')
            .populate('assignedGroup');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        console.log('✅ Login successful for:', user.email);

        // Generate token
        const token = generateToken(user._id);

        // Determine target group
        let targetGroup = user.assignedGroup;
        if (!targetGroup) {
            targetGroup = await getMainChatGroup(user._id);
        }

        // Ensure user is member of the group
        await ensureGroupMembership(user._id, targetGroup._id);

        // Get group data
        const groupData = await getGroupData(targetGroup._id);

        // Prepare user response
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            assignedGroup: user.assignedGroup,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            data: {
                user: userResponse,
                ...groupData
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * Change Password Controller
 */
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;

        console.log('🔑 Password change request for user:', userId);

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        validatePasswordStrength(newPassword);

        // Get user with password
        const user = await User.findById(userId).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Check if new password is same as current
        const isSamePassword = await user.comparePassword(newPassword);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: 'New password cannot be the same as current password'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        console.log('✅ Password updated for user:', userId);

        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('❌ Change password error:', error);
        
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

        // Handle password validation error
        if (error.message.includes('Password must be')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error changing password',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * Get User Profile
 */
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('assignedGroup', 'name description')
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Add online status
        const userWithStatus = {
            ...user,
            isCurrentlyOnline: user.lastActive && 
                new Date(user.lastActive) > new Date(Date.now() - 5 * 60 * 1000)
        };

        res.status(200).json({
            success: true,
            data: userWithStatus
        });

    } catch (error) {
        console.error('❌ Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile'
        });
    }
};

export default {
    signup,
    login,
    getProfile,
    changePassword
};