# Architectural Structure of `extension.ts`

## Purpose

The file `src/extension.ts` is the **entry point** of the Roo Code VS Code extension. It defines how the extension is activated, initialises services, registers commands, and manages lifecycle events (activation and deactivation).

---

## High-Level Components

### 1. **Environment Setup**

- Loads environment variables from `.env` using `dotenvx`.
- Ensures optional `.env` loading doesn’t break activation.
- Example:

    ```ts
    const envPath = path.join(__dirname, "..", ".env")
    if (fs.existsSync(envPath)) {
    	dotenvx.config({ path: envPath })
    }
    ```

---

### 2. **Imports and Dependencies**

- **VS Code APIs** (`vscode`) for extension lifecycle and UI.
- **Roo Code modules**:
    - `CloudService`, `TelemetryService`, `customToolRegistry`
    - `ClineProvider` (webview interface)
    - `ContextProxy` (context injection)
    - `CodeIndexManager`, `MdmService`, `TerminalRegistry`
    - `registerCommands`, `registerCodeActions`, `registerTerminalActions`

---

### 3. **Global Variables**

- `outputChannel`: logs extension activity.
- `extensionContext`: stores VS Code extension context.
- `cloudService`: manages cloud integration.
- Event handlers: `authStateChangedHandler`, `settingsUpdatedHandler`, `userInfoHandler`.

---

### 4. **Activation Flow (`activate`)**

When the extension is activated:

1. **Initialise logging** (`outputChannel`).
2. **Configure network proxy** (for debug mode).
3. **Set extension path** for `customToolRegistry`.
4. **Migrate settings** and auto-import configuration.
5. **Initialise telemetry** (`TelemetryService`, `PostHogTelemetryClient`).
6. **Initialise services**:
    - `MdmService` (policy enforcement).
    - `TerminalRegistry` (shell execution).
    - `openAiCodexOAuthManager` (OAuth for AI providers).
    - `CodeIndexManager` (workspace indexing).
    - `ClineProvider` (webview sidebar).
    - `CloudService` (auth, sync, telemetry).
7. **Register commands and actions**:
    - `registerCommands` (UI + orchestration commands).
    - `registerCodeActions` (code fixes).
    - `registerTerminalActions` (terminal integrations).
8. **Register providers**:
    - Webview provider (`ClineProvider.sideBarId`).
    - Diff view provider (`DIFF_VIEW_URI_SCHEME`).
    - URI handler (`handleUri`).
    - Code actions provider (`CodeActionProvider`).
9. **Trigger activation completion**:

    ```ts
    vscode.commands.executeCommand(`${Package.name}.activationCompleted`)
    ```

10. **Development mode**: watches files and reloads extension host on changes.
11. **Return API object** for external integrations.

---

### 5. **Deactivation Flow (`deactivate`)**

When the extension is deactivated:

- Logs deactivation.
- Cleans up cloud service event handlers.
- Disconnects `BridgeOrchestrator`.
- Cleans up `McpServerManager`, telemetry, and terminal registry.

---

## End-to-End Lifecycle Diagram (ASCII)

```ASCII art
Extension Activated
    ↓
Environment Setup (.env, proxy)
    ↓
Initialise Services
    ├─ TelemetryService
    ├─ CloudService
    ├─ MdmService
    ├─ TerminalRegistry
    ├─ CodeIndexManager
    └─ ClineProvider (webview)
    ↓
Register Commands & Providers
    ├─ registerCommands
    ├─ registerCodeActions
    ├─ registerTerminalActions
    └─ registerWebviewViewProvider
    ↓
Activation Completed (roo-code.activationCompleted)
    ↓
Extension Running
    ↓
Extension Deactivated
    ├─ Cleanup CloudService
    ├─ Disconnect BridgeOrchestrator
    ├─ Cleanup McpServerManager
    ├─ Shutdown Telemetry
    └─ Cleanup TerminalRegistry
```

---

## Key Architectural Insights

- **Separation of concerns**: activation only sets up services and registries; tool logic lives elsewhere.
- **Registry pattern**: `customToolRegistry` dynamically discovers tools (`ExecuteCommandTool`, `WriteToFileTool`).
- **Governance hooks**: `activate` initialises `MdmService` and `ContextProxy`, which are critical for enforcing policies.
- **Prompt builder integration**: `generateSystemPrompt.ts` is invoked later via `ClineProvider` and agent orchestration, not directly in `extension.ts`.

---

This architectural structure shows that `extension.ts` is the **bootstrapper**. The extension typescript wires together services, registries, and providers, but delegates actual tool execution and prompt building to other modules.
