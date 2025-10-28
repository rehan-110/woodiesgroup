// controllers/groupMemberController.js
import Group from '../models/Group.js';
import GroupMember from '../models/GroupMember.js';
import User from '../models/User.js';

// Invite user to private group (Admin only)
export const inviteToGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { email } = req.body;
        const adminId = req.user._id;

        // Check if group exists and user is admin
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        const adminMembership = await GroupMember.findOne({
            user: adminId,
            group: groupId,
            role: 'admin'
        });

        if (!adminMembership) {
            return res.status(403).json({
                success: false,
                message: 'Only group admin can invite members'
            });
        }

        // Find user by email
        const userToInvite = await User.findOne({ email });
        if (!userToInvite) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is already a member
        const existingMember = await GroupMember.findOne({
            user: userToInvite._id,
            group: groupId
        });

        if (existingMember) {
            return res.status(409).json({
                success: false,
                message: 'User is already a member of this group'
            });
        }

        // Check if user is already invited
        const alreadyInvited = group.invitedUsers.find(
            invite => invite.user.toString() === userToInvite._id.toString()
        );

        if (alreadyInvited) {
            return res.status(409).json({
                success: false,
                message: 'User has already been invited to this group'
            });
        }

        // Add to invited users
        group.invitedUsers.push({
            user: userToInvite._id,
            invitedBy: adminId,
            status: 'pending'
        });

        await group.save();

        res.status(200).json({
            success: true,
            message: 'User invited successfully',
            data: {
                invitedUser: {
                    _id: userToInvite._id,
                    name: userToInvite.name,
                    email: userToInvite.email
                }
            }
        });

    } catch (error) {
        console.error('Invite to group error:', error);
        res.status(500).json({
            success: false,
            message: 'Error inviting user to group'
        });
    }
};

// Accept group invitation
export const acceptInvitation = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Find and update invitation
        const invitation = group.invitedUsers.find(
            invite => invite.user.toString() === userId.toString() && invite.status === 'pending'
        );

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: 'No pending invitation found'
            });
        }

        // Add user as member
        await GroupMember.create({
            user: userId,
            group: groupId,
            role: 'member'
        });

        // Update invitation status
        invitation.status = 'accepted';
        await group.save();

        res.status(200).json({
            success: true,
            message: 'Group invitation accepted successfully'
        });

    } catch (error) {
        console.error('Accept invitation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error accepting invitation'
        });
    }
};

// Get group members
export const getGroupMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Check if user is member of the group
        const userMembership = await GroupMember.findOne({
            user: userId,
            group: groupId,
            isActive: true
        });

        if (!userMembership) {
            return res.status(403).json({
                success: false,
                message: 'You are not a member of this group'
            });
        }

        const members = await GroupMember.find({ group: groupId, isActive: true })
            .populate('user', 'name email')
            .sort({ role: -1, joinedAt: 1 }); // Admins first, then by join date

        res.status(200).json({
            success: true,
            count: members.length,
            data: members
        });

    } catch (error) {
        console.error('Get group members error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching group members'
        });
    }
};

// Remove member from group (Admin only)
export const removeMember = async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const adminId = req.user._id;

        // Check if admin
        const adminMembership = await GroupMember.findOne({
            user: adminId,
            group: groupId,
            role: 'admin'
        });

        if (!adminMembership) {
            return res.status(403).json({
                success: false,
                message: 'Only group admin can remove members'
            });
        }

        // Cannot remove yourself if you're the only admin
        if (userId === adminId.toString()) {
            const adminCount = await GroupMember.countDocuments({
                group: groupId,
                role: 'admin',
                isActive: true
            });

            if (adminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot remove yourself as the only admin. Transfer admin role first or delete group.'
                });
            }
        }

        // Remove member
        await GroupMember.findOneAndUpdate(
            { user: userId, group: groupId },
            { isActive: false }
        );

        res.status(200).json({
            success: true,
            message: 'Member removed successfully'
        });

    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing member from group'
        });
    }
};