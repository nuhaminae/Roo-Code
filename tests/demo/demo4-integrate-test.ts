// scripts/demo4-integrate-test.ts
import { registerHooks } from "../../src/hooks"
import { callTool } from "../../src/hooks/host-api"

async function run() {
	const ctx = { workspaceRoot: process.cwd() }
	registerHooks()

	console.log("Listing staged changes...")
	const listRes = await callTool("list_staged_changes", {}, ctx)
	console.log("list_staged_changes result:", listRes)

	if (listRes.value?.length) {
		const stagedFile = listRes.value[0]
		console.log("Diffing first staged file:", stagedFile)
		const diffRes = await callTool("diff_staged_change", { stagedFile }, ctx)
		console.log("diff_staged_change result:", diffRes)
	} else {
		console.log("No staged changes found.")
	}
}

run().catch((err) => console.error(err))
