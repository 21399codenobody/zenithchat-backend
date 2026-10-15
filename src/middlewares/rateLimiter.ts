import rateLimit from 'express-rate-limit';
import { type Request, type Response } from 'express';


export const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            message: "Too many login/signup attempts from this network. Please wait 5 minutes."
        });
    }
});


export const recoveryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            message: "Too many recovery attempts from this network. Please wait 15 minutes."
        });
    }
});