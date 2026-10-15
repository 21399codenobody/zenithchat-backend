import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IOtp extends Document {
    phoneNumber: string;
    otp: string;
    attempts: number;
    createdAt: Date;
}

const otpSchema: Schema<IOtp> = new Schema({
    phoneNumber: {
        type: String,
        required: true,
        index: true
    },
    otp: {
        type: String,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 
    }
});

const Otp: Model<IOtp> = mongoose.model<IOtp>('Otp', otpSchema);
export default Otp;