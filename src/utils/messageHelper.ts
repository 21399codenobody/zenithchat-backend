export const ALLOWED_REACTION_EMOJIS = [
    '👍', '👎', '❤️', '🔥', '🥰', '👏', '😁',
    '🤔', '🤯', '😱', '🤬', '😢', '🎉', '🤩',
    '🤮', '💩', '🙏', '💯', '⚡'
] as const;

export type reactionEmoji = typeof ALLOWED_REACTION_EMOJIS[number];

export const isValidReactionEmoji = (emoji: string): boolean => {
    return ALLOWED_REACTION_EMOJIS.includes(emoji as reactionEmoji);
};

export const SENDER_POPULATE_FIELDS = 'firstName lastName userName profilePic isOnline lastSeen';

export const getSelfDestructSeconds = (duration: string): number => {
    switch (duration) {
        case '3s': return 3;
        case '10s': return 10;
        case '30s': return 30;
        case 'view_once': return 0;
        default: return 0;
    }
};