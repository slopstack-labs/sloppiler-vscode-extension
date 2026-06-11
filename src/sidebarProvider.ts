import * as vscode from 'vscode';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'sloppiler.sidebar';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _compile: () => void,
        private readonly _getModels: () => Record<string, string[]>,
    ) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this._getHtml();
        webviewView.webview.onDidReceiveMessage(msg => {
            switch (msg.type) {
                case 'ready':
                    this._sendSettings();
                    break;
                case 'updateSetting':
                    vscode.workspace.getConfiguration('sloppiler')
                        .update(msg.key, msg.value, vscode.ConfigurationTarget.Global);
                    break;
                case 'compile':
                    this._compile();
                    break;
            }
        });
    }

    refresh(models?: Record<string, string[]>) {
        this._sendSettings(models);
    }

    private async _fetchOllamaModels(ollamaUrl: string): Promise<string[]> {
        try {
            const base = new URL(ollamaUrl).origin;
            const res = await fetch(`${base}/api/tags`);
            if (!res.ok) { return []; }
            const data = await res.json() as { models?: { name: string }[] };
            return (data.models ?? []).map((m: { name: string }) => m.name);
        } catch {
            return [];
        }
    }

    private async _sendSettings(models?: Record<string, string[]>) {
        if (!this._view) { return; }
        const cfg = vscode.workspace.getConfiguration('sloppiler');
        const provider  = cfg.get('provider', 'local');
        const ollamaUrl = cfg.get('ollamaUrl', 'http://localhost:11434/api/generate');

        let effectiveModels = models ?? this._getModels();
        if (provider === 'local') {
            const live = await this._fetchOllamaModels(ollamaUrl as string);
            if (live.length > 0) {
                const existing = effectiveModels['local'] ?? [];
                effectiveModels = {
                    ...effectiveModels,
                    local: [...new Set([...live, ...existing])],
                };
            }
        }

        this._view.webview.postMessage({
            type: 'settings',
            settings: {
                provider,
                model:        cfg.get('model', ''),
                apiKey:       cfg.get('apiKey', ''),
                ollamaUrl,
                target:       cfg.get('target', 'linux'),
                outputPath:   cfg.get('outputPath', 'a.out'),
                optimistic:   cfg.get('optimistic', false),
                loop:         cfg.get('loop', 0),
                forceIterate: cfg.get('forceIterate', 0),
            },
            models: effectiveModels,
        });
    }

    private _getHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .header {
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .header h1 {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .header p {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
      font-style: italic;
    }

    .section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 6px;
    }

    label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      display: block;
      margin-bottom: 3px;
    }

    select, input[type="text"], input[type="password"], input[type="number"] {
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      padding: 4px 6px;
      font-size: var(--vscode-font-size);
      font-family: var(--vscode-font-family);
      outline: none;
      border-radius: 2px;
    }
    select:focus, input:focus {
      border-color: var(--vscode-focusBorder);
    }

    .field { margin-bottom: 8px; }

    .row { display: flex; gap: 8px; }
    .row .field { flex: 1; }

    .toggle-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
    }
    .toggle-row input[type="checkbox"] {
      width: auto;
    }
    .toggle-row span {
      font-size: 12px;
    }
    .toggle-row .badge {
      margin-left: auto;
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 10px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .target-group {
      display: flex;
      gap: 0;
    }
    .target-group button {
      flex: 1;
      padding: 4px 0;
      font-size: 11px;
      background: var(--vscode-input-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
      cursor: pointer;
    }
    .target-group button:not(:last-child) { border-right: none; }
    .target-group button:first-child { border-radius: 2px 0 0 2px; }
    .target-group button:last-child  { border-radius: 0 2px 2px 0; }
    .target-group button.active {
      background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
      color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
    }

    .compile-btn {
      width: 100%;
      padding: 8px;
      font-size: 12px;
      font-weight: 700;
      font-family: var(--vscode-font-family);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      margin-top: 4px;
    }
    .compile-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .compile-btn:active {
      opacity: 0.9;
    }

    .divider {
      border: none;
      border-top: 1px solid var(--vscode-panel-border);
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>⚡ Sloppiler</h1>
    <p>Beyond Deterministic Compilation</p>
  </div>

  <div>
    <div class="section-label">Intelligence Substrate</div>
    <div class="field">
      <label>Provider</label>
      <select id="provider"></select>
    </div>
    <div class="field">
      <label>Model</label>
      <input type="text" id="model" list="model-list" placeholder="provider default">
      <datalist id="model-list"></datalist>
    </div>
    <div class="field" id="ollamaUrlField" style="display:none">
      <label>Ollama URL</label>
      <input type="text" id="ollamaUrl" placeholder="http://localhost:11434/api/generate">
    </div>
    <div class="field" id="apiKeyField" style="display:none">
      <label>API Key</label>
      <input type="password" id="apiKey" placeholder="or set SLOPPILER_API_KEY">
    </div>
  </div>

  <hr class="divider">

  <div>
    <div class="section-label">Compilation Target</div>
    <div class="target-group">
      <button data-target="linux">linux</button>
      <button data-target="windows">windows</button>
      <button data-target="darwin">darwin</button>
    </div>
  </div>

  <hr class="divider">

  <div>
    <div class="section-label">Pipeline Configuration</div>
    <div class="toggle-row">
      <input type="checkbox" id="optimistic">
      <span>Agentic Co-Pilot Mode</span>
      <span class="badge">--optimistic</span>
    </div>
    <div class="row" style="margin-top: 8px;">
      <div class="field">
        <label>Remediation Loops</label>
        <input type="number" id="loop" min="0" value="0">
      </div>
      <div class="field">
        <label>Force-Iterate Cycles</label>
        <input type="number" id="forceIterate" min="0" value="0">
      </div>
    </div>
  </div>

  <hr class="divider">

  <div>
    <div class="section-label">Output Artefact</div>
    <div class="field">
      <label>Binary Path</label>
      <input type="text" id="outputPath" placeholder="a.out">
    </div>
  </div>

  <button class="compile-btn" id="compileBtn">⚡ Synthesize Binary Artifact</button>

  <script>
    const vscode = acquireVsCodeApi();
    let allModels = {};

    const $ = id => document.getElementById(id);

    function send(key, value) {
      vscode.postMessage({ type: 'updateSetting', key, value });
    }

    function buildProviderDropdown(providers, current) {
      const el = $('provider');
      el.innerHTML = providers.map(p =>
        \`<option value="\${p}" \${p === current ? 'selected' : ''}>\${p}</option>\`
      ).join('');
    }

    function updateModelDatalist(provider) {
      const dl = $('model-list');
      const models = allModels[provider] || [];
      dl.innerHTML = models.map(m => \`<option value="\${m}">\`).join('');
    }

    function updateProviderFields(provider) {
      $('ollamaUrlField').style.display = provider === 'local' ? '' : 'none';
      $('apiKeyField').style.display    = provider !== 'local' ? '' : 'none';
      updateModelDatalist(provider);
    }

    function setTarget(target) {
      document.querySelectorAll('.target-group button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === target);
      });
    }

    document.querySelectorAll('.target-group button').forEach(btn => {
      btn.addEventListener('click', () => {
        setTarget(btn.dataset.target);
        send('target', btn.dataset.target);
      });
    });

    $('provider').addEventListener('change', () => {
      const p = $('provider').value;
      updateProviderFields(p);
      send('provider', p);
      $('model').value = '';
      send('model', '');
    });

    $('model').addEventListener('change', () => send('model', $('model').value));
    $('model').addEventListener('blur',   () => send('model', $('model').value));
    $('apiKey').addEventListener('change', () => send('apiKey', $('apiKey').value));
    $('ollamaUrl').addEventListener('change', () => send('ollamaUrl', $('ollamaUrl').value));
    $('ollamaUrl').addEventListener('blur',   () => send('ollamaUrl', $('ollamaUrl').value));
    $('outputPath').addEventListener('change', () => send('outputPath', $('outputPath').value));
    $('loop').addEventListener('change', () => send('loop', Number($('loop').value)));
    $('forceIterate').addEventListener('change', () => send('forceIterate', Number($('forceIterate').value)));
    $('optimistic').addEventListener('change', () => send('optimistic', $('optimistic').checked));
    $('compileBtn').addEventListener('click', () => vscode.postMessage({ type: 'compile' }));

    vscode.postMessage({ type: 'ready' });

    window.addEventListener('message', ({ data }) => {
      if (data.type !== 'settings') { return; }
      const s = data.settings;
      allModels = data.models;

      buildProviderDropdown(Object.keys(allModels), s.provider);
      updateProviderFields(s.provider);
      setTarget(s.target);

      $('model').value        = s.model;
      $('apiKey').value       = s.apiKey;
      $('ollamaUrl').value    = s.ollamaUrl;
      $('outputPath').value   = s.outputPath;
      $('loop').value         = s.loop;
      $('forceIterate').value = s.forceIterate;
      $('optimistic').checked = s.optimistic;
    });
  </script>
</body>
</html>`;
    }
}
