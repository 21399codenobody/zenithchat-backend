import { Router } from "express";
import { sendOtp, verifyOtp, completeProfile, getSupportedCountries } from "@/controllers/authController.js";
import { authLimiter } from "@/middlewares/rateLimiter.js";
import { protect } from "@/middlewares/authMiddleware.js";

const authRouter = Router();

authRouter.get('/countries', getSupportedCountries);
authRouter.post('/send-otp', authLimiter, sendOtp);
authRouter.post('/verify-otp', verifyOtp);
authRouter.post('/complete-profile', protect, completeProfile);

export default authRouter;