import type { Response } from "express";
import mongoose from 'mongoose';
import Channel from "@/models/Channel.js";
import type { AuthenticatedRequest } from "@/middlewares/authMiddleware.js";
import { ENTITY_POPULATE_FIELDS, isEntityOwner, isValidHandle, DEFAULT_CHANNEL_ADMIN_POWERS } from "@/utils/index.js";

export const createChannel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { name, description, profilePic, channelType, userName, allowComments } = req.body || {};
        const ownerId = req.user!._id;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            res.status(400).json({ success: false, message: "Channel name is required." });
            return;
        }

        if (channelType === 'public' && userName) {
            if (!isValidHandle(userName)) {
                res.status(400).json({ success: false, message: "Invalid channel username (4-20 alphanumeric characters)." });
                return;
            }
            const existingChannel = await Channel.findOne({ userName: userName.toLowerCase().trim() });
            if (existingChannel) {
                res.status(400).json({ success: false, message: "This channel username is already taken!" });
                return;
            }
        }

        const ownerAdminProfile = {
            user: ownerId,
            ...DEFAULT_CHANNEL_ADMIN_POWERS,
            canAddAdmins: true
        };

        const channel = await Channel.create({
            name: name.trim(),
            description: description ? description.trim() : "",
            profilePic: profilePic || "",
            owner: ownerId,
            channelType: channelType || 'public',
            userName: channelType === 'public' && userName ? userName.toLowerCase().trim() : undefined,
            subscribers: [ownerId],
            allowComments: typeof allowComments === 'boolean' ? allowComments : true,
            admins: [ownerAdminProfile]
        });

        const fullChannel = await Channel.findById(channel._id).populate('owner', ENTITY_POPULATE_FIELDS);

        res.status(201).json({
            success: true,
            message: "Channel created successfully!",
            channel: fullChannel
        });
    } catch (error) {
        console.error("createChannel Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const getChannelDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { channelId } = req.params;
        const currentUserId = req.user!._id;

        if (!channelId || typeof channelId !== 'string' || !mongoose.Types.ObjectId.isValid(channelId)) {
            res.status(400).json({ success: false, message: "Valid Channel ID is required." });
            return;
        }


        const channel = await Channel.findById(channelId)
            .populate('owner', ENTITY_POPULATE_FIELDS)
            .populate('admins.user', ENTITY_POPULATE_FIELDS);

        if (!channel) {
            res.status(404).json({ success: false, message: "Channel not found." });
            return;
        }

        const isSubscriber = channel.subscribers.some(id => id.toString() === currentUserId.toString());
        if (channel.channelType === 'private' && !isSubscriber) {
            res.status(403).json({ success: false, message: "Access denied to private Channel." });
            return;
        }

        res.status(200).json({
            success: true,
            channel: {
                ...channel.toObject(),
                subscriberCount: channel.subscribers.length,
                isSubscriber
            }
        });
    } catch (error) {
        console.error("getChannelDetails Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const updateChannelSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { channelId } = req.params;
        const { name, description, profilePic, channelType, allowComments } = req.body || {};
        const currentUserId = req.user!._id;

        if (!channelId || typeof channelId !== 'string' || !mongoose.Types.ObjectId.isValid(channelId)) {
            res.status(400).json({ success: false, message: "Valid Channel ID is required." });
            return;
        }

        const channel = await Channel.findById(channelId);
        if (!channel) {
            res.status(404).json({ success: false, message: "Channel not found." });
            return;
        }

        const adminEntry = channel.admins.find(a => a.user.toString() === currentUserId.toString());
        const canEdit = isEntityOwner(channel, currentUserId) || adminEntry?.canEditMessages;

        if (!canEdit) {
            res.status(403).json({ success: false, message: "Permission Denied! You lack permission to edit this channel." });
            return;
        }

        if (name && typeof name === 'string') channel.name = name.trim();
        if (description !== undefined && typeof description === 'string') channel.description = description.trim();
        if (profilePic !== undefined) channel.profilePic = profilePic;
        if (['public', 'private'].includes(channelType)) channel.channelType = channelType;
        if (typeof allowComments === 'boolean') channel.allowComments = allowComments;

        await channel.save();

        res.status(200).json({
            success: true,
            message: "Channel updated successfully.",
            channel
        });
    } catch (error) {
        console.error("updateChannelSettings Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const subscribeUnsubscribe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { channelId } = req.params;
        const currentUserId = req.user!._id;

        if (!channelId || typeof channelId !== 'string' || !mongoose.Types.ObjectId.isValid(channelId)) {
            res.status(400).json({ success: false, message: "Valid Channel ID is required." });
            return;
        }

        const channel = await Channel.findById(channelId);
        if (!channel) {
            res.status(404).json({ success: false, message: "Channel not found." });
            return;
        }

        if (isEntityOwner(channel, currentUserId)) {
            res.status(400).json({ success: false, message: "Channel owner cannot unsubscribe from their own channel." });
            return;
        }

        const isSubscriber = channel.subscribers.some(id => id.toString() === currentUserId.toString());

        if (isSubscriber) {
            await Channel.findByIdAndUpdate(channelId, {
                $pull: {
                    subscribers: currentUserId,
                    admins: { user: currentUserId }
                }
            });
            res.status(200).json({
                success: true,
                message: "Unsubscribed from channel.",
                isSubscriber: false
            });
        } else {
            await Channel.findByIdAndUpdate(channelId, {
                $addToSet: { subscribers: currentUserId }
            });

            res.status(200).json({
                success: true,
                message: "Subscribed to channel successfully.",
                isSubscriber: true
            });
        }
    } catch (error) {
        console.error("subscribeUnsubscribe Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const manageChannelAdmins = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { channelId } = req.params;
        const { action, targetUserId, powers } = req.body || {};
        const currentUserId = req.user!._id;

        if (!channelId || typeof channelId !== 'string' || !mongoose.Types.ObjectId.isValid(channelId)) {
            res.status(400).json({ success: false, message: "Valid Channel ID is required." });
            return;
        }

        if (!targetUserId || typeof targetUserId !== 'string' || !mongoose.Types.ObjectId.isValid(targetUserId)) {
            res.status(400).json({ success: false, message: "Valid targetUserId is required." });
            return;
        }

        const channel = await Channel.findById(channelId);
        if (!channel) {
            res.status(404).json({ success: false, message: "Channel not found." });
            return;
        }

        const adminEntry = channel.admins.find(a => a.user.toString() === currentUserId.toString());
        const canManage = isEntityOwner(channel, currentUserId) || adminEntry?.canAddAdmins;

        if (!canManage) {
            res.status(403).json({ success: false, message: "Access Denied! Only channel owner or authorized admins can manage roles." });
            return;
        }

        if (isEntityOwner(channel, targetUserId)) {
            res.status(403).json({ success: false, message: "Cannot modify owner's role." });
            return;
        }

        if (action === 'promote') {
            await Channel.findByIdAndUpdate(channelId, {
                $pull: { admins: { user: targetUserId } }
            });

            const newAdmin = {
                user: targetUserId,
                ...DEFAULT_CHANNEL_ADMIN_POWERS,
                ...(powers || {})
            };

            await Channel.findByIdAndUpdate(channelId, {
                $push: { admins: newAdmin },
                $addToSet: { subscribers: targetUserId }
            });
        } else if (action === 'demote') {
            await Channel.findByIdAndUpdate(channelId, {
                $pull: { admins: { user: targetUserId } }
            });
        } else {
            res.status(400).json({ success: false, message: "Action must be 'promote' or 'demote'." });
            return;
        }

        res.status(200).json({
            success: true,
            message: `Channel admin role '${action}' executed successfully.`
        });
    } catch (error) {
        console.error("manageChannelAdmins Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const deleteChannel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { channelId } = req.params;
        const currentUserId = req.user!._id;

        if (!channelId || typeof channelId !== 'string' || !mongoose.Types.ObjectId.isValid(channelId)) {
            res.status(400).json({ success: false, message: "Valid Channel ID is required." });
            return;
        }

        const channel = await Channel.findById(channelId);
        if (!channel) {
            res.status(404).json({ success: false, message: "Channel not found." });
            return;
        }


        if (!isEntityOwner(channel, currentUserId)) {
            res.status(403).json({ success: false, message: "Forbidden! Only the channel owner can delete this channel." });
            return;
        }

        await Channel.findByIdAndDelete(channelId);

        res.status(200).json({
            success: true,
            message: "Channel has been permanently deleted by owner."
        });
    } catch (error) {
        console.error("deleteChannel Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};