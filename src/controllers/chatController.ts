import type { Response } from 'express';
import mongoose from 'mongoose';
import Chat from '@/models/Chat.js';
import User from '@/models/User.js';
import type { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

const USER_POPULATE_FIELDS = 'firstName lastName userName profilePic isOnline lastSeen';


const getDefaultSettings = (userId: mongoose.Types.ObjectId | string) => ({
    user: new mongoose.Types.ObjectId(userId),
    isMuted: false,
    mutedUntil: null,
    isArchived: false,
    isPinned: false,
    unreadCount: 0,
    folder: 'All'
});


export const accessOrCreateChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { recipientId } = req.body || {};
        const currentUserId = req.user!._id;

        if (!recipientId || typeof recipientId !== 'string' || !mongoose.Types.ObjectId.isValid(recipientId)) {
            res.status(400).json({
                success: false,
                message: "Valid recipient ID is required."
            });
            return;
        }

        if (currentUserId.toString() === recipientId.toString()) {
            res.status(400).json({
                success: false,
                message: "You cannot create a chatroom with yourself. Use 'Saved Messages' instead."
            });
            return;
        }

        const recipient = await User.findById(recipientId);
        if (!recipient) {
            res.status(404).json({
                success: false,
                message: "Recipient user not found."
            });
            return;
        }

        const isBlockedByMe = req.user!.blockedUsers?.some(id => id.toString() === recipientId.toString());
        const isBlockedByThem = recipient.blockedUsers?.some(id => id.toString() === currentUserId.toString());

        if (isBlockedByMe || isBlockedByThem) {
            res.status(403).json({
                success: false,
                message: "Unable to create or access chat. Block restriction exists."
            });
            return;
        }

        
        let chat = await Chat.findOne({
            isSavedMessages: false,
            participants: {
                $all: [currentUserId, recipientId],
                $size: 2
            }
        })
        .populate('participants', USER_POPULATE_FIELDS)
        .populate('lastMessage');

        
        if (chat) {
            res.status(200).json({
                success: true,
                message: "Existing chat retrieved.",
                isNewChat: false,
                chat
            });
            return;
        }

        
        const createdChat = await Chat.create({
            participants: [currentUserId, recipientId],
            isSavedMessages: false,
            autoDeleteTimer: {
                enabled: false,
                duration: 'off'
            },
            participantSettings: [
                getDefaultSettings(currentUserId),
                getDefaultSettings(recipientId)
            ]
        });

        
        const fullChat = await Chat.findById(createdChat._id)
            .populate('participants', USER_POPULATE_FIELDS);

        res.status(201).json({
            success: true,
            message: "New 1-on-1 chat created successfully.",
            isNewChat: true,
            chat: fullChat
        });

    } catch (error) {
        console.error("accessOrCreateChat Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};


export const getUserChats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const currentUserId = req.user!._id;

        const chats = await Chat.find({
            participants: currentUserId,
            isSavedMessages: false 
        })
        .populate('participants', USER_POPULATE_FIELDS)
        .populate({
            path: 'lastMessage',
            populate: {
                path: 'sender',
                select: 'firstName lastName userName profilePic'
            }
        })
        .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            count: chats.length,
            chats
        });

    } catch (error) {
        console.error("getUserChats Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};


export const updateChatSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { chatId } = req.params;
        const { isMuted, mutedUntil, isArchived, isPinned, folder, autoDeleteTimer } = req.body || {};
        const currentUserId = req.user!._id;

        if (!chatId || typeof chatId !== 'string' || !mongoose.Types.ObjectId.isValid(chatId)) {
            res.status(400).json({
                success: false,
                message: "Invalid Chat ID format."
            });
            return;
        }

        const chat = await Chat.findOne({
            _id: new mongoose.Types.ObjectId(chatId),
            participants: currentUserId
        });

        if (!chat) {
            res.status(404).json({
                success: false,
                message: "Chat not found or access denied."
            });
            return;
        }

        let userSettings = chat.participantSettings.find(
            p => p.user.toString() === currentUserId.toString()
        );

        if (!userSettings) {
            chat.participantSettings.push(getDefaultSettings(currentUserId));
            userSettings = chat.participantSettings[chat.participantSettings.length - 1];
        }

        if (userSettings) {
            if (typeof isMuted === 'boolean') userSettings.isMuted = isMuted;
            if (mutedUntil !== undefined) userSettings.mutedUntil = mutedUntil;
            if (typeof isArchived === 'boolean') userSettings.isArchived = isArchived;
            if (typeof isPinned === 'boolean') userSettings.isPinned = isPinned;
            if (folder && typeof folder === 'string') userSettings.folder = folder.trim();
        }

        if (autoDeleteTimer) {
            const validDurations = ['off', '1day', '1week', '1month', 'custom'];
            if (validDurations.includes(autoDeleteTimer)) {
                chat.autoDeleteTimer = {
                    enabled: autoDeleteTimer !== 'off',
                    duration: autoDeleteTimer
                };
            }
        }

        await chat.save();

        res.status(200).json({
            success: true,
            message: "Settings updated successfully.",
            chat
        });

    } catch (error) {
        console.error("updateChatSettings Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};


export const getOrCreateSavedMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const currentUserId = req.user!._id;

        let chat = await Chat.findOne({
            participants: currentUserId,
            isSavedMessages: true
        })
        .populate('participants', USER_POPULATE_FIELDS)
        .populate({
            path: 'lastMessage',
            populate: {
                path: 'sender',
                select: 'firstName lastName userName profilePic'
            }
        });

        if (!chat) {
            const newSavedChat = await Chat.create({
                participants: [currentUserId],
                isSavedMessages: true,
                autoDeleteTimer: {
                    enabled: false,
                    duration: 'off'
                },
                participantSettings: [getDefaultSettings(currentUserId)]
            });

            chat = await Chat.findById(newSavedChat._id)
                .populate('participants', USER_POPULATE_FIELDS);
        }

        res.status(200).json({
            success: true,
            message: "Saved Messages cloud ready.",
            chat
        });

    } catch (error) {
        console.error("getOrCreateSavedMessages Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};