// controllers/adminController.js
import User from '../models/User.js';
import Group from '../models/Group.js';
import GroupMember from '../models/GroupMember.js';
import Message from '../models/Message.js';

/**
 * Utility function to check admin permissions
 */
const checkAdminPermission = async (userId) => {
    const adminUser = await User.findById(userId);
    if (!adminUser || (adminUser.role !== 'super_admin' && adminUser.role !== 'admin')) {
        throw new Error('Only administrators can perform this action');
    }
    return adminUser;
};

/**
 * Validate and get user by ID
 */
const validateUserExists = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    return user;
};

/**
 * Validate assigned group exists
 */
const validateAssignedGroup = async (groupId) => {
    if (!groupId) return null;
    
    const group = await Group.findById(groupId);
    if (!group) {
        throw new Error('Assigned group not found');
    }
    return group;
};

/**
 * Create user by admin
 */
export const createUser = async (req, res) => {
    try {
        const { name, email, password, role, assignedGroup } = req.body;
        const adminId = req.user._id;

        await checkAdminPermission(adminId);
        await validateAssignedGroup(assignedGroup);

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User already exists with this email address'
            });
        }

        // Create new user
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            role: role || 'user',
            assignedGroup: assignedGroup || null
        });

        // If assigned to a group, add as member
        if (assignedGroup) {
            await GroupMember.create({
                user: user._id,
                group: assignedGroup,
                role: 'member'
            });
        }

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                assignedGroup: user.assignedGroup,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Admin create user error:', error);
        
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

        // Handle custom permission errors
        if (error.message.includes('Only administrators') || error.message.includes('Assigned group')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating user',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * Get all groups for dropdown (Admin only)
 */
export const getAllGroups = async (req, res) => {
    try {
        await checkAdminPermission(req.user._id);

        const groups = await Group.find()
            .select('name description isPublic maxMembers createdAt')
            .sort({ name: 1 })
            .lean();

        res.status(200).json({
            success: true,
            count: groups.length,
            data: groups
        });

    } catch (error) {
        console.error('Get groups error:', error);
        
        if (error.message.includes('Only administrators')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error fetching groups'
        });
    }
};

/**
 * Get all users with online status
 */
export const getAllUsers = async (req, res) => {
    try {
        await checkAdminPermission(req.user._id);

        const users = await User.find()
            .select('-password')
            .populate('assignedGroup', 'name')
            .sort({ createdAt: -1 })
            .lean();

        const usersWithStatus = users.map(user => ({
            ...user,
            isCurrentlyOnline: user.lastActive && 
                new Date(user.lastActive) > new Date(Date.now() - 5 * 60 * 1000)
        }));

        res.status(200).json({
            success: true,
            count: usersWithStatus.length,
            data: usersWithStatus
        });

    } catch (error) {
        console.error('Get users error:', error);
        
        if (error.message.includes('Only administrators')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
};

/**
 * Update user by admin
 */
export const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, password, role, assignedGroup } = req.body;
        const adminId = req.user._id;

        await checkAdminPermission(adminId);
        await validateUserExists(userId);
        await validateAssignedGroup(assignedGroup);

        // Prepare update data
        const updateData = {
            ...(name && { name: name.trim() }),
            ...(email && { email: email.toLowerCase().trim() }),
            ...(role && { role }),
            assignedGroup: assignedGroup || null
        };

        // Only update password if provided
        if (password) {
            updateData.password = password;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { 
                new: true, 
                runValidators: true,
                context: 'query'
            }
        ).select('-password').populate('assignedGroup', 'name');

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });

    } catch (error) {
        console.error('Admin update user error:', error);
        
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
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

        // Handle custom errors
        if (error.message.includes('Only administrators') || 
            error.message.includes('User not found') ||
            error.message.includes('Assigned group')) {
            return res.status(error.message.includes('User not found') ? 404 : 403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * Delete user by admin
 */
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const adminId = req.user._id;

        await checkAdminPermission(adminId);

        // Prevent admin from deleting themselves
        if (userId === adminId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        const userToDelete = await validateUserExists(userId);

        // Use transaction-like operations
        await Promise.all([
            GroupMember.deleteMany({ user: userId }),
            Message.deleteMany({ sender: userId }),
            User.findByIdAndDelete(userId)
        ]);

        res.status(200).json({
            success: true,
            message: `User ${userToDelete.name} deleted successfully`
        });

    } catch (error) {
        console.error('Admin delete user error:', error);
        
        if (error.message.includes('Only administrators') || error.message.includes('User not found')) {
            return res.status(error.message.includes('User not found') ? 404 : 403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error deleting user',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * Get user by ID for editing
 */
export const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        await checkAdminPermission(req.user._id);
        const user = await validateUserExists(userId);

        const userData = await User.findById(userId)
            .select('-password')
            .populate('assignedGroup', 'name')
            .lean();

        res.status(200).json({
            success: true,
            data: userData
        });

    } catch (error) {
        console.error('Get user by ID error:', error);
        
        if (error.message.includes('Only administrators') || error.message.includes('User not found')) {
            return res.status(error.message.includes('User not found') ? 404 : 403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error fetching user details'
        });
    }
};