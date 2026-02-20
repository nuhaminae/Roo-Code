// src/hooks/index.ts
import { registerTool, ToolContext, ToolResult } from "../hooks/host-api" // adapt to Roo-Code host API
import { preHookInterceptor } from "./preHook"
import { selectActiveIntentTool } from "./selectActiveIntent"

// Register hooks and tools. Adapt registration to Roo-Code extension APIs.
export function registerHooks() {
	// Register the select_active_intent tool
	registerTool({
		name: "select_active_intent",
		description: "Select an active intent by id and return intent_context XML block",
		handler: selectActiveIntentTool,
	})

	// Register a global pre-hook interceptor for outgoing LLM prompts
	// The host should call preHookInterceptor before sending prompts to the LLM.
	ToolContext.onPreToolUse(preHookInterceptor)
}
