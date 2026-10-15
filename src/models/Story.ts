import mongoose, { Document, Schema, Model } from 'mongoose';
import type { IUser } from './User.js';

export interface IStory extends Document {
    user: mongoose.Types.ObjectId | IUser;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    duration: number;
    caption?: string;
    expiresAt: Date;
    isDeleted: boolean;
    views: {
        viewer: mongoose.Types.ObjectId | IUser;
        viewedAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date
}

const storySchema: Schema<IStory> = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    mediaUrl: {
        type: String,
        required: true
    },
    mediaType: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    duration: {
        type: Number,
        default: 0
    },
    caption: {
        type: String,
        default: "",
        maxlength: 200
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + (24 * 60 * 60 * 1000))
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    views: [{
        viewer: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        viewedAt: {
            type: Date,
            default: Date.now
        }
    }]
},
    {
        timestamps: true
    }
);

const Story: Model<IStory> = mongoose.model<IStory>('Story', storySchema);
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default Story;