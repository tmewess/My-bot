import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import accountsRouter from "./accounts";
import ordersRouter from "./orders";
import statsRouter from "./stats";
import lolzRouter from "./lolz";
import balanceRouter from "./balance";
import usersRouter from "./users";
import sessionsRouter from "./sessions";
import newsRouter from "./news";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(accountsRouter);
router.use(ordersRouter);
router.use(statsRouter);
router.use(lolzRouter);
router.use(balanceRouter);
router.use(usersRouter);
router.use(sessionsRouter);
router.use(newsRouter);

export default router;
