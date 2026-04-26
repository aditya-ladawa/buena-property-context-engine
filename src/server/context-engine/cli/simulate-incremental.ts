import { rm } from "node:fs/promises";
import { CONTEXTS_ROOT, WORKDIR_ROOT } from "../config";
import { runIngest } from "./ingest";

const days = ["day-01", "day-02", "day-03", "day-04", "day-05", "day-06", "day-07", "day-08", "day-09", "day-10"];

async function main() {
  await rm(WORKDIR_ROOT, { recursive: true, force: true });
  await rm(CONTEXTS_ROOT, { recursive: true, force: true });

  const results = [];
  results.push({ step: "base-rebuild", incrementalThroughDay: null, ...(await runIngest()) });

  for (const day of days) {
    results.push({ step: `incremental-${day}`, incrementalThroughDay: day, ...(await runIngest({ incrementalThroughDay: day })) });
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
