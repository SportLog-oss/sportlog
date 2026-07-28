import fs from "node:fs";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), "data", "cache");
const files = {
  "daily-metrics": "daily-metrics.json",
  "analytics-summary": "analytics-summary.json",
  "training-trends": "training-trends.json",
  "injury-risk": "injury-risk.json",
  "anomalies": "anomalies.json",
  "activities": "activities.json",
  "performance-estimates": "performance-estimates.json",
  "curves": "curves.json",
};

const entries = {};
for (const [key, filename] of Object.entries(files)) {
  entries[key] = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, filename), "utf-8"));
}

const res = await fetch("https://sportlog-three.vercel.app/api/sync", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-sync-secret": process.env.SYNC_SECRET,
  },
  body: JSON.stringify({ entries }),
});

console.log(res.status, await res.text());
