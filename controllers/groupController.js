// controllers/groupController.js
import Group from '../models/Group.js';
import GroupMember from '../models/GroupMember.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

/**
 * Utility functions
 */

// Validate group name uniqueness
const validateGroupName = async (name, excludeId = null) => {
    const query = { name: name.trim() };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    
    const existingGroup = await Group.findOne(query);
    if (existingGroup) {
        throw new Error('Group with this name already exists');
    }
};

// Get group with member count
const getGroupWithMemberCount = async (groupId) => {
    const [group, memberCount] = await Promise.all([
        Group.findById(groupId).lean(),
        GroupMember.countDocuments({ group: groupId, isActive: true })
    ]);
    
    if (!group) {
        throw new Error('Group not found');
    }
    
    return { ...group, memberCount };
};

// Get group data with messages
const getGroupData = async (groupId, messageLimit = 50) => {
    const [groupData, messages] = await Promise.all([
        getGroupWithMemberCount(groupId),
        Message.find({ group: groupId })
            .populate('sender', 'name email')
            .sort({ createdAt: 1 })
            .limit(messageLimit)
            .lean()
    ]);
    
    return { group: groupData, messages };
};

// Create default groups if they don't exist
const createDefaultGroups = async () => {
    const defaultGroups = [
        { name: 'General Chat', description: 'General discussions for everyone', isPublic: true, maxMembers: 1000 },
        { name: 'Technology', description: 'Tech talks and discussions', isPublic: true, maxMembers: 500 },
        { name: 'Gaming', description: 'Video games and gaming culture', isPublic: true, maxMembers: 300 },
        { name: 'Music', description: 'Share and discuss music', isPublic: true, maxMembers: 200 },
        { name: 'Sports', description: 'Sports discussions and updates', isPublic: true, maxMembers: 400 }
    ];

    for (const groupData of defaultGroups) {
        const existingGroup = await Group.findOne({ name: groupData.name });
        if (!existingGroup) {
            await Group.create(groupData);
            console.log(`✅ Created default group: ${groupData.name}`);
        }
    }
};

/**
 * Public Routes (No Authentication Required)
 */

// Get public groups for demo
export const getPublicGroupsForDemo = async (req, res) => {
    try {
        // Ensure default groups exist
        await createDefaultGroups();

        const groups = await Group.find({ isPublic: true })
            .select('name description isPublic maxMembers createdAt')
            .sort({ name: 1 })
            .limit(10)
            .lean();

        // Get member counts for each group
        const groupsWithCounts = await Promise.all(
            groups.map(async (group) => {
                const memberCount = await GroupMember.countDocuments({
                    group: group._id,
                    isActive: true
                });
                return {
                    ...group,
                    memberCount
                };
            })
        );

        res.status(200).json({
            success: true,
            count: groupsWithCounts.length,
            data: groupsWithCounts
        });

    } catch (error) {
        console.error('❌ Get public groups for demo error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching groups',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

// Get all public groups
export const getAllPublicGroups = async (req, res) => {
    try {
        const groups = await Group.find({ isPublic: true })
            .select('name description maxMembers createdAt')
            .sort({ name: 1 })
            .lean();

        const groupsWithCounts = await Promise.all(
            groups.map(async (group) => {
                const memberCount = await GroupMember.countDocuments({
                    group: group._id,
                    isActive: true
                });
                return {
                    ...group,
                    memberCount
                };
            })
        );

        res.status(200).json({
            success: true,
            count: groupsWithCounts.length,
            data: groupsWithCounts
        });

    } catch (error) {
        console.error('❌ Get public groups error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching public groups'
        });
    }
};

// Get all groups (for admin/demo purposes)
export const getAllGroups = async (req, res) => {
    try {
        const groups = await Group.find()
            .select('name description isPublic maxMembers createdAt')
            .sort({ name: 1 })
            .lean();

        const groupsWithCounts = await Promise.all(
            groups.map(async (group) => {
                const memberCount = await GroupMember.countDocuments({
                    group: group._id,
                    isActive: true
                });
                return {
                    ...group,
                    memberCount
                };
            })
        );

        res.status(200).json({
            success: true,
            count: groupsWithCounts.length,
            data: groupsWithCounts
        });

    } catch (error) {
        console.error('❌ Get all groups error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching groups'
        });
    }
};

// Create group without authentication (for demo)
export const createGroupPublic = async (req, res) => {
    try {
        const { name, description, isPublic = true, maxMembers = 50 } = req.body;

        console.log('👥 Creating public group:', name);

        // Validate group name
        await validateGroupName(name);

        // Create group
        const group = await Group.create({
            name: name.trim(),
            description: description?.trim(),
            isPublic,
            maxMembers: Math.min(Math.max(maxMembers, 1), 1000), // Clamp between 1-1000
            createdBy: null
        });

        console.log('✅ Public group created:', group._id);

        res.status(201).json({
            success: true,
            message: 'Group created successfully',
            data: group
        });

    } catch (error) {
        console.error('❌ Create public group error:', error);
        
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

        if (error.code === 11000 || error.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                message: 'Group with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating group',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

// Update group publicly (for demo)
export const updateGroupPublic = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description, isPublic, maxMembers } = req.body;

        console.log('🔄 Updating group publicly:', groupId);

        // Check if group exists
        const existingGroup = await Group.findById(groupId);
        if (!existingGroup) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Validate group name if changing
        if (name && name !== existingGroup.name) {
            await validateGroupName(name, groupId);
        }

        const updateData = {
            ...(name && { name: name.trim() }),
            ...(description && { description: description.trim() }),
            ...(isPublic !== undefined && { isPublic }),
            ...(maxMembers && { maxMembers: Math.min(Math.max(maxMembers, 1), 1000) })
        };

        const updatedGroup = await Group.findByIdAndUpdate(
            groupId,
            updateData,
            { new: true, runValidators: true }
        );

        console.log('✅ Group updated publicly:', updatedGroup._id);

        res.status(200).json({
            success: true,
            message: 'Group updated successfully',
            data: updatedGroup
        });

    } catch (error) {
        console.error('❌ Update group public error:', error);
        
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

        if (error.code === 11000 || error.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                message: 'Group with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating group',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

// Delete group publicly (for demo)
export const deleteGroupPublic = async (req, res) => {
    try {
        const { groupId } = req.params;

        console.log('🗑️ Deleting group publicly:', groupId);

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Prevent deletion of Main Chat
        if (group.name === 'Main Chat') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete the Main Chat group'
            });
        }

        // Delete all related data in parallel
        await Promise.all([
            Message.deleteMany({ group: groupId }),
            GroupMember.deleteMany({ group: groupId }),
            Group.findByIdAndDelete(groupId)
        ]);

        console.log('✅ Group deleted publicly:', groupId);

        res.status(200).json({
            success: true,
            message: 'Group deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete group public error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting group',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * Protected Routes (Require Authentication)
 */

// Create a new group
export const createGroup = async (req, res) => {
    try {
        const { name, description, isPublic, maxMembers } = req.body;
        const userId = req.user._id;

        console.log('👥 Creating group by user:', userId);

        // Validate group name
        await validateGroupName(name);

        const group = await Group.create({
            name: name.trim(),
            description: description?.trim(),
            isPublic: isPublic || false,
            maxMembers: Math.min(Math.max(maxMembers || 50, 1), 1000),
            createdBy: userId
        });

        // Add creator as admin member
        await GroupMember.create({
            user: userId,
            group: group._id,
            role: 'admin'
        });

        // Add welcome message
        await Message.create({
            content: `Group "${name}" was created! Start the conversation.`,
            sender: userId,
            group: group._id,
            messageType: 'system'
        });

        console.log('✅ Group created:', group._id);

        res.status(201).json({
            success: true,
            message: 'Group created successfully',
            data: group
        });

    } catch (error) {
        console.error('❌ Create group error:', error);
        
        if (error.code === 11000 || error.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                message: 'Group with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating group',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

// Get user's groups
export const getUserGroups = async (req, res) => {
    try {
        const userId = req.user._id;

        const userGroups = await GroupMember.find({ user: userId, isActive: true })
            .populate('group')
            .sort({ updatedAt: -1 })
            .lean();

        const groups = userGroups.map(member => ({
            ...member.group,
            userRole: member.role,
            joinedAt: member.joinedAt
        }));

        res.status(200).json({
            success: true,
            count: groups.length,
            data: groups
        });

    } catch (error) {
        console.error('❌ Get user groups error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching groups'
        });
    }
};

// Get main chat for user
export const getMainChat = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Find or create main chat
        let mainChat = await Group.findOne({ name: 'Main Chat' });
        
        if (!mainChat) {
            mainChat = await Group.create({
                name: 'Main Chat',
                description: 'Welcome to the main chat room!',
                isPublic: true,
                maxMembers: 1000,
                createdBy: userId
            });
        }

        // Ensure user is member of main chat
        const existingMembership = await GroupMember.findOne({
            user: userId,
            group: mainChat._id
        });

        if (!existingMembership) {
            await GroupMember.create({
                user: userId,
                group: mainChat._id,
                role: 'member'
            });
        }

        const groupData = await getGroupData(mainChat._id);

        res.status(200).json({
            success: true,
            data: groupData
        });

    } catch (error) {
        console.error('❌ Get main chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading main chat'
        });
    }
};

// Get group details
export const getGroupDetails = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Check if user is member of the group
        const membership = await GroupMember.findOne({
            user: userId,
            group: groupId,
            isActive: true
        });

        if (!membership) {
            return res.status(403).json({
                success: false,
                message: 'You are not a member of this group'
            });
        }

        const groupData = await getGroupData(groupId);

        res.status(200).json({
            success: true,
            data: {
                ...groupData,
                userRole: membership.role
            }
        });

    } catch (error) {
        console.error('❌ Get group details error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching group details'
        });
    }
};

// Update group (Admin only)
export const updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description, isPublic, maxMembers } = req.body;
        const userId = req.user._id;

        console.log('🔄 Updating group:', groupId);

        // Check if group exists and user is admin
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        const adminMembership = await GroupMember.findOne({
            user: userId,
            group: groupId,
            role: 'admin'
        });

        if (!adminMembership) {
            return res.status(403).json({
                success: false,
                message: 'Only group admin can update the group'
            });
        }

        // Validate group name if changing
        if (name && name !== group.name) {
            await validateGroupName(name, groupId);
        }

        const updateData = {
            ...(name && { name: name.trim() }),
            ...(description && { description: description.trim() }),
            ...(isPublic !== undefined && { isPublic }),
            ...(maxMembers && { maxMembers: Math.min(Math.max(maxMembers, 1), 1000) })
        };

        const updatedGroup = await Group.findByIdAndUpdate(
            groupId,
            updateData,
            { new: true, runValidators: true }
        );

        console.log('✅ Group updated:', updatedGroup._id);

        res.status(200).json({
            success: true,
            message: 'Group updated successfully',
            data: updatedGroup
        });

    } catch (error) {
        console.error('❌ Update group error:', error);
        
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

        if (error.code === 11000 || error.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                message: 'Group with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating group',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

// Delete group (Admin only)
export const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        console.log('🗑️ Deleting group:', groupId);

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        const adminMembership = await GroupMember.findOne({
            user: userId,
            group: groupId,
            role: 'admin'
        });

        if (!adminMembership) {
            return res.status(403).json({
                success: false,
                message: 'Only group admin can delete the group'
            });
        }

        // Prevent deletion of Main Chat
        if (group.name === 'Main Chat') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete the Main Chat group'
            });
        }

        // Delete all related data in parallel
        await Promise.all([
            Message.deleteMany({ group: groupId }),
            GroupMember.deleteMany({ group: groupId }),
            Group.findByIdAndDelete(groupId)
        ]);

        console.log('✅ Group deleted:', groupId);

        res.status(200).json({
            success: true,
            message: 'Group deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete group error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting group',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};