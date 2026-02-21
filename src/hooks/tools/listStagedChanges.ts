// src/hooks/tools/listStagedChanges.ts
import fs from "fs"
import path from "path"

export async function listStagedChangesTool(args: any, ctx: any) {
	const workspaceRoot = ctx?.workspaceRoot || process.cwd()
	const stagedDir = path.join(workspaceRoot, ".orchestration", "staged_changes")
	if (!fs.existsSync(stagedDir)) {
		return { success: true, staged: [] }
	}

	const files = fs.readdirSync(stagedDir)
	return { success: true, staged: files.map((f) => path.join(stagedDir, f)) }
}
