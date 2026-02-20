// File: src/services/llmWrapper.ts
let vscode: any
try {
	// Only works inside VS Code extension host
	vscode = require("vscode")
} catch {
	// Fallback shim for Node.js demos
	vscode = {
		window: {
			createOutputChannel: (name: string) => ({
				appendLine: (s: string) => console.log(`[${name}] ${s}`),
			}),
			showErrorMessage: (msg: string) => console.error(msg),
		},
		workspace: {
			workspaceFolders: [{ uri: { fsPath: process.cwd() } }],
		},
	}
}

import { runPrePromptHooks, callTool } from "../hooks/host-api"

export type LlmPayload = { [key: string]: any }

export type SendOptions = {
	outputChannel?: { appendLine: (s: string) => void } | any
	workspaceRoot?: string
	promptKey?: string
	[key: string]: any
}

let cachedOutputChannel: any = null

function getOutputChannel(opts?: SendOptions) {
	const provided = opts?.outputChannel
	if (provided && typeof (provided as any).appendLine === "function") {
		return provided
	}
	if (!cachedOutputChannel) {
		cachedOutputChannel = vscode.window.createOutputChannel("LLM Wrapper")
	}
	return cachedOutputChannel
}

export async function sendToModel(client: any, payload: LlmPayload, opts: SendOptions = {}) {
	const output = getOutputChannel(opts)
	const workspaceRoot = opts.workspaceRoot ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

	if (!client || (typeof client !== "object" && typeof client !== "function")) {
		const msg = "[LLM Wrapper] No model client provided"
		output.appendLine(msg)
		throw new Error(msg)
	}

	let processedPayload: any
	try {
		processedPayload = await runPrePromptHooks(payload, { workspaceRoot })
	} catch (err: any) {
		const message = err instanceof Error ? err.message : String(err)
		output.appendLine(`[LLM Wrapper] Pre-prompt hook blocked model call: ${message}`)
		vscode.window.showErrorMessage(`[Hooks] Pre-prompt check failed: ${message}`)
		throw err
	}

	if (processedPayload == null) processedPayload = payload

	const tryCall = async (methodName: string) => {
		const fn = client[methodName]
		if (typeof fn !== "function") return { ok: false }
		try {
			try {
				return { ok: true, result: await fn.call(client, processedPayload, opts) }
			} catch {
				return { ok: true, result: await fn.call(client, processedPayload) }
			}
		} catch (err) {
			return { ok: false, error: err }
		}
	}

	const methods = ["send", "request", "call", "complete", "createCompletion", "run", "createChatCompletion"]

	for (const m of methods) {
		const res = await tryCall(m)
		if (res.ok) {
			output.appendLine(`[LLM Wrapper] Called client.${m} successfully`)

			// Phase 2: record intent trace
			try {
				const active = processedPayload?.toolResults?.select_active_intent
				const intentId =
					active?.value && typeof active.value === "string"
						? (active.value.match(/(INT-[0-9A-Za-z_-]+)/)?.[1] ?? null)
						: null

				if (intentId) {
					await callTool(
						"record_intent_trace",
						{
							intent_id: intentId,
							action: "llm_call",
							details: {
								payloadSummary: {
									prompt: processedPayload?.prompt?.slice(0, 100),
									messages: processedPayload?.messages?.slice(0, 3),
								},
								modelMethod: m,
							},
						},
						{ workspaceRoot },
					)
				}
			} catch {
				// ignore trace errors
			}

			return res.result
		}
	}

	if (typeof client === "function") {
		const result = await client(processedPayload, opts)
		output.appendLine(`[LLM Wrapper] Called client() function successfully`)
		return result
	}

	for (const m of ["post", "fetch", "invoke"]) {
		const res = await tryCall(m)
		if (res.ok) {
			output.appendLine(`[LLM Wrapper] Called client.${m} successfully`)
			return res.result
		}
	}

	const errMsg = "[LLM Wrapper] Could not find a callable method on the provided model client"
	output.appendLine(errMsg)
	vscode.window.showErrorMessage(errMsg)
	throw new Error(errMsg)
}

export async function preparePayloadForHttp(payload: LlmPayload, workspaceRoot?: string) {
	const hookCtx = { workspaceRoot: workspaceRoot ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath }
	const processed = await runPrePromptHooks(payload, hookCtx)
	return processed == null ? payload : processed
}
