import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const bundledWorker = resolve("dist", "worker.js");
const openNextWorker = resolve(".open-next", "worker.js");

if (!existsSync(bundledWorker)) {
  throw new Error(
    "Cloudflare did not produce dist/worker.js. The hosting build cannot be finalized.",
  );
}

const workerSource = readFileSync(bundledWorker, "utf8");

if (!workerSource.includes("require_node_crypto()")) {
  throw new Error(
    "The Cloudflare worker does not appear to contain the bundled Node compatibility shims.",
  );
}

copyFileSync(bundledWorker, openNextWorker);
console.log("Finalized the OpenNext worker with Cloudflare compatibility shims.");
