import mongoose, { Document, Schema, Model } from "mongoose";
import type { IUser } from './User.js';

export interface ICall extends Document {
    caller: mongoose.Types.ObjectId | IUser;
    receiver?: mongoose.Types.ObjectId | IUser | null;
    chatId?: mongoose.Types.ObjectId | null;
    isGroupCall: boolean;
    groupId?: mongoose.Types.ObjectId | null;
    callType: 'audio' | 'video';
    status: 'ongoing' | 'completed' | 'missed' | 'declined' | 'busy';
    startedAt: Date | null;
    endedAt: Date | null;
    duration: number;
    createdAt: Date;
    updatedAt: Date;
}

const callSchema: Schema<ICall> = new Schema({
    caller: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    chatId: {
        type: Schema.Types.ObjectId,
        ref: 'Chat',
        default: null
    },
    isGroupCall: {
        type: Boolean,
        default: false
    },
    groupId: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        default: null
    },
    callType: {
        type: String,
        enum: ['audio', 'video'],
        required: true
    },
    status: {
        type: String,
        enum: ['ongoing', 'completed', 'missed', 'declined', 'busy'],
        default: 'ongoing'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date,
        default: null
    },
    duration: {
        type: Number,
        default: 0
    }
},
    {
        timestamps: true
    }
);

callSchema.index({ caller: 1, startedAt: -1 });
callSchema.index({ receiver: 1, startedAt: -1 });

const Call: Model<ICall> = mongoose.model<ICall>('Call', callSchema);
export default Call;