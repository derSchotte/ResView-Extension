import * as http from "http";
import * as https from "https";
import type { DetectedServer } from "./types";

export type { DetectedServer };

const CANDIDATE_PORTS: ReadonlyArray<{ port: number; framework: string }> = [
  { port: 3000,  framework: "Next.js / React / Create React App" },
  { port: 3001,  framework: "React (alt port)" },
  { port: 3030,  framework: "Nuxt 3" },
  { port: 4000,  framework: "Gatsby / Express" },
  { port: 4200,  framework: "Angular" },
  { port: 4321,  framework: "Astro" },
  { port: 5000,  framework: "Flask / Express" },
  { port: 5173,  framework: "Vite (React / Vue / Svelte)" },
  { port: 5174,  framework: "Vite (alt port)" },
  { port: 5500,  framework: "Live Server (VS Code)" },
  { port: 8000,  framework: "Django / generic" },
  { port: 8080,  framework: "Webpack Dev Server / generic" },
  { port: 8888,  framework: "generic" },
  { port: 24678, framework: "Nuxt HMR" },
];

const FRAMEWORK_PATTERNS: ReadonlyArray<{ pattern: RegExp; framework: string }> = [
  { pattern: /__NEXT_DATA__/,     framework: "Next.js" },
  { pattern: /id="__next"/,       framework: "Next.js" },
  { pattern: /react/,             framework: "React" },
  { pattern: /nuxt/,              framework: "Nuxt" },
  { pattern: /data-v-/,           framework: "Vue" },
  { pattern: /<div id="app">/,    framework: "Vue / generic SPA" },
  { pattern: /svelte/,            framework: "Svelte / SvelteKit" },
  { pattern: /astro/,             framework: "Astro" },
  { pattern: /ng-version/,        framework: "Angular" },
];

const FETCH_TIMEOUT_MS = 1500;
const MAX_BODY_BYTES = 8192;

function fetchHtml(targetUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = targetUrl.startsWith("https") ? https : http;
    const req = lib.get(targetUrl, { timeout: FETCH_TIMEOUT_MS }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        body += chunk;
        if (body.length > MAX_BODY_BYTES) {
          req.destroy();
          resolve(body);
        }
      });
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function detectFramework(html: string, port: number): string {
  for (const { pattern, framework } of FRAMEWORK_PATTERNS) {
    if (pattern.test(html)) return framework;
  }
  return CANDIDATE_PORTS.find((c) => c.port === port)?.framework ?? "Unknown";
}

async function probePort(port: number): Promise<DetectedServer | null> {
  const targetUrl = `http://localhost:${port}`;
  try {
    const body = await fetchHtml(targetUrl);
    const isHighConfidence = FRAMEWORK_PATTERNS.some(({ pattern }) => pattern.test(body));
    return {
      url: targetUrl,
      port,
      framework: detectFramework(body, port),
      confidence: isHighConfidence ? "high" : "medium",
    };
  } catch {
    return null;
  }
}

export async function detectRunningServers(): Promise<DetectedServer[]> {
  const results = await Promise.all(
    CANDIDATE_PORTS.map(({ port }) => probePort(port))
  );
  return results.filter((r): r is DetectedServer => r !== null);
}
