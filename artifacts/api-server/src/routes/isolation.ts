import { Router, type IRouter } from "express";
import multer from "multer";
import { GetIsolationStatusResponse } from "@workspace/api-zod";
import { uploadFile, startSplit, checkStatus } from "../lib/lalal";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post("/isolation", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "An audio file is required" });
      return;
    }
    const fileId = await uploadFile(
      req.file.buffer,
      req.file.originalname || "audio",
      req.file.mimetype,
    );
    await startSplit(fileId);
    res.json({ taskId: fileId, status: "processing" });
    return;
  } catch (err) {
    next(err);
  }
});

router.get("/isolation/status", async (req, res, next) => {
  try {
    const taskId =
      typeof req.query.taskId === "string" ? req.query.taskId : undefined;
    if (!taskId) {
      res.status(400).json({ error: "A taskId is required" });
      return;
    }
    const check = await checkStatus(taskId);
    res.json(
      GetIsolationStatusResponse.parse({
        taskId,
        status: check.status,
        progress: check.progress,
        vocalUrl: check.vocalUrl,
        error: check.error,
      }),
    );
    return;
  } catch (err) {
    next(err);
  }
});

export default router;
