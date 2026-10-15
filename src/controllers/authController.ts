import { type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import User from '@/models/User.js';
import Otp from '@/models/Otp.js';
import type { AuthenticatedRequest } from '@/middlewares/authMiddleware.js';
import { generateToken } from '@/utils/jwtHelper.js';
import { formatAndValidatePhone, generate6DigitOtp } from '@/utils/phoneHelper.js';
import { POPULAR_COUNTRIES } from '@/config/countryGlossary.js';


export const sendOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phoneNumber, countryCode } = req.body || {};


        const phoneValidation = formatAndValidatePhone(phoneNumber, countryCode || 'BD');
        if (!phoneValidation.isValid || !phoneValidation.e164) {
            res.status(400).json({ success: false, message: phoneValidation.message });
            return;
        }

        const e164Phone = phoneValidation.e164;
        const otpCode = generate6DigitOtp();
        const hashedOtp = await bcrypt.hash(otpCode, 10);


        await Otp.deleteMany({ phoneNumber: e164Phone });


        await Otp.create({
            phoneNumber: e164Phone,
            otp: hashedOtp
        });


        console.log(`===============================================`);
        console.log(`📲 [ZENITH OTP GATEWAY] Sending to: ${e164Phone}`);
        console.log(`🔑 Verification Code: ${otpCode} (Valid for 5 mins)`);
        console.log(`===============================================`);

        res.status(200).json({
            success: true,
            message: "6-digit verification code sent successfully.",
            phoneNumber: e164Phone,
            debugOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined
        });

    } catch (error) {
        console.error("sendOtp Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const getSupportedCountries = (_req: Request, res: Response): void => {
    res.status(200).json({
        success: true,
        count: POPULAR_COUNTRIES.length,
        countries: POPULAR_COUNTRIES
    });
};


export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phoneNumber, otp, countryCode, deviceId } = req.body || {};

        if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
            res.status(400).json({ success: false, message: "A valid 6-digit OTP code is required." });
            return;
        }

        const phoneValidation = formatAndValidatePhone(phoneNumber, countryCode || 'BD');
        if (!phoneValidation.isValid || !phoneValidation.e164) {
            res.status(400).json({ success: false, message: "Invalid phone number." });
            return;
        }

        const e164Phone = phoneValidation.e164;

        const otpRecord = await Otp.findOne({ phoneNumber: e164Phone });
        if (!otpRecord) {
            res.status(400).json({
                success: false,
                message: "OTP expired or not requested. Please request a new code."
            });
            return;
        }


        if (otpRecord.attempts >= 5) {
            await Otp.deleteOne({ _id: otpRecord._id });
            res.status(429).json({
                success: false,
                message: "Too many failed attempts. This OTP has been invalidated. Please request a new one."
            });
            return;
        }

        const isMatch = await bcrypt.compare(otp.trim(), otpRecord.otp);
        if (!isMatch) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            res.status(400).json({
                success: false,
                message: `Invalid code. ${5 - otpRecord.attempts} attempts remaining.`
            });
            return;
        }


        await Otp.deleteOne({ _id: otpRecord._id });


        let user = await User.findOne({ phoneNumber: e164Phone });
        let isNewUser = false;
        const currentDevice = deviceId || (req.headers['user-agent'] as string) || "unknown_device";

        if (!user) {

            isNewUser = true;
            const tempUsername = `user_${Date.now().toString().slice(-6)}`;
            user = await User.create({
                phoneNumber: e164Phone,
                userName: tempUsername,
                trustedDevices: [currentDevice],
                isProfileComplete: false
            });
        } else {

            if (!user.trustedDevices.includes(currentDevice)) {
                user.trustedDevices.push(currentDevice);
                await user.save();
            }
        }

        const token = generateToken(user._id.toString(), user.userName || user.phoneNumber);

        res.status(200).json({
            success: true,
            message: isNewUser ? "Welcome! Account created. Please setup your profile." : "Signed in successfully!",
            isNewUser,
            isProfileComplete: user.isProfileComplete,
            token,
            user: {
                id: user._id,
                numericId: user.numericId,
                phoneNumber: user.phoneNumber,
                userName: user.userName,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePic: user.profilePic,
                isProfileComplete: user.isProfileComplete
            }
        });

    } catch (error) {
        console.error("verifyOtp Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const completeProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { firstName, lastName, userName, bio, profilePic } = req.body || {};
        const user = req.user!;

        if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
            res.status(400).json({ success: false, message: "First name is mandatory." });
            return;
        }

        if (userName) {
            const cleanUserName = userName.trim().toLowerCase();
            const existing = await User.findOne({ userName: cleanUserName, _id: { $ne: user._id } });
            if (existing) {
                res.status(409).json({ success: false, message: "This username is already taken. Choose another." });
                return;
            }
            user.userName = cleanUserName;
        }

        user.firstName = firstName.trim();
        user.lastName = lastName && typeof lastName === 'string' ? lastName.trim() : "";
        if (bio !== undefined) user.bio = bio ? bio.trim().substring(0, 150) : "";
        if (profilePic !== undefined) user.profilePic = profilePic;
        user.isProfileComplete = true;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile completed successfully!",
            user: {
                id: user._id,
                numericId: user.numericId,
                phoneNumber: user.phoneNumber,
                userName: user.userName,
                name: `${user.firstName} ${user.lastName}`.trim(),
                bio: user.bio,
                profilePic: user.profilePic,
                isProfileComplete: true
            }
        });

    } catch (error) {
        console.error("completeProfile Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};