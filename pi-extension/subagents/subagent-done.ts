/**
 * Extension loaded into sub-agents.
 * - Provides `subagent_done_with_summary` for structured handoff to the orchestrator
 * - Keeps legacy `subagent_done` for backward compatibility
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
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

  pi.registerTool({
    name: "subagent_done",
    label: "Subagent Done",
    description:
      "Legacy completion tool. Call this when done to close the subagent session. " +
      "Prefer subagent_done_with_summary for structured handoff.",
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      ctx.shutdown();
      return {
        content: [{ type: "text", text: "Shutting down subagent session." }],
        details: {},
      };
    },
  });
}
