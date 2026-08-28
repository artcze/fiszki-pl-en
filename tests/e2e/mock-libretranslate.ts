import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const host = "127.0.0.1";
const port = 54330;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let rawBody = "";

    request.setEncoding("utf8");

    request.on("data", (chunk: string) => {
      rawBody += chunk;
    });

    request.on("end", () => {
      resolve(rawBody);
    });

    request.on("error", reject);
  });
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "POST" && request.url === "/translate") {
    const rawBody = await readBody(request);

    let body: unknown;

    try {
      body = JSON.parse(rawBody) as unknown;
    } catch {
      sendJson(response, 400, { error: "invalid json" });
      return;
    }

    if (
      !isRecord(body) ||
      body.q !== "zamek" ||
      body.source !== "pl" ||
      body.target !== "en" ||
      body.format !== "text"
    ) {
      sendJson(response, 422, { error: "unexpected translation request" });
      return;
    }

    sendJson(response, 200, {
      translatedText: "castle",
      alternatives: ["lock", "CASTLE"],
    });
    return;
  }

  sendJson(response, 404, { error: "not found" });
}

const server = createServer((request, response) => {
  void handleRequest(request, response).catch(() => {
    sendJson(response, 500, { error: "internal mock server error" });
  });
});

server.listen(port, host);
