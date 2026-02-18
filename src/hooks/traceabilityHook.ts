// src/hooks/traceabilityHook.ts
// Purpose: Enforce intent-code traceability by embedding metadata into code

import * as fs from "fs"
import * as path from "path"

interface IntentSpec {
	id: string
	file: string
	description: string
}

export function traceabilityHook(code: string, intent: IntentSpec): string {
	// Add metadata comments linking code to intent specification
	const metadata = `
  // IntentID: ${intent.id}
  // SpecRef: ${intent.file}
  // Description: ${intent.description}
  `

	return `${metadata}\n${code}`
}

// Example usage: inject traceability before saving code
export function applyTraceability(filePath: string, intent: IntentSpec) {
	const code = fs.readFileSync(filePath, "utf-8")
	const tracedCode = traceabilityHook(code, intent)

	fs.writeFileSync(filePath, tracedCode, "utf-8")
	console.log(`Traceability metadata applied to ${path.basename(filePath)}`)
}
