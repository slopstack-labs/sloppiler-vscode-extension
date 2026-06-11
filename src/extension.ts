import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { SidebarProvider } from './sidebarProvider';
import { TokenmaxxDiagnostics, TokenmaxxActionProvider, tokenmaxxFile } from './tokenmaxx';

let outputChannel: vscode.OutputChannel;
let providerStatusItem: vscode.StatusBarItem;
let compiling = false;

function stripAnsi(s: string): string {
    return s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');
}

const DEFAULT_MODELS: Record<string, string[]> = {
    local:  ['llama3', 'codellama', 'phi3'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'o4-mini'],
    google: ['gemini-2.0-flash', 'gemini-2.5-pro'],
    claude: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-3-5'],
};

function getModels(): Record<string, string[]> {
    const custom = vscode.workspace.getConfiguration('sloppiler').get<Record<string, string[]>>('customModels', {});
    const merged: Record<string, string[]> = {};
    for (const provider of Object.keys(DEFAULT_MODELS)) {
        const extras = custom[provider] ?? [];
        const base = DEFAULT_MODELS[provider];
        merged[provider] = [...base, ...extras.filter(m => !base.includes(m))];
    }
    return merged;
}


export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Sloppiler');
    context.subscriptions.push(outputChannel);

    const sidebar = new SidebarProvider(compile, getModels);
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
                sidebar.refresh(getModels());
            }
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

    const models = getModels()[picked] ?? [];
    const modelItems: vscode.QuickPickItem[] = [
        { label: '(provider default)', description: '' },
        ...models.map(m => ({ label: m, description: '' })),
        { label: '$(edit) Enter custom model...', description: '' },
    ];
    const pickedModel = await vscode.window.showQuickPick(modelItems, {
        title: `Select model for ${picked}`,
        placeHolder: 'Model',
    });
    if (!pickedModel) { return; }

    let modelValue = pickedModel.label === '(provider default)' ? '' : pickedModel.label;
    if (pickedModel.label.includes('Enter custom model')) {
        modelValue = await vscode.window.showInputBox({ prompt: `Enter model name for ${picked}`, placeHolder: 'e.g. qwen2.5-coder:1.5b' }) ?? '';
    }

    const cfg = vscode.workspace.getConfiguration('sloppiler');
    await cfg.update('provider', picked, vscode.ConfigurationTarget.Global);
    await cfg.update('model', modelValue, vscode.ConfigurationTarget.Global);
}

function compile() {
    if (compiling) {
        vscode.window.showWarningMessage('Sloppiler: synthesis already in progress.');
        return;
    }

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
    const ollamaUrl  = cfg.get<string>('ollamaUrl', 'http://localhost:11434/api/generate');
    const target     = cfg.get<string>('target', 'linux');
    const outputPath = cfg.get<string>('outputPath', 'a.out');
    const optimistic = cfg.get<boolean>('optimistic', false);
    const loop       = cfg.get<number>('loop', 0);
    const forceIter  = cfg.get<number>('forceIterate', 0);

    const args: string[] = [];
    args.push(`--provider=${provider}`);
    if (model)  { args.push('--model', model); }
    if (apiKey) { args.push(`--api-key=${apiKey}`); }
    if (provider === 'local') { args.push(`--ollama=${ollamaUrl}`); }
    args.push(`--target=${target}`);
    args.push('-o', outputPath);
    if (optimistic)    { args.push('--optimistic'); }
    if (loop > 0)      { args.push('--loop', String(loop)); }
    if (forceIter > 0) { args.push('--force-iterate', String(forceIter)); }
    args.push(filePath);

    compiling = true;
    outputChannel.clear();

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Sloppiler',
        cancellable: true,
    }, (progress, token) => {
        progress.report({ message: 'initializing synthesis pipeline...' });

        return new Promise<void>((resolve, reject) => {
            const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
                     ?? path.dirname(filePath);
            const proc = cp.spawn(executable, args, { env: process.env, cwd });

            token.onCancellationRequested(() => {
                proc.kill();
                reject(new Error('cancelled'));
            });

            const onData = (chunk: Buffer) => {
                const text = stripAnsi(chunk.toString());
                outputChannel.append(text);
                // Feed the latest non-empty line into the progress toast
                const line = text.split('\n').map(l => l.trim()).filter(Boolean).pop();
                if (line) { progress.report({ message: line }); }
            };

            proc.stdout.on('data', onData);
            proc.stderr.on('data', onData);
            proc.on('error', reject);
            proc.on('close', code => code === 0 ? resolve() : reject(new Error(`exit ${code}`)));
        });
    }).then(
        () => {
            compiling = false;
            vscode.window.showInformationMessage(`Sloppiler: binary materialized → ${outputPath}`, 'Show Log')
                .then(v => { if (v) { outputChannel.show(true); } });
        },
        (err: Error) => {
            compiling = false;
            if (err.message === 'cancelled') { return; }
            vscode.window.showErrorMessage(`Sloppiler: ${err.message}`, 'Show Log')
                .then(v => { if (v) { outputChannel.show(true); } });
        },
    );
}

export function deactivate() {}
