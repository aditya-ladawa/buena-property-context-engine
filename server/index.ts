import "dotenv/config";
import cors from "cors";
import express from "express";
import { appendFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import WebSocket from "ws";
import { createAgent, tool } from "langchain";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { runIngest, type IngestResult } from "../src/server/context-engine/cli/ingest";

type ChatRole = "user" | "agent" | "tool";

type ChatMessage = {
  role: ChatRole;
  content: string;
  createdAt: string;
};

type Todo = {
  content: string;
  status: "pending" | "in_progress" | "completed";
};

type ThreadRecord = {
  threadId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  todos: Todo[];
};

type ContextGraphNode = {
  id: string;
  label: string;
  type: string;
};

type ContextGraphEdge = {
  from: string;
  to: string;
  label: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const runtimeDir = path.join(rootDir, ".agent-data");
const checkpointPath = path.join(runtimeDir, "chat-checkpoints.sqlite");
const incrementalRoot = path.join(rootDir, "data", "incremental");
const manifestPath = path.join(rootDir, "workdir", "manifest.json");
let ingestRunning = false;
const gradiumSttUrl = "wss://api.gradium.ai/api/speech/asr";
const gradiumTtsUrl = "https://api.gradium.ai/api/post/speech/tts";
const defaultGradiumVoiceId = process.env.GRADIUM_VOICE_ID ?? "0y1VZjPabOBU3rWy";

const propertyLocations: Record<string, { label: string; address: string; note: string }> = {
  "LIE-001": {
    label: "WEG Immanuelkirchstraße 26",
    address: "Immanuelkirchstraße 26, 10405 Berlin, Germany",
    note: "Main property address.",
  },
  "HAUS-12": {
    label: "HAUS-12",
    address: "Immanuelkirchstraße 26, 10405 Berlin, Germany",
    note: "Part of the main property WEG Immanuelkirchstraße 26.",
  },
};

await mkdir(runtimeDir, { recursive: true });

const checkpointer = SqliteSaver.fromConnString(checkpointPath);

const todoSchema = z.object({
  todos: z.array(
    z.object({
      content: z.string().min(1),
      status: z.enum(["pending", "in_progress", "completed"]),
    }),
  ),
});

const entityContextSchema = z.object({
  entityId: z.string().min(1),
});

const contextNoteSchema = z.object({
  note: z.string().min(1),
  reason: z.string().min(1),
});

const correctionSchema = z.object({
  correction: z.string().min(1),
  reason: z.string().min(1),
  targetSectionId: z.string().min(1).optional(),
  targetFactIds: z.array(z.string().min(1)).default([]),
  targetEntityIds: z.array(z.string().min(1)).default([]),
  targetSourceIds: z.array(z.string().min(1)).default([]),
});

const localServiceSearchSchema = z.object({
  query: z.string().min(1).describe("The local-service/vendor search query, such as plumber, electrician, locksmith, roof repair, or Hausmeister."),
  entityId: z.string().min(1).optional().describe("Optional property/building/entity ID, for example HAUS-12 or LIE-001."),
  location: z.string().min(1).optional().describe("Optional explicit address or neighborhood. If omitted, use the known property address for the entity."),
  maxResults: z.number().int().min(1).max(8).default(5).optional(),
});

const voiceSpeakSchema = z.object({
  text: z.string().min(1).max(6000),
  voiceId: z.string().min(1).optional(),
});

function safeFileStem(value: string) {
  return value
    .replace(/\.[^.]+$/, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function readTextIfExists(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function sha256Text(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function stableId(prefix: string, value: unknown) {
  return `${prefix}-${sha256Text(JSON.stringify(value)).slice(0, 16).toUpperCase()}`;
}

function contextSectionHash(markdown: string, sectionId: string) {
  const regex = new RegExp(`<!-- BCE:SECTION ${sectionId} START hash=([a-f0-9]+) -->\\n([\\s\\S]*?)\\n<!-- BCE:SECTION ${sectionId} END -->`, "m");
  return markdown.match(regex)?.[1];
}

async function buildContextGraph() {
  const entityIndexText = await readTextIfExists(path.join(rootDir, "contexts", "LIE-001", "entity-index.json"));
  const factIndexText = await readTextIfExists(path.join(rootDir, "contexts", "LIE-001", "fact-index.json"));
  if (!entityIndexText) return { nodes: [], edges: [] };

  const entityIndex = JSON.parse(entityIndexText) as {
    entities: Record<string, { id: string; type: string; displayName: string; relatedEntityIds?: string[] }>;
  };
  const factIndex = factIndexText ? JSON.parse(factIndexText) as {
    facts?: { kind: string; fromEntityId?: string; toEntityId?: string; relationshipType?: string; decision?: string; subjectId?: string; entities?: string[] }[];
  } : undefined;

  const includeTypes = new Set(["property", "building", "unit", "owner", "tenant", "contractor"]);
  const selected = new Set(
    Object.values(entityIndex.entities)
      .filter((entity) => includeTypes.has(entity.type))
      .map((entity) => entity.id),
  );

  for (const fact of factIndex?.facts ?? []) {
    if (fact.kind === "invoice" && fact.decision !== "keep" && fact.subjectId) selected.add(fact.subjectId);
    for (const entityId of fact.entities ?? []) {
      if (entityIndex.entities[entityId]?.type === "contractor" && fact.kind === "invoice") selected.add(entityId);
    }
  }

  const nodes: ContextGraphNode[] = [...selected]
    .map((id) => entityIndex.entities[id])
    .filter(Boolean)
    .map((entity) => ({ id: entity.id, label: entity.displayName || entity.id, type: entity.type }));

  const edgeKeys = new Set<string>();
  const edges: ContextGraphEdge[] = [];
  const addEdge = (from: string | undefined, to: string | undefined, label: string) => {
    if (!from || !to || from === to || !selected.has(from) || !selected.has(to)) return;
    const key = `${from}->${to}:${label}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to, label });
  };

  for (const entityId of selected) {
    const entity = entityIndex.entities[entityId];
    for (const relatedId of entity?.relatedEntityIds ?? []) addEdge(entityId, relatedId, "related");
  }
  for (const fact of factIndex?.facts ?? []) {
    if (fact.kind === "relationship") addEdge(fact.fromEntityId, fact.toEntityId, fact.relationshipType ?? "relationship");
    if (fact.kind === "invoice" && fact.subjectId) {
      for (const entityId of fact.entities ?? []) addEdge(fact.subjectId, entityId, "invoice_link");
    }
  }

  return { nodes, edges };
}

async function appendContextNote(note: string, reason: string) {
  const contextPath = path.join(rootDir, "contexts", "LIE-001", "Context.md");
  const existing = await readTextIfExists(contextPath);
  if (!existing) return "No generated property context found. Run `npm run context:ingest` first.";

  const now = new Date().toISOString();
  const entry = [`- ${now} agent note: ${note.trim()}`, `  Reason: ${reason.trim()}`].join("\n");
  const heading = "## Human And Agent Notes";
  const sectionStart = existing.indexOf(`\n${heading}\n`);
  let next: string;

  if (sectionStart === -1) {
    const firstManagedSection = existing.indexOf("\n<!-- BCE:SECTION ");
    const notes = `${heading}\n\n${entry}\n\n`;
    next = firstManagedSection === -1
      ? `${existing.trimEnd()}\n\n${notes}`
      : `${existing.slice(0, firstManagedSection).trimEnd()}\n\n${notes}${existing.slice(firstManagedSection + 1)}`;
  } else {
    const insertAt = sectionStart + `\n${heading}\n`.length;
    next = `${existing.slice(0, insertAt)}\n${entry}\n${existing.slice(insertAt)}`;
  }

  await writeFile(contextPath, next.endsWith("\n") ? next : `${next}\n`, "utf8");
  return "Appended note outside BCE managed sections. Future ingestion will preserve it; durable source-backed facts still require source ingestion/extraction.";
}

async function createContextCorrection(threadId: string, input: z.infer<typeof correctionSchema>) {
  const contextPath = path.join(rootDir, "contexts", "LIE-001", "Context.md");
  const correctionsPath = path.join(rootDir, "contexts", "LIE-001", "corrections.jsonl");
  const now = new Date().toISOString();
  const context = await readTextIfExists(contextPath);
  const correction = {
    correctionId: stableId("CORR", { threadId, correction: input.correction, reason: input.reason, now }),
    propertyId: "LIE-001",
    status: "proposed",
    correction: input.correction.trim(),
    reason: input.reason.trim(),
    targetSectionId: input.targetSectionId,
    targetSectionHash: context && input.targetSectionId ? contextSectionHash(context, input.targetSectionId) : undefined,
    targetFactIds: [...new Set(input.targetFactIds)],
    targetEntityIds: [...new Set(input.targetEntityIds)],
    targetSourceIds: [...new Set(input.targetSourceIds)],
    provenance: { type: "chat_thread", threadId },
    createdAt: now,
  };

  await mkdir(path.dirname(correctionsPath), { recursive: true });
  await appendFile(correctionsPath, `${JSON.stringify(correction)}\n`, "utf8");

  if (context) {
    await appendContextNote(
      `Correction ${correction.correctionId} proposed: ${correction.correction}`,
      `Recorded from chat thread ${threadId.slice(0, 6)}. Targets: ${[
        correction.targetSectionId ? `section ${correction.targetSectionId}` : "",
        correction.targetFactIds.length ? `facts ${correction.targetFactIds.join(", ")}` : "",
        correction.targetEntityIds.length ? `entities ${correction.targetEntityIds.join(", ")}` : "",
        correction.targetSourceIds.length ? `sources ${correction.targetSourceIds.join(", ")}` : "",
      ].filter(Boolean).join("; ") || "unspecified"}.`,
    );
  }

  return [
    `Recorded correction ${correction.correctionId} as proposed.`,
    `Correction log: contexts/LIE-001/corrections.jsonl`,
    correction.targetSectionHash ? `Captured current managed-section hash for ${correction.targetSectionId}: ${correction.targetSectionHash}` : "No managed-section hash captured.",
    "This does not directly rewrite generated facts. It preserves provenance and can be applied by a future correction-overlay/materialization step.",
  ].join("\n");
}

async function searchLocalServices(input: z.infer<typeof localServiceSearchSchema>) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return "TAVILY_API_KEY is not configured. Add it to .env and restart the API server.";

  const entityLocation = input.entityId ? propertyLocations[input.entityId.toUpperCase()] : undefined;
  const location = input.location ?? entityLocation?.address ?? propertyLocations["LIE-001"].address;
  const query = `${input.query} near ${location}`;
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      include_answer: true,
      max_results: input.maxResults ?? 5,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return `Tavily search failed with ${response.status}: ${body.slice(0, 300)}`;
  }

  const data = await response.json() as {
    answer?: string;
    results?: { title?: string; url?: string; content?: string; score?: number }[];
  };
  const results = (data.results ?? []).slice(0, input.maxResults ?? 5).map((result, index) => [
    `${index + 1}. ${result.title ?? "Untitled result"}`,
    result.url ? `   URL: ${result.url}` : undefined,
    result.content ? `   Note: ${result.content.replace(/\s+/g, " ").slice(0, 240)}` : undefined,
  ].filter(Boolean).join("\n"));

  return [
    `Search query: ${query}`,
    entityLocation ? `Location context: ${entityLocation.label}; ${entityLocation.note}` : `Location context: ${location}`,
    data.answer ? `Tavily answer: ${data.answer}` : undefined,
    results.length ? "Results:" : "No Tavily results returned.",
    ...results,
    "Reminder: verify availability, licenses, pricing, and emergency coverage before assigning work.",
  ].filter(Boolean).join("\n");
}

function createEmptyThread(threadId: string): ThreadRecord {
  const now = new Date().toISOString();
  return {
    threadId,
    title: `Thread ${threadId.slice(0, 6)}`,
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        role: "agent",
        content:
          "Connected to the Buena context agent for `LIE-001`. Ask me about the property context engine, ingestion architecture, or this property dataset.",
        createdAt: now,
      },
    ],
    todos: [],
  };
}

function getMessageText(message: unknown): string {
  const candidate = message as { content?: unknown };
  const content = candidate?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) {
          return String((item as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function getStreamTokenText(token: unknown): string {
  const candidate = token as { content?: unknown; contentBlocks?: { type?: string; text?: string }[] };
  if (Array.isArray(candidate.contentBlocks)) {
    return candidate.contentBlocks
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text)
      .join("");
  }
  if (typeof candidate.content === "string") return candidate.content;
  if (Array.isArray(candidate.content)) {
    return candidate.content
      .map((item) => typeof item === "string" ? item : item && typeof item === "object" && "text" in item ? String((item as { text?: unknown }).text ?? "") : "")
      .join("");
  }
  return "";
}

function writeStreamEvent(res: express.Response, event: unknown) {
  res.write(`${JSON.stringify(event)}\n`);
}

function getGradiumApiKey() {
  const apiKey = process.env.GRADIUM_API_KEY;
  if (!apiKey) throw new Error("GRADIUM_API_KEY is not configured. Add it to .env and restart the API server.");
  return apiKey;
}

function parseGradiumMessage(data: WebSocket.RawData) {
  const text = Buffer.isBuffer(data)
    ? data.toString("utf8")
    : Array.isArray(data)
      ? Buffer.concat(data).toString("utf8")
      : data instanceof ArrayBuffer
        ? Buffer.from(data).toString("utf8")
        : String(data);
  try {
    return JSON.parse(text) as { type?: string; text?: string; message?: string; code?: number };
  } catch {
    return { type: "raw", text };
  }
}

async function transcribeGradiumPcm(pcm: Buffer) {
  if (pcm.byteLength < 2400) throw new Error("No usable voice audio was captured.");

  const apiKey = getGradiumApiKey();
  const frameBytes = 1920 * 2;

  return await new Promise<string>((resolve, reject) => {
    const ws = new WebSocket(gradiumSttUrl, { headers: { "x-api-key": apiKey } });
    const transcriptParts: string[] = [];
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      ws.close();
      if (error) {
        reject(error);
        return;
      }
      resolve(transcriptParts.join(" ").replace(/\s+/g, " ").trim());
    };

    timeout = setTimeout(() => {
      finish(new Error("Gradium STT timed out while processing audio."));
    }, 45_000);

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "setup", model_name: "default", input_format: "pcm" }));
    });

    ws.on("message", (data) => {
      const message = parseGradiumMessage(data);

      if (message.type === "ready") {
        for (let offset = 0; offset < pcm.byteLength; offset += frameBytes) {
          const chunk = pcm.subarray(offset, Math.min(offset + frameBytes, pcm.byteLength));
          ws.send(JSON.stringify({ type: "audio", audio: chunk.toString("base64") }));
        }
        ws.send(JSON.stringify({ type: "end_of_stream" }));
        return;
      }

      if (message.type === "text" && message.text?.trim()) transcriptParts.push(message.text.trim());
      if (message.type === "error") finish(new Error(`Gradium STT failed: ${message.message ?? `code ${message.code ?? "unknown"}`}`));
      if (message.type === "end_of_stream") finish();
    });

    ws.on("error", (error) => finish(error instanceof Error ? error : new Error("Gradium STT WebSocket failed.")));
    ws.on("close", (code, reason) => {
      if (!settled && transcriptParts.length > 0) finish();
      if (!settled) finish(new Error(`Gradium STT closed before a transcript was returned (${code}${reason.length ? `: ${reason.toString()}` : ""}).`));
    });
  });
}

async function synthesizeGradiumSpeech(input: z.infer<typeof voiceSpeakSchema>) {
  const response = await fetch(gradiumTtsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getGradiumApiKey(),
    },
    body: JSON.stringify({
      text: input.text,
      voice_id: input.voiceId ?? defaultGradiumVoiceId,
      output_format: "wav",
      model_name: "default",
      only_audio: true,
      json_config: JSON.stringify({ rewrite_rules: "de", padding_bonus: -1.4 }),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gradium TTS failed with ${response.status}: ${body.slice(0, 300)}`);
  }

  return {
    audio: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "audio/wav",
  };
}

async function walkDirSummary(dirPath: string): Promise<{ fileCount: number; totalBytes: number }> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const summaries = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) return walkDirSummary(entryPath);
    if (!entry.isFile()) return { fileCount: 0, totalBytes: 0 };
    const fileStat = await stat(entryPath);
    return { fileCount: 1, totalBytes: fileStat.size };
  }));
  return summaries.reduce((total, next) => ({ fileCount: total.fileCount + next.fileCount, totalBytes: total.totalBytes + next.totalBytes }), { fileCount: 0, totalBytes: 0 });
}

async function currentAppliedIncrementalDay() {
  const manifest = await readTextIfExists(manifestPath);
  if (!manifest) return undefined;
  const parsed = JSON.parse(manifest) as { items?: { incrementalDay?: string; status?: string }[] };
  return parsed.items
    ?.map((item) => item.incrementalDay)
    .filter((day): day is string => Boolean(day))
    .sort((a, b) => a.localeCompare(b))
    .at(-1);
}

async function listIncrementalDeltas() {
  const appliedThroughDay = await currentAppliedIncrementalDay();
  const entries = await readdir(incrementalRoot, { withFileTypes: true }).catch(() => []);
  const days = entries
    .filter((entry) => entry.isDirectory() && /^day-\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return Promise.all(days.map(async (day) => {
    const dayRoot = path.join(incrementalRoot, day);
    const summary = await walkDirSummary(dayRoot);
    const manifestText = await readTextIfExists(path.join(dayRoot, "incremental_manifest.json"));
    const manifest = manifestText ? JSON.parse(manifestText) as Record<string, unknown> : undefined;
    return {
      day,
      path: path.relative(rootDir, dayRoot).replaceAll("\\", "/"),
      fileCount: summary.fileCount,
      totalBytes: summary.totalBytes,
      applied: appliedThroughDay ? day.localeCompare(appliedThroughDay) <= 0 : false,
      manifest,
    };
  }));
}

function emitIngestSummary(res: express.Response, result: IngestResult) {
  writeStreamEvent(res, { type: "log", level: "success", message: `Manifest complete: ${result.manifestItems} source records, ${result.normalized} normalized, ${result.newlyNormalized} new.` });
  writeStreamEvent(res, { type: "log", level: "success", message: `Facts rebuilt: ${result.facts.factCount} facts across ${result.entities} entities and ${result.workItems} work items.` });
  writeStreamEvent(res, { type: "log", level: result.context.conflictSections > 0 ? "warning" : "success", message: `Context patched: ${result.context.patchedSections} sections, ${result.context.conflictSections} conflicts.` });
  writeStreamEvent(res, { type: "log", level: result.coverage.missingAssignments > 0 || result.coverage.pendingWorkItems > 0 ? "warning" : "success", message: `Coverage: ${result.coverage.assignedSources}/${result.coverage.eligibleSources} sources assigned, ${result.coverage.pendingWorkItems} pending work items.` });
  writeStreamEvent(res, { type: "log", level: "info", message: "Terminal JSON result", data: result });
}

async function streamIngest(res: express.Response, label: string, options: Parameters<typeof runIngest>[0]) {
  if (ingestRunning) {
    writeStreamEvent(res, { type: "error", error: "Another ingest is already running. Wait for it to finish before starting a new run." });
    res.end();
    return;
  }

  ingestRunning = true;
  const startedAt = new Date().toISOString();
  writeStreamEvent(res, { type: "log", level: "info", message: `${label} started at ${startedAt}` });
  writeStreamEvent(res, { type: "log", level: "info", message: options?.incrementalThroughDay ? `Including incremental deltas through ${options.incrementalThroughDay}.` : "Historic ingest only. data/incremental is intentionally skipped." });
  try {
    const result = await runIngest({
      ...options,
      onProgress: (event) => {
        const eventData = event.data && typeof event.data === "object"
          ? { stage: event.stage, ...(event.data as Record<string, unknown>) }
          : { stage: event.stage, value: event.data };
        writeStreamEvent(res, { type: "log", level: event.level, message: event.message, data: eventData });
      },
    });
    emitIngestSummary(res, result);
    writeStreamEvent(res, { type: "done", result, deltas: await listIncrementalDeltas() });
  } catch (error) {
    writeStreamEvent(res, { type: "error", error: error instanceof Error ? error.message : "Unknown ingest error" });
  } finally {
    ingestRunning = false;
    res.end();
  }
}

function streamActivityFromUpdate(chunk: unknown) {
  const entries = Object.entries(chunk as Record<string, { messages?: unknown[] }>);
  return entries.flatMap(([step, content]) => {
    const messages = content?.messages ?? [];
    const activities: { phase: string; label: string; detail: string }[] = [];
    for (const message of messages) {
      const candidate = message as { tool_calls?: { name?: string; args?: unknown }[]; name?: string; content?: unknown; _getType?: () => string };
      if (Array.isArray(candidate.tool_calls) && candidate.tool_calls.length > 0) {
        for (const call of candidate.tool_calls) {
          activities.push({ phase: "tool_call", label: call.name ?? "tool", detail: JSON.stringify(call.args ?? {}) });
        }
        continue;
      }
      if (candidate._getType?.() === "tool") {
        activities.push({ phase: "tool_result", label: candidate.name ?? "tool_result", detail: getMessageText(message).slice(0, 180) });
        continue;
      }
      if (step === "model") activities.push({ phase: "model", label: "agent_reasoning", detail: "Planning next response step" });
    }
    return activities;
  });
}

function getToolCallMessages(messages: unknown[]): ChatMessage[] {
  const now = new Date().toISOString();
  const toolMessages: ChatMessage[] = [];

  for (const message of messages) {
    const candidate = message as {
      tool_calls?: { name?: string; args?: unknown }[];
      tool_call_id?: string;
      name?: string;
      content?: unknown;
      _getType?: () => string;
    };

    if (Array.isArray(candidate.tool_calls)) {
      for (const call of candidate.tool_calls) {
        toolMessages.push({
          role: "tool",
          content: `[tool call: ${call.name ?? "unknown"}, query:${JSON.stringify(call.args ?? {})}]`,
          createdAt: now,
        });
      }
    }

    if (candidate._getType?.() === "tool") {
      const toolName = candidate.name ?? candidate.tool_call_id ?? "tool_result";
      const text = getMessageText(message);
      toolMessages.push({
        role: "tool",
        content: `[tool result: ${toolName}] ${text}`,
        createdAt: now,
      });
    }
  }

  return toolMessages;
}

function getMessageType(message: unknown): string | undefined {
  const candidate = message as { _getType?: () => string; type?: string };
  return candidate._getType?.() ?? candidate.type;
}

function getTodosFromMessages(messages: unknown[]): Todo[] {
  for (const message of [...messages].reverse()) {
    const candidate = message as { tool_calls?: { name?: string; args?: { todos?: Todo[] } }[] };
    const todoCall = candidate.tool_calls?.find((call) => call.name === "write_todos");
    if (todoCall?.args?.todos) return todoCall.args.todos;
  }
  return [];
}

function checkpointMessagesToChatMessages(messages: unknown[]): ChatMessage[] {
  const chatMessages: ChatMessage[] = [];

  for (const message of messages) {
    const type = getMessageType(message);
    const createdAt = new Date().toISOString();

    if (type === "human") {
      chatMessages.push({ role: "user", content: getMessageText(message), createdAt });
      continue;
    }

    if (type === "ai") {
      chatMessages.push(...getToolCallMessages([message]));
      const content = getMessageText(message);
      if (content.trim()) chatMessages.push({ role: "agent", content, createdAt });
      continue;
    }

    if (type === "tool") {
      chatMessages.push(...getToolCallMessages([message]));
    }
  }

  return chatMessages;
}

function hideToolMessages(thread: ThreadRecord): ThreadRecord {
  return {
    ...thread,
    messages: thread.messages.filter((message) => message.role !== "tool"),
  };
}

async function getCheckpointThread(threadId: string): Promise<ThreadRecord> {
  const tuple = await checkpointer.getTuple({ configurable: { thread_id: threadId, checkpoint_ns: "" } });
  if (!tuple) return createEmptyThread(threadId);

  const checkpoint = tuple.checkpoint as { ts?: string; channel_values?: { messages?: unknown[] } };
  const messages = checkpoint.channel_values?.messages ?? [];
  const chatMessages = checkpointMessagesToChatMessages(messages);
  const firstUserMessage = chatMessages.find((message) => message.role === "user")?.content;
  const updatedAt = checkpoint.ts ?? new Date().toISOString();

  return hideToolMessages({
    threadId,
    title: firstUserMessage?.slice(0, 48) || `Thread ${threadId.slice(0, 6)}`,
    createdAt: updatedAt,
    updatedAt,
    messages: chatMessages.length ? chatMessages : createEmptyThread(threadId).messages,
    todos: getTodosFromMessages(messages),
  });
}

async function listCheckpointThreads(): Promise<ThreadRecord[]> {
  const latestByThread = new Map<string, ThreadRecord>();

  for await (const item of checkpointer.list(
    { configurable: { checkpoint_ns: "" } },
    { limit: 300 },
  )) {
    const threadId = item.config.configurable?.thread_id;
    if (!threadId || latestByThread.has(threadId)) continue;

    const checkpoint = item.checkpoint as { ts?: string; channel_values?: { messages?: unknown[] } };
    const messages = checkpoint.channel_values?.messages ?? [];
    const chatMessages = checkpointMessagesToChatMessages(messages);
    const firstUserMessage = chatMessages.find((message) => message.role === "user")?.content;
    const updatedAt = checkpoint.ts ?? new Date().toISOString();

    latestByThread.set(threadId, hideToolMessages({
      threadId,
      title: firstUserMessage?.slice(0, 48) || `Thread ${threadId.slice(0, 6)}`,
      createdAt: updatedAt,
      updatedAt,
      messages: chatMessages.length ? chatMessages : createEmptyThread(threadId).messages,
      todos: getTodosFromMessages(messages),
    }));
  }

  return [...latestByThread.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

async function deleteThread(threadId: string) {
  await checkpointer.deleteThread(threadId);
  return listCheckpointThreads();
}

function createChatAgent(threadId: string, setTodos: (todos: Todo[]) => void) {
  const writeTodos = tool(
    async ({ todos }) => {
      const nextTodos = todos.map((todo) => ({
        content: todo.content,
        status: todo.status,
      })) as Todo[];
      setTodos(nextTodos);
      return `Updated todo list for ${threadId.slice(0, 6)} with ${nextTodos.length} item(s).`;
    },
    {
      name: "write_todos",
      description:
        "Use this before answering requests that require more than one step. It updates the visible todo panel in the chat UI.",
      schema: todoSchema,
    },
  );

  const readPropertyContext = tool(
    async () => {
      return await readTextIfExists(path.join(rootDir, "contexts", "LIE-001", "Context.md")) ?? "No generated property context found. Run `npm run context:ingest` first.";
    },
    {
      name: "read_property_context",
      description: "Read the current high-level Buena property context summary.",
      schema: z.object({}),
    },
  );

  const readEntityContext = tool(
    async ({ entityId }) => {
      return await readTextIfExists(path.join(rootDir, "contexts", "LIE-001", "entities", `${safeFileStem(entityId)}.md`)) ?? `No generated entity context found for ${entityId}. Run \`npm run context:ingest\` or check entity-index.json.`;
    },
    {
      name: "read_entity_context",
      description: "Read generated scoped context for a specific entity such as HAUS-12, EH-014, MIE-001, EIG-001, DL-003, INV-00042, or EMAIL-00001.",
      schema: entityContextSchema,
    },
  );

  const appendContextNoteTool = tool(
    async ({ note, reason }) => appendContextNote(note, reason),
    {
      name: "append_context_note",
      description: "Append a human/agent note to Context.md outside BCE managed sections. Use only when the user explicitly asks to update context or save a note. Do not use for source-backed facts that require ingestion.",
      schema: contextNoteSchema,
    },
  );

  const createContextCorrectionTool = tool(
    async (input) => createContextCorrection(threadId, input),
    {
      name: "create_context_correction",
      description: "Record a user-requested correction as an auditable proposed correction with optional target section, fact, entity, and source IDs. Use this when the user says context/facts are wrong and asks you to correct them. It does not directly edit BCE managed sections.",
      schema: correctionSchema,
    },
  );

  const searchLocalServicesTool = tool(
    async (input) => searchLocalServices(input),
    {
      name: "search_local_services",
      description: "Search the web with Tavily for local property-management services or vendors near a known property/building address. Use for questions like plumbers near HAUS-12, electricians near the property, locksmiths, roofers, Hausmeister, emergency repair vendors, or similar external/local lookup tasks. Do not use for internal context facts.",
      schema: localServiceSearchSchema,
    },
  );

  const model = new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_CHAT_MODEL ?? "gemini-3-pro-preview",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0,
  });

  return createAgent({
    model,
    tools: [writeTodos, readPropertyContext, readEntityContext, appendContextNoteTool, createContextCorrectionTool, searchLocalServicesTool],
    checkpointer,
    systemPrompt: [
      "You are the Buena chat agent for a property context-engine demo.",
      "Answer concisely and practically. This is often used as a voice agent, so prefer short spoken answers: 1-3 sentences by default, with only the key IDs, actions, and caveats.",
      "When the user asks for detail, give detail; otherwise avoid long lists and avoid reading large context excerpts aloud.",
      "Known location context: HAUS-12 is at Immanuelkirchstraße 26, 10405 Berlin, Germany and is part of the main property WEG Immanuelkirchstraße 26 (LIE-001).",
      "Use read_property_context when the user asks about the property, context engine, ingestion, or architecture.",
      "Use read_entity_context when the user asks about a specific building, unit, owner, tenant, contractor, invoice, letter, or email.",
      "Use search_local_services for external/local vendor lookup questions such as plumbers, electricians, locksmiths, roofers, Hausmeister, or emergency repairs near HAUS-12/LIE-001. Prefer entityId HAUS-12 when the user mentions that building. Summarize results with names, URLs, and practical caveats; do not pretend Tavily results are source-backed property facts.",
      "Use append_context_note only when the user explicitly asks to update or save a context note. Explain that notes are preserved because they live outside BCE managed sections.",
      "Use create_context_correction when the user says generated context or a fact is wrong and asks you to correct it. Capture target section IDs, fact IDs, entity IDs, and source IDs when the user provides them.",
      "When the user asks to edit, update, change, fix, or correct context, first clarify the exact target and intended change if either is ambiguous. Once clear, do what they asked using create_context_correction for generated facts/context or append_context_note for user notes.",
      "For edit requests, do not silently guess which fact, section, entity, or source should change. Ask one concise clarification question when needed, then proceed after the user answers.",
      "Do not overwrite managed BCE sections. Durable facts should come from source ingestion and evidence, not direct chat edits.",
      "Context.md managed sections are guarded by BCE hashes; if a human edits a managed block, ingestion records a conflict instead of destroying the edit.",
      "Use write_todos before answering any request that has multiple steps, design decisions, or implementation work.",
      "Do not claim generated facts have changed unless a correction overlay/materialization step has applied them. If create_context_correction is used, say the correction was recorded as proposed.",
    ].join("\n"),
  });
}

async function fallbackReply(message: string, threadId: string): Promise<{ reply: string; todos: Todo[] }> {
  const todos: Todo[] = [
    { content: "Read the user request", status: "completed" },
    { content: "Use available Buena context", status: "completed" },
    { content: "Return a concise answer", status: "completed" },
  ];

  return {
    todos,
    reply: [
      `Local fallback response for thread \`${threadId.slice(0, 6)}\`.`,
      "",
      "The LangChain agent backend is wired, but no `GEMINI_API_KEY` is available in this process, so I cannot call the model yet.",
      "",
      `Your message was: ${message}`,
    ].join("\n"),
  };
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/voice/transcribe", express.raw({ type: ["application/octet-stream", "audio/pcm"], limit: "12mb" }), async (req, res, next) => {
  try {
    const pcm = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? []);
    const transcript = await transcribeGradiumPcm(pcm);
    res.json({ transcript });
  } catch (error) {
    next(error);
  }
});

app.post("/api/voice/speak", async (req, res, next) => {
  try {
    const parsed = voiceSpeakSchema.parse(req.body);
    const { audio, contentType } = await synthesizeGradiumSpeech(parsed);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(audio.byteLength));
    res.setHeader("Cache-Control", "no-store");
    res.send(audio);
  } catch (error) {
    next(error);
  }
});

app.get("/api/context", async (_req, res, next) => {
  try {
    const markdown = await readTextIfExists(path.join(rootDir, "contexts", "LIE-001", "Context.md"));
    res.json({
      propertyId: "LIE-001",
      markdown: markdown ?? "No generated property context found. Run `npm run context:ingest` first.",
      exists: Boolean(markdown),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/context/graph", async (_req, res, next) => {
  try {
    res.json(await buildContextGraph());
  } catch (error) {
    next(error);
  }
});

app.get("/api/ingest/deltas", async (_req, res, next) => {
  try {
    const deltas = await listIncrementalDeltas();
    res.json({
      running: ingestRunning,
      noticed: deltas.length,
      message: deltas.length ? `Noticed ${deltas.length} incremental delta${deltas.length === 1 ? "" : "s"}. Want to update?` : "No incremental deltas found.",
      deltas,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/ingest/historic", async (_req, res) => {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  await streamIngest(res, "Historic ingest", {});
});

app.post("/api/ingest/incremental", async (req, res, next) => {
  try {
    const parsed = z.object({ day: z.string().regex(/^day-\d+$/) }).parse(req.body);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    await streamIngest(res, `Incremental update ${parsed.day}`, { incrementalThroughDay: parsed.day });
  } catch (error) {
    if (res.headersSent) {
      writeStreamEvent(res, { type: "error", error: error instanceof Error ? error.message : "Unknown ingest error" });
      res.end();
      return;
    }
    next(error);
  }
});

app.get("/api/threads", async (_req, res, next) => {
  try {
    const threads = await listCheckpointThreads();
    res.json({
      threads: threads.slice(0, 12).map((thread) => ({
        threadId: thread.threadId,
        shortId: thread.threadId.slice(0, 6),
        title: thread.title,
        updatedAt: thread.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/threads", async (_req, res, next) => {
  try {
    const thread = createEmptyThread(uuidv4());
    res.json({ thread });
  } catch (error) {
    next(error);
  }
});

app.get("/api/threads/:threadId", async (req, res, next) => {
  try {
    const thread = await getCheckpointThread(req.params.threadId);
    res.json({ thread });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/threads/:threadId", async (req, res, next) => {
  try {
    const threads = await deleteThread(req.params.threadId);
    res.json({
      ok: true,
      threads: threads.slice(0, 12).map((thread) => ({
        threadId: thread.threadId,
        shortId: thread.threadId.slice(0, 6),
        title: thread.title,
        updatedAt: thread.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/chat", async (req, res, next) => {
  try {
    const parsed = z
      .object({
        threadId: z.string().min(1),
        message: z.string().min(1),
      })
      .parse(req.body);

    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");

    let todos: Todo[] = [];

    if (!process.env.GEMINI_API_KEY) {
      const fallback = await fallbackReply(parsed.message, parsed.threadId);
      todos = fallback.todos;
      const emptyThread = createEmptyThread(parsed.threadId);
      const now = new Date().toISOString();
      const updated: ThreadRecord = {
        ...emptyThread,
        title: parsed.message.slice(0, 48),
        updatedAt: now,
        todos,
        messages: [
          ...emptyThread.messages,
          { role: "user", content: parsed.message, createdAt: now },
          { role: "agent", content: fallback.reply, createdAt: new Date().toISOString() },
        ],
      };
      writeStreamEvent(res, { type: "delta", content: fallback.reply });
      writeStreamEvent(res, { type: "done", thread: updated, todos });
      res.end();
      return;
    }

    const agent = createChatAgent(parsed.threadId, (nextTodos) => {
      todos = nextTodos;
      writeStreamEvent(res, { type: "todos", todos });
      writeStreamEvent(res, { type: "activity", phase: "update", label: "write_todos", detail: `${todos.length} todo item(s) updated` });
    });

    writeStreamEvent(res, { type: "activity", phase: "start", label: "user_request", detail: parsed.message.slice(0, 160) });

    const stream = await agent.stream(
      { messages: [{ role: "user", content: parsed.message }] } as never,
      { configurable: { thread_id: parsed.threadId }, streamMode: ["updates", "messages"] } as never,
    ) as AsyncIterable<[string, unknown]>;

    for await (const [mode, chunk] of stream) {
      if (mode === "messages") {
        const [token] = chunk as [unknown, unknown];
        const text = getStreamTokenText(token);
        if (text) writeStreamEvent(res, { type: "delta", content: text });
        continue;
      }
      if (mode === "updates") {
        for (const activity of streamActivityFromUpdate(chunk)) writeStreamEvent(res, { type: "activity", ...activity });
      }
    }

    const updated = await getCheckpointThread(parsed.threadId);
    writeStreamEvent(res, { type: "activity", phase: "done", label: "agent_response", detail: "Response complete" });
    writeStreamEvent(res, { type: "done", thread: updated, todos });
    res.end();
  } catch (error) {
    if (res.headersSent) {
      writeStreamEvent(res, { type: "error", error: error instanceof Error ? error.message : "Unknown server error" });
      res.end();
      return;
    }
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unknown server error";
  res.status(500).json({ error: message });
});

const port = Number(process.env.AGENT_PORT ?? 8787);
app.listen(port, () => {
  console.log(`Buena agent API listening on http://localhost:${port}`);
});
