import mongoose, { Document, Schema, Model } from 'mongoose';
import type { IUser } from './User.js';


export interface IInviteLink extends Document {
    linkCode: string;
    linkName: string;
    entityType: 'Group' | 'Channel';
    entityId: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId | IUser;
    isPrimary: boolean;
    isRevoked: boolean;
    expiresAt: Date | null;
    usageLimit: number;
    usedCount: number;
    joinedUsers: (mongoose.Types.ObjectId | IUser)[];
    needApproval: boolean;
    pendingRequests: {
        user: mongoose.Types.ObjectId | IUser;
        requestedAt: Date
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const inviteLinkSchema: Schema<IInviteLink> = new Schema({
    linkCode: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    linkName: {
        type: String,
        default: "Invite Link",
        maxlength: 50,
        trim: true,
    },
    entityType: {
        type: String,
        enum: ['Group', 'Channel'],
        required: true
    },
    entityId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    isRevoked: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        default: null
    },
    usageLimit: {
        type: Number,
        default: 0
    },
    usedCount: {
        type: Number,
        default: 0
    },
    joinedUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    needApproval: {
        type: Boolean,
        default: false
    },
    pendingRequests: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        requestedAt: {
            type: Date,
            default: Date.now
        }
    }]
},
    {
        timestamps: true
    }
);

const InviteLink: Model<IInviteLink> = mongoose.model<IInviteLink>('InviteLink', inviteLinkSchema);
export default InviteLink;