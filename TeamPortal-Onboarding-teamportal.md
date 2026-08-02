# TeamPortal — Onboarding & Projekt-Setup Dokumentation

> Fuer Superadmins und DevOps. Beschreibt den kompletten Prozess zur
> Einrichtung neuer Projekte im TeamPortal.

---

## 1. Architektur-Ueberblick

Das TeamPortal nutzt eine **Shared-Database-Architektur**:

- **Eine PostgreSQL-Datenbank** (`teamportal`) auf dem Hetzner VPS
- **Alle Projekte teilen die gleiche DB** — Isolation ueber `project_id` auf jeder Tabelle
- **Kein separater DB-User pro Projekt** — der App-User (`moritz_admin`) hat Zugriff auf alles
- **Better Auth** verwaltet User-Sessions, Rollen und Zugriffsrechte

### Warum Shared DB?
- Einfachere Wartung (ein Backup, ein Connection-Pool)
- Cross-Project Queries moeglich (globale Statistiken)
- Projekte koennen spaeter isoliert werden wenn noetig

---

## 2. Neues Projekt anlegen

### 2.1 Ueber die UI (empfohlen)

1. Einloggen unter `https://teamportal-hub.vercel.app`
2. Dashboard (`/`) → **"Neues Projekt"** Karte klicken
3. Formular ausfuellen:
   - **Name**: z.B. "Mein Projekt"
   - **Slug**: wird automatisch generiert (z.B. `mein-projekt`)
   - **GitHub Repo**: aus Dropdown waehlen oder manuell eingeben (`owner/repo`)
   - **Default Branch**: `develop` (Standard)
   - **URLs**: Production, Staging, Local Dev
   - **Tech Stack**: z.B. "Next.js 16, TypeScript, Supabase"
   - **Farbe**: Projekt-Farbe fuer die UI
4. **Speichern** → Redirect zu `/p/mein-projekt/overview`

### 2.2 Ueber die Datenbank (manuell)

```sql
INSERT INTO projects (slug, name, description, github_repo, github_default_branch, tech_stack, color)
VALUES ('mein-projekt', 'Mein Projekt', 'Beschreibung', 'owner/repo', 'develop', 'Next.js + TypeScript', '#3b82f6');
```

---

## 3. API-Key fuer KI-Agenten generieren

### 3.1 Ueber die UI

1. `/p/mein-projekt/settings` oeffnen
2. Runterscrollen zu **"API-Keys"**
3. **"Neuen API-Key generieren"** klicken
4. Namen vergeben (z.B. "Claude Code Laptop")
5. **Key kopieren** — wird NUR EINMAL angezeigt!

### 3.2 Ueber die Kommandozeile

```bash
cd team-portal
npm run api-key:generate mein-projekt
```

### Key-Verwaltung
- Mehrere Keys pro Projekt moeglich
- Jeder Key hat eigene Permissions: `tickets:read`, `tickets:write`, `comments:write`
- Keys koennen in den Einstellungen geloescht werden
- Nur der SHA-256 Hash wird gespeichert — Klartext ist nicht wiederherstellbar

---

## 4. Workflow-Regeln ins Projekt laden

### 4.1 Setup-Script (empfohlen)

```bash
# Aus dem TeamPortal-Verzeichnis:
npx tsx scripts/setup-project.ts https://teamportal-hub.vercel.app <API_KEY> mein-projekt
```

Erstellt/aktualisiert:
- `.claude/rules/teamportal-workflow.md` — Git-Workflow, Commit-Format, API
- `CLAUDE.md` — Agent-Context, Ticket-System
- `.env.example` — API-Key Platzhalter (append)

### 4.2 CLAUDE.md Download

1. `/p/mein-projekt/onboarding` oeffnen
2. **"CLAUDE.md herunterladen"** Button klicken
3. Datei ins Projekt-Root legen

---

## 5. Hetzner VPS — Datenbank-Server

### Verbindungsdaten

| | |
|---|---|
| **IP** | 178.105.135.102 |
| **Port** | 5432 |
| **User** | moritz_admin (Superuser) |
| **Datenbank** | teamportal |
| **OS** | Ubuntu 24.04 LTS |
| **PostgreSQL** | 16.x |

### SSH-Zugang

```bash
ssh root@178.105.135.102
```

### Connection-String

```
postgresql://moritz_admin:<PASSWORT>@178.105.135.102:5432/teamportal
```

### Backups

| | |
|---|---|
| **Automatisch** | Taeglich 03:00 UTC, 7-Tage-Rotation |
| **Lokal** | `X:\BusinessBackups\backup-pull.bat` (14 Tage) |
| **Manuell** | `ssh root@178.105.135.102 "/usr/local/bin/pg-backup.sh"` |

### Restore

```bash
gunzip -c /var/backups/postgresql/<backup>.sql.gz | sudo -u postgres psql teamportal
```

---

## 6. Drizzle ORM Konfiguration

### Schema-Dateien

Alle Schemas liegen in `team-portal/src/lib/db/schema/`:

| Datei | Tabellen |
|---|---|
| `projects.ts` | projects, project_members |
| `tickets.ts` | tickets, ticket_checklist_items, ticket_comments, ticket_categories, ticket_attachments |
| `auth.ts` | user, session, account, verification (Better Auth) |
| `api-keys.ts` | api_keys |
| `servers.ts` | servers |
| `forum.ts` | forum_posts, forum_comments |
| `changelog.ts` | changelog_entries |
| `goals.ts` | team_goals, goal_milestones, goal_comments, goal_assignees |
| `timetracking.ts` | time_entries |
| `deployment.ts` | deployment_test_results, deployment_comments |
| `documents.ts` | doc_comments |

### Migration erstellen + ausfuehren

```bash
# Schema aendern, dann:
npx drizzle-kit generate        # Migration generieren
npx drizzle-kit push             # Direkt auf DB anwenden (dev)
npx drizzle-kit migrate          # Migration-Dateien ausfuehren (prod)
```

### Wichtig: project_id

**Jede Tabelle mit Projektdaten hat eine `project_id` Spalte.**
Alle Queries MUESSEN nach `project_id` filtern — sonst sieht man Daten anderer Projekte.

---

## 7. Better Auth Integration

### Konfiguration

```
BETTER_AUTH_SECRET=<min. 32 Zeichen, zufaellig>
BETTER_AUTH_URL=https://teamportal-hub.vercel.app
```

### Rollen-System

| Rolle | Scope | Kann |
|---|---|---|
| **Superadmin** | Global (`user.role = 'admin'`) | Alles, Projekte anlegen |
| **Projekt-Admin** | Pro Projekt (`project_members.role = 'admin'`) | Projekt verwalten |
| **Kunde** | Pro Projekt (`project_members.role = 'kunde'`) | Eingeschraenkt |

### Session-Check

```typescript
// Server Component:
const session = await auth.api.getSession({ headers: await headers() });

// Server Action:
const user = await requireUser(); // wirft Error wenn nicht eingeloggt
```

### Middleware (Cookie-basiert)

Die Middleware prueft nur ob ein Session-Cookie existiert (kein DB-Query).
Die echte Validierung passiert im Portal-Layout (Server Component).

HTTPS-Cookies: `__Secure-better-auth.session_token`
HTTP-Cookies: `better-auth.session_token`

---

## 8. Environment Variables

### Pflicht-Variablen

| Variable | Beschreibung |
|---|---|
| `BETTER_AUTH_SECRET` | Session-Signierung (min. 32 Zeichen) |
| `BETTER_AUTH_URL` | App-URL (fuer Callbacks) |
| `DATABASE_URL` | PostgreSQL Connection-String |
| `GITHUB_PAT` | GitHub Personal Access Token |

### Optionale Variablen

| Variable | Beschreibung |
|---|---|
| `ANTHROPIC_API_KEY` | Fuer KI-Ticket-Generierung |
| `NEXT_PUBLIC_APP_NAME` | App-Name im Browser-Tab |
| `GITHUB_OWNER` | GitHub Owner (Fallback) |
| `GITHUB_REPO` | GitHub Repo (Fallback) |

---

## 9. Testing & Validierung

### Datenbank-Verbindung testen

```bash
# Verbindung pruefen:
node -e "require('dotenv').config({path:'.env.local'}); const p=require('postgres'); const s=p(process.env.DATABASE_URL,{prepare:false,max:1}); s\`SELECT version()\`.then(r=>{console.log('OK:',r[0].version);s.end()}).catch(e=>{console.error('FEHLER:',e.message);process.exit(1)})"
```

### Schema pruefen

```bash
ssh root@178.105.135.102 "sudo -u postgres psql teamportal -c \"SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;\""
```

### API-Endpunkte testen

```bash
# Tickets laden:
curl -H "Authorization: Bearer tp_..." https://teamportal-hub.vercel.app/api/v1/tickets

# Ticket erstellen:
curl -X POST -H "Authorization: Bearer tp_..." -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test-Ticket","priority":"niedrig"}' \
  https://teamportal-hub.vercel.app/api/v1/tickets
```

---

## 9a. Burnrate-Anzeige einrichten (einmalig, global)

Der Ring oben rechts im TeamPortal-Header zeigt die Claude-Max Session-Auslastung
(5h-Fenster + 7-Tage-Cap). **Die Einrichtung ist projekt-unabhaengig** und muss
pro Rechner nur einmal gemacht werden — nicht pro Projekt.

Alles laeuft ueber ein self-contained Setup-Script (kein Repo-Clone, keine
Dateien im Projekt-Ordner). Das Script patcht ausschliesslich `~/.claude/`.

### Voraussetzungen

- Claude Max Abo (OAuth-Endpoint liefert sonst keine Daten)
- Node.js 18+
- Eingeloggt in Claude Code (`~/.claude/.credentials.json` existiert)
- Beliebiger TeamPortal API-Key + eigene User-ID (Anzeige gilt global fuer
  alle Projekte auf diesem Rechner)

### Schritt 1: Setup-Script herunterladen

Ueber die Admin-Einstellungen im Portal (`/admin-settings/burnrate` →
"Setup-Script herunterladen") oder direkt per curl aus der eingeloggten Session:

```bash
curl -L -o teamportal-burnrate-setup.mjs \
  -H "Cookie: <deine-session-cookies>" \
  "https://teamportal-hub.vercel.app/api/v1/download/burnrate-setup"
```

Das Script enthaelt den Hook als Inline-Bundle — es referenziert keine
Dateien aus einem lokalen TeamPortal-Repo und kann an beliebiger Stelle
ausgefuehrt werden (z.B. Downloads-Ordner).

### Schritt 2: User-ID nachschlagen

Im TeamPortal eingeloggt → F12 → Network-Tab → beliebigen API-Request
inspizieren. Die User-ID steht im Session-Cookie oder Response-Body.
Alternativ zeigt die Onboarding-Seite sie bereits vorbefuellt an.

### Schritt 3: Script ausfuehren

```bash
node teamportal-burnrate-setup.mjs <API_KEY> <USER_ID>
```

Das Script legt an bzw. patcht:

| Datei | Zweck |
|---|---|
| `~/.claude/teamportal-hook.js` | Statusline-Hook (Inline-Bundle) |
| `~/.claude/teamportal-statusline-wrapper.js` | Wrapper mit Env-Vars vorbefuellt |
| `~/.claude/settings.json` | statusLine.command auf den Wrapper gepatcht (Backup: `.bak`) |

Idempotent — mehrfaches Ausfuehren aktualisiert nur die Zieldateien.

### Schritt 4 (optional, Windows): Background-Push

Damit der Ring auch bei Quack/Headless-Nutzung aktuell bleibt, alle 5 Min via Scheduled-Task pushen:

```cmd
copy team-portal\scripts\teamportal-background-push.template.bat %USERPROFILE%\.claude\teamportal-background-push.bat
:: FILL_ME_IN in der BAT durch API-Key + User-ID ersetzen

schtasks /create /tn "TeamPortalUsagePush" ^
    /tr "%USERPROFILE%\.claude\teamportal-background-push.bat" ^
    /sc minute /mo 5 /rl LIMITED /f

schtasks /run /tn "TeamPortalUsagePush"
```

Deinstallieren: `schtasks /delete /tn "TeamPortalUsagePush" /f`

### Verifizieren

- Claude Code neu starten → Statusline zeigt `[TP XX%]` (XX = freies 5h-Guthaben in Prozent)
- Browser TeamPortal-Tab refreshen → Ring oben rechts faerbt sich (gruen &ge;75% frei, gelb &ge;25%, rot &lt;25%)

### Burnrate-Troubleshooting

| Symptom | Ursache / Fix |
|---|---|
| `[TP -]` in Statusline | Kein OAuth-Token — `~/.claude/.credentials.json` fehlt/leer |
| `[TP err]` in Statusline | Anthropic-Endpoint fehlerhaft und kein Cache verfuegbar |
| Kein TP-Suffix in Statusline | Wrapper laeuft nicht — Pfad in `settings.json` pruefen |
| Ring im TeamPortal bleibt grau | API-Key oder User-ID falsch — Heartbeat mit `curl` testen |

Heartbeat-Test:

```bash
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"userId":"DEINE_ID","fiveHourUsedPct":50}' \
  https://teamportal-hub.vercel.app/api/v1/usage/heartbeat
# Erwartet: {"ok":true}
```

---

## 10. Troubleshooting

### Connection Refused (Port 5432)

```bash
# PostgreSQL listen_addresses pruefen:
ssh root@178.105.135.102 "grep listen_addresses /etc/postgresql/16/main/postgresql.conf"
# Muss sein: listen_addresses = '*'

# Firewall pruefen:
ssh root@178.105.135.102 "ufw status"
# Port 5432 muss ALLOW sein
```

### Permission Denied (DB)

```bash
# pg_hba.conf pruefen:
ssh root@178.105.135.102 "grep -v '^#' /etc/postgresql/16/main/pg_hba.conf | grep -v '^$'"
# Muss enthalten: host all all 0.0.0.0/0 scram-sha-256
```

### Migration Failures

```bash
# Schema-Status pruefen:
npx drizzle-kit generate  # Zeigt ob Aenderungen pending sind

# Direkt pushen (dev only):
echo "y" | npx drizzle-kit push
```

### Login-Endlosschleife (Vercel)

- `BETTER_AUTH_URL` muss exakt der Vercel-Domain entsprechen
- Vercel Deployment Protection muss auf "Disabled" stehen
- Cookies pruefen: `__Secure-better-auth.session_token` muss gesetzt sein

### GitHub API 404

- Repo existiert? `gh repo view owner/repo`
- PAT hat Zugriff? `curl -H "Authorization: Bearer ghp_..." https://api.github.com/repos/owner/repo`
- `main` vs `master`: Der Code erkennt automatisch welcher Branch existiert

---

## 11. Projekt-Mitglied hinzufuegen

1. User muss sich zuerst registrieren (Login-Seite)
2. `/p/mein-projekt/team` oeffnen
3. Email eingeben + Rolle waehlen (Admin/Kunde)
4. **Hinzufuegen**

Oder via Datenbank:
```sql
INSERT INTO project_members (project_id, user_id, email, role)
VALUES ('<project-uuid>', '<user-id>', 'email@example.com', 'admin');
```

---

## 12. Checkliste: Neues Projekt komplett einrichten

- [ ] Projekt in TeamPortal UI anlegen (Name, Slug, GitHub, URLs)
- [ ] API-Key generieren (Einstellungen → API-Keys)
- [ ] Workflow-Regeln laden (`npx tsx scripts/setup-project.ts ...`)
- [ ] CLAUDE.md ins Projekt-Root kopieren
- [ ] `.env.local` mit API-Key + DB-URL konfigurieren
- [ ] KI-Kontext hochladen (Einstellungen → Projektdokumentation)
- [ ] Kategorien anlegen (Tickets → Kategorie-Verwaltung)
- [ ] Team-Mitglieder einladen
- [ ] `npm run dev` testen — Login + Tickets funktionieren
- [ ] DevStatus pruefen — GitHub-Anbindung korrekt

---

*Generiert vom TeamPortal — 28.7.2026*
