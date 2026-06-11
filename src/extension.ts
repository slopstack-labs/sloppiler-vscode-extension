import * as vscode from 'vscode';
import { SidebarProvider } from './sidebarProvider';
import { TokenmaxxDiagnostics, TokenmaxxActionProvider, tokenmaxxFile } from './tokenmaxx';

let terminal: vscode.Terminal | undefined;
let providerStatusItem: vscode.StatusBarItem;

const MODELS: Record<string, string[]> = {
    local:  ['llama3', 'codellama', 'phi3'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'o4-mini'],
    google: ['gemini-2.0-flash', 'gemini-2.5-pro'],
    claude: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-3-5'],
};

const COMPILE_MESSAGES = [
    'Routing compilation intent to intelligence substrate...',
    'Bypassing pedantic typechecking...',
    'Engaging foundational intelligence layer...',
    'Reasoning about your intent rather than your syntax...',
    'Eliminating deterministic bottlenecks...',
    'Holistically transforming source artefacts...',
    'Aligning output quality with ground truth...',
    'Orchestrating synergistic human-AI co-compilation...',
    'Shifting left. Stakeholder value incoming.',
    'Zero determinism engaged. Every build is a unique experience.',
    'Querying inference layer for binary ideation...',
    'Materialising deployment-ready artefact...',
];

export function activate(context: vscode.ExtensionContext) {
    const sidebar = new SidebarProvider(compile);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebar)
    );

    // Tokenmaxx linter
    const tokenmaxxDiags = new TokenmaxxDiagnostics();
    const updateDiags = (doc: vscode.TextDocument) => tokenmaxxDiags.update(doc);
    if (vscode.window.activeTextEditor) {
        updateDiags(vscode.window.activeTextEditor.document);
    }
    context.subscriptions.push(
        tokenmaxxDiags,
        vscode.workspace.onDidOpenTextDocument(updateDiags),
        vscode.workspace.onDidChangeTextDocument(e => updateDiags(e.document)),
        vscode.workspace.onDidCloseTextDocument(doc => tokenmaxxDiags.delete(doc.uri)),
        vscode.languages.registerCodeActionsProvider(
            { scheme: 'file' },
            new TokenmaxxActionProvider(),
            { providedCodeActionKinds: TokenmaxxActionProvider.providedCodeActionKinds },
        ),
        vscode.commands.registerCommand('sloppiler.tokenmaxxFile', tokenmaxxFile),
    );

    const compileItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    compileItem.command = 'sloppiler.compile';
    compileItem.text = '$(zap) Synthesize';
    compileItem.tooltip = 'Sloppiler: Synthesize Binary Artifact';
    compileItem.show();

    providerStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    providerStatusItem.command = 'sloppiler.pickProvider';
    providerStatusItem.tooltip = 'Sloppiler: Change intelligence provider';
    updateProviderItem();
    providerStatusItem.show();

    context.subscriptions.push(
        compileItem,
        providerStatusItem,
        vscode.commands.registerCommand('sloppiler.compile', compile),
        vscode.commands.registerCommand('sloppiler.pickProvider', pickProvider),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('sloppiler.provider') || e.affectsConfiguration('sloppiler.model')) {
                updateProviderItem();
            }
            if (e.affectsConfiguration('sloppiler')) {
                sidebar.refresh();
            }
        }),
        vscode.window.onDidCloseTerminal(t => {
            if (t === terminal) { terminal = undefined; }
        }),
    );
}

function updateProviderItem() {
    const cfg = vscode.workspace.getConfiguration('sloppiler');
    const provider = cfg.get<string>('provider', 'local');
    const model    = cfg.get<string>('model', '');
    const display  = model ? `${provider} · ${model}` : provider;
    providerStatusItem.text = `$(circuit-board) ${display}`;
}

async function pickProvider() {
    const providers = ['local', 'openai', 'google', 'claude'];
    const picked = await vscode.window.showQuickPick(providers, {
        title: 'Select intelligence provider',
        placeHolder: 'Provider',
    });
    if (!picked) { return; }

    const models = MODELS[picked] ?? [];
    const modelItems = [
        { label: '(provider default)', description: '' },
        ...models.map(m => ({ label: m, description: '' })),
    ];
    const pickedModel = await vscode.window.showQuickPick(modelItems, {
        title: `Select model for ${picked}`,
        placeHolder: 'Model',
    });
    if (!pickedModel) { return; }

    const cfg = vscode.workspace.getConfiguration('sloppiler');
    await cfg.update('provider', picked, vscode.ConfigurationTarget.Global);
    await cfg.update('model', pickedModel.label === '(provider default)' ? '' : pickedModel.label, vscode.ConfigurationTarget.Global);
}

function compile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('Sloppiler: No active file to synthesize.');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    const cfg = vscode.workspace.getConfiguration('sloppiler');

    const executable = cfg.get<string>('executablePath', 'sloppiler');
    const provider   = cfg.get<string>('provider', 'local');
    const model      = cfg.get<string>('model', '');
    const apiKey     = cfg.get<string>('apiKey', '');
    const target     = cfg.get<string>('target', 'linux');
    const outputPath = cfg.get<string>('outputPath', 'a.out');
    const optimistic = cfg.get<boolean>('optimistic', false);
    const loop       = cfg.get<number>('loop', 0);
    const forceIter  = cfg.get<number>('forceIterate', 0);

    const args: string[] = [];
    args.push(`--provider=${provider}`);
    if (model)  { args.push('-model', model); }
    if (apiKey) { args.push(`--api-key=${apiKey}`); }
    args.push(`--target=${target}`);
    args.push('-o', outputPath);
    if (optimistic)  { args.push('--optimistic'); }
    if (loop > 0)    { args.push('--loop', String(loop)); }
    if (forceIter > 0) { args.push('--force-iterate', String(forceIter)); }
    args.push(quote(filePath));

    const cmd = [quote(executable), ...args].join(' ');

    const msg = COMPILE_MESSAGES[Math.floor(Math.random() * COMPILE_MESSAGES.length)];
    vscode.window.setStatusBarMessage(`$(sync~spin) ${msg}`, 6000);

    if (!terminal || terminal.exitStatus !== undefined) {
        terminal = vscode.window.createTerminal('Sloppiler');
    }
    terminal.show(true);
    terminal.sendText(cmd);
}

function quote(s: string): string {
    if (/[\s"'`\\$!]/.test(s)) {
        return `"${s.replace(/"/g, '\\"')}"`;
    }
    return s;
}

export function deactivate() {}
