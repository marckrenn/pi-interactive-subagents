/**
 * Extension loaded into sub-agents.
 * - Provides `subagent_done_with_summary` for structured handoff to the orchestrator
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  const DONE_TOOL = "subagent_done_with_summary";
  const LEGACY_DONE_TOOL = "subagent_done";
  const reminder =
    "🚨 Mandatory: Finish by calling subagent_done_with_summary({ summary: \"<concise outcome>\" }).";
  let completionSeen = false;

  const isDoneTool = (name: string | undefined) => name === DONE_TOOL || name === LEGACY_DONE_TOOL;

  // Enforce that once completion is called, no further tools can run.
  pi.on("tool_call", async (event) => {
    if (completionSeen) {
      return {
        block: true,
        reason: "subagent_done_with_summary must be the final tool call.",
      };
    }

    if (isDoneTool(event.toolName)) {
      completionSeen = true;
    }
  });

  // Track completion from tool results as well.
  pi.on("tool_result", async (event) => {
    if (isDoneTool(event.toolName)) {
      completionSeen = true;
    }
  });

  // If a run ends without completion, immediately post a reminder as a new user turn.
  // This avoids relying on prompt compliance and doesn't interrupt in-flight tool chains.
  pi.on("agent_end", async (event) => {
    if (completionSeen) return;

    const doneSeenInMessages = event.messages.some((msg: any) => {
      if (msg?.role === "toolResult") return isDoneTool(msg.toolName);
      if (msg?.role !== "assistant") return false;
      return Array.isArray(msg.content)
        && msg.content.some((b: any) => b?.type === "toolCall" && isDoneTool(b?.name));
    });

    if (doneSeenInMessages) {
      completionSeen = true;
      return;
    }

    try {
      pi.sendUserMessage(reminder);
    } catch {
      // Non-fatal: initial task file also contains the same completion instruction.
    }
  });

  pi.registerTool({
    name: "subagent_done_with_summary",
    label: "Subagent Done (Summary)",
    description:
      "Call this tool when you have completed your task. " +
      "Pass a concise summary in the `summary` field. " +
      "This closes the subagent session and returns a structured summary to the caller.",
    parameters: Type.Object({
      summary: Type.String({ description: "Concise completion summary for the orchestrator" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      ctx.shutdown();
      return {
        content: [{ type: "text", text: "Shutting down subagent session." }],
        details: { summary: params.summary },
      };
    },
  });
}
