import jwt from "jsonwebtoken";


const JWT_SECRET = process.env.JWT_SECRET;


export interface ITokenPayload {
    userId: string;
    userName: string;
}


export const generateToken = (userId: string, userName: string): string => {
    return jwt.sign({
        userId, userName
    },
        JWT_SECRET,
        { expiresIn: '30d' });
};


export const verifyToken = (token: string): ITokenPayload => {
    return jwt.verify(token, JWT_SECRET) as ITokenPayload;
};