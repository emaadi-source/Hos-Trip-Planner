import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tripRouter from "./trip";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tripRouter);

export default router;
