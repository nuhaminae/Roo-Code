// File: scripts/demo-intent-test.ts
import { callTool, runPrePromptHooks, listRegisteredTools } from "../../src/hooks/host-api"
import { registerHooks } from "../../src/hooks" // ensure path is correct
import * as path from "path"

const payload: any = {
	prompt: "Please modify the code to improve performance.",
	messages: [{ role: "user", content: "Refactor foo()" }],
	toolResults: {}, // ensure shape exists for attaching tool outputs
}
const ctx = { workspaceRoot: process.cwd() }

async function run() {
	// Register hooks/tools in this Node process so the demo is self-contained
	registerHooks()
	console.log("registerHooks function called")
	console.log("Registered tools:", listRegisteredTools())

	try {
		console.log("Running pre-prompt hooks (expect block if no intent selected)...")
		const processed = await runPrePromptHooks(payload, ctx)
		console.log("Processed payload:", processed)
	} catch (err) {
		console.error("Pre-hook blocked as expected:", err)
	}

	console.log("Calling select_active_intent('INT-001')...")
	const res = await callTool("select_active_intent", { intent_id: "INT-001" }, ctx)
	console.log("select_active_intent raw result:", res)

	// Normalize and attach the tool result into payload.toolResults so preHookInterceptor can see it.
	// The registry wrapper returns { success: true, value: <toolReturn> }.
	// The toolReturn itself may be { success: true, value: '<intent_context>...' } or directly the xml string.
	const toolReturn = res?.value ?? null

	let canonicalToolResult: any
	if (!toolReturn) {
		canonicalToolResult = { success: false, error: "tool returned no value" }
	} else if (typeof toolReturn === "string") {
		// Tool returned xml string directly
		canonicalToolResult = { success: true, value: toolReturn }
	} else if (toolReturn && toolReturn.success === true && typeof toolReturn.value === "string") {
		// Nested success wrapper: { success: true, value: { success: true, value: '<xml>' } }
		canonicalToolResult = { success: true, value: toolReturn.value }
	} else if (toolReturn && toolReturn.success === true && typeof toolReturn.value !== "string") {
		// Tool returned structured value under value
		canonicalToolResult = { success: true, value: toolReturn.value }
	} else if (toolReturn && toolReturn.success === false) {
		canonicalToolResult = { success: false, error: toolReturn.error ?? "tool reported failure" }
	} else {
		// Fallback: attach whatever the tool returned
		canonicalToolResult = toolReturn
	}

	// Ensure payload.toolResults exists and attach
	payload.toolResults = payload.toolResults || {}
	payload.toolResults.select_active_intent = canonicalToolResult

	console.log(
		"select_active_intent canonical tool result attached to payload.toolResults:",
		payload.toolResults.select_active_intent,
	)

	console.log("Running pre-prompt hooks again (should inject intent_context)...")
	try {
		const processed2 = await runPrePromptHooks(payload, ctx)
		console.log("Processed payload after selecting intent:", processed2)
	} catch (err) {
		console.error("Pre-hook still blocked (unexpected if tool succeeded):", err)
	}
}

run().catch((e) => console.error(e))
