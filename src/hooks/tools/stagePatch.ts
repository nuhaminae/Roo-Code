// src/hooks/tools/stagePatch.ts
import fs from "fs"
import path from "path"

/**
 * stagePatch tool
 * Input: { patch: string | Array<{path:string, content:string}>, description?: string }
 * - Saves edits under .orchestration/staged_changes/ instead of applying directly.
 * - Returns: { success: boolean, stagedFiles: string[], error?: string }
 */
export async function stagePatchTool(args: any, ctx: any) {
	const workspaceRoot = ctx?.workspaceRoot || process.cwd()
	const patch = args?.patch
	const description = args?.description || ""

	if (!patch) return { success: false, error: "stage_patch requires a patch" }

	let edits: Array<{ path: string; content: string }> = []
	if (typeof patch === "string") {
		try {
			const parsed = JSON.parse(patch)
			if (Array.isArray(parsed)) edits = parsed
		} catch {
			return { success: false, error: "Unsupported patch format" }
		}
	} else if (Array.isArray(patch)) {
		edits = patch
	}

	const stagedDir = path.join(workspaceRoot, ".orchestration", "staged_changes")
	if (!fs.existsSync(stagedDir)) fs.mkdirSync(stagedDir, { recursive: true })

	const stagedFiles: string[] = []
	try {
		for (const e of edits) {
			const target = path.join(stagedDir, e.path.replace(/[\\/]/g, "_"))
			fs.writeFileSync(target, e.content, "utf8")
			stagedFiles.push(target)
		}
		return { success: true, stagedFiles, description }
	} catch (err: any) {
		return { success: false, error: String(err?.message ?? err) }
	}
}
