import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tracksRouter from "./tracks";
import isolationRouter from "./isolation";
import gradeRouter from "./grade";
import translateRouter from "./translate";
import lineAudioRouter from "./lineAudio";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tracksRouter);
router.use(isolationRouter);
router.use(gradeRouter);
router.use(translateRouter);
router.use(lineAudioRouter);

export default router;
