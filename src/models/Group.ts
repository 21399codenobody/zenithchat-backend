import mongoose, { Document, Schema, Model } from 'mongoose';
import type { IUser } from './User.js';
import type { IMessage } from './Message.js';

export interface IGroup extends Document {
    name: string;
    description?: string;
    profilePic?: string;
    owner: mongoose.Types.ObjectId | IUser;
    groupType: 'public' | 'private';
    category: 'tech' | 'crypto' | 'business' | 'travel' | 'gaming' | 'movies' | 'music' | 'fitness' | 'politics' | 'education' | 'mature_18' | 'general';
    isNSFW: boolean;
    tags: string[];
    userName?: string;
    restrictSavingContent: boolean;
    chatHistoryForNewMembers: 'hidden' | 'visible';
    slowMode: 'off' | '5s' | '10s' | '15s' | '30s' | '1m' | '5m' | '15m' | '1h';
    admins: {
        user: mongoose.Types.ObjectId | IUser;
        canChangeGroupInfo: boolean;
        canDeleteMessages: boolean;
        canBanUsers: boolean;
        canAddMembers: boolean;
        canManageVideoChat: boolean;
        canAddAdmins: boolean;
        customTitle?: string;
    }[];
    defaultPermissions: {
        sendMessages: boolean;
        sendMedia: boolean;
        sendMusic: boolean;
        sendVoice: boolean;
        sendFiles: boolean;
        sendReactions: boolean;
        pinMessages: boolean;
    };
    bannedUsers: (mongoose.Types.ObjectId | IUser)[];
    members: (mongoose.Types.ObjectId | IUser)[];
    lastMessage?: mongoose.Types.ObjectId | IMessage | null;
    createdAt: Date;
    updatedAt: Date;
}

const groupSchema: Schema<IGroup> = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        default: "",
        maxlength: 500
    },
    profilePic: {
        type: String,
        default: ""
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    groupType: {
        type: String,
        enum: ['public', 'private'],
        default: 'public'
    },
    category: {
        type: String,
        enum: ['tech', 'crypto', 'business', 'travel', 'gaming', 'movies', 'music', 'fitness', 'politics', 'education', 'mature_18', 'general'],
        default: 'general',
        index: true
    },
    isNSFW: {
        type: Boolean,
        default: false
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    userName: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true,
        maxlength: 20,
        match: /^\w+$/
    },
    restrictSavingContent: {
        type: Boolean,
        default: false
    },
    chatHistoryForNewMembers: {
        type: String,
        enum: ['visible', 'hidden'],
        default: 'hidden'
    },
    slowMode: {
        type: String,
        enum: ['off', '5s', '10s', '15s', '30s', '1m', '5m', '15m', '1h'],
        default: 'off'
    },
    admins: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        canChangeGroupInfo: {
            type: Boolean,
            default: false
        },
        canDeleteMessages: {
            type: Boolean,
            default: false
        },
        canBanUsers: {
            type: Boolean,
            default: false
        },
        canAddMembers: {
            type: Boolean,
            default: true
        },
        canManageVideoChat: {
            type: Boolean,
            default: false
        },
        canAddAdmins: {
            type: Boolean,
            default: false
        },
        customTitle: {
            type: String,
            default: "Admin"
        }
    }],
    defaultPermissions: {
        sendMessages: {
            type: Boolean,
            default: true
        },
        sendMedia: {
            type: Boolean,
            default: true
        },
        sendMusic: {
            type: Boolean,
            default: true
        },
        sendVoice: {
            type: Boolean,
            default: true
        },
        sendFiles: {
            type: Boolean,
            default: true
        },
        sendReactions: {
            type: Boolean,
            default: true
        },
        pinMessages: {
            type: Boolean,
            default: false
        }
    },
    bannedUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    lastMessage: {
        type: Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    }
},
    {
        timestamps: true
    }
);

groupSchema.index({ members: 1 });
groupSchema.index({ name: 'text', description: 'text' });
const Group: Model<IGroup> = mongoose.model<IGroup>('Group', groupSchema);
export default Group;