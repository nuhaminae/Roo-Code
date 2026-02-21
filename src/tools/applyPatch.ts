// src/hooks/tools/applyPatch.ts
import fs from "fs"
import path from "path"

/**
 * applyPatch tool
 * Input: { patch: string, description?: string }
 * - patch: unified diff or a simple JSON array of { path, content } edits.
 * - Returns: { success: boolean, applied: string[], error?: string }
 *
 * NOTE: This is intentionally minimal and conservative. It writes files directly.
 * In production you should add backups, dry-run, validation, and git integration.
 */
export async function applyPatchTool(args: any, ctx: any) {
	const workspaceRoot = ctx?.workspaceRoot || process.cwd()
	const patch = args?.patch
	const description = args?.description || ""

	if (!patch) {
		return { success: false, error: "apply_patch requires a patch string or edits array" }
	}

	// If patch is a string that looks like JSON array of edits, try parse
	let edits: Array<{ path: string; content: string }> = []

	if (typeof patch === "string") {
		// Try to detect a simple JSON array
		try {
			const parsed = JSON.parse(patch)
			if (Array.isArray(parsed)) edits = parsed
		} catch {
			// Not JSON — treat as unified diff not supported by this minimal tool
			return {
				success: false,
				error: "String patch format not supported by this tool. Provide JSON edits array.",
			}
		}
	} else if (Array.isArray(patch)) {
		edits = patch
	} else {
		return { success: false, error: "Unsupported patch format" }
	}

	const applied: string[] = []
	try {
		for (const e of edits) {
			const target = path.join(workspaceRoot, e.path)
			const dir = path.dirname(target)
			if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
			fs.writeFileSync(target, e.content, "utf8")
			applied.push(e.path)
		}
		return { success: true, applied, description }
	} catch (err: any) {
		return { success: false, error: String(err?.message ?? err) }
	}
}
