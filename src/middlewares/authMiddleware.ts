import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/index.js';
import type { IUser } from '@/models/User.js';
import User from '@/models/User.js';

export interface AuthenticatedRequest extends Request {
    user?: IUser;
}


export const protect = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    let token: string | undefined;

    try {
        const authHeader = req.headers.authorization;


        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1]?.trim();
        }

        if (!token) {
            res.status(401).json({
                success: false,
                message: "Access denied. No token provided! Please login first."
            });
            return;
        }


        const decoded = verifyToken(token);


        const user = await User.findById(decoded.userId);

        if (!user) {
            res.status(401).json({
                success: false,
                message: "User belonging to this token no longer exists."
            });
            return;
        }

        if (user.isPermanentlyBanned) {
            res.status(403).json({
                success: false,
                message: "Your account is permanently banned."
            });
            return;
        }

        req.user = user;
        next();

    } catch (error: any) {
        console.error("Auth Middleware Error:", error.message);

        if (error.name === 'TokenExpiredError') {
            res.status(401).json({
                success: false,
                message: "Your session has expired. Please sign in again."
            });
            return;
        }

        res.status(401).json({
            success: false,
            message: `Authentication failed: ${error.message}`
        });
    }
};


export const requireCompleteProfile = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user || !req.user.isProfileComplete) {
        res.status(403).json({
            success: false,
            message: "Action restricted! Please complete your profile setup first.",
            requiresProfileSetup: true
        });
        return;
    }
    next();
};