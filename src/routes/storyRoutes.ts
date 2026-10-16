import { Router } from "express";
import {
    createStory,
    getFeedStories,
    getUserStoryArchive,
    viewStory,
    deleteStory
} from "@/controllers/storyController.js";
import { protect, requireCompleteProfile } from "@/middlewares/authMiddleware.js";

const storyRouter = Router();


storyRouter.use(protect, requireCompleteProfile);


storyRouter.post(['/', '', '/create'], createStory);


storyRouter.get('/feed', getFeedStories);
storyRouter.get('/archive/:userId', getUserStoryArchive);
storyRouter.post('/:storyId/view', viewStory);
storyRouter.delete('/:storyId', deleteStory);

export default storyRouter;
