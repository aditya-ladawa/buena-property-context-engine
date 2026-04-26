import { readFile } from "node:fs/promises";
import path from "node:path";
import { NORMALIZED_ROOT, PROJECT_ROOT, PROPERTY_ID } from "../config";
import type { NormalizedMeta, SourceRegistry } from "../types";
import { parseCsv, toJsonLines } from "../utils/csv";
import { safeFileStem, sha256Text, toPosixPath, writeJson, writeText } from "../utils/fs";

type EmailParts = {
  headers: Record<string, string>;
  body: string;
};

function outputPath(...parts: string[]) {
  return path.join(NORMALIZED_ROOT, ...parts);
}

function relativeOutput(filePath: string) {
  return toPosixPath(path.relative(PROJECT_ROOT, filePath));
}

function parseEmail(raw: string): EmailParts {
  const [rawHeader = "", ...bodyParts] = raw.split(/\r?\n\r?\n/);
  const unfolded = rawHeader.replace(/\r?\n[ \t]+/g, " ");
  const headers: Record<string, string> = {};

  for (const line of unfolded.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  }

  let body = bodyParts.join("\n\n").trim();
  if ((headers["content-transfer-encoding"] ?? "").toLowerCase().includes("quoted-printable")) {
    body = body
      .replace(/=\r?\n/g, "")
      .replace(/=([A-Fa-f0-9]{2})/g, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
  }

  return { headers, body };
}

function parseInvoiceFilename(rawPath: string) {
  const fileName = path.posix.basename(rawPath);
  const match = fileName.match(/^(\d{4})(\d{2})(\d{2})_(DL-(?:FAKE-)?\d+)_(INV-(?:DUP-|FAKE-)?\d+)\.pdf$/);
  return {
    filename: fileName,
    date: match ? `${match[1]}-${match[2]}-${match[3]}` : undefined,
    contractorId: match?.[4],
    invoiceId: match?.[5],
    flags: {
      duplicateMarker: fileName.includes("INV-DUP-"),
      fakeMarker: fileName.includes("FAKE"),
    },
  };
}

function parseLetterFilename(rawPath: string) {
  const fileName = path.posix.basename(rawPath);
  const match = fileName.match(/^(\d{4})(\d{2})(\d{2})_([^_]+(?:_[^_]+)*)_(LTR-\d+)\.pdf$/);
  return {
    filename: fileName,
    date: match ? `${match[1]}-${match[2]}-${match[3]}` : undefined,
    letterType: match?.[4],
    letterId: match?.[5],
  };
}

async function writeMeta(meta: NormalizedMeta) {
  await writeJson(path.join(PROJECT_ROOT, meta.normalizedPaths[0].replace(/\.[^.]+$/, ".meta.json")), meta);
}

async function normalizeTextSource(section: string, sourceId: string, rawPath: string, text: string, meta: Omit<NormalizedMeta, "normalizedPaths" | "normalizedSha256">) {
  const stem = safeFileStem(sourceId);
  const mdPath = outputPath(section, `${stem}.md`);
  const normalizedSha256 = sha256Text(text);
  await writeText(mdPath, text.endsWith("\n") ? text : `${text}\n`);
  const normalizedPaths = [relativeOutput(mdPath)];
  await writeJson(mdPath.replace(/\.md$/, ".meta.json"), { ...meta, normalizedPaths, normalizedSha256 });
  return { normalizedPaths, normalizedSha256 };
}

export async function normalizeSources(registry: SourceRegistry): Promise<SourceRegistry> {
  for (const source of registry.sources) {
    if (["deleted", "duplicate", "ignored"].includes(source.status)) continue;
    if (source.status === "normalized" && source.normalizedPaths.length > 0) continue;

    const absolutePath = path.join(PROJECT_ROOT, source.rawPath);
    const stem = safeFileStem(source.sourceId);

    try {
      if (source.kind === "master_data") {
        const raw = await readFile(absolutePath, "utf8");
        const metadata = source.rawPath.endsWith(".csv")
          ? { rowCount: parseCsv(raw).length, format: "csv" }
          : { format: "json" };
        const jsonPath = outputPath("master-data", `${stem}.json`);
        const normalized = source.rawPath.endsWith(".csv") ? JSON.stringify(parseCsv(raw), null, 2) : JSON.stringify(JSON.parse(raw), null, 2);
        await writeText(jsonPath, `${normalized}\n`);
        source.normalizedPaths = [relativeOutput(jsonPath)];
        source.normalizedSha256 = sha256Text(normalized);
        await writeMeta({ sourceId: source.sourceId, propertyId: PROPERTY_ID, kind: source.kind, rawPath: source.rawPath, rawSha256: source.rawSha256, normalizedPaths: source.normalizedPaths, normalizedSha256: source.normalizedSha256, metadata });
      } else if (source.kind === "email") {
        const raw = await readFile(absolutePath, "utf8");
        const email = parseEmail(raw);
        const markdown = [
          `# Email ${source.sourceId}`,
          "",
          `- Source: ${source.rawPath}`,
          `- Date: ${email.headers.date ?? source.sourceDate ?? ""}`,
          `- From: ${email.headers.from ?? ""}`,
          `- To: ${email.headers.to ?? ""}`,
          `- Subject: ${email.headers.subject ?? ""}`,
          `- Message-ID: ${email.headers["message-id"] ?? ""}`,
          "",
          "## Body",
          "",
          email.body,
        ].join("\n");
        const result = await normalizeTextSource("emails", source.sourceId, source.rawPath, markdown, {
          sourceId: source.sourceId,
          propertyId: PROPERTY_ID,
          kind: source.kind,
          rawPath: source.rawPath,
          rawSha256: source.rawSha256,
          metadata: { headers: email.headers, bodyLength: email.body.length },
        });
        source.normalizedPaths = result.normalizedPaths;
        source.normalizedSha256 = result.normalizedSha256;
      } else if (source.kind === "invoice_pdf") {
        const parsed = parseInvoiceFilename(source.rawPath);
        const markdown = [
          `# Invoice PDF ${parsed.invoiceId ?? source.sourceId}`,
          "",
          `- Source: ${source.rawPath}`,
          `- Date: ${parsed.date ?? source.sourceDate ?? ""}`,
          `- Contractor ID: ${parsed.contractorId ?? ""}`,
          `- Invoice ID: ${parsed.invoiceId ?? ""}`,
          `- Duplicate marker: ${parsed.flags.duplicateMarker}`,
          `- Fake marker: ${parsed.flags.fakeMarker}`,
          "",
          "PDF text extraction has not been run yet. This normalized file preserves filename-derived metadata for deterministic coverage.",
        ].join("\n");
        const result = await normalizeTextSource("invoices", source.sourceId, source.rawPath, markdown, {
          sourceId: source.sourceId,
          propertyId: PROPERTY_ID,
          kind: source.kind,
          rawPath: source.rawPath,
          rawSha256: source.rawSha256,
          metadata: parsed,
        });
        source.normalizedPaths = result.normalizedPaths;
        source.normalizedSha256 = result.normalizedSha256;
      } else if (source.kind === "letter_pdf") {
        const parsed = parseLetterFilename(source.rawPath);
        const markdown = [
          `# Letter PDF ${parsed.letterId ?? source.sourceId}`,
          "",
          `- Source: ${source.rawPath}`,
          `- Date: ${parsed.date ?? source.sourceDate ?? ""}`,
          `- Letter type: ${parsed.letterType ?? ""}`,
          `- Letter ID: ${parsed.letterId ?? ""}`,
          "",
          "PDF text extraction has not been run yet. This normalized file preserves filename-derived metadata for deterministic coverage.",
        ].join("\n");
        const result = await normalizeTextSource("letters", source.sourceId, source.rawPath, markdown, {
          sourceId: source.sourceId,
          propertyId: PROPERTY_ID,
          kind: source.kind,
          rawPath: source.rawPath,
          rawSha256: source.rawSha256,
          metadata: parsed,
        });
        source.normalizedPaths = result.normalizedPaths;
        source.normalizedSha256 = result.normalizedSha256;
      } else if (source.kind === "bank_csv" || source.kind === "index_csv") {
        const raw = await readFile(absolutePath, "utf8");
        const rows = parseCsv(raw);
        const jsonl = toJsonLines(rows);
        const folder = source.kind === "bank_csv" ? "bank" : "indexes";
        const jsonlPath = outputPath(folder, `${stem}.jsonl`);
        await writeText(jsonlPath, jsonl);
        source.normalizedPaths = [relativeOutput(jsonlPath)];
        source.normalizedSha256 = sha256Text(jsonl);
        await writeJson(jsonlPath.replace(/\.jsonl$/, ".meta.json"), {
          sourceId: source.sourceId,
          propertyId: PROPERTY_ID,
          kind: source.kind,
          rawPath: source.rawPath,
          rawSha256: source.rawSha256,
          normalizedPaths: source.normalizedPaths,
          normalizedSha256: source.normalizedSha256,
          metadata: { rowCount: rows.length, format: "csv" },
        });
      } else if (source.kind === "bank_xml" || source.kind === "incremental_manifest") {
        const raw = await readFile(absolutePath, "utf8");
        const folder = source.kind === "bank_xml" ? "bank" : "incremental";
        const extension = source.kind === "bank_xml" ? "xml" : "json";
        const outPath = outputPath(folder, `${stem}.${extension}`);
        await writeText(outPath, raw.endsWith("\n") ? raw : `${raw}\n`);
        source.normalizedPaths = [relativeOutput(outPath)];
        source.normalizedSha256 = sha256Text(raw);
        await writeJson(outPath.replace(/\.[^.]+$/, ".meta.json"), {
          sourceId: source.sourceId,
          propertyId: PROPERTY_ID,
          kind: source.kind,
          rawPath: source.rawPath,
          rawSha256: source.rawSha256,
          normalizedPaths: source.normalizedPaths,
          normalizedSha256: source.normalizedSha256,
          metadata: { format: extension },
        });
      }

      if (source.normalizedPaths.length > 0) source.status = "normalized";
    } catch (error) {
      source.status = "error";
      source.error = error instanceof Error ? error.message : String(error);
    }
  }

  return registry;
}
