import mongoose, { Document, Schema, Model } from 'mongoose';
import type { IUser } from './User.js';
import type { IMessage } from './Message.js';

export interface IChat extends Document {
    participants: (mongoose.Types.ObjectId | IUser)[];
    lastMessage?: mongoose.Types.ObjectId | IMessage | null;
    isSavedMessages: boolean;
    autoDeleteTimer: {
        enabled: boolean;
        duration: '1day' | '1week' | '1month' | 'custom' | 'off';
        customHours?: number;
    };
    participantSettings: {
        user: mongoose.Types.ObjectId | IUser;
        isMuted: boolean;
        mutedUntil: Date | null;
        isArchived: boolean;
        isPinned: boolean;
        unreadCount: number;
        folder?: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
}


const chatSchema: Schema<IChat> = new Schema({
    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessage: {
        type: Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    isSavedMessages: {
        type: Boolean,
        default: false
    },
    autoDeleteTimer: {
        enabled: {
            type: Boolean,
            default: false
        },
        duration: {
            type: String,
            enum: ['1day', '1week', '1month', 'custom', 'off'],
            default: 'off'
        },
        customHours: {
            type: Number,
            default: 0
        }
    },
    participantSettings: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        isMuted: {
            type: Boolean,
            default: false
        },
        mutedUntil: {
            type: Date,
            default: null
        },
        isArchived: {
            type: Boolean,
            default: false
        },
        unreadCount: {
            type: Number,
            default: 0
        },
        folder: {
            type: String,
            default: 'All'
        }
    }]
},
    {
        timestamps: true
    }
);

chatSchema.index({ participants: 1 });
chatSchema.index({ "participantSettings.user": 1 });
const Chat: Model<IChat> = mongoose.model<IChat>('Chat', chatSchema);
export default Chat;