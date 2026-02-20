// src/hooks/preHook.ts
import fs from "fs"
import path from "path"
import yaml from "js-yaml"

/**
 * preHookInterceptor
 * - Called before sending a prompt to the LLM.
 * - Ensures the agent has selected an active intent by checking the prompt payload
 *   for a declared intent_id or for a prior call to select_active_intent.
 * - If an intent_id is present, loads .orchestration/active_intents.yaml and injects
 *   an <intent_context> XML block into the prompt payload under `tool_results.intent_context`.
 *
 * Host integration note:
 * - Roo-Code has a prompt builder and tool execution pipeline. Wire this function
 *   into the host's pre-prompt hook (where outgoing LLM payloads can be mutated).
 */
export async function preHookInterceptor(payload: any, ctx: any) {
	// payload: { prompt: string, toolsCalled: [...], toolResults: {...}, metadata: {...} }
	const workspaceRoot = ctx?.workspaceRoot || process.cwd()

	// 1) Check if the agent already called select_active_intent and we have a cached result
	if (
		payload.toolResults &&
		payload.toolResults.select_active_intent &&
		payload.toolResults.select_active_intent.success
	) {
		// Already selected; ensure intent_context is present
		payload.intent_context = payload.toolResults.select_active_intent.value
		return payload
	}

	// 2) Try to find an explicit intent_id in the payload metadata or prompt
	const explicitIntentId = payload.metadata?.intent_id || extractIntentIdFromPrompt(payload.prompt)
	if (!explicitIntentId) {
		// Block execution: agent must call select_active_intent first
		throw new PreHookError(
			"You must call select_active_intent(intent_id) before attempting to write code. Gatekeeper blocked execution.",
		)
	}

	// 3) Load active_intents.yaml and find the intent
	const intentsFile = path.join(workspaceRoot, ".orchestration", "active_intents.yaml")
	if (!fs.existsSync(intentsFile)) {
		throw new PreHookError(
			".orchestration/active_intents.yaml not found. Create an active_intents.yaml with at least one intent.",
		)
	}
	const raw = fs.readFileSync(intentsFile, "utf8")
	const doc = yaml.load(raw) as any
	const intents = doc?.active_intents ?? []
	const found = intents.find((i: any) => i.id === explicitIntentId)
	if (!found) {
		throw new PreHookError(`You must cite a valid active Intent ID. ${explicitIntentId} not found.`)
	}

	// 4) Build XML intent_context and inject into payload
	const xml = buildIntentContextXml(found)
	payload.intent_context = xml

	// 5) Optionally: modify the system prompt to include the intent_context block
	if (!payload.systemPrompt) payload.systemPrompt = ""
	payload.systemPrompt += `\n\n<intent_context>${xml}</intent_context>`

	return payload
}

function extractIntentIdFromPrompt(prompt: string): string | null {
	// Very small heuristic: look for "INT-" style tokens in the prompt metadata
	const m = prompt?.match(/(INT-[0-9A-Za-z_-]+)/)
	// return m ? m[1] : null;
	return m ? (m[1] ?? null) : null
}

function buildIntentContextXml(intent: any) {
	const constraints = (intent.constraints || [])
		.map((c: string) => `<constraint>${escapeXml(c)}</constraint>`)
		.join("")
	const scope = (intent.owned_scope || []).map((s: string) => `<scope>${escapeXml(s)}</scope>`).join("")
	return `<intent_context>
  <id>${escapeXml(intent.id)}</id>
  <name>${escapeXml(intent.name || "")}</name>
  <status>${escapeXml(intent.status || "")}</status>
  <constraints>${constraints}</constraints>
  <owned_scope>${scope}</owned_scope>
</intent_context>`
}

function escapeXml(s: string) {
	return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

class PreHookError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "PreHookError"
	}
}

export { PreHookError }
