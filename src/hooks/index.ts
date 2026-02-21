// src/hooks/index.ts
import { registerTool, ToolContext } from "../hooks/host-api" // adapt to Roo-Code host API
import { preHookInterceptor } from "./preHook"
import { selectActiveIntentTool } from "./selectActiveIntent"
import { applyPatchTool } from "./tools/applyPatch"
import { recordIntentTraceTool } from "./tools/recordIntentTrace"

// Register hooks and tools. Adapt registration to Roo-Code extension APIs.
export function registerHooks() {
	// Register the select_active_intent tool
	registerTool({
		name: "select_active_intent",
		description: "Select an active intent by id and return intent_context XML block",
		handler: selectActiveIntentTool,
	})

	// Register the apply_patch tool
	registerTool({
		name: "apply_patch",
		description: "Apply a set of file edits to the workspace (JSON edits array).",
		handler: applyPatchTool,
	})

	// Register the record_intent_trace tool
	registerTool({
		name: "record_intent_trace",
		description: "Record an intent trace entry to .orchestration/intents_traces/",
		handler: recordIntentTraceTool,
	})

	// Register a global pre-hook interceptor for outgoing LLM prompts
	// The host should call preHookInterceptor before sending prompts to the LLM.
	ToolContext.onPreToolUse(preHookInterceptor)
}
