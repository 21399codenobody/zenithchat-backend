import type { IUser } from '@/models/User.js';


export const CONTACT_PUBLIC_FIELDS = 'firstName lastName userName phoneNumber bio profilePic isOnline lastSeen privacySettings';

export const isBlockedBetween = (userA: IUser, userB: IUser): boolean => {
    if (!userA || !userB) return false;
    const aBlockedB = userA.blockedUsers?.some(id => id.toString() === userB._id.toString());
    const bBlockedA = userB.blockedUsers?.some(id => id.toString() === userA._id.toString());
    return Boolean(aBlockedB || bBlockedA);
};

export const getFilteredPrivacyData = (targetUser: IUser, viewerId: string) => {
    const viewerStr = viewerId.toString();
    const isFriend = targetUser.contacts?.some(id => id.toString() === viewerStr);
    let visibleLastSeen: Date | null = targetUser.lastSeen;
    const lastSeenVis = targetUser.privacySettings?.lastSeenVisibility || 'everyone';

    if (lastSeenVis === 'nobody' || (lastSeenVis === 'contacts' && !isFriend)) {
        visibleLastSeen = null;
    }
    
    return {
        visibleLastSeen
    };
};