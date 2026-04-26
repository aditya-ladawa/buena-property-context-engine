const USER_BLOCK_RE = /<user\b[^>]*>[\s\S]*?<\/user>/gi;

export function extractUserBlocks(markdown: string) {
  return markdown.match(USER_BLOCK_RE) ?? [];
}

export function validateHumanAuthority(before: string, after: string) {
  const beforeBlocks = extractUserBlocks(before);
  const afterBlocks = extractUserBlocks(after);
  return beforeBlocks.length === afterBlocks.length && beforeBlocks.every((block, index) => block === afterBlocks[index]);
}

export function sanitizeUserText(value: string) {
  return value.replace(/<\/user>/gi, "</ user>").trim();
}

export function sanitizeAttr(value: string) {
  return value.replace(/[^A-Za-z0-9_.@-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "frontend-user";
}

function userBlockLines(editId: string, index: number, author: string, createdAt: string, action: string, content: string) {
  const safeContent = sanitizeUserText(content);
  if (!safeContent) return [];
  return [
    `<user id="${editId}-${index}" author="${sanitizeAttr(author)}" created_at="${createdAt}" action="${sanitizeAttr(action)}">`,
    ...safeContent.split(/\r?\n/),
    "</user>",
  ];
}

function commonPrefixLength(a: string[], b: string[]) {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) index += 1;
  return index;
}

function commonSuffixLength(a: string[], b: string[], prefixLength: number) {
  let count = 0;
  while (
    count < a.length - prefixLength &&
    count < b.length - prefixLength &&
    a[a.length - 1 - count] === b[b.length - 1 - count]
  ) {
    count += 1;
  }
  return count;
}

function lineOpcodes(currentLines: string[], editedLines: string[]) {
  const m = currentLines.length;
  const n = editedLines.length;
  const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] = currentLines[i] === editedLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const opcodes: Array<{ tag: "equal" | "delete" | "insert" | "replace"; a0: number; a1: number; b0: number; b1: number }> = [];
  let i = 0;
  let j = 0;
  let equalStartA: number | undefined;
  let equalStartB: number | undefined;

  const flushEqual = () => {
    if (equalStartA === undefined || equalStartB === undefined) return;
    opcodes.push({ tag: "equal", a0: equalStartA, a1: i, b0: equalStartB, b1: j });
    equalStartA = undefined;
    equalStartB = undefined;
  };

  const pushChange = (tag: "delete" | "insert", a0: number, a1: number, b0: number, b1: number) => {
    const last = opcodes[opcodes.length - 1];
    if (last?.tag === tag && last.a1 === a0 && last.b1 === b0) {
      last.a1 = a1;
      last.b1 = b1;
      return;
    }
    opcodes.push({ tag, a0, a1, b0, b1 });
  };

  while (i < m && j < n) {
    if (currentLines[i] === editedLines[j]) {
      if (equalStartA === undefined) {
        equalStartA = i;
        equalStartB = j;
      }
      i += 1;
      j += 1;
      continue;
    }

    flushEqual();
    if (dp[i + 1][j] >= dp[i][j + 1]) {
      pushChange("delete", i, i + 1, j, j);
      i += 1;
    } else {
      pushChange("insert", i, i, j, j + 1);
      j += 1;
    }
  }

  flushEqual();
  if (i < m) pushChange("delete", i, m, j, j);
  if (j < n) pushChange("insert", i, i, j, n);

  const merged: typeof opcodes = [];
  for (let index = 0; index < opcodes.length; index += 1) {
    const current = opcodes[index];
    const next = opcodes[index + 1];
    if (current?.tag === "delete" && next?.tag === "insert" && current.a1 === next.a0 && current.b1 === next.b0) {
      merged.push({ tag: "replace", a0: current.a0, a1: current.a1, b0: next.b0, b1: next.b1 });
      index += 1;
      continue;
    }
    merged.push(current);
  }

  return merged;
}

export function markUserContextChanges(current: string, edited: string, author: string) {
  if (current === edited) return current;
  if (!validateHumanAuthority(current, edited)) {
    throw new Error("Blocked because protected <user> blocks changed.");
  }

  const createdAt = new Date().toISOString();
  const timestamp = createdAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "").replace("Z", "");
  const editId = `USEREDIT-${timestamp}`;
  const currentLines = current.split(/\r?\n/);
  const editedLines = edited.split(/\r?\n/);
  const output: string[] = [];
  let editCount = 0;

  for (const opcode of lineOpcodes(currentLines, editedLines)) {
    if (opcode.tag === "equal") {
      output.push(...editedLines.slice(opcode.b0, opcode.b1));
      continue;
    }

    editCount += 1;
    if (opcode.tag === "delete") {
      const deleted = currentLines.slice(opcode.a0, opcode.a1).join("\n").trim();
      output.push(...userBlockLines(editId, editCount, author, createdAt, "delete", deleted ? `Deleted generated context:\n\n${deleted}` : ""));
      continue;
    }

    const replacement = editedLines.slice(opcode.b0, opcode.b1).join("\n").trim();
    if (!replacement) continue;
    const action = opcode.tag === "insert" ? "insert" : "replace";
    output.push(...userBlockLines(editId, editCount, author, createdAt, action, replacement));
  }

  const result = output.join("\n");
  return edited.endsWith("\n") ? `${result}\n` : result;
}

export function mergeUserBlocksIntoCandidate(before: string, candidate: string) {
  if (validateHumanAuthority(before, candidate)) return candidate;
  throw new Error("Blocked because protected <user> blocks changed.");
}
