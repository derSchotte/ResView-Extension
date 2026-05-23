# Skill: build-release

Erstellt zwei VSIX-Pakete und veröffentlicht sie auf den jeweiligen Marketplaces.

| Ziel | Publisher | Ordner | Marketplace |
|---|---|---|---|
| VS Code Marketplace | `FrankMcDonald` | `Marketplace/` | marketplace.visualstudio.com |
| Open VSX | `derSchotte` | `OpenVSX/` | open-vsx.org |

**Voraussetzungen (alle erfüllt):**
- `vsce` global installiert
- `ovsx` global installiert
- Umgebungsvariable `VSCE_PAT` gesetzt (VS Code Marketplace)
- Umgebungsvariable `OVSX_PAT` gesetzt (Open VSX)

---

## Schritte

### 1. Version lesen
Lese das `version`-Feld aus `package.json`. Die VSIX-Dateien heißen `resview-{version}.vsix`.

### 2. Ausgabe-Ordner anlegen
```powershell
New-Item -ItemType Directory -Force Marketplace
New-Item -ItemType Directory -Force OpenVSX
```

### 3. Marketplace-Build + Publish (FrankMcDonald)
```powershell
# package.json: "publisher": "FrankMcDonald", "author": "Frank McDonald"

vsce package --out Marketplace/
# → Marketplace/resview-{version}.vsix

# WICHTIG: Token im selben PowerShell-Block setzen und verwenden —
# $env:VSCE_PAT geht zwischen separaten Tool-Calls verloren.
$env:VSCE_PAT = "<token>"
vsce publish --packagePath Marketplace/resview-{version}.vsix
```

### 4. OpenVSX-Build + Publish (derSchotte)
```powershell
# package.json: "publisher": "derSchotte", "author": "derSchotte"

vsce package --out OpenVSX/
# → OpenVSX/resview-{version}.vsix

# WICHTIG: --pat mit Anführungszeichen verwenden (nicht -p).
# Token im selben Block setzen — geht sonst verloren.
$env:OVSX_PAT = "<token>"
ovsx publish OpenVSX/resview-{version}.vsix --pat "$env:OVSX_PAT"
```

### 5. package.json wiederherstellen
Sicherstellen, dass `package.json` am Ende `"publisher": "derSchotte"` enthält.

### 6. Abschlussmeldung
- Beide VSIX-Pfade ausgeben
- Ergebnis beider Publish-Schritte melden (Erfolg oder Fehlermeldung)

---

## Hinweise

- Builds **sequenziell** ausführen — beide schreiben `package.json`.
- `Marketplace/` und `OpenVSX/` sind in `.gitignore` eingetragen — kein Commit nötig.
- `package.json` endet immer im Zustand `derSchotte` (Repository-Standard).
- **`$env:*`-Variablen** leben nur im jeweiligen PowerShell-Block — Token immer im selben Block setzen und verwenden, nie in einem separaten vorherigen Aufruf.
- **`ovsx publish`**: immer `--pat "..."` (langer Flag, Anführungszeichen) — der kurze `-p`-Flag übergibt den Wert nicht zuverlässig.
