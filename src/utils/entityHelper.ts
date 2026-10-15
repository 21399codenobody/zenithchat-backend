import crypto from 'crypto';

export const ENTITY_POPULATE_FIELDS = 'firstName lastName userName profilePic';

export const isEntityOwner = (entity: any, userId: any): boolean => {
    if (!entity || !entity.owner || !userId) return false;
    return entity.owner.toString() === userId.toString();
};

export const isEntityAdmin = (entity: any, userId: any): boolean => {
    if (!entity || !userId) return false;
    if (isEntityOwner(entity, userId)) return true;
    return entity.admins?.some((a: any) => {
        const adminId = a.user?._id || a.user;
        return adminId?.toString() === userId.toString();
    });
};

export const isValidHandle = (handle: string): boolean => {
    const handleRegex = /^[a-z0-9_]{4,20}$/;
    return handleRegex.test(handle.toLowerCase().trim());
};

export const DEFAULT_GROUP_PERMISSIONS = {
    sendMessages: true,
    sendMedia: true,
    sendMusic: true,
    sendVoice: true,
    sendFiles: true,
    sendReactions: true,
    pinMessages: false
};


export const DEFAULT_GROUP_ADMIN_POWERS = {
    canChangeGroupInfo: true,
    canDeleteMessages: true,
    canBanUsers: true,
    canAddMembers: true,
    canManageVideoChat: true,
    canAddAdmins: false,
    customTitle: "Admin"
};

export const VALID_SLOW_MODES = ['off', '5s', '10s', '15s', '30s', '1m', '5m', '15m', '1h'] as const;

export const isValidSlowMode = (mode: string): boolean => {
    return VALID_SLOW_MODES.includes(mode as any);
};

export const DEFAULT_CHANNEL_ADMIN_POWERS = {
    canPostMessages: true,
    canEditMessages: true,
    canDeleteMessages: true,
    canAddSubscribers: true,
    canAddAdmins: false
};

export const calculateGroupSuccessor = (group: any, departingOwnerId: string): any => {
    const remainingAdmins = group.admins.filter(
        (a: any) => (a.user?._id || a.user).toString() !== departingOwnerId.toString()
    );

    if (remainingAdmins.length > 0) {
        const scoredAdmins = remainingAdmins.map((admin: any) => {
            let score = 0;
            if (admin.canAddAdmins) score += 5;
            if (admin.canBanUsers) score += 3;
            if (admin.canChangeGroupInfo) score += 2;
            if (admin.canDeleteMessages) score += 2;
            if (admin.canAddMembers) score += 1;
            if (admin.canManageVideoChat) score += 1;
            return { admin, score };
        });
        scoredAdmins.sort((a: any, b: any) => b.score - a.score);
        return scoredAdmins[0].admin.user?._id || scoredAdmins[0].admin.user;
    }

    const remainingMembers = group.members.filter(
        (m: any) => (m?._id || m).toString() !== departingOwnerId.toString()
    );

    if (remainingMembers.length > 0) {
        return remainingMembers[0]?._id || remainingMembers[0];
    }

    return null;
};

export const generate10CharLinkCode = (): string => {
    return crypto.randomBytes(8).toString('base64url').substring(0, 10);
};

export const calculateLinkExpiry = (duration?: string, customDate?: Date): Date | null => {
    if (!duration || duration === 'none' || duration === 'no limit') return null;
    const now = Date.now();
    if (duration === '1h') return new Date(now + 60 * 60 * 1000);
    if (duration === '1day') return new Date(now + 24 * 60 * 60 * 1000);
    if (duration === '1week') return new Date(now + 7 * 24 * 60 * 60 * 1000);
    if (duration === 'custom' && customDate) return new Date(customDate);
    return null;
};