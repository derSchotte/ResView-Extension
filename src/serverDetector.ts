import * as http from "http";
import * as https from "https";

export interface DetectedServer {
  url: string;
  port: number;
  framework?: string;
  confidence: "high" | "medium" | "low";
}

// Common dev-server ports mapped to their likely framework
const CANDIDATE_PORTS: Array<{ port: number; framework: string }> = [
  { port: 3000, framework: "Next.js / React / Create React App" },
  { port: 3001, framework: "React (alt port)" },
  { port: 4000, framework: "Gatsby / Express" },
  { port: 4200, framework: "Angular" },
  { port: 5000, framework: "Flask / Express" },
  { port: 5173, framework: "Vite (React / Vue / Svelte)" },
  { port: 5174, framework: "Vite (alt port)" },
  { port: 8000, framework: "Django / generic" },
  { port: 8080, framework: "Webpack Dev Server / generic" },
  { port: 8888, framework: "generic" },
  { port: 4321, framework: "Astro" },
  { port: 3030, framework: "Nuxt 3" },
  { port: 24678, framework: "Nuxt HMR" },
];

// Framework fingerprints inside the HTML body
const FRAMEWORK_HINTS: Array<{ pattern: RegExp; framework: string }> = [
  { pattern: /__NEXT_DATA__/, framework: "Next.js" },
  { pattern: /id="__next"/, framework: "Next.js" },
  { pattern: /react/, framework: "React" },
  { pattern: /nuxt/, framework: "Nuxt" },
  { pattern: /data-v-/, framework: "Vue" },
  { pattern: /<div id="app">/, framework: "Vue / generic SPA" },
  { pattern: /svelte/, framework: "Svelte / SvelteKit" },
  { pattern: /astro/, framework: "Astro" },
  { pattern: /ng-version/, framework: "Angular" },
];

function fetchUrl(url: string, timeoutMs = 1500): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        body += chunk;
        if (body.length > 8192) {
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
  for (const hint of FRAMEWORK_HINTS) {
    if (hint.pattern.test(html)) return hint.framework;
  }
  return (
    CANDIDATE_PORTS.find((c) => c.port === port)?.framework ?? "Unknown"
  );
}

async function probePort(
  port: number
): Promise<DetectedServer | null> {
  const url = `http://localhost:${port}`;
  try {
    const body = await fetchUrl(url);
    const framework = detectFramework(body, port);
    return {
      url,
      port,
      framework,
      confidence: FRAMEWORK_HINTS.some((h) => h.pattern.test(body))
        ? "high"
        : "medium",
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
