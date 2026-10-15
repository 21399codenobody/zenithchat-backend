import mongoose, { Document, Schema, Model } from 'mongoose';
import type { IUser } from './User.js';

export interface IMessage extends Document {
    sender: mongoose.Types.ObjectId | IUser;
    chatType: 'direct' | 'group' | 'channel';
    chatId: mongoose.Types.ObjectId;
    text?: string;
    mediaUrl?: string;
    mediaType: 'image' | 'none' | 'audio' | 'video' | 'voice' | 'file';
    caption?: string;
    location?: {
        latitude: number;
        longitude: number;
    };
    selfDestruct: {
        isSelfDestruct: boolean;
        duration: 'view_once' | '3s' | '10s' | '30s' | 'none';
        viewedAt?: Date | null;
    };
    replyTo?: mongoose.Types.ObjectId | IMessage | null;
    isForwarded: boolean;
    forwardedFrom?: mongoose.Types.ObjectId | IUser | null;
    isPinned?: boolean;
    reactions: {
        user: mongoose.Types.ObjectId | IUser;
        emoji: string;
    }[];
    deletedFor: (mongoose.Types.ObjectId | IUser)[];
    seenBy: {
        user: mongoose.Types.ObjectId | IUser;
        seenAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema: Schema<IMessage> = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    chatType: {
        type: String,
        enum: ['direct', 'group', 'channel'],
        required: true
    },
    chatId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    text: {
        type: String,
        default: ""
    },
    mediaUrl: {
        type: String,
        default: ""
    },
    mediaType: {
        type: String,
        enum: ['none', 'image', 'audio', 'video', 'voice', 'file'],
        default: 'none'
    },
    caption: {
        type: String,
        default: "",
        maxlength: 200
    },
    location: {
        latitude: {
            type: Number
        },
        longitude: {
            type: Number
        }
    },
    selfDestruct: {
        isSelfDestruct: {
            type: Boolean,
            default: false
        },
        duration: {
            type: String,
            enum: ['view_once', '3s', '10s', '30s', 'none'],
            default: 'none'
        },
        viewedAt: {
            type: Date,
            default: null
        }
    },
    replyTo: {
        type: Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    isForwarded: {
        type: Boolean,
        default: false
    },
    forwardedFrom: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    reactions: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        emoji: {
            type: String,
            required: true
        }
    }],
    deletedFor: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    seenBy: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        seenAt: {
            type: Date,
            default: Date.now
        }
    }]
},
    {
        timestamps: true
    }
);

const Message: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);
messageSchema.index({ chatId: 1, createdAt: -1 });
export default Message;