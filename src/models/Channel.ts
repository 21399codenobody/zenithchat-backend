import mongoose, { Document, Schema, Model } from 'mongoose';
import type { IUser } from './User.js';
import type { IMessage } from './Message.js';

export interface IChannel extends Document {
    name: string;
    description?: string;
    profilePic?: string;
    owner: mongoose.Types.ObjectId | IUser;
    channelType: 'private' | 'public';
    category: 'tech' | 'crypto' | 'business' | 'travel' | 'gaming' | 'movies' | 'music' | 'fitness' | 'politics' | 'education' | 'mature_18' | 'general';
    isNSFW: boolean;
    tags: string[];
    userName?: string;
    subscribers: (mongoose.Types.ObjectId | IUser)[];
    allowComments: boolean;
    admins: {
        user: mongoose.Types.ObjectId;
        canPostMessages: boolean;
        canEditMessages: boolean;
        canDeleteMessages: boolean;
        canAddSubscribers: boolean;
        canAddAdmins: boolean
    }[];
    lastMessage?: mongoose.Types.ObjectId | IMessage | null;
    createdAt: Date;
    updatedAt: Date;
}

const channelSchema: Schema<IChannel> = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        default: "",
        maxlength: 1000
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
    channelType: {
        type: String,
        enum: ['private', 'public'],
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
        trim: true,
        lowercase: true,
        maxlength: 20,
        match: /^\w+$/
    },
    subscribers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    allowComments: {
        type: Boolean,
        default: true
    },
    admins: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        canPostMessages: {
            type: Boolean,
            default: true
        },
        canEditMessages: {
            type: Boolean,
            default: true
        },
        canDeleteMessages: {
            type: Boolean,
            default: true
        },
        canAddSubscribers: {
            type: Boolean,
            default: true
        },
        canAddAdmins: {
            type: Boolean,
            default: false
        }
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

channelSchema.index({ subscribers: 1 });
channelSchema.index({ name: 'text', description: 'text' });

const Channel: Model<IChannel> = mongoose.model<IChannel>('Channel', channelSchema);
export default Channel;