import mongoose from 'mongoose';
import Story from "@/models/Story.js";

export const STORY_USER_FIELDS = 'firstName lastName userName profilePic';

export const validateStoryMedia = (
    mediaUrl?: string,
    mediaType?: string,
    duration?: number
): { isValid: boolean; message?: string } => {
    if (!mediaUrl || typeof mediaUrl !== 'string' || mediaUrl.trim().length === 0) {
        return { isValid: false, message: "Valid media URL is required." };
    }

    if (!mediaType || !['image', 'video'].includes(mediaType)) {
        return { isValid: false, message: "mediaType must be either 'image' or 'video'." };
    }

    if (mediaType === 'video' && (!duration || typeof duration !== 'number' || duration <= 0 || duration > 60)) {
        return { isValid: false, message: "Video stories must have a duration between 1 and 60 seconds." };
    }

    return { isValid: true };
};

export const checkDailyStoryLimit = async (userId: mongoose.Types.ObjectId | string): Promise<{
    isExceeded: boolean;
    remaining: number;
}> => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await Story.countDocuments({
        user: userId,
        createdAt: { $gte: twentyFourHoursAgo },
        isDeleted: false
    });

    return {
        isExceeded: count >= 5,
        remaining: Math.max(0, 5 - count)
    };
};