import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import productsRouter from "./products";
import statsRouter from "./stats";
import logsRouter from "./logs";
import exportsRouter from "./exports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(statsRouter);
router.use(logsRouter);
router.use(jobsRouter);
router.use(productsRouter);
router.use(exportsRouter);

export default router;
