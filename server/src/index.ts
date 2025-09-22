import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { z } from "zod";

dotenv.config();

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(8787),
  AGENT_PROVIDER: z.string().default("openai"),
  AGENT_MODEL: z.string().min(1, "AGENT_MODEL is required"),
  AGENT_API_KEY: z.string().min(1, "AGENT_API_KEY is required"),
  AGENT_BASE_URL: z.string().optional(),
  AGENT_ORGANIZATION: z.string().optional(),
  AGENT_PROJECT: z.string().optional(),
  AGENT_MODEL_SETTINGS: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      try {
        return JSON.parse(value);
      } catch (error) {
        throw new Error("AGENT_MODEL_SETTINGS must be valid JSON");
      }
    }),
  ALLOWED_ORIGINS: z.string().optional(),
});

const parsed = ConfigSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Failed to start agent server due to invalid configuration:");
  console.error(parsed.error.format());
  process.exit(1);
}

const {
  PORT,
  AGENT_PROVIDER,
  AGENT_MODEL,
  AGENT_API_KEY,
  AGENT_BASE_URL,
  AGENT_ORGANIZATION,
  AGENT_PROJECT,
  AGENT_MODEL_SETTINGS,
  ALLOWED_ORIGINS,
} = parsed.data;

const app = express();

app.use(express.json());

if (ALLOWED_ORIGINS) {
  const origins = ALLOWED_ORIGINS.split(",").map((origin) => origin.trim());
  app.use(
    cors({
      origin: origins,
    })
  );
} else {
  app.use(cors());
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/agent/model", (_req, res) => {
  res.json({
    provider: AGENT_PROVIDER,
    model: AGENT_MODEL,
    apiKey: AGENT_API_KEY,
    baseUrl: AGENT_BASE_URL ?? null,
    organization: AGENT_ORGANIZATION ?? null,
    project: AGENT_PROJECT ?? null,
    modelSettings: AGENT_MODEL_SETTINGS ?? null,
  });
});

app.listen(PORT, () => {
  console.log(`Agent config server listening on port ${PORT}`);
});
