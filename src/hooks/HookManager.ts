// src/hooks/HookManager.ts
// Purpose: Central manager to orchestrate pre-hooks, post-hooks, and runtime hooks

import { traceabilityHook, applyTraceability } from "./traceabilityHook"
import { validateIntent } from "./validationHook"
import { debugHook } from "./debugHook"

interface IntentSpec {
	id: string
	file: string
	description: string
	constraints: string[]
}

interface DebugContext {
	intentId: string
	functionName: string
	errorMessage?: string
	stackTrace?: string
}

export class HookManager {
	private intent: IntentSpec

	constructor(intent: IntentSpec) {
		this.intent = intent
	}

	// Run pre-hooks before code execution
	runPreHooks(): boolean {
		console.log("Running Pre-Hooks...")
		const isValid = validateIntent(this.intent)
		if (!isValid) {
			console.error("Pre-Hook failed: Intent validation error.")
			return false
		}
		console.log("Pre-Hooks completed successfully.")
		return true
	}

	// Run post-hooks after code generation
	runPostHooks(filePath: string): void {
		console.log("Running Post-Hooks...")
		applyTraceability(filePath, this.intent)
		console.log("Post-Hooks completed successfully.")
	}

	// Run runtime hooks during execution
	runRuntimeHooks(context: DebugContext): void {
		console.log("Running Runtime Hooks...")
		debugHook(context)
		console.log("Runtime Hooks completed.")
	}
}
