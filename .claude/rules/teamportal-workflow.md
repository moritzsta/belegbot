# TeamPortal Workflow — Belegbot
# Automatisch generiert. Aenderungen werden beim naechsten Setup ueberschrieben.

## Session-Start (PFLICHT — immer als ERSTES!)
Bevor irgendwas anderes passiert:
1. git fetch origin
2. git checkout develop
3. git pull origin develop (lokalen develop auf Remote-Stand bringen)
4. Erst DANN weiterarbeiten (Ticket laden, Feature-Branch erstellen, etc.)
WARUM: Ohne Pull basiert alle Arbeit auf veraltetem Code → Konflikte und fehlende Features

## Branch-Sicherheit (PFLICHT bei jeder Session!)
- VOR JEDER Git-Operation: git branch --show-current ausfuehren
- Pruefen ob der erwartete Branch aktiv ist (z.B. feature/TK-0015-...)
- Bei Mismatch: WARNUNG an User, NICHT stillschweigend weiterarbeiten

## Git-Workflow
- Branching: feature/* → develop → main
- Feature-Branches IMMER von develop erstellen
- KEIN direkter Push auf develop oder main
- KEIN Force-Push, KEIN --no-verify
- IMMER PR erstellen (wird im TeamPortal gemergt)
- Nach Merge auf main: Fast-Forward develop auf main HEAD

## Ticket-Lade-Workflow (API-basiert)
Ticket laden (z.B. "TK-0015"):
1. GET http://localhost:3001/api/v1/tickets/TK-0015
   → Gibt zurueck: ticket mit checklistItems, comments, attachments
2. Zeige dem User: Titel, Beschreibung, Checkliste, Anhaenge, Kommentare, Prioritaet, Kategorie
WICHTIG: Checklisten-Items = strukturierte Akzeptanzkriterien des Tickets.

## Ticket-Status aendern
PATCH http://localhost:3001/api/v1/tickets/TK-0015
Body: { "status": "in_arbeit" }
Status-Flow: eingang → geplant → in_arbeit → review → erledigt

## Kommentar erstellen
POST http://localhost:3001/api/v1/tickets/TK-0015/comments
Body: { "body": "Automatisch verschoben: In Arbeit → Review" }

## API-Authentifizierung
Alle Requests brauchen den Header:
Authorization: Bearer ${TEAMPORTAL_API_KEY}

## Commit-Format (HEREDOC mit Testliste)
git commit -m "$(cat <<'EOF'
<typ>(TK-XXXX): <zusammenfassung in Imperativ, max 70 Zeichen>

<Beschreibung fuer Nicht-Entwickler. Was + Warum.>

Ticket: TK-XXXX
Testliste:
- [ ] Konkreter Testschritt auf Staging
- [ ] Weiterer Testschritt

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
WICHTIG: Ohne Testliste ist das Feature wertlos (DevStatus parst diese)

## Code-Konventionen
- TypeScript strict, keine any Types
- Funktionen max 20 Zeilen, Dateien max 300 Zeilen
- Absolute Imports mit @/ Prefix
- Commit-Types: feat, fix, refactor, style, docs
- KEINE Unicode-Umlaute in Commit-Messages (ae/oe/ue/ss)

## Checklisten-Struktur (fuer Ticket-Erstellung)
Jede Checkliste muss 3 Aspekte abdecken (3-8 Eintraege):
1. Erwartetes Ergebnis — Was soll der User sehen/tun koennen?
2. Akzeptanzkriterien — Woran erkennt man 'fertig'?
3. Einschraenkungen — Was darf nicht kaputtgehen? Edge Cases?
Kernprinzip: Beschreibe WAS, nicht WIE. Keine technischen Details.

## Agent-Status-Updates (automatisch bei Ticket-Bearbeitung)
Der Agent aktualisiert den Ticket-Status automatisch:
1. Ticket geladen → PATCH status = 'geplant'
2. Implementierung beginnt → PATCH status = 'in_arbeit' + Audit-Kommentar
3. PR erstellt → PATCH status = 'review' + Audit-Kommentar

API-Basis: http://localhost:3001/api/v1/tickets/
Auth: Authorization: Bearer ${TEAMPORTAL_API_KEY}
