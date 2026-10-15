import type { Response } from "express";
import mongoose from "mongoose";
import User from "@/models/User.js";
import type { AuthenticatedRequest } from "@/middlewares/authMiddleware.js";
import { CONTACT_PUBLIC_FIELDS, isBlockedBetween, getFilteredPrivacyData } from '@/utils/userHelper.js';
import { formatAndValidatePhone } from '@/utils/phoneHelper.js';


export const syncContacts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { phoneNumbers, countryCode } = req.body || {};
        const currentUser = req.user!;

        if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
            res.status(400).json({
                success: false,
                message: "An array of phone numbers is required."
            });
            return;
        }

        
        const formattedPhones: string[] = [];
        for (const phone of phoneNumbers) {
            if (typeof phone === 'string') {
                const parsed = formatAndValidatePhone(phone, countryCode || 'BD');
                if (parsed.isValid && parsed.e164) {
                    formattedPhones.push(parsed.e164);
                }
            }
        }

        
        const registeredUsers = await User.find({
            phoneNumber: { $in: formattedPhones },
            _id: { $ne: currentUser._id }
        }).select(CONTACT_PUBLIC_FIELDS);

        
        const newContactIds = registeredUsers.map(u => u._id);
        await User.findByIdAndUpdate(currentUser._id, {
            $addToSet: {
                contacts: { $each: newContactIds }
            }
        });

        res.status(200).json({
            success: true,
            message: `${registeredUsers.length} contacts synced successfully!`,
            contacts: registeredUsers
        });

    } catch (error) {
        console.error("syncContacts Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const getMyContacts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.user!._id).populate('contacts', CONTACT_PUBLIC_FIELDS);
        res.status(200).json({
            success: true,
            contacts: user?.contacts || []
        });
    } catch (error) {
        console.error("getMyContacts Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const searchUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { query } = req.query;
        const currentUserId = req.user!._id;

        if (!query || typeof query !== 'string' || query.trim().length < 2) {
            res.status(400).json({ success: false, message: "Search query must be at least 2 characters long." });
            return;
        }

        const cleanQuery = query.trim().toLowerCase();
        const searchRegex = new RegExp(cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

        const users = await User.find({
            _id: { $ne: currentUserId },
            $or: [
                { userName: searchRegex },
                { firstName: searchRegex },
                { lastName: searchRegex }
            ]
        })
        .select(CONTACT_PUBLIC_FIELDS)
        .limit(20);

        res.status(200).json({
            success: true,
            users
        });

    } catch (error) {
        console.error("searchUsers Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const currentUser = req.user!;

        if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
            res.status(400).json({ success: false, message: "Invalid User ID format." });
            return;
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            res.status(404).json({ success: false, message: "User not found." });
            return;
        }

        if (isBlockedBetween(currentUser, targetUser)) {
            res.status(403).json({ success: false, message: "Access denied. Block restriction exists." });
            return;
        }

        const { visibleLastSeen } = getFilteredPrivacyData(targetUser, currentUser._id.toString());

        res.status(200).json({
            success: true,
            profile: {
                id: targetUser._id,
                numericId: targetUser.numericId,
                phoneNumber: targetUser.phoneNumber,
                name: `${targetUser.firstName} ${targetUser.lastName}`.trim(),
                userName: targetUser.userName,
                bio: targetUser.bio,
                profilePic: targetUser.profilePic,
                isOnline: targetUser.isOnline,
                lastSeen: visibleLastSeen,
            }
        });
    } catch (error) {
        console.error("getUserProfile Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const updatePrivacySettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { lastSeenVisibility, allowSensitiveContent } = req.body || {};
        const user = req.user!;
        const validVisibility = ['everyone', 'contacts', 'nobody'];

        if (lastSeenVisibility && validVisibility.includes(lastSeenVisibility)) {
            user.privacySettings.lastSeenVisibility = lastSeenVisibility;
        }

        if (typeof allowSensitiveContent === 'boolean') {
            user.privacySettings.allowSensitiveContent = allowSensitiveContent;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "Privacy settings updated successfully.",
            privacySettings: user.privacySettings
        });
    } catch (error) {
        console.error("updatePrivacySettings Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const blockUnblockUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { targetUserId } = req.body || {};
        const currentUser = req.user!;

        if (!targetUserId || typeof targetUserId !== 'string' || !mongoose.Types.ObjectId.isValid(targetUserId)) {
            res.status(400).json({ success: false, message: "Valid target user ID is required." });
            return;
        }

        if (currentUser._id.toString() === targetUserId.toString()) {
            res.status(400).json({ success: false, message: "You cannot block yourself." });
            return;
        }

        const targetUserExists = await User.exists({ _id: targetUserId });
        if (!targetUserExists) {
            res.status(404).json({ success: false, message: "Target user does not exist." });
            return;
        }

        const isBlocked = currentUser.blockedUsers?.some(id => id.toString() === targetUserId.toString());

        if (isBlocked) {
            await User.findByIdAndUpdate(currentUser._id, {
                $pull: { blockedUsers: targetUserId }
            });
            res.status(200).json({
                success: true,
                message: "User unblocked successfully.",
                isBlocked: false
            });
        } else {
            await User.findByIdAndUpdate(currentUser._id, {
                $addToSet: { blockedUsers: targetUserId }
            });
            res.status(200).json({
                success: true,
                message: "User blocked successfully.",
                isBlocked: true
            });
        }
    } catch (error) {
        console.error("blockUnblockUser Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};