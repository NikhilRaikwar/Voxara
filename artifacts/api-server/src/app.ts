import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// The app runs behind Replit's reverse proxy, which sets X-Forwarded-For.
// Trust exactly one proxy hop so express-rate-limit can read the real client
// IP without being permissive enough to let clients spoof it.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Restrict CORS to the app's own origins so third-party websites cannot drive
// paid provider endpoints from visitors' browsers.
// In production, REPLIT_DOMAINS is a comma-separated list of public hostnames.
const allowedOrigins: Set<string> = new Set(
  (process.env.REPLIT_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .flatMap((d) => [`https://${d}`, `http://${d}`]),
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / server-to-server requests (no Origin header).
      if (!origin) {
        callback(null, true);
        return;
      }
      // Allow localhost variants in development.
      if (
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/localhost(:\d+)?$/.test(origin)
      ) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Centralized error handler — respects a statusCode on thrown errors.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const statusCode =
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    typeof (err as { statusCode: unknown }).statusCode === "number"
      ? (err as { statusCode: number }).statusCode
      : 500;
  const message =
    err instanceof Error ? err.message : "Internal server error";
  req.log.error({ err }, "Request failed");
  res.status(statusCode).json({
    error: statusCode >= 500 ? "Something went wrong on our end" : message,
  });
});

export default app;
