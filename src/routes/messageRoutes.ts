import { Router } from 'express';
import {
    sendMessage,
    getChatMessages,
    deleteMessage,
    reactionToMessage
} from '@/controllers/messageController.js';
import { protect, requireCompleteProfile } from '@/middlewares/authMiddleware.js';

const messageRouter = Router();

messageRouter.use(protect, requireCompleteProfile);

messageRouter.post('/send', sendMessage);
messageRouter.get('/:chatId', getChatMessages);
messageRouter.delete('/:messageId', deleteMessage);

messageRouter.post('/:messageId/react', reactionToMessage);

export default messageRouter;