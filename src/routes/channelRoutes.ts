import { Router } from "express";
import { protect, requireCompleteProfile } from "@/middlewares/authMiddleware.js";
import {
    createChannel,
    getChannelDetails,
    updateChannelSettings,
    subscribeUnsubscribe,
    manageChannelAdmins,
    deleteChannel
} from "@/controllers/channelController.js";

const channelRouter = Router();

channelRouter.use(protect, requireCompleteProfile);

channelRouter.post('/', createChannel);
channelRouter.get('/:channelId', getChannelDetails);
channelRouter.patch('/:channelId/settings', updateChannelSettings);
channelRouter.post('/:channelId/subscribe', subscribeUnsubscribe);
channelRouter.post('/:channelId/admins', manageChannelAdmins);
channelRouter.delete('/:channelId', deleteChannel);

export default channelRouter;