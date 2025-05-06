import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken'; // Assuming JWT is used

// Extend Express Request type to include 'user'
declare global {
    namespace Express {
        interface Request {
            user?: { id: string; username: string }; // Adjust based on your token payload
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // if there isn't any token

    // Replace 'YOUR_SECRET_KEY' with your actual secret key
    const secret = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';

    jwt.verify(token, secret, (err: any, user: any) => {
        if (err) {
            console.error("JWT Verification Error:", err);
            return res.sendStatus(403); // Forbidden if token is invalid
        }
        req.user = user as { id: string; username: string }; // Attach user payload to request
        next(); // pass the execution off to whatever request the client intended
    });
};