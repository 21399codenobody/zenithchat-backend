import type { Response } from "express";
import mongoose from "mongoose";
import Message, { type IMessage } from '@/models/Message.js';
import Chat from '@/models/Chat.js';
import User from "@/models/User.js";
import type { AuthenticatedRequest } from "@/middlewares/authMiddleware.js";
import { isValidReactionEmoji, SENDER_POPULATE_FIELDS, ALLOWED_REACTION_EMOJIS } from "../utils/messageHelper.js";

export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const {
            chatId,
            text,
            mediaUrl,
            mediaType,
            caption,
            location,
            replyTo,
            isSelfDestruct,
            selfDestructDuration
        } = req.body || {};

        if (!chatId || typeof chatId !== 'string' || !mongoose.Types.ObjectId.isValid(chatId)) {
            res.status(400).json({ success: false, message: "Valid chat ID is required." });
            return;
        }

        const senderId = req.user!._id;

        if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
            res.status(400).json({ success: false, message: "Valid chat ID is required." });
            return;
        }

        const hasText = text && typeof text === 'string' && text.trim().length > 0;
        const hasMedia = mediaUrl && typeof mediaUrl === 'string' && mediaUrl.trim().length > 0;
        const hasLocation = location && typeof location.latitude === 'number' && typeof location.longitude === 'number';

        if (!hasText && !hasMedia && !hasLocation) {
            res.status(400).json({ success: false, message: "Message content cannot be completely empty." });
            return;
        }

        const chat = await Chat.findOne({
            _id: chatId,
            participants: senderId
        });

        if (!chat) {
            res.status(404).json({ success: false, message: "Chat room not found or access denied." });
            return;
        }

        
        const recipientId = chat.participants.find(p => p.toString() !== senderId.toString());
        if (recipientId) {
            const recipientUser = await User.findById(recipientId).select('blockedUsers');
            if (!recipientUser) {
                res.status(404).json({ success: false, message: "Recipient user not found." });
                return;
            }

            const isBlockedByRecipient = recipientUser.blockedUsers?.some(id => id.toString() === senderId.toString());
            if (isBlockedByRecipient) {
                res.status(403).json({ success: false, message: "Cannot send message. You have been blocked by this user." });
                return;
            }

            
            const hasBlockedRecipient = req.user!.blockedUsers?.some(id => id.toString() === recipientId.toString());
            if (hasBlockedRecipient) {
                res.status(400).json({ success: false, message: "You have blocked this user. Unblock them first to send a message." });
                return;
            }
        }

        
        const validDurations = ['view_once', '3s', '10s', '30s'];
        const destructDuration = isSelfDestruct && validDurations.includes(selfDestructDuration)
            ? selfDestructDuration
            : 'none';

        const messageData: Partial<IMessage> = {
            sender: senderId,
            chatType: 'direct',
            chatId: chat._id as any,
            text: hasText ? text.trim() : "",
            mediaUrl: hasMedia ? mediaUrl.trim() : "",
            mediaType: mediaType || 'none',
            caption: caption ? caption.trim() : "",
            location: hasLocation ? location : undefined,
            replyTo: replyTo && mongoose.Types.ObjectId.isValid(replyTo) ? replyTo : null,
            isForwarded: false,
            isPinned: false,
            reactions: [],
            deletedFor: [],
            seenBy: [{
                user: senderId,
                seenAt: new Date()
            }],
            selfDestruct: {
                isSelfDestruct: Boolean(isSelfDestruct),
                duration: destructDuration,
                viewedAt: null
            }
        };

        const createdMessage = await Message.create(messageData);

        
        chat.lastMessage = createdMessage._id as any;
        chat.participantSettings.forEach(setting => {
            if (setting.user.toString() !== senderId.toString()) {
                setting.unreadCount += 1;
            }
        });
        await chat.save();

        const fullMessage = await Message.findById(createdMessage._id)
            .populate('sender', SENDER_POPULATE_FIELDS)
            .populate({
                path: 'replyTo',
                select: 'text mediaType mediaUrl sender',
                populate: {
                    path: 'sender',
                    select: SENDER_POPULATE_FIELDS
                }
            });

        res.status(201).json({
            success: true,
            message: fullMessage
        });

    } catch (error) {
        console.error("sendMessage Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const getChatMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { chatId } = req.params;
        const currentUserId = req.user!._id;
        const limit = Math.min(Number(req.query.limit) || 50, 100); 
        const before = req.query.before as string; 

        if (!chatId || typeof chatId !== 'string' || !mongoose.Types.ObjectId.isValid(chatId)) {
            res.status(400).json({ success: false, message: "Valid chat ID is required." });
            return;
        }

        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.some(p => p.toString() === currentUserId.toString())) {
            res.status(403).json({ success: false, message: "Chat not found or access denied." });
            return;
        }

        const query: any = {
            chatId: chat._id,
            deletedFor: { $ne: currentUserId }
        };

        if (before && mongoose.Types.ObjectId.isValid(before)) {
            query._id = { $lt: new mongoose.Types.ObjectId(before) };
        }

        const messages = await Message.find(query)
            .sort({ _id: -1 }) 
            .limit(limit)
            .populate('sender', SENDER_POPULATE_FIELDS)
            .populate({
                path: 'replyTo',
                select: 'text mediaType mediaUrl sender',
                populate: {
                    path: 'sender',
                    select: SENDER_POPULATE_FIELDS
                }
            });

        
        const mySetting = chat.participantSettings.find(p => p.user.toString() === currentUserId.toString());
        if (mySetting && mySetting.unreadCount > 0) {
            mySetting.unreadCount = 0;
            await chat.save();
        }

        res.status(200).json({
            success: true,
            count: messages.length,
            messages: messages.reverse() 
        });

    } catch (error) {
        console.error("getChatMessages Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const deleteMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { messageId } = req.params;
        const { deletedForEveryone } = req.body || {};
        const currentUserId = req.user!._id;

        if (!messageId || typeof messageId !== 'string' || !mongoose.Types.ObjectId.isValid(messageId)) {
            res.status(400).json({ success: false, message: "Valid message ID is required." });
            return;
        }

        const message = await Message.findById(messageId);
        if (!message) {
            res.status(404).json({ success: false, message: "Message not found." }); 
            return;
        }

        
        const chat = await Chat.findOne({ _id: message.chatId, participants: currentUserId });
        if (!chat) {
            res.status(403).json({ success: false, message: "Access denied to this message." });
            return;
        }

        if (deletedForEveryone === true) {
            if (message.sender.toString() !== currentUserId.toString()) {
                res.status(403).json({
                    success: false,
                    message: "Forbidden! You can only delete your own messages for everyone."
                });
                return;
            }

            await Message.findByIdAndDelete(messageId);

            res.status(200).json({
                success: true,
                message: "Message deleted for everyone.",
                deletedMessageId: messageId,
                deletedForEveryone: true
            });
            return;
        }

        
        if (!message.deletedFor.some(id => id.toString() === currentUserId.toString())) {
            message.deletedFor.push(currentUserId);
            await message.save();
        }

        res.status(200).json({
            success: true,
            message: "Message deleted for you.",
            deletedMessageId: messageId,
            deletedForEveryone: false
        });

    } catch (error) {
        console.error("deleteMessage Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const reactionToMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body || {};
        const currentUserId = req.user!._id;

        if (!messageId || typeof messageId !== 'string' || !mongoose.Types.ObjectId.isValid(messageId)) {
            res.status(400).json({ success: false, message: "Valid message ID is required." });
            return;
        }

        if (!emoji || !isValidReactionEmoji(emoji)) {
            res.status(400).json({
                success: false,
                message: "Invalid reaction emoji! Please choose an allowed emoji.",
                allowedEmojis: ALLOWED_REACTION_EMOJIS
            });
            return;
        }

        const message = await Message.findById(messageId);
        if (!message) {
            res.status(404).json({ success: false, message: "Message not found." });
            return;
        }

        
        const chat = await Chat.findOne({ _id: message.chatId, participants: currentUserId });
        if (!chat) {
            res.status(403).json({ success: false, message: "Access denied. You cannot react to this message." });
            return;
        }

        const existingIndex = message.reactions.findIndex(r => r.user.toString() === currentUserId.toString());
        if (existingIndex > -1) {
            if (message.reactions[existingIndex]!.emoji === emoji) {
                
                message.reactions.splice(existingIndex, 1);
            } else {
                
                message.reactions[existingIndex]!.emoji = emoji;
            }
        } else {
            message.reactions.push({
                user: currentUserId,
                emoji
            });
        }

        await message.save();

        res.status(200).json({
            success: true,
            messageId: message._id,
            reactions: message.reactions
        });

    } catch (error) {
        console.error("reactionToMessage Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};