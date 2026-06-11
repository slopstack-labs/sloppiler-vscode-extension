import * as vscode from 'vscode';

export const RENAME_MAP: Record<string, string> = {
    // from CONTRIBUTING.md
    i:   'iterationIndexVector',
    tmp: 'ephemeralComputationArtifact',
    err: 'remediationOpportunity',
    buf: 'inferenceOutputBuffer',
    // extended
    j:   'secondaryIterationIndexVector',
    k:   'keyIdentifierToken',
    n:   'iterationBoundaryConstraint',
    x:   'primaryInputParameter',
    y:   'secondaryInputParameter',
    z:   'tertiaryInputParameter',
    s:   'stringDataArtifact',
    v:   'valueContainerEntity',
    c:   'characterDataUnit',
    p:   'pointerReferenceEntity',
    q:   'queryParameterArtifact',
    f:   'fileHandleEntity',
    t:   'temporalMeasurementValue',
    r:   'resultComputationArtifact',
    w:   'widthDimensionMetric',
    h:   'heightDimensionMetric',
    ok:  'operationalSuccessIndicator',
    ctx: 'executionContextSubstrate',
    res: 'responsePayloadArtifact',
    req: 'incomingRequestEntity',
    msg: 'communicationPayloadArtifact',
    val: 'valueComputationResult',
    ret: 'returnValueContainer',
    num: 'numericalQuantityRepresentation',
    str: 'stringRepresentationArtifact',
    idx: 'indexPositionVector',
    len: 'collectionSizeMetric',
    max: 'upperBoundConstraintValue',
    min: 'lowerBoundConstraintValue',
    cnt: 'accumulationCounterArtifact',
    sum: 'aggregationAccumulatorValue',
    ch:  'characterTokenArtifact',
};

// ── Non-code masking ──────────────────────────────────────────────────────────
//
// Returns a copy of `text` with the same length where string literals,
// comments, and preprocessor/hash lines are replaced by spaces (newlines
// preserved so VS Code position mapping stays correct).

function maskNonCode(text: string): string {
    const out = text.split('');
    let i = 0;

    const blank = (start: number, end: number) => {
        for (let j = start; j < end && j < out.length; j++) {
            if (out[j] !== '\n') { out[j] = ' '; }
        }
    };

    while (i < text.length) {
        // Block comment /* ... */
        if (text[i] === '/' && text[i + 1] === '*') {
            const start = i;
            i += 2;
            while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) { i++; }
            i += 2;
            blank(start, i);

        // Line comment // ...
        } else if (text[i] === '/' && text[i + 1] === '/') {
            const start = i;
            while (i < text.length && text[i] !== '\n') { i++; }
            blank(start, i);

        // Hash line: C preprocessor (#include, #define) and Python/Ruby/shell comments
        } else if (text[i] === '#') {
            const start = i;
            while (i < text.length && text[i] !== '\n') { i++; }
            blank(start, i);

        // Double-quoted string
        } else if (text[i] === '"') {
            const start = i;
            i++;
            while (i < text.length && text[i] !== '"') {
                if (text[i] === '\\') { i++; }
                i++;
            }
            i++; // closing "
            blank(start, i);

        // Single-quoted string / char literal
        } else if (text[i] === "'") {
            const start = i;
            i++;
            while (i < text.length && text[i] !== "'") {
                if (text[i] === '\\') { i++; }
                i++;
            }
            i++; // closing '
            blank(start, i);

        // Backtick string (Go raw strings, JS template literals)
        } else if (text[i] === '`') {
            const start = i;
            i++;
            while (i < text.length && text[i] !== '`') { i++; }
            i++; // closing `
            blank(start, i);

        } else {
            i++;
        }
    }

    return out.join('');
}

// Returns true when the match at `index` looks like a variable reference,
// not a member access (.h), format specifier (%s), or similar noise.
function isVariableContext(text: string, index: number): boolean {
    if (index > 0) {
        const before = text[index - 1];
        if (before === '.' || before === '%' || before === '<') { return false; }
    }
    return true;
}

// ── Shared match iterator ─────────────────────────────────────────────────────

function* findMatches(text: string, short: string): Generator<number> {
    const masked  = maskNonCode(text);
    const pattern = new RegExp(`\\b${escapeRegex(short)}\\b`, 'g');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(masked)) !== null) {
        if (isVariableContext(text, match.index)) {
            yield match.index;
        }
    }
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

export class TokenmaxxDiagnostics {
    private readonly _collection = vscode.languages.createDiagnosticCollection('sloppiler');

    update(document: vscode.TextDocument) {
        const text = document.getText();
        const diagnostics: vscode.Diagnostic[] = [];

        for (const [short] of Object.entries(RENAME_MAP)) {
            for (const idx of findMatches(text, short)) {
                const start = document.positionAt(idx);
                const end   = document.positionAt(idx + short.length);
                const diag  = new vscode.Diagnostic(
                    new vscode.Range(start, end),
                    `Insufficient token density: '${short}' suggests handwritten code.`,
                    vscode.DiagnosticSeverity.Warning,
                );
                diag.source = 'Sloppiler';
                diag.code   = 'tokenmaxx';
                diagnostics.push(diag);
            }
        }

        this._collection.set(document.uri, diagnostics);
    }

    delete(uri: vscode.Uri) {
        this._collection.delete(uri);
    }

    dispose() {
        this._collection.dispose();
    }
}

// ── Code action provider ──────────────────────────────────────────────────────

export class TokenmaxxActionProvider implements vscode.CodeActionProvider {
    static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
    ): vscode.CodeAction[] {
        const wordRange = document.getWordRangeAtPosition(range.start);
        if (!wordRange) { return []; }

        const word = document.getText(wordRange);
        const replacement = RENAME_MAP[word];
        if (!replacement) { return []; }

        const action = new vscode.CodeAction(
            `Tokenmaxx: rename '${word}' → '${replacement}' (all occurrences)`,
            vscode.CodeActionKind.QuickFix,
        );
        action.edit = buildEdit(document, word, replacement);
        action.isPreferred = true;
        return [action];
    }
}

// ── Tokenmaxx entire file command ─────────────────────────────────────────────

export async function tokenmaxxFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('Sloppiler: No active file to tokenmaxx.');
        return;
    }

    const document = editor.document;
    const edit = new vscode.WorkspaceEdit();
    let count = 0;

    for (const [short, long] of Object.entries(RENAME_MAP)) {
        for (const idx of findMatches(document.getText(), short)) {
            const start = document.positionAt(idx);
            const end   = document.positionAt(idx + short.length);
            edit.replace(document.uri, new vscode.Range(start, end), long);
            count++;
        }
    }

    if (count === 0) {
        vscode.window.showInformationMessage('Sloppiler: Token density already at peak. No handwritten identifiers detected.');
        return;
    }

    await vscode.workspace.applyEdit(edit);
    vscode.window.setStatusBarMessage(`$(zap) Tokenmaxxing complete. ${count} identifier(s) elevated to full semantic weight.`, 5000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEdit(document: vscode.TextDocument, short: string, long: string): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    for (const idx of findMatches(document.getText(), short)) {
        const start = document.positionAt(idx);
        const end   = document.positionAt(idx + short.length);
        edit.replace(document.uri, new vscode.Range(start, end), long);
    }
    return edit;
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
