import "dotenv/config";
import cors from "cors";
import express from "express";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { createAgent, tool } from "langchain";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { ChatOpenAI } from "@langchain/openai";

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const runtimeDir = path.join(rootDir, ".agent-data");
const checkpointPath = path.join(runtimeDir, "chat-checkpoints.sqlite");

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

async function getCheckpointThread(threadId: string): Promise<ThreadRecord> {
  const tuple = await checkpointer.getTuple({ configurable: { thread_id: threadId, checkpoint_ns: "" } });
  if (!tuple) return createEmptyThread(threadId);

  const checkpoint = tuple.checkpoint as { ts?: string; channel_values?: { messages?: unknown[] } };
  const messages = checkpoint.channel_values?.messages ?? [];
  const chatMessages = checkpointMessagesToChatMessages(messages);
  const firstUserMessage = chatMessages.find((message) => message.role === "user")?.content;
  const updatedAt = checkpoint.ts ?? new Date().toISOString();

  return {
    threadId,
    title: firstUserMessage?.slice(0, 48) || `Thread ${threadId.slice(0, 6)}`,
    createdAt: updatedAt,
    updatedAt,
    messages: chatMessages.length ? chatMessages : createEmptyThread(threadId).messages,
    todos: getTodosFromMessages(messages),
  };
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

    latestByThread.set(threadId, {
      threadId,
      title: firstUserMessage?.slice(0, 48) || `Thread ${threadId.slice(0, 6)}`,
      createdAt: updatedAt,
      updatedAt,
      messages: chatMessages.length ? chatMessages : createEmptyThread(threadId).messages,
      todos: getTodosFromMessages(messages),
    });
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
      return [
        "Property: LIE-001, WEG Immanuelkirchstrasse 26.",
        "Dataset domains: stammdaten, bank transactions, emails, invoices, letters, incremental updates.",
        "Current architecture: sources -> normalized documents -> work queue -> observations -> assertions -> Context.md.",
        "Rule: Chat agent reads context and requests updates; Context Agent owns Context.md writes.",
      ].join("\n");
    },
    {
      name: "read_property_context",
      description: "Read the current high-level Buena property context summary.",
      schema: z.object({}),
    },
  );

  const model = new ChatOpenAI({
    model: process.env.OPENROUTER_MODEL,
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:5173",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "Buena Context Engine",
      },
    },
  });

  return createAgent({
    model,
    tools: [writeTodos, readPropertyContext],
    checkpointer,
    systemPrompt: [
      "You are the Buena chat agent for a property context-engine demo.",
      "Answer concisely and practically.",
      "Use read_property_context when the user asks about the property, context engine, ingestion, or architecture.",
      "Use write_todos before answering any request that has multiple steps, design decisions, or implementation work.",
      "Do not claim Context.md has been updated unless a context-writer tool exists and was used.",
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
      "The LangChain agent backend is wired, but no `OPENROUTER_API_KEY` is available in this process, so I cannot call the model yet.",
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

    let todos: Todo[] = [];
    let reply: string;

    if (!process.env.OPENROUTER_API_KEY) {
      const fallback = await fallbackReply(parsed.message, parsed.threadId);
      todos = fallback.todos;
      reply = fallback.reply;
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
          { role: "agent", content: reply, createdAt: new Date().toISOString() },
        ],
      };
      res.json({ thread: updated, reply, todos });
      return;
    } else {
      const agent = createChatAgent(parsed.threadId, (nextTodos) => {
        todos = nextTodos;
      });

      const result = await agent.invoke(
        { messages: [{ role: "user", content: parsed.message }] } as never,
        { configurable: { thread_id: parsed.threadId } },
      );

      const resultMessages = (result as { messages?: unknown[] }).messages ?? [];
      reply = getMessageText(resultMessages.at(-1)) || "I could not produce a text response.";
    }

    const updated = await getCheckpointThread(parsed.threadId);
    res.json({ thread: updated, reply, todos });
  } catch (error) {
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
