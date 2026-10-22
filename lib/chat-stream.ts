export type ChatEvent =
  | { type: "status"; message: string }
  | { type: "delta"; text: string }
  | { type: "fallback"; content: string }
  | { type: "done"; sources: string[]; suggestions: string[] }
  | { type: "error"; message: string };

/** Handles UTF-8 and SSE records split across arbitrary network chunks. */
export async function readChatStream(response: Response, receive: (event: ChatEvent) => void) {
  if (!response.body) throw new Error("Missing response stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", doneEvent = false;
  const dispatch = (record: string) => {
    const data = record.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
    if (!data) return;
    const event = JSON.parse(data) as ChatEvent;
    if (event.type === "done") doneEvent = true;
    receive(event);
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let match: RegExpExecArray | null;
      while ((match = /\r?\n\r?\n/.exec(buffer))) {
        dispatch(buffer.slice(0, match.index)); buffer = buffer.slice(match.index+match[0].length);
      }
      if (done) break;
    }
    if (buffer.trim()) dispatch(buffer);
    if (!doneEvent) throw new Error("Response stream ended early");
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
