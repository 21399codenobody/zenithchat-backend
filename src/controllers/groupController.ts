import type { Response } from "express";
import mongoose from "mongoose";
import Group from "@/models/Group.js";
import type { AuthenticatedRequest } from "@/middlewares/authMiddleware.js";
import { 
    ENTITY_POPULATE_FIELDS, 
    isEntityOwner, 
    isEntityAdmin, 
    isValidHandle, 
    DEFAULT_GROUP_ADMIN_POWERS, 
    DEFAULT_GROUP_PERMISSIONS, 
    isValidSlowMode, 
    calculateGroupSuccessor 
} from "@/utils/index.js";

export const createGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { name, description, profilePic, groupType, userName, memberIds } = req.body || {};
        const ownerId = req.user!._id;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            res.status(400).json({ success: false, message: "Group name is required." });
            return;
        }

        if (groupType === 'public' && userName) {
            if (!isValidHandle(userName)) {
                res.status(400).json({ success: false, message: "Invalid group username (4-20 alphanumeric characters)." });
                return;
            }
            const existingGroup = await Group.findOne({ userName: userName.toLowerCase().trim() });
            if (existingGroup) {
                res.status(400).json({ success: false, message: "This group username is already taken!" });
                return;
            }
        }

        const initialMembers = [ownerId];
        if (Array.isArray(memberIds)) {
            memberIds.forEach(id => {
                if (mongoose.Types.ObjectId.isValid(id) && id.toString() !== ownerId.toString()) {
                    initialMembers.push(id);
                }
            });
        }

        const ownerAdminProfile = {
            user: ownerId,
            ...DEFAULT_GROUP_ADMIN_POWERS,
            canAddAdmins: true,
            canManageVideoChat: true,
            customTitle: "Creator"
        };

        const group = await Group.create({
            name: name.trim(),
            description: description ? description.trim() : "",
            profilePic: profilePic || '',
            owner: ownerId,
            groupType: groupType || 'public',
            userName: groupType === 'public' && userName ? userName.toLowerCase().trim() : undefined,
            chatHistoryForNewMembers: 'hidden',
            restrictSavingContent: false,
            slowMode: 'off',
            admins: [ownerAdminProfile],
            defaultPermissions: DEFAULT_GROUP_PERMISSIONS,
            members: initialMembers,
            bannedUsers: []
        });

        const fullGroup = await Group.findById(group._id)
            .populate('owner', ENTITY_POPULATE_FIELDS)
            .populate('members', ENTITY_POPULATE_FIELDS);

        res.status(201).json({
            success: true,
            message: "Group created successfully!",
            group: fullGroup
        });
    } catch (error) {
        console.error("createGroup Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const getGroupDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const currentUserId = req.user!._id;

        if (!groupId || typeof groupId !== 'string' || !mongoose.Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ success: false, message: "Valid group ID is required." });
            return;
        }

        const group = await Group.findById(groupId)
            .populate('owner', ENTITY_POPULATE_FIELDS)
            .populate('members', ENTITY_POPULATE_FIELDS)
            .populate('admins.user', ENTITY_POPULATE_FIELDS);

        if (!group) {
            res.status(404).json({ success: false, message: "Group not found." });
            return;
        }

        const isMember = group.members.some((m: any) => (m._id || m).toString() === currentUserId.toString());
        if (group.groupType === 'private' && !isMember) {
            res.status(403).json({ success: false, message: "Access denied to private group." });
            return;
        }

        res.status(200).json({
            success: true,
            group
        });
    } catch (error) {
        console.error("getGroupDetails Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const updateGroupSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const { name, description, profilePic, slowMode, restrictSavingContent, chatHistoryForNewMembers, groupType, defaultPermissions } = req.body || {};
        const currentUserId = req.user!._id;

        if (!groupId || typeof groupId !== 'string' || !mongoose.Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ success: false, message: "Valid group ID is required." });
            return;
        }

        const group = await Group.findById(groupId);
        if (!group) {
            res.status(404).json({ success: false, message: "Group not found." });
            return;
        }

        const adminEntry = group.admins.find(a => a.user.toString() === currentUserId.toString());
        const canChange = isEntityOwner(group, currentUserId) || adminEntry?.canChangeGroupInfo;

        if (!canChange) {
            res.status(403).json({ success: false, message: "Access Denied! You lack permission to edit group settings." });
            return;
        }

        if (name && typeof name === 'string') group.name = name.trim();
        if (description !== undefined && typeof description === 'string') group.description = description.trim();
        if (profilePic !== undefined) group.profilePic = profilePic;
        if (typeof restrictSavingContent === 'boolean') group.restrictSavingContent = restrictSavingContent;
        if (['visible', 'hidden'].includes(chatHistoryForNewMembers)) group.chatHistoryForNewMembers = chatHistoryForNewMembers;
        if (['public', 'private'].includes(groupType)) group.groupType = groupType;
        if (slowMode && isValidSlowMode(slowMode)) group.slowMode = slowMode as any;
        if (defaultPermissions) {
            group.defaultPermissions = {
                ...group.defaultPermissions,
                ...defaultPermissions
            };
        }

        await group.save();

        res.status(200).json({
            success: true,
            message: "Group settings updated successfully!",
            group
        });
    } catch (error) {
        console.error("updateGroupSettings Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const manageMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const { action, targetUserId } = req.body || {};
        const currentUserId = req.user!._id;

        if (!groupId || typeof groupId !== 'string' || !mongoose.Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ success: false, message: "Valid group ID is required." });
            return;
        }

        if (!['add', 'remove', 'ban', 'unban'].includes(action) || !targetUserId || typeof targetUserId !== 'string' || !mongoose.Types.ObjectId.isValid(targetUserId)) {
            res.status(400).json({ success: false, message: "Valid action and targetUserId required." });
            return;
        }

        const group = await Group.findById(groupId);
        if (!group) {
            res.status(404).json({ success: false, message: "Group not found." });
            return;
        }

        if (isEntityOwner(group, targetUserId) && ['remove', 'ban'].includes(action)) {
            res.status(403).json({ success: false, message: "You cannot remove or ban the group owner!" });
            return;
        }

        const targetIsAdmin = group.admins.some(a => a.user.toString() === targetUserId.toString());
        if (targetIsAdmin && !isEntityOwner(group, currentUserId)) {
            res.status(403).json({ success: false, message: "Forbidden! Admins cannot remove or ban fellow admins. Only the owner can." });
            return;
        }

        const adminEntry = group.admins.find(a => a.user.toString() === currentUserId.toString());

        if (action === 'add') {
            const canAdd = isEntityOwner(group, currentUserId) || adminEntry?.canAddMembers || group.groupType === 'public';
            if (!canAdd) {
                res.status(403).json({ success: false, message: "Permission Denied to add members." });
                return;
            }

            await Group.findByIdAndUpdate(groupId, {
                $addToSet: { members: targetUserId },
                $pull: { bannedUsers: targetUserId }
            });
        } 
        else if (action === 'remove' || action === 'ban') {
            const canBan = isEntityOwner(group, currentUserId) || adminEntry?.canBanUsers;
            if (!canBan) {
                res.status(403).json({ success: false, message: "Permission denied to remove or ban users." });
                return;
            }

            const updateQuery: any = {
                $pull: {
                    members: targetUserId,
                    admins: { user: targetUserId }
                }
            };

            if (action === 'ban') {
                updateQuery.$addToSet = { bannedUsers: targetUserId };
            }

            
            await Group.findByIdAndUpdate(groupId, updateQuery);
        } 
        else if (action === 'unban') {
            if (!isEntityAdmin(group, currentUserId)) {
                res.status(403).json({ success: false, message: "Permission denied to unban users." });
                return;
            }
            await Group.findByIdAndUpdate(groupId, {
                $pull: { bannedUsers: targetUserId }
            });
        }

        res.status(200).json({
            success: true,
            message: `Action '${action}' executed successfully.`
        });
    } catch (error) {
        console.error("manageMembers Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const manageAdmins = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const { action, targetUserId, powers, customTitle } = req.body || {};
        const currentUserId = req.user!._id;

        if (!groupId || typeof groupId !== 'string' || !mongoose.Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ success: false, message: "Valid group ID is required." });
            return;
        }

        if (!targetUserId || typeof targetUserId !== 'string' || !mongoose.Types.ObjectId.isValid(targetUserId)) {
            res.status(400).json({ success: false, message: "Valid targetUserId is required." });
            return;
        }

        const group = await Group.findById(groupId);
        if (!group) {
            res.status(404).json({ success: false, message: "Group not found." });
            return;
        }

        const adminEntry = group.admins.find(a => a.user.toString() === currentUserId.toString());
        const canManage = isEntityOwner(group, currentUserId) || adminEntry?.canAddAdmins;

        if (!canManage) {
            res.status(403).json({ success: false, message: "Only owner or authorized admins can manage roles." });
            return;
        }

        if (isEntityOwner(group, targetUserId)) {
            res.status(403).json({ success: false, message: "Cannot modify owner's admin status." });
            return;
        }

        if (action === 'promote') {
            await Group.findByIdAndUpdate(groupId, {
                $pull: { admins: { user: targetUserId } }
            });

            const newAdmin = {
                user: targetUserId,
                ...DEFAULT_GROUP_ADMIN_POWERS,
                ...(powers || {}),
                customTitle: customTitle ? customTitle.trim() : "Admin"
            };

            await Group.findByIdAndUpdate(groupId, {
                $push: { admins: newAdmin },
                $addToSet: { members: targetUserId }
            });
        } else if (action === 'demote') {
            await Group.findByIdAndUpdate(groupId, {
                $pull: { admins: { user: targetUserId } }
            });
        } else {
            res.status(400).json({ success: false, message: "Action must be 'promote' or 'demote'." });
            return;
        }

        res.status(200).json({
            success: true,
            message: `Admin role '${action}' updated successfully.`
        });
    } catch (error) {
        console.error("manageAdmins Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const leaveGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const { nominatedOwnerId } = req.body || {};
        const currentUserId = req.user!._id;

        if (!groupId || typeof groupId !== 'string' || !mongoose.Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ success: false, message: "Valid group ID is required." });
            return;
        }

        const group = await Group.findById(groupId);
        if (!group) {
            res.status(404).json({ success: false, message: "Group not found." });
            return;
        }

        if (!isEntityOwner(group, currentUserId)) {
            await Group.findByIdAndUpdate(groupId, {
                $pull: {
                    members: currentUserId,
                    admins: { user: currentUserId }
                }
            });
            res.status(200).json({ success: true, message: "You have left the group." });
            return;
        }

        let newOwnerId: any = null;
        if (nominatedOwnerId && mongoose.Types.ObjectId.isValid(nominatedOwnerId)) {
            const isMember = group.members.some(m => m.toString() === nominatedOwnerId.toString());
            if (isMember) {
                newOwnerId = nominatedOwnerId;
            }
        }

        if (!newOwnerId) {
            newOwnerId = calculateGroupSuccessor(group, currentUserId.toString());
        }

        if (!newOwnerId) {
            await Group.findByIdAndDelete(groupId);
            res.status(200).json({
                success: true,
                message: "Owner left and no members remained. Group permanently deleted."
            });
            return;
        }

        group.owner = newOwnerId;
        const existingAdmin = group.admins.find(a => a.user.toString() === newOwnerId.toString());
        if (existingAdmin) {
            existingAdmin.canChangeGroupInfo = true;
            existingAdmin.canAddAdmins = true;
            existingAdmin.canDeleteMessages = true;
            existingAdmin.canBanUsers = true;
            existingAdmin.customTitle = "Owner";
        } else {
            group.admins.push({
                user: newOwnerId,
                ...DEFAULT_GROUP_ADMIN_POWERS,
                canChangeGroupInfo: true,
                canAddAdmins: true,
                customTitle: "Owner"
            });
        }

        group.members = group.members.filter(m => m.toString() !== currentUserId.toString());
        group.admins = group.admins.filter(a => a.user.toString() !== currentUserId.toString());
        await group.save();

        res.status(200).json({
            success: true,
            message: "You have left the group. Ownership transferred successfully!",
            newOwner: newOwnerId
        });
    } catch (error) {
        console.error("leaveGroup Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const deleteGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const currentUserId = req.user!._id;

        if (!groupId || typeof groupId !== 'string' || !mongoose.Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ success: false, message: "Valid group ID is required." });
            return;
        }

        const group = await Group.findById(groupId);
        if (!group) {
            res.status(404).json({ success: false, message: "Group not found." });
            return;
        }

        if (!isEntityOwner(group, currentUserId)) {
            res.status(403).json({ success: false, message: "Permission Denied! Only the group owner can delete this group." });
            return;
        }

        await Group.findByIdAndDelete(groupId);

        res.status(200).json({
            success: true,
            message: "Group has been permanently deleted by owner."
        });
    } catch (error) {
        console.error("deleteGroup Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};