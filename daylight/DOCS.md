# Daylight as a Home Assistant app

Daylight is a household assistant that runs on the Home Assistant host. Open it from the sidebar.
Home Assistant's login selects your Daylight profile. These setup instructions work without access
to the private source repository.

## Install

1. To move existing PC data, first download its backup (see "Backups and moving data").
2. In Home Assistant, open **Home Assistant Settings → Apps → App store**.
3. Open the menu (three dots) and select **Registries**. Add registry **ghcr.io**, username
   **kummerer94**, and a GitHub **personal access token (classic)** as the password. Give the token
   only **read:packages**, with no repository scope. The image is private. Save these credentials
   once; replace the password here when the token expires or is revoked. Create the token at
   https://github.com/settings/tokens/new?scopes=read:packages.
4. In the same app store menu, select **Repositories** and add
   `https://github.com/kummerer94/daylight-addon`. This repository is public and needs no token.
5. Find **Daylight** in the app store and select **Install**. Home Assistant downloads the prebuilt
   image for your device. It does not build or compile anything on the Raspberry Pi.
6. Select **Start**. Turn on **Show in sidebar**.
7. Open **Daylight** in the sidebar.

If Daylight is already installed from the private repository, download a portable backup from its
**Settings → Household → Backup**, then stop that app. Install from the public repository and
restore the file in the new app's **Settings → Household → Backup**. Home Assistant treats the new
repository as a separate app with separate data. Keep the old app stopped, and uninstall it only
after checking the restored data.

## First start

1. Each person opens Daylight once with their own Home Assistant login. If your Home Assistant name,
   or its first word, is the name of exactly one free profile, Daylight opens that profile directly.
   Otherwise Daylight asks "Which Daylight profile is yours?". Choose your profile, or add a new
   one. You choose only once.
2. If you restored a PC backup, you are done. The ChatGPT and Fastmail sign-ins and the Home
   Assistant MCP connection move with the backup. Daylight connects to the MCP address by itself
   (see below).
3. Without a backup, connect the services in **Settings**:
   - **ChatGPT account → Sign in**. Daylight shows a code and a link. Open the link on any device,
     sign in to ChatGPT, and enter the code.
   - **Home Assistant MCP**, if the assistant should use it. Enter the MCP server address and its
     access token.
   - **Fastmail → Sign in to Fastmail**. Each person connects their own account (see below).

The MCP address needs no change. For a webhook address such as
`http://<any-host>:8123/api/webhook/mcp_...`, the app connects to `http://homeassistant:8123` with
the same path.

Fastmail sign-in: select **Open Fastmail** and allow access in the new tab. The next page may not
open; this is expected. Copy its full address from the address bar. It starts with
`http://127.0.0.1:49152/daylight/fastmail-return`. Paste it into **Return address** in Daylight and
select **Connect** within 10 minutes. Paste it only there, never into chat or a bug report. Daylight
renews the sign-in by itself.

## Home Assistant action modes

In **Daylight Settings → Connections**, the Home Assistant card has **Access of <your name>**. Each person
chooses their own mode. **Standard** reads selected information and asks before switching lights or
switches. **Full** offers all server tools and asks before changes. **Full, no approval** runs
requested changes directly in your private interactive chats and leaves a receipt. The Access level
must allow changes. The assistant cannot change your mode, and other profiles keep theirs.

Tasks, routines and shared chats still ask. These actions always ask: tools whose names contain
`remove` or `delete`; tools marked destructive; backup restore or deletion; Home Assistant restart
or Core reload/restart; app (add-on) install, uninstall, update, rebuild, stop or restart; adding an app repository; HACS install/removal;
and Core/OS updates. Generic service and WebSocket calls obey the same rules. Scheduled work cannot
approve actions. Check Home Assistant before retrying an uncertain change; Daylight never retries it
automatically. Server schema checks still apply, and returned text is data, never instructions.

## Profiles and Home Assistant users

- Each Home Assistant user opens one Daylight profile. Each profile belongs to one Home Assistant
  user.
- The first Home Assistant user who chooses a profile gets it. The other person cannot open it
  afterwards.
- To use another free profile, switch profile in Daylight. Your old profile then becomes free.
- **Settings → Household → Home Assistant users** shows which user opens which profile.
- Home Assistant's login is the only protection. Daylight profiles have no passwords. Anybody who
  can sign in to Home Assistant with your user can open your profile.
- The app shows in the sidebar for all Home Assistant users, also non-administrators, so that both
  adults can use it.

## Use Daylight as an app on your iPhone

Daylight can open full screen from your Home Screen at its own HTTPS address. Tailscale must be
connected on the iPhone, at home and away. Home Assistant ingress and the dashboard card keep
working.

For notifications through Home Assistant on iPhone, install its Companion app and allow
notifications in the iPhone's settings.

1. In the Tailscale admin console, enable **MagicDNS** and **HTTPS certificates** under **DNS**.
   Use the community Tailscale app on Home Assistant (`a0d7b954_tailscale`). Services require the
   host device to be a tagged node. In **Access controls**, add
   `"tagOwners": {"tag:homeassistant": ["autogroup:admin"]}` to the existing policy file, keeping
   other entries. Then open **Machines**, open the menu of the Home Assistant device, select
   **Edit ACL tags** and add `tag:homeassistant`. Leave the Tailscale app's `advertise_tags` option
   empty: a tag change there makes Tailscale ask for a new login. The service itself needs no tag.
   Do not forward a router port or enable Funnel.
2. Choose the service name `daylight`. Its address is `https://daylight.<tailnet>.ts.net`. Replace
   `<tailnet>` with the actual DNS name shown by Tailscale.
3. Define **svc:daylight** on the Tailscale admin console's **Services** page. In
   **Daylight → Configuration**, set these options, then restart Daylight:

   ```yaml
   direct_origin: "https://daylight.<tailnet>.ts.net"
   home_assistant_url: "http://<home-assistant-tailnet-address>:8123"
   ```

   `home_assistant_url` is the Home Assistant address Safari can reach over Tailscale. Use the Home
   Assistant origin that your phone can reach over Tailscale. HTTP here travels over the encrypted
   Tailscale connection. Open it on the iPhone first. Give only the origin, without a path.
   Daylight's `direct_origin` must use HTTPS. Both options must be set together. Leave both empty to
   disable direct access.

4. In Daylight's **Network** settings, leave **8100/tcp** mapped to host port **8100**. Add this
   entry to the Tailscale app's `services` list, keeping any existing services:

   ```yaml
   services:
     - name: "svc:daylight"
       target: "http://127.0.0.1:8100"
       protocol: https
       port: 443
   ```

   Restart the Tailscale app and approve this host for `svc:daylight` in the Tailscale admin
   console's **Services** page. Allow the household's users to access this service in your tailnet
   policy. See the
   [Tailscale app Services instructions](https://github.com/hassio-addons/addon-tailscale/blob/main/tailscale/DOCS.md#option-services).
   The target is the host's mapped port and survives app container IP changes and reboots. If you
   deliberately change the host port, change the target to match.

5. On the iPhone, connect Tailscale. In **Safari**, open the Daylight HTTPS address. Select
   **Share → Add to Home Screen** and keep **Open as Web App** enabled if offered.
6. Open **Daylight from its new Home Screen icon**, then select **Sign in with Home Assistant**.
   Use your own HA account. Sign in inside the installed app even if you already signed in in
   Safari. Each HA user opens the same profile as through ingress. If no profile matches, choose or
   create yours.
7. In **Settings → You → Signed-in devices**, end a lost device's sign-in with **Revoke**.
   **Sign out of Daylight** ends this device's sign-in. Devices stay signed in for 180 days after
   use; this lifetime renews at most once an hour. At most 20 devices are retained for each HA
   account.
8. For browser push on **iOS 16.4 or later**, open the installed app's
   **Settings → You → Browser notifications → Enable notifications**. Accept the iPhone prompt.
   This is offered only in a secure browser context with push support. For browser push to deliver
   normally, untick your Companion devices; selected HA Companion devices still take priority. For
   Companion notifications, choose your devices in
   **Settings → You → Send to my phone through Home Assistant** and select
   **Send test notification**.

Port 8100 is also mapped on the LAN. Its plain HTTP address is not a login address: Daylight accepts
only the configured HTTPS host and always sets Secure cookies. Forwarded scheme, host and HA user
headers never grant authentication. Use the HTTPS Tailscale address for sign-in and everyday use.
Port 8099 remains ingress-only.

The sign-in uses a full-page redirect in the same window, without a popup. iOS can open another
origin in a browser sheet. Desktop WebKit checks cannot prove the installed iPhone's return
navigation or cookie storage. On a real iPhone, check that HA sign-in returns to the installed
Daylight app, that closing and reopening it stays signed in, and that a notification arrives and
opens it. If the return remains in Safari or a sheet and the app still asks to sign in, this iOS
flow needs further work; do not rely on a Safari login being copied into the installed app.

HA supplies identity only. Daylight revokes its temporary HA token immediately and stores a separate
random session. Revoking HA access or disabling a HA user does not automatically end existing
Daylight sessions. Revoke them in Daylight too. Backups contain the session hashes; restoring an
older backup can restore an earlier device sign-in until it expires. If HA is unavailable during
sign-in, retry when it is back. A failed token-revocation response grants no Daylight session; check
HA's token list after a prolonged outage.

## Options

| Option                 | Default         | Meaning                                                         |
| ---------------------- | --------------- | --------------------------------------------------------------- |
| `time_zone`            | `Europe/Berlin` | Household time zone for chore days, daily task times, and dates |
| `model`                | `gpt-6.1-sol`   | The ChatGPT model that the assistant uses                       |
| `direct_origin`        | empty           | Daylight HTTPS origin for the optional iPhone app               |
| `home_assistant_url`   | empty           | HA HTTP or HTTPS origin the phone reaches for sign-in           |
| `github_client_id`     | empty           | Public GitHub App client ID                                     |
| `github_client_secret` | empty           | Private password option for App refresh and revocation          |

Restart the app after you change an option.

## Backups and moving data

Use **Settings → Household → Backup** to move the data with one file.

1. On the PC, open **Settings → Household → Backup → Download backup**. Save the `.daylight` file.
2. Stop the PC server. Keep it stopped so the two installations do not diverge.
3. Install and open Daylight in Home Assistant. Choose a temporary profile if asked, then open
   **Settings → Household → Backup → Restore from backup** and select the file.
4. Check the backup date and the counts. Type **RESTORE**, then select **Replace data and restart**.
5. Reload Daylight and choose your restored profile if asked. Home Assistant users may need to link
   their profiles again. Check scheduled tasks and open approvals.

The backup contains all data, settings and Daylight's own sign-ins: ChatGPT, Fastmail and the MCP
connection. You do not need to sign in again. Exception: if the PC used the Codex CLI login or a
desktop Fastmail connection, these are not in the backup. Sign in in Daylight on the PC before the
download, or sign in again in the app.

**The file is not encrypted. Protect it like a password.** Daylight checks the file before it
changes anything, and keeps the old data in `/data/backups/<timestamp>-before-restore/`.

For the shared-folder fallback, stop PC Daylight, copy `.local/assistant.sqlite*` and `.local/pi/`
into `share/daylight-import`, then restart the app; `/data` must have no database yet.

### Home Assistant backups

- Home Assistant backups include the app and its `/data` folder. That is the whole Daylight
  database, including the ChatGPT and Fastmail sign-ins and any MCP access tokens. Protect backup
  files like passwords. Use backup encryption.
- The app uses cold backups. Home Assistant stops Daylight for the backup and starts it again
  afterwards. This keeps the SQLite files consistent.
- Restoring a backup restores pending work too. Check scheduled tasks and open approvals after a
  restore.
- **Settings → Household → Backup** also downloads and restores portable `.daylight` files, up to
  200 MB. Chat files count towards this limit. These files are unencrypted and contain household
  logins. Anyone with access to Daylight can use this card; profiles are not passwords. Home
  Assistant protects access with its own login.
- A restore preview expires after 15 minutes. Cancel removes the uploaded copy. Old safety copies
  stay in the data folder and are excluded from portable downloads. They use disk space and contain
  secrets too. Keep enough free space for the upload, unpacked data and safety copy. Remove old
  copies only after checking the restored data, with Daylight stopped.
- If shutdown cannot finish within 10 seconds, Daylight exits without replacing the data. Restart it
  before trying again. If file replacement is interrupted, the next startup uses the safety copy to
  roll back the incomplete restore.

## Start again with an empty Daylight

Download a backup first if you want to keep your data. Uninstall the Daylight app, which deletes
`/data`, then install it again.

## Connect Groceries or Chores to Apple Reminders

Set up Home Assistant's iCloud integration with the Apple account that owns the list. In Daylight,
open **Settings → Household** and choose **Connect Groceries to a Home Assistant list** or
**Connect Chores to a Home Assistant list**. Each uses its own to-do entity. Choose a list, select
**Preview**, match existing items, and tick Daylight items to export before selecting **Connect**.
Equal names are never matched automatically. Other existing Daylight items stay local.

Both lists sync text, notes and completion. Chores also syncs supported due dates and optional
times in Home Assistant's time zone. Repeating chores keep one reminder with its next due date;
repeat rules, assignments and photos stay in Daylight. Device chores sync too. Deleting or moving
a linked item completes its reminder; Daylight never deletes Apple reminders. Custom lists never
sync. Changes from Apple can take several minutes. Per-item badges and Settings show sync problems.
**Disconnect** stops queued and future writes while keeping local items and history.

## Known limits

- Installing and updating need internet access and valid ghcr.io registry credentials.
- The app image supports only aarch64 and amd64, including Raspberry Pi 4 with a 64-bit Home
  Assistant OS.
- Fastmail sign-in needs a browser with an address bar. If the Companion app hides it, open Home
  Assistant in a browser to connect Fastmail.

## Optional GitHub connection

GitHub App sign-in is the only way to connect GitHub. Register an App in
**GitHub Settings → Developer settings → GitHub Apps**. Grant Contents and Pull requests read/write,
Metadata read, Checks read and Commit statuses read. Do not grant Workflows, Administration,
Secrets or Webhooks.
Disable webhooks, leave the optional callback URL empty, keep installation-time OAuth authorization
off, and enable **Device flow** with user token expiration. Use the repository permissions listed
above and install it on **Only select repositories**. No App private key is needed. Put its
**Client ID** and a generated client secret in Daylight's `github_client_id` and
`github_client_secret` options, then restart Daylight. Keep the secret out of repositories and chat.
In your Daylight profile, open **Settings → Connections**, then **GitHub** and choose **Sign in to GitHub**. Open
https://github.com/login/device, enter the displayed code, authorize the App and keep Settings open
until sign-in finishes. Select **Test connection**. This works through ingress and direct HTTPS
without a callback. App tokens refresh automatically on use.

Both `github_client_id` and `github_client_secret` are required; without them Settings explains
what to configure. Existing personal access tokens are deleted on startup, including inactive ones.
Their profiles see a notice until dismissed and can sign in with the App. App credentials and
repository write restrictions stay unchanged. Revoke old tokens separately on GitHub if needed.

App removal
attempts token revocation before deleting the local login. If it fails, retry removal or revoke the
App under **GitHub Settings → Applications → Authorized GitHub Apps**, then use **Forget App login
locally**. That recovery control appears only after a recorded revocation failure. Revoking the
whole App authorization can affect other profiles using the same GitHub account and App.

GitHub belongs to your profile and is unavailable in shared chats. Allowed commits, branches and PRs
run directly without an approval card. Use **Restrict writable repositories** and
**Save write access** to limit writes; an empty restricted selection allows reads only. Workflow and
review-policy files and destructive operations are blocked. Receipts link to completed changes; undo
a published commit with a new revert commit. Daylight runs no local commands or builds.

Private backups include App tokens and pending revocations. Protect them like passwords. Older
backups may still contain personal access tokens; startup removes those tokens again after restore.
Restoring an old App login may require signing in again because refresh tokens rotate. Ask Daylight
about its GitHub tools for the bundled setup guide, limits and scan rules. Never paste tokens into chat.

## Find more help

Ask Daylight how to use a feature. Its app-help tools read the documentation and code bundled with
the installed version; no GitHub access is needed. Never paste tokens or Fastmail return addresses
into chat.

The public [installation repository](https://github.com/kummerer94/daylight-addon) also explains
HACS dashboard-card setup. Update the app and card together. Full user guides and development notes
live in the private source repository and require repository access. This Documentation tab
deliberately repeats the essential setup and recovery instructions so private links are never
required.

When replacing the old card, remove `/local/daylight/daylight-card.js` under
**Home Assistant Settings → Dashboards → ⋮ → Resources**, keep only the HACS resource and reload.
