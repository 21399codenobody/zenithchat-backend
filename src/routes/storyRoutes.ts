import { Router } from "express";
import { globalSearch } from "@/controllers/searchController.js";
import { protect, requireCompleteProfile } from "@/middlewares/authMiddleware.js";

const searchRouter = Router();

searchRouter.use(protect, requireCompleteProfile);

searchRouter.get('/', globalSearch);

export default searchRouter;