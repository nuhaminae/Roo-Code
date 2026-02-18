// src/hooks/validationHook.ts
// Purpose: Validate intent IDs and constraints before code execution

import * as fs from "fs"

interface IntentSpec {
	id: string
	file: string
	constraints: string[]
}

export function validateIntent(intent: IntentSpec): boolean {
	// Check that intent ID exists
	if (!intent.id || intent.id.trim() === "") {
		console.error("Validation failed: Missing intent ID.")
		return false
	}

	// Check that referenced spec file exists
	if (!fs.existsSync(intent.file)) {
		console.error(`Validation failed: Spec file not found at ${intent.file}`)
		return false
	}

	// Check constraints (simple example: ensure non-empty)
	for (const constraint of intent.constraints) {
		if (!constraint || constraint.trim() === "") {
			console.error("Validation failed: Empty constraint detected.")
			return false
		}
	}

	console.log(`Validation passed for IntentID: ${intent.id}`)
	return true
}
