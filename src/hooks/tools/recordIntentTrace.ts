// src/hooks/tools/recordIntentTrace.ts
import fs from "fs"
import path from "path"

/**
 * recordIntentTrace
 * Input: { intent_id: string, action: string, details: any }
 * Appends a JSON trace file under .orchestration/intents_traces/<intent_id>-<timestamp>.json
 */
export async function recordIntentTraceTool(args: any, ctx: any) {
	const workspaceRoot = ctx?.workspaceRoot || process.cwd()
	const intentId = args?.intent_id
	const action = args?.action || "unknown"
	const details = args?.details ?? {}

	if (!intentId) return { success: false, error: "record_intent_trace requires intent_id" }

	const tracesDir = path.join(workspaceRoot, ".orchestration", "intents_traces")
	if (!fs.existsSync(tracesDir)) fs.mkdirSync(tracesDir, { recursive: true })

	const ts = new Date().toISOString().replace(/[:.]/g, "-")
	const filename = `${intentId}-${ts}.json`
	const filepath = path.join(tracesDir, filename)

	const trace = {
		intent_id: intentId,
		action,
		details,
		timestamp: new Date().toISOString(),
	}

	try {
		fs.writeFileSync(filepath, JSON.stringify(trace, null, 2), "utf8")
		return { success: true, path: filepath }
	} catch (err: any) {
		return { success: false, error: String(err?.message ?? err) }
	}
}
