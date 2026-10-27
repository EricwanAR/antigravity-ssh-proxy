import * as fs from 'fs';
import * as path from 'path';

export function generateSetupScript(proxyHost: string, proxyPort: number, proxyType: string, extensionPath: string): string {
    const scriptPath = path.join(extensionPath, 'scripts', 'setup-proxy.sh');
    let script = fs.readFileSync(scriptPath, 'utf-8');

    // Replace placeholders
    script = script.replace(/__PROXY_HOST__/g, proxyHost);
    script = script.replace(/__PROXY_PORT__/g, String(proxyPort));
    script = script.replace(/__PROXY_TYPE__/g, proxyType);

    return script;
}

export function generateRollbackScript(): string {
    return `#!/bin/bash
set -e

# Search in all possible server directories (new name first, then legacy) and agy binary location
BAKS=""

if [ -f "$HOME/.gemini/bin/agy.bak" ]; then
    BAKS="$HOME/.gemini/bin/agy.bak"
fi

for DIR in "$HOME/.antigravity-ide-server" "$HOME/.antigravity-server"; do
    if [ -d "$DIR" ]; then
        FOUND=$(find "$DIR" -path "*/extensions/antigravity/bin/*" -name "language_server_[l]inux_*.bak" -type f 2>/dev/null || true)
        if [ -n "$FOUND" ]; then
            BAKS="$BAKS
$FOUND"
        fi
    fi
done
BAKS=$(echo "$BAKS" | sed '/^$/d')

[ -z "$BAKS" ] && echo "Nothing to rollback" && exit 0

RESTORED=0
while IFS= read -r BAK; do
    [ -z "$BAK" ] && continue
    TARGET="\${BAK%.bak}"
    echo "Restoring: $TARGET"
    [ -f "$TARGET" ] && rm -f "$TARGET"
    mv -f "$BAK" "$TARGET"
    RESTORED=$((RESTORED + 1))
done <<< "$BAKS"

# Terminate running processes after rollback so the IDE restarts cleanly
pkill -f "[.]gemini/bin/agy(\\.bak)?.*--[h]ub" 2>/dev/null || true
pkill -f "[l]anguage_server_linux.*\\.bak" 2>/dev/null || true
pkill -f "[l]anguage_server_linux" 2>/dev/null || true

echo "Rollback complete: $RESTORED file(s) restored"
`;
}
