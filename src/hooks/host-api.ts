// src/hooks/host-api.ts
import type { CancellationToken } from "vscode"

/**
 * Minimal host-api shim for local development.
 * Replace with Roo-Code's real host API when available.
 */

/** Tool handler signature */
export type ToolHandler = (args: any, ctx?: any) => Promise<any> | any

/** Tool registration shape */
export type ToolRegistration = {
	name: string
	description?: string
	handler: ToolHandler
}

/** Tool result shape */
export type ToolResult = {
	success: boolean
	value?: any
	error?: string
}

/** Simple in-memory registry */
const toolRegistry = new Map<string, ToolRegistration>()

/** Register a tool */
export function registerTool(reg: ToolRegistration) {
	if (!reg || !reg.name || typeof reg.handler !== "function") {
		throw new Error("Invalid tool registration")
	}
	toolRegistry.set(reg.name, reg)
}

/** Call a registered tool by name */
export async function callTool(name: string, args?: any, ctx?: any): Promise<ToolResult> {
	const reg = toolRegistry.get(name)
	if (!reg) return { success: false, error: `Tool ${name} not found` }
	try {
		const value = await Promise.resolve(reg.handler(args || {}, ctx))
		return { success: true, value }
	} catch (err: any) {
		return { success: false, error: String(err?.message ?? err) }
	}
}

/**
 * Pre-prompt hook registration
 * The host should call all registered prePrompt hooks before sending prompts to the LLM.
 */
type PrePromptHook = (payload: any, ctx?: any) => Promise<any> | any
const prePromptHooks: PrePromptHook[] = []

export function registerPrePromptHook(hook: PrePromptHook) {
	if (typeof hook !== "function") throw new Error("hook must be a function")
	prePromptHooks.push(hook)
}

/** Utility: run all pre-prompt hooks in sequence */
export async function runPrePromptHooks(payload: any, ctx?: any) {
	let p = payload
	for (const hook of prePromptHooks) {
		p = await Promise.resolve(hook(p, ctx))
	}
	return p
}

/** Expose registry for debugging */
export function listRegisteredTools() {
	return Array.from(toolRegistry.keys())
}

/** Minimal ToolContext placeholder (expand as needed) */
export const ToolContext = {
	onPreToolUse: registerPrePromptHook,
}

export default {
	registerTool,
	callTool,
	registerPrePromptHook,
	runPrePromptHooks,
	listRegisteredTools,
	ToolContext,
}
