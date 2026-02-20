// File: src/services/llmWrapper.ts
import * as vscode from "vscode"
import { runPrePromptHooks } from "../hooks/host-api" // adjust path if your hooks folder is elsewhere

export type LlmPayload = { [key: string]: any }

export type SendOptions = {
	outputChannel?: { appendLine: (s: string) => void } | vscode.OutputChannel
	workspaceRoot?: string
	promptKey?: string
	[key: string]: any
}

/** Cached OutputChannel instance (created once and reused) */
let cachedOutputChannel: vscode.OutputChannel | null = null

function getOutputChannel(opts?: SendOptions) {
	const provided = opts?.outputChannel
	if (provided && typeof (provided as any).appendLine === "function") {
		return provided as { appendLine: (s: string) => void }
	}

	try {
		if (vscode && typeof vscode.window !== "undefined" && typeof vscode.window.createOutputChannel === "function") {
			if (!cachedOutputChannel) {
				cachedOutputChannel = vscode.window.createOutputChannel("LLM Wrapper")
			}
			return cachedOutputChannel
		}
	} catch {
		// ignore
	}

	return {
		appendLine: (s: string) => {
			console.log(s)
		},
	}
}

export async function sendToModel(client: any, payload: LlmPayload, opts: SendOptions = {}) {
	const output = getOutputChannel(opts)
	const workspaceRoot = opts.workspaceRoot ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

	if (!client || (typeof client !== "object" && typeof client !== "function")) {
		const msg = "[LLM Wrapper] No model client provided"
		try {
			output.appendLine(msg)
		} catch {}
		throw new Error(msg)
	}

	let processedPayload: any
	try {
		const hookCtx = { workspaceRoot }
		processedPayload = await runPrePromptHooks(payload, hookCtx)
	} catch (err: any) {
		const message = err instanceof Error ? err.message : String(err)
		try {
			output.appendLine(`[LLM Wrapper] Pre-prompt hook blocked model call: ${message}`)
			if (
				vscode &&
				typeof vscode.window !== "undefined" &&
				typeof vscode.window.showErrorMessage === "function"
			) {
				vscode.window.showErrorMessage(`[Hooks] Pre-prompt check failed: ${message}`)
			}
		} catch {}
		throw err
	}

	if (processedPayload === undefined || processedPayload === null) {
		processedPayload = payload
	}

	const tryCall = async (methodName: string) => {
		if (!client) return { ok: false }
		const fn = client[methodName]
		if (typeof fn !== "function") return { ok: false }
		try {
			try {
				const result = await fn.call(client, processedPayload, opts)
				return { ok: true, result }
			} catch {
				const result = await fn.call(client, processedPayload)
				return { ok: true, result }
			}
		} catch (err) {
			return { ok: false, error: err }
		}
	}

	const methods = ["send", "request", "call", "complete", "createCompletion", "run", "createChatCompletion"]

	for (const m of methods) {
		const res = await tryCall(m)
		if (res.ok) {
			try {
				output.appendLine(`[LLM Wrapper] Called client.${m} successfully`)
			} catch {}
			return res.result
		}
	}

	if (typeof client === "function") {
		try {
			const result = await client(processedPayload, opts)
			try {
				output.appendLine(`[LLM Wrapper] Called client() function successfully`)
			} catch {}
			return result
		} catch (err) {
			try {
				output.appendLine(`[LLM Wrapper] client() invocation failed: ${String(err)}`)
			} catch {}
			throw err
		}
	}

	for (const m of ["post", "fetch", "invoke"]) {
		const res = await tryCall(m)
		if (res.ok) {
			try {
				output.appendLine(`[LLM Wrapper] Called client.${m} successfully`)
			} catch {}
			return res.result
		}
	}

	const errMsg = "[LLM Wrapper] Could not find a callable method on the provided model client"
	try {
		output.appendLine(errMsg)
		if (vscode && typeof vscode.window !== "undefined" && typeof vscode.window.showErrorMessage === "function") {
			vscode.window.showErrorMessage(errMsg)
		}
	} catch {}
	throw new Error(errMsg)
}

export async function preparePayloadForHttp(payload: LlmPayload, workspaceRoot?: string) {
	const hookCtx = { workspaceRoot: workspaceRoot ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath }
	const processed = await runPrePromptHooks(payload, hookCtx)
	return processed === undefined || processed === null ? payload : processed
}
