// src/hooks/tools/approvePatch.ts
import fs from "fs"
import path from "path"

/**
 * approvePatch tool
 * Input: { stagedFiles: string[], intent_id: string }
 * - Copies staged files into their real workspace paths.
 * - Returns: { success: boolean, applied: string[], error?: string }
 */
export async function approvePatchTool(args: any, ctx: any) {
	const workspaceRoot = ctx?.workspaceRoot || process.cwd()
	const stagedFiles: string[] = args?.stagedFiles || []
	const intentId = args?.intent_id || "unknown"

	if (!stagedFiles.length) return { success: false, error: "No staged files provided" }

	const applied: string[] = []
	try {
		for (const staged of stagedFiles) {
			const filename = path.basename(staged).replace(/_/g, path.sep)
			const target = path.join(workspaceRoot, filename)
			const dir = path.dirname(target)
			if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
			const content = fs.readFileSync(staged, "utf8")
			fs.writeFileSync(target, content, "utf8")
			applied.push(target)
		}
		return { success: true, applied, intentId }
	} catch (err: any) {
		return { success: false, error: String(err?.message ?? err) }
	}
}
