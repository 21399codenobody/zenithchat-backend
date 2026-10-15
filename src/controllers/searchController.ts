import type { Response } from 'express';
import User from '@/models/User.js';
import Group from '@/models/Group.js';
import Channel from '@/models/Channel.js';
import Chat from '@/models/Chat.js';
import type { AuthenticatedRequest } from '@/middlewares/authMiddleware.js';


const VALID_CATEGORIES = [
    'tech', 'crypto', 'business', 'travel', 'gaming',
    'movies', 'music', 'fitness', 'politics', 'education',
    'mature_18', 'general'
] as const;

type CategoryType = typeof VALID_CATEGORIES[number];

export const globalSearch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { q, category } = req.query;
        const currentUser = req.user!;

        const rawQuery = typeof q === 'string' ? q.trim() : '';
        if (rawQuery.length === 0) {
            res.status(200).json({
                success: true,
                query: "",
                counts: { users: 0, groups: 0, channels: 0, total: 0 },
                results: { users: [], groups: [], channels: [] }
            });
            return;
        }


        const cleanQuery = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(cleanQuery, 'i');


        const allowsNSFW = Boolean(currentUser.privacySettings?.allowSensitiveContent);


        let selectedCategory: CategoryType | null = null;
        if (category && typeof category === 'string') {
            const cleanCat = category.toLowerCase().trim();
            if (VALID_CATEGORIES.includes(cleanCat as CategoryType)) {
                selectedCategory = cleanCat as CategoryType;
            }
        }


        const existingChats = await Chat.find({
            participants: currentUser._id,
            isSavedMessages: false
        }).select('participants');

        const existingChatPartnerIds = existingChats
            .flatMap(chat => chat.participants)
            .filter(id => id.toString() !== currentUser._id.toString());

        const userQuery: Record<string, any> = {
            _id: {
                $ne: currentUser._id,
                $nin: currentUser.blockedUsers || []
            },
            $or: [
                { userName: searchRegex },
                {
                    _id: { $in: existingChatPartnerIds },
                    $or: [
                        { firstName: searchRegex },
                        { lastName: searchRegex }
                    ]
                }
            ]
        };


        const groupQuery: Record<string, any> = {
            groupType: 'public',
            $or: [
                { name: searchRegex },
                { userName: searchRegex },
                { tags: searchRegex }
            ]
        };

        if (!allowsNSFW) {
            groupQuery.isNSFW = false;
            groupQuery.category = { $ne: 'mature_18' } as any;
        }

        if (selectedCategory) {
            groupQuery.category = selectedCategory;
        }


        const channelQuery: Record<string, any> = {
            channelType: 'public',
            $or: [
                { name: searchRegex },
                { userName: searchRegex },
                { tags: searchRegex }
            ]
        };

        if (!allowsNSFW) {
            channelQuery.isNSFW = false;
            channelQuery.category = { $ne: 'mature_18' } as any;
        }

        if (selectedCategory) {
            channelQuery.category = selectedCategory;
        }


        const [users, groups, channels] = await Promise.all([
            User.find(userQuery)
                .select('firstName lastName userName profilePic isOnline lastSeen bio')
                .limit(15),

            Group.find(groupQuery)
                .select('name description profilePic groupType userName category isNSFW tags members')
                .limit(20),

            Channel.find(channelQuery)
                .select('name description profilePic channelType userName category isNSFW tags subscribers')
                .limit(20)
        ]);

        res.status(200).json({
            success: true,
            query: rawQuery,
            activeCategory: selectedCategory || 'all',
            counts: {
                users: users.length,
                groups: groups.length,
                channels: channels.length,
                total: users.length + groups.length + channels.length
            },
            results: {
                users,
                groups,
                channels
            }
        });

    } catch (error) {
        console.error("globalSearch Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};