// src/hooks/tools/diffStagedChange.ts
import fs from "fs"
import path from "path"

export async function diffStagedChangeTool(args: any, ctx: any) {
	const workspaceRoot = ctx?.workspaceRoot || process.cwd()
	const stagedFile = args?.stagedFile
	if (!stagedFile) return { success: false, error: "diff_staged_change requires stagedFile" }

	const filename = path.basename(stagedFile).replace(/_/g, path.sep)
	const targetPath = path.join(workspaceRoot, filename)

	const stagedContent = fs.existsSync(stagedFile) ? fs.readFileSync(stagedFile, "utf8") : ""
	const currentContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : ""

	// Simple line-by-line diff (replace with a real diff lib if desired)
	const diff = {
		added: stagedContent.split("\n").filter((line) => !currentContent.includes(line)),
		removed: currentContent.split("\n").filter((line) => !stagedContent.includes(line)),
	}

	return { success: true, diff, stagedFile, targetPath }
}
