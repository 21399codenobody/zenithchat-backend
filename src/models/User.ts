import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUser extends Document {
    numericId: string;
    phoneNumber: string;
    userName?: string;
    firstName: string;
    lastName: string;
    bio?: string;
    profilePic?: string;
    isProfileComplete: boolean;
    trustedDevices: string[];
    lastSeen: Date;
    isOnline: boolean;
    privacySettings: {
        lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
        allowSensitiveContent: boolean;
    };
    contacts: mongoose.Types.ObjectId[];
    blockedUsers: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const generate10DigitId = (): string => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

const userSchema: Schema<IUser> = new Schema({
    numericId: {
        type: String,
        default: generate10DigitId,
        unique: true,
        immutable: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true
    },
    userName: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true,
        maxlength: [25, "Maximum characters 25"],
        minlength: [3, "Minimum characters 3"]
    },
    firstName: {
        type: String,
        maxlength: 30,
        trim: true,
        default: ""
    },
    lastName: {
        type: String,
        maxlength: 30,
        trim: true,
        default: ""
    },
    bio: {
        type: String,
        maxlength: 150,
        default: ""
    },
    profilePic: {
        type: String,
        default: ""
    },
    isProfileComplete: {
        type: Boolean,
        default: false
    },
    trustedDevices: {
        type: [String],
        default: []
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    privacySettings: {
        lastSeenVisibility: {
            type: String,
            enum: ['everyone', 'contacts', 'nobody'],
            default: 'everyone'
        },
        allowSensitiveContent: {
            type: Boolean,
            default: false
        }
    },
    contacts: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    blockedUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;