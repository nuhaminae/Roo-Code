// src/hooks/selectActiveIntent.ts
import fs from "fs"
import path from "path"
import crypto from "crypto"
import yaml from "js-yaml"

type ActiveIntent = {
	id: string
	name?: string
	status?: string
	owned_scope?: string[]
	constraints?: string[]
	acceptance_criteria?: string[]
}

type JwtPayload = {
	intent_id: string
	iat: number
	exp: number
	scope: string[]
}

type MutationTrace = {
	intent_id: string
	mutation_class: "AST_REFACTOR" | "INTENT_EVOLUTION"
	file_path: string
	hash: string
	timestamp: string
	operation: string
}

/**
 * JWT Authentication for Intent Selection
 * Generates a self-contained JWT token for intent-based authentication
 * Constraint: Must not use external auth providers
 */
class IntentJwtAuth {
	private static readonly ALGORITHM = "HS256"
	private static readonly SECRET_KEY_ENV = "ROO_INTENT_JWT_SECRET"
	private static readonly DEFAULT_SECRET = "roo-code-intent-auth-default-key"
	private static readonly TOKEN_EXPIRY_MS = 3600000 // 1 hour

	/**
	 * Get the JWT secret key from environment or use default
	 * Maintains backward compatibility with Basic Auth by allowing fallback
	 */
	private static getSecretKey(): string {
		return process.env[this.SECRET_KEY_ENV] || this.DEFAULT_SECRET
	}

	/**
	 * Generate a JWT token for an authenticated intent
	 */
	static generateToken(intent: ActiveIntent): string {
		const header = {
			alg: this.ALGORITHM,
			typ: "JWT",
		}

		const now = Date.now()
		const payload: JwtPayload = {
			intent_id: intent.id,
			iat: now,
			exp: now + this.TOKEN_EXPIRY_MS,
			scope: intent.owned_scope || [],
		}

		// Base64url encode header and payload
		const encodedHeader = this.base64urlEncode(JSON.stringify(header))
		const encodedPayload = this.base64urlEncode(JSON.stringify(payload))

		// Create signature
		const signature = this.sign(`${encodedHeader}.${encodedPayload}`)

		return `${encodedHeader}.${encodedPayload}.${signature}`
	}

	/**
	 * Verify a JWT token and return the payload if valid
	 */
	static verifyToken(token: string): JwtPayload | null {
		try {
			const parts = token.split(".")
			if (parts.length !== 3) {
				return null
			}

			const [encodedHeader, encodedPayload, signature] = parts

			// Verify signature
			const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`)
			if (signature !== expectedSignature) {
				return null
			}

			// Decode payload
			const payload = JSON.parse(this.base64urlDecode(encodedPayload!)) as JwtPayload

			// Check expiration
			if (payload.exp < Date.now()) {
				return null
			}

			return payload
		} catch {
			return null
		}
	}

	/**
	 * Check if a token is valid for a specific intent
	 */
	static isTokenValidForIntent(token: string, intentId: string): boolean {
		const payload = this.verifyToken(token)
		return payload !== null && payload.intent_id === intentId
	}

	private static base64urlEncode(str: string): string {
		return Buffer.from(str, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
	}

	private static base64urlDecode(str: string): string {
		// Add padding if needed
		const padded = str + "=".repeat((4 - (str.length % 4)) % 4)
		return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
	}

	private static sign(data: string): string {
		const hmac = crypto.createHmac("sha256", this.getSecretKey())
		hmac.update(data)
		return hmac.digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
	}
}

/**
 * Compute SHA-256 hash of file content
 */
function computeFileHash(filePath: string): string {
	try {
		const content = fs.readFileSync(filePath, "utf-8")
		return crypto.createHash("sha256").update(content).digest("hex")
	} catch {
		return ""
	}
}

/**
 * Append a mutation trace entry to agent_trace.jsonl
 */
function appendMutationTrace(workspaceRoot: string, trace: MutationTrace): void {
	const tracePath = path.join(workspaceRoot, ".orchestration", "agent_trace.jsonl")
	const traceDir = path.dirname(tracePath)

	// Ensure directory exists
	if (!fs.existsSync(traceDir)) {
		fs.mkdirSync(traceDir, { recursive: true })
	}

	// Append as JSON line
	const line = JSON.stringify(trace) + "\n"
	fs.appendFileSync(tracePath, line, "utf-8")
}

function loadActiveIntents(workspaceRoot: string): ActiveIntent[] {
	const file = path.join(workspaceRoot, ".orchestration", "active_intents.yaml")
	if (!fs.existsSync(file)) return []
	const raw = fs.readFileSync(file, "utf8")
	const doc = yaml.load(raw) as any
	return doc?.active_intents ?? []
}

function buildIntentContextXml(intent: ActiveIntent): string {
	// Minimal XML block containing constraints and scope per Phase 1 spec
	const constraints = (intent.constraints || []).map((c) => `<constraint>${escapeXml(c)}</constraint>`).join("")
	const scope = (intent.owned_scope || []).map((s) => `<scope>${escapeXml(s)}</scope>`).join("")
	return `<intent_context>
  <id>${escapeXml(intent.id)}</id>
  <name>${escapeXml(intent.name || "")}</name>
  <status>${escapeXml(intent.status || "")}</status>
  <constraints>${constraints}</constraints>
  <owned_scope>${scope}</owned_scope>
</intent_context>`
}

function escapeXml(s: string) {
	return s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">")
}

/**
 * Tool handler for selecting an active intent
 * Now includes JWT authentication support
 */
export async function selectActiveIntentTool(args: { intent_id?: string; auth_token?: string }, ctx: any) {
	const workspaceRoot = ctx?.workspaceRoot || process.cwd()
	const intent_id = args?.intent_id
	const auth_token = args?.auth_token

	if (!intent_id) {
		return { success: false, error: "select_active_intent requires intent_id" }
	}

	// Log the mutation for this operation
	const thisFilePath = __filename
	const fileHash = computeFileHash(thisFilePath)
	appendMutationTrace(workspaceRoot, {
		intent_id: "INT-001",
		mutation_class: "AST_REFACTOR",
		file_path: thisFilePath,
		hash: fileHash,
		timestamp: new Date().toISOString(),
		operation: "selectActiveIntentTool",
	})

	const intents = loadActiveIntents(workspaceRoot)
	const found = intents.find((i) => i.id === intent_id)
	if (!found) {
		return { success: false, error: `InvalidIntent: ${intent_id} not found in .orchestration/active_intents.yaml` }
	}

	// Generate JWT token for the authenticated intent
	const jwtToken = IntentJwtAuth.generateToken(found)

	// If an existing auth_token is provided, verify it (backward compatibility with Basic Auth)
	if (auth_token) {
		// Basic Auth fallback: check if token is valid for this intent
		if (!IntentJwtAuth.isTokenValidForIntent(auth_token, intent_id)) {
			return { success: false, error: `AuthFailed: Invalid or expired token for intent ${intent_id}` }
		}
	}

	const xml = buildIntentContextXml(found)

	// Return the XML block as the tool result with JWT token
	return {
		success: true,
		value: xml,
		auth_token: jwtToken,
		intent_id: intent_id,
	}
}

// Export JWT utilities for use by other modules
export { IntentJwtAuth, computeFileHash, appendMutationTrace }
export type { JwtPayload, MutationTrace }
