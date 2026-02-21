// scripts/demo-middle-test.ts
import { registerHooks } from "../src/hooks"
import { callTool, runPrePromptHooks } from "../src/hooks/host-api"
import { sendToModel } from "../src/services/llmWrapper"

async function run() {
	const ctx = { workspaceRoot: process.cwd() }
	registerHooks()

	// 1) Select intent
	console.log("Selecting intent INT-001...")
	const sel = await callTool("select_active_intent", { intent_id: "INT-001" }, ctx)
	console.log("select result:", sel)

	// 2) Build payload and call LLM (dummy client returns a suggested edit)
	const payload: any = {
		prompt: "Refactor foo() to be pure and add unit tests. INT-001",
		messages: [{ role: "user", content: "Refactor foo()" }],
		toolResults: { select_active_intent: sel?.value ? { success: true, value: sel.value } : undefined },
	}

	const dummyClient = {
		createCompletion: async (p: any) => {
			// Simulate an LLM response that suggests a JSON edits array
			const edits = [
				{ path: "src/foo.ts", content: "// refactored foo\nexport function foo() { return 42 }\n" },
				{ path: "tests/foo.test.ts", content: "test('foo', ()=>{ expect(true).toBe(true) })\n" },
			]
			return { ok: true, editsJson: JSON.stringify(edits), raw: "Suggested edits" }
		},
	}

	// sendToModel will run pre-prompt hooks and return the client response
	const resp = await sendToModel(dummyClient, payload, { workspaceRoot: ctx.workspaceRoot })
	console.log("LLM response:", resp)

	// 3) Normalize LLM response into edits and call apply_patch
	const editsJson = resp?.editsJson ?? resp?.result?.editsJson
	if (!editsJson) {
		console.log("No edits suggested by LLM.")
		return
	}
	const edits = JSON.parse(editsJson)

	// Call apply_patch tool
	const applyRes = await callTool("apply_patch", { patch: edits }, ctx)
	console.log("apply_patch result:", applyRes)

	// Record a trace entry (tool may already be called by wrapper; this is explicit)
	const traceRes = await callTool(
		"record_intent_trace",
		{
			intent_id: "INT-001",
			action: "apply_patch",
			details: { applied: applyRes?.value ?? applyRes },
		},
		ctx,
	)
	console.log("trace result:", traceRes)
}

run().catch((e) => {
	console.error(e)
	process.exit(1)
})
