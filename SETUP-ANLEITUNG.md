# BelegBot – Vollständige Setup-Anleitung

## Übersicht

Was wir einrichten:
1. **Telegram Bot** erstellen
2. **Anthropic API Key** holen
3. **Supabase-Datenbank** vorbereiten (Schema + Tabelle + Storage)
4. **n8n Workflow** importieren und konfigurieren
5. **Webapp deployen** auf deinen Apache-Server
6. **Testen**

---

## Schritt 1: Telegram Bot erstellen

1. Öffne Telegram und suche nach `@BotFather`
2. Schreibe `/newbot`
3. Gib deinem Bot einen Namen (z.B. `MeinBelegBot`)
4. Gib einen Username ein (muss auf `_bot` enden, z.B. `lena_moritz_beleg_bot`)
5. Du bekommst einen **Bot-Token** – sieht so aus: `7123456789:AAFxxx...`  
   → Diesen sicher aufbewahren!

**Deine Telegram-User-ID herausfinden:**
- Schreibe `@userinfobot` eine Nachricht
- Oder: `@getidsbot`
- Notiere die IDs von Lena **und** Moritz – beide werden im n8n-Workflow gebraucht

---

## Schritt 2: Anthropic API Key

1. Gehe zu [console.anthropic.com](https://console.anthropic.com)
2. Account erstellen / einloggen
3. → API Keys → Create Key
4. Key notieren (nur einmal anzeigbar!)

---

## Schritt 3: Supabase-Datenbank einrichten

### 3a. Tabelle erstellen

Verbinde dich mit deiner Supabase-Datenbank:

```bash
docker exec -it supabase-db psql -U supabase_admin -d postgres
```

Führe dann **komplett** den Inhalt der Datei `database-schema.sql` aus:

```bash
# Alternativ direkt als Datei einspielen (vom Server aus):
docker cp /pfad/zu/database-schema.sql supabase-db:/tmp/schema.sql
docker exec -it supabase-db psql -U supabase_admin -d postgres -f /tmp/schema.sql
```

Prüfen, ob die Tabelle erstellt wurde:
```sql
\dt belegbot.*
-- Sollte "receipts" anzeigen
```

### 3b. Storage Bucket erstellen

Öffne die Supabase Studio UI (normalerweise auf Port 3000 oder via deinem Setup).

**Oder per SQL:**
```sql
-- In der Supabase DB ausführen
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true);

-- RLS für Storage
CREATE POLICY "Public receipts" ON storage.objects
  FOR ALL USING (bucket_id = 'receipts');
```

**Oder via Supabase API:**
```bash
curl -X POST http://192.168.178.61:8000/storage/v1/bucket \
  -H "Authorization: Bearer DEIN_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"receipts","name":"receipts","public":true}'
```

> Den Service Role Key findest du in deiner Supabase Docker-Konfiguration  
> (meist in `/etc/supabase/.env` oder der docker-compose.yml als `SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`)

---

## Schritt 4: n8n Workflow konfigurieren

### 4a. Workflow importieren

1. Öffne n8n unter `https://xoe8312g4177ugoq.myfritz.net:8444/`
2. → Workflows → **Import from file**
3. Wähle `n8n-workflow.json` aus

### 4b. Telegram Credentials einrichten

1. In n8n: → Credentials → New Credential → **Telegram API**
2. Name: `BelegBot Telegram`
3. Access Token: Dein Bot-Token aus Schritt 1
4. Speichern

Dann im Workflow alle Telegram-Nodes auf diese Credential verweisen lassen (die Nodes mit `DEINE_TELEGRAM_CREDENTIAL_ID`).

### 4c. Environment Variables in n8n setzen

In n8n unter **Settings → Environment Variables** (oder in der n8n Docker-Compose):

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_SERVICE_KEY=eyJhbGciOi...  (der service_role key)
```

Bei Docker in der `docker-compose.yml` (n8n-Service):
```yaml
environment:
  - N8N_ENCRYPTION_KEY=dein-key
  - ANTHROPIC_API_KEY=sk-ant-dein-key
  - SUPABASE_SERVICE_KEY=eyJ...service-role-key...
```

Nach Änderung: `docker restart n8n`

### 4d. Telegram User-IDs eintragen

Im Workflow-Node **"Tokens parsen"**, im Code:

```javascript
const USER_MAP = {
  123456789: 'lena',    // ← Lenas echte Telegram-User-ID einsetzen
  987654321: 'moritz',  // ← Moritz' echte Telegram-User-ID einsetzen
};
```

### 4e. Webhook aktivieren

1. Den Workflow-Node "Telegram Trigger" öffnen
2. Webhook-URL kopieren (zeigt n8n automatisch an)
3. **Oder:** Telegram-Trigger benutzt automatisch n8n's eingetragenen Webhook

**Telegram Webhook manuell setzen (falls nötig):**
```bash
curl "https://api.telegram.org/botDEIN_BOT_TOKEN/setWebhook?url=https://xoe8312g4177ugoq.myfritz.net:8444/webhook/belegbot-webhook"
```

### 4f. Workflow aktivieren

Den Toggle oben rechts im Workflow auf **Active** stellen.

---

## Schritt 5: Webapp deployen

### 5a. GitHub Repository erstellen

1. Erstelle ein neues Repo auf GitHub (z.B. `belegbot`)
2. Füge den Code ein:

```bash
cd /pfad/zum/belegbot-ordner
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/moritzsta/belegbot.git
git push -u origin main
```

### 5b. Server-Deployment

SSH auf deinen Server, dann:

```bash
cd /opt/webapps
sudo git clone https://moritzsta:GITHUB-TOKEN@github.com/moritzsta/belegbot.git belegbot
cd belegbot
sudo npm install
sudo npx vite build
```

### 5c. Apache konfigurieren

Datei öffnen:
```bash
sudo nano /etc/apache2/sites-available/supabase.conf
```

Vor `</VirtualHost>` einfügen:
```apache
# --- BelegBot App ---
Alias /belegbot /opt/webapps/belegbot/dist
<Directory /opt/webapps/belegbot/dist>
    Options -Indexes +FollowSymLinks
    AllowOverride None
    Require all granted
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /belegbot/index.html [L]
</Directory>

# --- BelegBot: Anthropic API Proxy ---
# Regel 2: API-Key wird hier serverseitig injiziert — NIEMALS im Frontend-Code!
<Location /belegbot/anthropic-api/>
    ProxyPass https://api.anthropic.com/
    ProxyPassReverse https://api.anthropic.com/
    RequestHeader set x-api-key "sk-ant-api03-DEIN-ANTHROPIC-KEY-HIER"
    RequestHeader set anthropic-version "2023-06-01"
    RequestHeader unset Origin
    RequestHeader unset Referer
</Location>
```

Dann:
```bash
# mod_headers aktivieren (einmalig nötig für RequestHeader)
sudo a2enmod headers proxy proxy_http

sudo apachectl configtest   # sollte "Syntax OK" anzeigen
sudo systemctl reload apache2
```

### 5d. App testen

Öffne: `https://xoe8312g4177ugoq.myfritz.net/belegbot/`

---

## Schritt 6: Vollständiger Funktionstest

### Test 1: Einfacher privater Beleg
1. Schicke ein Foto deines Kassenbons an den Bot, **ohne Text**
2. Erwartung: Bot antwortet mit Bestätigung (Händler, Betrag, Datum, Kategorie)
3. In der App: Beleg erscheint unter "Privat"

### Test 2: Gemeinsamer Beleg mit Token
Schicke ein Beleg-Foto mit Text:
```
g:ja Pizzaabend
```
→ Erscheint unter "Gemeinsam"

### Test 3: Andere Person als Ausleger
```
g:ja p:lena Baumarkt für Küche
```
→ Gemeinsam, Ausleger = Lena

### Test 4: Nur privater Beleg mit Notiz
```
p:moritz Tanken für Wochenendtrip
```
→ Privat, Ausleger = Moritz, Notiz gesetzt

---

## App aktualisieren (nach Code-Änderungen)

```bash
cd /opt/webapps/belegbot
sudo git checkout -- .
sudo git pull
sudo npm install
sudo npx vite build
# Kein Apache-Neustart nötig!
```

---

## Fehlerbehebung

### Problem: Bot antwortet nicht
- Prüfe, ob der Workflow aktiv ist (n8n)
- Überprüfe den Webhook: `https://api.telegram.org/botTOKEN/getWebhookInfo`
- Schaue in n8n → Executions nach Fehlern

### Problem: KI erkennt Beleg nicht richtig
- Überprüfe, ob `ANTHROPIC_API_KEY` korrekt gesetzt ist
- Teste mit einem klareren, gut beleuchteten Foto
- Kategorie "Andere" ist der Fallback – manuell in der App ändern

### Problem: Webapp lädt keine Daten
- Browser-Konsole öffnen (F12) → Network-Tab
- Prüfe, ob `/rest/v1/receipts` Requests 200 zurückgeben
- Supabase-Status: `curl http://192.168.178.61:8000/rest/v1/ -H "apikey: ANON_KEY"`

### Problem: Belegs-Foto nicht sichtbar in App
- Prüfe, ob der `receipts`-Storage-Bucket als **public** erstellt wurde
- Test: `curl http://192.168.178.61:8000/storage/v1/object/public/receipts/TEST`

### Problem: "Unbekannter Nutzer" Fehler
- Telegram-User-ID im Workflow-Node "Tokens parsen" korrekt eingetragen?
- Finde User-IDs mit `@userinfobot` in Telegram

---

## Architektur-Übersicht

```
Telegram-App
    │  (Foto + Token-Text)
    ▼
Telegram Bot API
    │  (Webhook)
    ▼
n8n Workflow
    ├── Token-Parser (g:ja, p:lena, etc.)
    ├── Datei-Download (von Telegram CDN)
    ├── Claude API (KI-Extraktion: Händler, Betrag, Datum, Kategorie)
    ├── Supabase Storage (Beleg-Foto hochladen)
    ├── Supabase DB (INSERT receipts)
    └── Telegram-Bestätigung
    
React Webapp
    └── Supabase DB (SELECT/UPDATE/DELETE receipts)
```

---

## Sicherheitshinweise

- **Anon Key** ist im Frontend-Code — das ist OK, da Supabase RLS aktiv ist
- **Service Role Key** → NUR in n8n Environment Variables, NIEMALS im Frontend
- **Anthropic API Key** → NUR in n8n, NIEMALS im Frontend oder Git
- Die `.gitignore` Datei sollte `.env` enthalten

---

## Telegram-Tokens Kurzreferenz

| Token | Bedeutung | Beispiel |
|-------|-----------|---------|
| (kein Token) | Privat, Ausleger = Absender | — |
| `g:ja` | Gemeinsam | `g:ja` |
| `g:nein` | Explizit Privat | `g:nein Geheimkauf` |
| `p:lena` | Ausleger = Lena | `p:lena` |
| `p:moritz` | Ausleger = Moritz | `g:ja p:moritz Dinner` |
| Freier Text | Wird als Notiz gespeichert | `g:ja Pizzaabend im August` |

Tokens können in **beliebiger Reihenfolge** stehen.  
Unbekannte Tokens landen als Warnung + in der Notiz.
