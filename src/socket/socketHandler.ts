import { Server, Socket } from 'socket.io';
import User from '../models/User.js';
import Call from '../models/Call.js';
import { verifyToken } from '../utils/index.js';
import mongoose from 'mongoose';


export interface AuthenticatedSocket extends Socket {
    userId?: string;
}


const onlineUsers = new Map<string, Set<string>>();


const busyUsers = new Set<string>();

export const initSocket = (io: Server) => {


    io.use(async (socket: AuthenticatedSocket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            if (!token) {
                return next(new Error("Authentication error: No token provided."));
            }

            const decoded = verifyToken(token) as { userId: string };
            if (!decoded || !decoded.userId) {
                return next(new Error("Authentication error: Invalid token payload."));
            }

            socket.userId = decoded.userId;
            next();
        } catch (error) {
            return next(new Error("Authentication error: Invalid or expired token."));
        }
    });


    io.on('connection', async (socket: AuthenticatedSocket) => {
        const userId = socket.userId!;


        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set<string>());
        }
        onlineUsers.get(userId)!.add(socket.id);


        socket.join(userId);


        await User.findByIdAndUpdate(userId, { isOnline: true });
        io.emit('user_status_change', {
            userId,
            isOnline: true
        });

        console.log(`[Socket Connected] User: ${userId} | Socket ID: ${socket.id}`);


        socket.on('join_chat', (chatId: string) => {
            if (chatId) socket.join(chatId);
        });


        socket.on('leave_chat', (chatId: string) => {
            if (chatId) socket.leave(chatId);
        });


        socket.on('send_message', (data: { chatId: string; message: any }) => {
            if (data?.chatId && data?.message) {
                socket.to(data.chatId).emit('receive_message', data.message);
            }
        });


        socket.on('typing_start', (data: { chatId: string }) => {
            if (data?.chatId) {
                socket.to(data.chatId).emit('user_typing', {
                    chatId: data.chatId,
                    isTyping: true,
                    userId
                });
            }
        });


        socket.on('typing_stop', (data: { chatId: string }) => {
            if (data?.chatId) {
                socket.to(data.chatId).emit('user_typing', {
                    chatId: data.chatId,
                    isTyping: false,
                    userId
                });
            }
        });


        socket.on('message_reaction_updated', (data: { chatId: string; messageId: string; reactions: any }) => {
            if (data?.chatId) {
                io.to(data.chatId).emit('receive_reaction', data);
            }
        });


        socket.on('call_user', async (data: {
            userToCall: string;
            signalData: any;
            callType: 'audio' | 'video';
            chatId?: string;
        }) => {
            const { userToCall, signalData, callType, chatId } = data || {};

            if (!userToCall) {
                socket.emit('call_failed', { message: "Invalid target user." });
                return;
            }


            if (busyUsers.has(userToCall)) {
                socket.emit('call_busy', {
                    message: "User is currently busy on another call."
                });

                try {
                    await Call.create({
                        caller: new mongoose.Types.ObjectId(userId),
                        receiver: new mongoose.Types.ObjectId(userToCall),
                        chatId: chatId && mongoose.Types.ObjectId.isValid(chatId) ? new mongoose.Types.ObjectId(chatId) : null,
                        isGroupCall: false,
                        callType: callType || 'audio',
                        status: 'busy',
                        startedAt: new Date(),
                        endedAt: new Date(),
                        duration: 0
                    });
                } catch (err) {
                    console.error("Call Busy Log Error:", err);
                }
                return;
            }


            const isReceiverOnline = onlineUsers.has(userToCall) && onlineUsers.get(userToCall)!.size > 0;

            if (isReceiverOnline) {

                io.to(userToCall).emit('incoming_call', {
                    signal: signalData,
                    from: userId,
                    callType: callType || 'audio',
                    chatId
                });
            } else {
                socket.emit('call_failed', {
                    message: "User is currently offline."
                });

                try {
                    await Call.create({
                        caller: new mongoose.Types.ObjectId(userId),
                        receiver: new mongoose.Types.ObjectId(userToCall),
                        chatId: chatId && mongoose.Types.ObjectId.isValid(chatId) ? new mongoose.Types.ObjectId(chatId) : null,
                        isGroupCall: false,
                        callType: callType || 'audio',
                        status: 'missed',
                        startedAt: new Date(),
                        endedAt: new Date(),
                        duration: 0
                    });
                } catch (err) {
                    console.error("Missed Call Log Error:", err);
                }
            }
        });


        socket.on('answer_call', (data: { to: string; signal: any }) => {
            const { to, signal } = data || {};
            if (to) {
                busyUsers.add(userId);
                busyUsers.add(to);

                io.to(to).emit('call_accepted', signal);
            }
        });


        socket.on('reject_call', (data: { to: string }) => {
            const { to } = data || {};
            if (to) {
                busyUsers.delete(userId);
                busyUsers.delete(to);

                io.to(to).emit('call_rejected', { by: userId });
            }
        });


        socket.on('end_call', async (data: {
            to: string;
            duration?: number;
            callType?: 'audio' | 'video';
            chatId?: string;
        }) => {
            const { to, duration, callType, chatId } = data || {};

            if (to) {
                busyUsers.delete(userId);
                busyUsers.delete(to);

                io.to(to).emit('call_ended');
            } else {
                busyUsers.delete(userId);
            }

            try {
                await Call.create({
                    caller: new mongoose.Types.ObjectId(userId),
                    receiver: to && mongoose.Types.ObjectId.isValid(to) ? new mongoose.Types.ObjectId(to) : null,
                    chatId: chatId && mongoose.Types.ObjectId.isValid(chatId) ? new mongoose.Types.ObjectId(chatId) : null,
                    isGroupCall: false,
                    callType: callType || 'audio',
                    status: duration && duration > 0 ? 'completed' : 'declined',
                    startedAt: new Date(Date.now() - (duration || 0) * 1000),
                    endedAt: new Date(),
                    duration: duration || 0
                });
            } catch (err) {
                console.error("Call End Log Error:", err);
            }
        });


        socket.on('disconnect', async () => {
            const userSockets = onlineUsers.get(userId);

            if (userSockets) {
                userSockets.delete(socket.id);


                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    busyUsers.delete(userId);

                    const lastSeenTime = new Date();

                    await User.findByIdAndUpdate(userId, {
                        isOnline: false,
                        lastSeen: lastSeenTime
                    });

                    io.emit('user_status_change', {
                        userId,
                        isOnline: false,
                        lastSeen: lastSeenTime
                    });

                    console.log(`[User Offline] All devices disconnected for user: ${userId}`);
                }
            }

            console.log(`[Socket Disconnected] User: ${userId} | Socket ID: ${socket.id}`);
        });
    });
};