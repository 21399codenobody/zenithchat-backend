import { Router } from "express";
import { globalSearch } from "@/controllers/searchController.js";
import { protect } from "@/middlewares/authMiddleware.js";
const searchRouter = Router();
searchRouter.use(protect);
searchRouter.get('/', globalSearch);
export default searchRouter;