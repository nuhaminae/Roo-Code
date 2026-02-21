// scripts/demo3-trace-test.ts
import { registerHooks } from "../src/hooks"
import { callTool } from "../src/hooks/host-api"

async function run() {
	const ctx = { workspaceRoot: process.cwd() }
	registerHooks()

	console.log("Selecting intent INT-003...")
	await callTool("select_active_intent", { intent_id: "INT-003" }, ctx)

	// Simulated edits from LLM
	const edits = [
		{ path: "src/bar.ts", content: "// new bar function\nexport function bar() { return 99 }\n" },
		{ path: "tests/bar.test.ts", content: "test('bar', ()=>{ expect(bar()).toBe(99) })\n" },
	]

	console.log("Staging edits...")
	const stageRes = await callTool("stage_patch", { patch: edits }, ctx)
	console.log("stage_patch result:", stageRes)

	console.log("Approving staged edits...")
	const approveRes = await callTool(
		"approve_patch",
		{ stagedFiles: stageRes.value?.stagedFiles, intent_id: "INT-003" },
		ctx,
	)

	console.log("approve_patch result:", approveRes)

	console.log("Recording trace...")
	const traceRes = await callTool(
		"record_intent_trace",
		{
			intent_id: "INT-003",
			action: "approve_patch",
			details: approveRes,
		},
		ctx,
	)
	console.log("trace result:", traceRes)
}

run().catch((e) => console.error(e))
