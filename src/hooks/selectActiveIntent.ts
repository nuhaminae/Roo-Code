// src/hooks/selectActiveIntent.ts
import fs from "fs"
import path from "path"
import yaml from "js-yaml"

type ActiveIntent = {
	id: string
	name?: string
	status?: string
	owned_scope?: string[]
	constraints?: string[]
	acceptance_criteria?: string[]
}

function loadActiveIntents(workspaceRoot: string): ActiveIntent[] {
	const file = path.join(workspaceRoot, ".orchestration", "active_intents.yaml")
	if (!fs.existsSync(file)) return []
	const raw = fs.readFileSync(file, "utf8")
	const doc = yaml.load(raw) as any
	return doc?.active_intents ?? []
}

function buildIntentContextXml(intent: ActiveIntent): string {
	// Minimal XML block containing constraints and scope per Phase 1 spec
	const constraints = (intent.constraints || []).map((c) => `<constraint>${escapeXml(c)}</constraint>`).join("")
	const scope = (intent.owned_scope || []).map((s) => `<scope>${escapeXml(s)}</scope>`).join("")
	return `<intent_context>
  <id>${escapeXml(intent.id)}</id>
  <name>${escapeXml(intent.name || "")}</name>
  <status>${escapeXml(intent.status || "")}</status>
  <constraints>${constraints}</constraints>
  <owned_scope>${scope}</owned_scope>
</intent_context>`
}

function escapeXml(s: string) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// Tool handler
export async function selectActiveIntentTool(args: { intent_id?: string }, ctx: any) {
	const workspaceRoot = ctx?.workspaceRoot || process.cwd()
	const intent_id = args?.intent_id
	if (!intent_id) {
		return { success: false, error: "select_active_intent requires intent_id" }
	}
	const intents = loadActiveIntents(workspaceRoot)
	const found = intents.find((i) => i.id === intent_id)
	if (!found) {
		return { success: false, error: `InvalidIntent: ${intent_id} not found in .orchestration/active_intents.yaml` }
	}
	const xml = buildIntentContextXml(found)
	// Return the XML block as the tool result (string)
	return { success: true, value: xml }
}
