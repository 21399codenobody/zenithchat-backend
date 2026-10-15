import type { Response } from "express";
import mongoose from "mongoose";
import Story from "@/models/Story.js";
import type { AuthenticatedRequest } from "@/middlewares/authMiddleware.js";
import { STORY_USER_FIELDS, validateStoryMedia, checkDailyStoryLimit } from "@/utils/storyHelper.js";


export const createStory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { mediaUrl, mediaType, duration, caption } = req.body || {};
        const userId = req.user!._id;

        const mediaCheck = validateStoryMedia(mediaUrl, mediaType, duration);
        if (!mediaCheck.isValid) {
            res.status(400).json({ success: false, message: mediaCheck.message });
            return;
        }

        const limitCheck = await checkDailyStoryLimit(userId);
        if (limitCheck.isExceeded) {
            res.status(400).json({
                success: false,
                message: "Daily limit of 5 stories reached! Try again after 24 hours."
            });
            return;
        }

        const story = await Story.create({
            user: userId,
            mediaUrl: mediaUrl.trim(),
            mediaType,
            duration: mediaType === 'video' ? duration : 0,
            caption: caption && typeof caption === 'string' ? caption.trim().substring(0, 200) : "",
            isDeleted: false,
            views: []
        });

        const fullStory = await Story.findById(story._id).populate('user', STORY_USER_FIELDS);

        res.status(201).json({
            success: true,
            message: "Story posted successfully!",
            remainingStoriesToday: Math.max(0, limitCheck.remaining - 1),
            story: fullStory
        });
    } catch (error) {
        console.error("createStory Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const getFeedStories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const currentUser = req.user!;
        const userIdsToFetch = [...(currentUser.contacts || []), currentUser._id];

        const activeStories = await Story.find({
            user: { $in: userIdsToFetch },
            expiresAt: { $gt: new Date() },
            isDeleted: false
        })
            .populate('user', STORY_USER_FIELDS)
            .populate('views.viewer', 'firstName lastName userName profilePic')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: activeStories.length,
            stories: activeStories
        });
    } catch (error) {
        console.error("getFeedStories Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const getUserStoryArchive = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!._id;

        if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
            res.status(400).json({ success: false, message: "Valid user ID is required." });
            return;
        }

        const isOwner = currentUserId.toString() === userId.toString();


        const query: any = {
            user: new mongoose.Types.ObjectId(userId),
            isDeleted: false
        };

        if (!isOwner) {
            query.expiresAt = { $gt: new Date() };
        }

        const stories = await Story.find(query)
            .populate('user', STORY_USER_FIELDS)
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: stories.length,
            isArchive: isOwner,
            stories
        });
    } catch (error) {
        console.error("getUserStoryArchive Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const viewStory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { storyId } = req.params;
        const currentUserId = req.user!._id;

        if (!storyId || typeof storyId !== 'string' || !mongoose.Types.ObjectId.isValid(storyId)) {
            res.status(400).json({ success: false, message: "Valid story ID is required." });
            return;
        }

        const story = await Story.findById(storyId);


        if (!story || story.isDeleted || story.expiresAt < new Date()) {
            res.status(404).json({ success: false, message: "Story not found or expired." });
            return;
        }


        const isOwner = story.user.toString() === currentUserId.toString();
        if (!isOwner) {
            const alreadyViewed = story.views.some(v => v.viewer.toString() === currentUserId.toString());
            if (!alreadyViewed) {
                story.views.push({
                    viewer: currentUserId,
                    viewedAt: new Date()
                });
                await story.save();
            }
        }

        res.status(200).json({
            success: true,
            message: "Story view recorded successfully."
        });
    } catch (error) {
        console.error("viewStory Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const deleteStory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { storyId } = req.params;
        const currentUserId = req.user!._id;

        if (!storyId || typeof storyId !== 'string' || !mongoose.Types.ObjectId.isValid(storyId)) {
            res.status(400).json({ success: false, message: "Valid story ID is required." });
            return;
        }

        const story = await Story.findById(storyId);

        if (!story) {
            res.status(404).json({ success: false, message: "Story not found." });
            return;
        }

        if (story.user.toString() !== currentUserId.toString()) {
            res.status(403).json({ success: false, message: "Access Denied! You can only delete your own stories." });
            return;
        }

        story.isDeleted = true;
        await story.save();

        res.status(200).json({
            success: true,
            message: "Story deleted successfully."
        });
    } catch (error) {
        console.error("deleteStory Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};