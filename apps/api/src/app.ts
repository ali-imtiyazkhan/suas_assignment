import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import questionsRouter from "./routes/questions";
import experimentsRouter from "./routes/experiments";
import resultsRouter from "./routes/results";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/questions", questionsRouter);
app.use("/experiments", experimentsRouter);
app.use("/results", resultsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;