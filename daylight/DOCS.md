# Daylight as a Home Assistant app

Daylight is the household assistant for two adults. This app runs it on the Home Assistant host. You open it from the Home Assistant sidebar. Home Assistant's login decides which Daylight profile opens.

Home Assistant calls add-ons "apps" since version 2026.2. This app is an add-on in the developer documentation.

## Install

1. To move existing PC data, first download its backup (see "Move the data from the PC").
2. In Home Assistant, open **Home Assistant Settings → Apps → App store**.
3. Open the menu (three dots) and select **Registries**. Add registry **ghcr.io**, username **kummerer94**, and a GitHub **personal access token (classic)** as the password. Give the token only **read:packages**, with no repository scope. The image is private. Save these credentials once; replace the password here when the token expires or is revoked. Create the token at https://github.com/settings/tokens/new?scopes=read:packages.
4. In the same app store menu, select **Repositories** and add `https://github.com/kummerer94/daylight-addon`. This repository is public and needs no token.
5. Find **Daylight** in the app store and select **Install**. Home Assistant downloads the prebuilt image for your device. It does not build or compile anything on the Raspberry Pi.
6. Select **Start**. Turn on **Show in sidebar**.
7. Open **Daylight** in the sidebar.

If Daylight is already installed from the private repository, download a portable backup from its **Settings → Household → Backup**, then stop that app. Install from the public repository and restore the file in the new app's **Settings → Household → Backup**. Home Assistant treats the new repository as a separate app with separate data. Keep the old app stopped, and uninstall it only after checking the restored data.

## First start

1. Each person opens Daylight once with their own Home Assistant login. If your Home Assistant name, or its first word, is the name of exactly one free profile, Daylight opens that profile directly. Otherwise Daylight asks "Which Daylight profile is yours?". Choose your profile, or add a new one. You choose only once.
2. If you restored a PC backup, you are done. The ChatGPT and Fastmail sign-ins and the Home Assistant MCP connection move with the backup. Daylight connects to the MCP address by itself (see below).
3. Without a backup, connect the services in **Settings**:
   - **ChatGPT account → Sign in**. Daylight shows a code and a link. Open the link on any device, sign in to ChatGPT, and enter the code.
   - **Home Assistant MCP**, if the assistant should use it. Enter the MCP server address and its access token.
   - **Fastmail → Sign in to Fastmail**. Each person connects their own account (see below).

The MCP address needs no change. For a webhook address such as `http://<any-host>:8123/api/webhook/mcp_...`, the app connects to `http://homeassistant:8123` with the same path.

Fastmail sign-in: select **Open Fastmail** and allow access in the new tab. The next page may not open; this is expected. Copy its full address from the address bar. It starts with `http://127.0.0.1:49152/daylight/fastmail-return`. Paste it into **Return address** in Daylight and select **Connect** within 10 minutes. Paste it only there, never into chat or a bug report. Daylight renews the sign-in by itself.

## Use Daylight as an app on your iPhone

Daylight can open full screen from your Home Screen at its own HTTPS address. Tailscale must be connected on the iPhone, at home and away. Home Assistant ingress and the dashboard card keep working.

1. In the Tailscale admin console, enable **MagicDNS** and **HTTPS certificates** under **DNS**. Use the community Tailscale app on Home Assistant (`a0d7b954_tailscale`). Services require the host device to be a tagged node. In **Access controls**, add `"tagOwners": {"tag:homeassistant": ["autogroup:admin"]}` to the existing policy file, keeping other entries. Then open **Machines**, open the menu of the Home Assistant device, select **Edit ACL tags** and add `tag:homeassistant`. Leave the Tailscale app's `advertise_tags` option empty: a tag change there makes Tailscale ask for a new login. The service itself needs no tag. Do not forward a router port or enable Funnel.
2. Choose the service name `daylight`. Its address is `https://daylight.<tailnet>.ts.net`. Replace `<tailnet>` with the actual DNS name shown by Tailscale.
3. Define **svc:daylight** on the Tailscale admin console's **Services** page. In **Daylight → Configuration**, set these options, then restart Daylight:

   ```yaml
   direct_origin: "https://daylight.<tailnet>.ts.net"
   home_assistant_url: "http://100.124.80.51:8123"
   ```

   `home_assistant_url` is the Home Assistant address Safari can reach over Tailscale. This HA instance uses `http://100.124.80.51:8123`; it is not shared through Tailscale Serve. HTTP here travels over the encrypted Tailscale connection. Open it on the iPhone first. Give only the origin, without a path. Daylight's `direct_origin` must use HTTPS. Both options must be set together. Leave both empty to disable direct access.

4. In Daylight's **Network** settings, leave **8100/tcp** mapped to host port **8100**. Add this entry to the Tailscale app's `services` list, keeping any existing services:

   ```yaml
   services:
     - name: "svc:daylight"
       target: "http://127.0.0.1:8100"
       protocol: https
       port: 443
   ```

   Restart the Tailscale app and approve this host for `svc:daylight` in the Tailscale admin console's **Services** page. Allow the household's users to access this service in your tailnet policy. See the [Tailscale app Services instructions](https://github.com/hassio-addons/addon-tailscale/blob/main/tailscale/DOCS.md#option-services). The target is the host's mapped port and survives app container IP changes and reboots. If you deliberately change the host port, change the target to match.

5. On the iPhone, connect Tailscale. In **Safari**, open the Daylight HTTPS address. Select **Share → Add to Home Screen** and keep **Open as Web App** enabled if offered.
6. Open **Daylight from its new Home Screen icon**, then select **Sign in with Home Assistant**. Use your own HA account. Sign in inside the installed app even if you already signed in in Safari. Each HA user opens the same profile as through ingress. If no profile matches, choose or create yours.
7. In **Settings → You → Signed-in devices**, end a lost device's sign-in with **Revoke**. **Sign out of Daylight** ends this device's sign-in. Devices stay signed in for 180 days after use; this lifetime renews at most once an hour. At most 20 devices are retained for each HA account.
8. For browser push on **iOS 16.4 or later**, open the installed app's **Settings → You → Browser notifications → Enable notifications**. Accept the iPhone prompt. This is offered only in a secure browser context with push support. For browser push to deliver normally, untick your Companion devices; selected HA Companion devices still take priority. The Companion notification setup below is unchanged.

Port 8100 is also mapped on the LAN. Its plain HTTP address is not a login address: Daylight accepts only the configured HTTPS host and always sets Secure cookies. Forwarded scheme, host and HA user headers never grant authentication. Use the HTTPS Tailscale address for sign-in and everyday use. Port 8099 remains ingress-only.

The sign-in uses a full-page redirect in the same window, without a popup. iOS can open another origin in a browser sheet. Desktop WebKit checks cannot prove the installed iPhone's return navigation or cookie storage. On a real iPhone, check that HA sign-in returns to the installed Daylight app, that closing and reopening it stays signed in, and that a notification arrives and opens it. If the return remains in Safari or a sheet and the app still asks to sign in, this iOS flow needs further work; do not rely on a Safari login being copied into the installed app.

HA supplies identity only. Daylight revokes its temporary HA token immediately and stores a separate random session. Revoking HA access or disabling a HA user does not automatically end existing Daylight sessions. Revoke them in Daylight too. Backups contain the session hashes; restoring an older backup can restore an earlier device sign-in until it expires. If HA is unavailable during sign-in, retry when it is back. A failed token-revocation response grants no Daylight session; check HA's token list after a prolonged outage.

## Profiles and Home Assistant users

- Each Home Assistant user opens one Daylight profile. Each profile belongs to one Home Assistant user.
- The first Home Assistant user who chooses a profile gets it. The other person cannot open it afterwards.
- To use another free profile, switch profile in Daylight. Your old profile then becomes free.
- **Settings → Household → Home Assistant users** shows which user opens which profile.
- Home Assistant's login is the only protection. Daylight profiles have no passwords. Anybody who can sign in to Home Assistant with your user can open your profile.
- The app shows in the sidebar for all Home Assistant users, also non-administrators, so that both adults can use it.

You can also ask Daylight in chat to change your own settings, for example "Add my calendar.family from Home Assistant". It changes only your own calendars, notification devices, profile name, and display link (off), and only when you ask. Logins, tokens, and backups stay in Settings.

Home Assistant and calendar changes that need approval show their saved action in chat. Review the details, then choose **Approve** or **Reject** there or in **Inbox**. Both show the current status and result. Scheduled tasks cannot approve changes.

## Chat and Inbox

- **Message actions.** Each message has one **⋯** button. A long press on a message opens the same menu: Copy, Quote, Edit (your last message), Ask again (a reply) and Fork from here. The newest reply also shows Copy. **Ask again** and **Edit** put the text back in the message box; they never send it. If the reply to your last message still waits in the queue, Edit removes the queued message, so the edited text replaces it. A finished turn stays in the chat; the edited text is sent as a new message, because the assistant already saw the first one.
- **Stop.** A running chat reply has **Stop**. Steps that already ran stay done. A stopped reply says so in one line. Background tasks and routine steps cannot be stopped here.
- **Keyboard and scrolling.** On the phone, the end of the chat stays above the keyboard. A round arrow goes back to the end of the chat; it says **New reply** when a reply finished out of view. A new approval that is taller than the screen shows from its top.
- **Connection.** Without a connection, the message box says so and Send waits. A message that could not go out is sent again once when the connection is back. Live updates reconnect by themselves. Drafts are kept in this browser for each profile and chat, also when the phone stops the app.
- **Shared chats.** Use Share with household in the chat menu. Both people can read and write, including old history and files. The warning lists detected personal sources and requires I checked this chat. Shared badges and author names identify the shared conversation. Only the owner can stop sharing. When the other person’s app learns that access ended, it returns to the chat list with “This chat is no longer shared with you.” It clears loaded messages, partial replies, drafts, draft files and unconfirmed sends for that chat. Drafts are discarded because they may quote shared history. If a draft or unsent message was removed, the notice adds “Your unsent text was discarded.” Only a chat-specific 404 confirms access loss; a 403, server failure or connection problem keeps the chat and unsent text. Stored unconfirmed sends include the chat owner so this also works after a reload. Both changes require an idle chat; chats linked to scheduled work cannot be shared. Each change starts a new model session with visible text only. Shared replies use household lists, meals, shared documents and calendars, household devices, web search, images and app help. Personal tools and data are excluded in code. Pin, archive and unread stay personal. Shared replies set unread dots and send no phone push. There is no shared memory store in this version.
- **Unread chats.** A reply from a background task or a routine, or a chat reply that ended while Daylight was not shown, makes its chat unread. The chat list shows a dot, and the Chat tab and the list button show the number. Opening the chat marks it read on all devices of the profile. Each profile has its own unread chats.
- **Search** in the chat list finds the text of every message, not only titles, and shows the line that matched.
- **Inbox.** **Needs you** lists the approvals to decide, then actions to check (running, failed or unclear in the last 7 days). **New** lists results and notices that you did not read yet: each result opens its chat with one tap and shows a short plain-text preview. One entry can be marked read with its check mark. **Earlier** lists read entries and decided approvals together by day.

## What the assistant can read about Daylight

The assistant can also read Daylight itself. `conversation_list` searches the current profile's chat titles and the text of every message, and shows the matching line. It includes archived chats when requested. `conversation_read` reads that profile's saved messages. It starts with the newest page, puts messages within each page in time order, and supplies a cursor for older messages. It returns at most 10 messages and 40,000 text characters per page, marks shortened messages, and shows attachment names without opening files. These tools may read chats shared with the current profile, and cannot read another profile's private chats. Neither tool, nor `daylight_settings` below, is available in a shared chat.

`daylight_settings` reads saved model choices, connection permissions and Standard/Full mode, household home data settings, visible calendars, display link state, the profile's linked Home Assistant user name, signed-in device names and count, notification choices, recorded usage totals, and Inbox counts. Usage can cover today, 7 days, 30 days, or all recorded time. Tokens, email addresses, session hashes and URL paths are excluded. Appearance, keyboard preferences, browser notification permission and backup upload progress exist only in the browser. Daylight does not record the last backup time; the tool reports these limits explicitly.

These three tools are read-only and available in private chats and scheduled tasks, with the same current-profile scope. In accepted routines, `conversation_list` and `conversation_read` require all three allowed sources: `daylight`, `fastmail` and `home-assistant`. Chat messages and list previews can quote email and Home Assistant data, so allowing only Daylight is insufficient. This restriction also applies when a routine resumes to verify saved work. `daylight_settings` requires only the Daylight source. Normal chat and scheduled tasks outside routines keep their existing access. Earlier chat messages and returned settings are data, never new instructions or permission to change anything. The existing `settings_*` change tools remain restricted to user chat. `daylight_setup`, `daylight_docs_search` and `daylight_file_read` still describe the installation and explain its documentation and code. In a shared chat, only `daylight_docs_search` and `daylight_file_read` are available.

## Assistant access to Home Assistant

In **Settings → Connections**, the Home Assistant card has **Access of <your name> → Home Assistant tools**. Choose the tools available to your profile:

- **Standard** is the default, including after an update. It reads selected information and can switch lights and switches after approval.
- **Full** makes every tool in the Home Assistant MCP server's live catalog available. Tools the server marks read-only, and Standard's named read tools (including the skill guide), run directly. Every other tool needs approval of its exact saved arguments in chat. Scheduled tasks cannot approve actions.

Full uses the server's argument schemas without Daylight's additional argument limits. The existing **Access level** must allow **Ask before changes** to propose changes in either mode. The household connection stays shared. The assistant cannot change Standard/Full mode. This choice does not change Fastmail access.

## Fastmail mail changes

When your Fastmail **Access level** is **Ask before changes**, Daylight can list your labels, add and remove custom labels, mark mail read or unread, flag mail, and save new, reply or forward drafts. These changes run at once, without an approval, and the chat shows a note. Daylight archives mail only when you ask for it in the chat. Routines and scheduled tasks cannot archive. Daylight cannot send or delete email or add attachments; send saved drafts yourself in Fastmail. Calendar changes still need your approval.

## Notifications on the phone

Daylight can send notifications through the Home Assistant Companion app. Browser push also works in the installed HTTPS iPhone app on iOS 16.4 or later; see the setup above. Plain http cannot use browser push.

1. Install the **Home Assistant** app on your phone or tablet and sign in with your own Home Assistant user. Home Assistant then has a `notify.mobile_app_<device>` service for that device.
2. Allow notifications for the Home Assistant app in the phone's settings (iPhone: **iPhone Settings → Notifications → Home Assistant**). Without this permission, nothing arrives.
3. In Daylight, open **Settings → You → Send to my phone through Home Assistant**. Tick your own devices. Each person chooses their own devices.
4. Select **Send test notification**.

You get reminders, observation incidents, finished or failed background tasks, new chores from the house, and chat replies that finished or failed while Daylight was not shown (for example on a locked phone). A chat notification names the chat, not the reply text. They arrive as notifications of the Home Assistant app. A tap opens Daylight in the Home Assistant app (`/app/<app slug>`). It opens the start page, not a specific chat; the chat shows as unread there. A browser push for a chat reply opens that chat. A new background task notification replaces the previous one.

While a device is chosen, Daylight sends no browser notification to your profile. This prevents the same message twice on one phone. If every Home Assistant delivery fails, Daylight tries browser push instead. Settings shows the last error.

## Dashboard card

The Daylight card shows Daylight on a Home Assistant dashboard, in the look of the other cards. It has two parts:

- **What matters** today and in the next two days. First what needs you now: late chores, bins to put out tonight, approvals that wait and expiring documents. Then today, tomorrow and the day after with their times: appointments, reminders, chores that are due, bins, lunch and dinner, and weather that changes plans. The button at the top, **Review** and **+N more** open Daylight.
- **Ask Daylight**: a box for a quick question. The question becomes a normal chat in Daylight. The answer shows in the card. **Open in Daylight** opens the app; the chat is at the top of the chat list. Approvals stay in Daylight: the card only says that an action waits.

Set it up once:

1. Install [HACS](https://www.hacs.xyz/docs/use/) if it is not already installed. Keep the Daylight app running with **Show in sidebar** on.
2. Open **HACS → ⋮ → Custom repositories**. Add `https://github.com/kummerer94/daylight-addon`, choose type **Dashboard**, and select **Add**.
3. Find **Daylight card** in HACS and select **Download**. HACS adds the resource automatically: `/hacsfiles/daylight-addon/daylight-card.js`, type **JavaScript module**. Reload the dashboard when prompted. If you manage resources in YAML, add that URL with `type: module` yourself.
4. If you used the old app-installed card, remove its `/local/daylight/daylight-card.js` resource under **Home Assistant Settings → Dashboards → ⋮ → Resources**. Load only the HACS resource, then reload the page. Existing card YAML still works.
5. On a dashboard, select **Edit dashboard → Add card → Manual** and paste:

   ```yaml
   type: custom:daylight-card
   grid_options:
     columns: full
   ```

Card options:

| Option        | Default         | Meaning                                                                       |
| ------------- | --------------- | ----------------------------------------------------------------------------- |
| `title`       | none            | A heading instead of the date; the date then shows below it                   |
| `show_prompt` | `true`          | `false` hides the question box                                                |
| `app`         | found by itself | The app slug, such as `a1b2c3d4_daylight`, if the card does not find Daylight |

How it works:

- The card finds Daylight in the sidebar, so keep **Show in sidebar** on. It makes its own ingress session through Home Assistant, like the app panel does, also for users who are not administrators. It renews the session while the dashboard is open, and makes a new one after the tablet slept. You do not need to open Daylight first.
- Your Home Assistant user selects the linked profile. If there is no link, Daylight links the one free profile whose name matches your Home Assistant name or its first word. The card shows that person's own and shared calendars, chores, approvals and reminders, and a question box.
- If no profile matches, or Home Assistant sends no user, the card uses the household's original profile (`local`). A tablet user without a match therefore sees that person's briefing and can ask as that person. This fallback does not link the tablet user. The main app still asks unmatched users to choose a profile.
- The rows come from Daylight's own data, without the model. The model writes only one summary line above them, in the background: early in the morning and after the facts changed, at most every 30 minutes and 12 times a day for each person. Reading or refreshing the card does not start a model call. The next background check updates the summary. Without a model text for today, for example at night, the card shows the same rows without the line.
- The card uses the language of your Home Assistant user (your profile in Home Assistant). German languages get German texts, all other languages get English. The "what matters" text and the dates come in the same language. Daylight keeps one text for each language. It writes a text in a language only while a card shows that language, so a second language costs model calls only when somebody uses it. A quick question gets its answer in the language of the question.
- After an app update, download the card update in HACS and reload the dashboard page. Update the app and card together.
- HACS installs the public card. The Daylight app has no access to Home Assistant's config folder. All other app code and the image stay private.
- This repository uses HACS's default-branch updates, without GitHub releases. HACS shows a short commit ID as the installed version. The card's own version is stamped from the app version during publication. See [HACS versions](https://www.hacs.xyz/docs/publish/start/#versions).

## Wall display link

The older way to show Daylight on a dashboard. Use the dashboard card above instead. The display link shows one person's day in an iframe, but it needs an ingress session in the tablet's browser that only the app panel makes.

1. In **Settings → You → Display link**, select **Make link** and copy the card.
2. In Home Assistant, open the tablet's dashboard: **Edit dashboard → Add card → Manual**. Paste the card. Its address has the form `/api/hassio_ingress/<ingress-token>/api/display/<secret>`.
3. On the tablet, open **Daylight** in the sidebar once. This starts the ingress session that the card needs. The page then keeps the session alive. After the tablet was off for more than 15 minutes, do this step again.

## Options

| Option               | Default         | Meaning                                                         |
| -------------------- | --------------- | --------------------------------------------------------------- |
| `time_zone`          | `Europe/Berlin` | Household time zone for chore days, daily task times, and dates |
| `model`              | `gpt-6.1-sol`   | The ChatGPT model that the assistant uses                       |
| `direct_origin`      | empty           | Daylight HTTPS origin for the optional iPhone app               |
| `home_assistant_url` | empty           | HA HTTP or HTTPS origin the phone reaches for sign-in           |

Restart the app after you change an option.

## Move the data from the PC

Use **Settings → Household → Backup** to move the data with one file.

1. On the PC, open **Settings → Household → Backup → Download backup**. Save the `.daylight` file.
2. Stop the PC server. Keep it stopped so the two installations do not diverge.
3. Install and open Daylight in Home Assistant. Choose a temporary profile if asked, then open **Settings → Household → Backup → Restore from backup** and select the file.
4. Check the backup date and the counts. Type **RESTORE**, then select **Replace data and restart**.
5. Reload Daylight and choose your restored profile if asked. Home Assistant users may need to link their profiles again. Check scheduled tasks and open approvals.

The backup contains all data, settings and Daylight's own sign-ins: ChatGPT, Fastmail and the MCP connection. You do not need to sign in again. Exception: if the PC used the Codex CLI login or a desktop Fastmail connection, these are not in the backup. Sign in in Daylight on the PC before the download, or sign in again in the app.

**The file is not encrypted. Protect it like a password.** Daylight checks the file before it changes anything, and keeps the old data in `/data/backups/<timestamp>-before-restore/`.

### Alternative: copy through the shared folder

The older `/share/daylight-import` method still works for a first start. Daylight keeps all data in `.local` on the PC and `/data` in the app.

The app's `/data` folder is not visible in the Samba or SSH apps. For the move, Daylight reads an import folder in the shared `share` folder once.

1. Stop the PC server. Wait until it has exited. A copy of a running SQLite database can miss recent changes.
2. Install and start the **Samba share** app (or the **SSH** app) if you do not have one.
3. Make the folder `share/daylight-import` on Home Assistant.
4. Copy everything from the PC `.local` folder into `share/daylight-import`. These are:
   - `assistant.sqlite`
   - `assistant.sqlite-wal` and `assistant.sqlite-shm`, if they exist
   - the `pi` folder
5. Restart the Daylight app.
6. At start, Daylight copies the files into `/data` and deletes `share/daylight-import`. It does this only when `/data` has no database yet. If `/data` already has one, Daylight keeps it, ignores the import folder, and writes a warning to the app log.
7. Open Daylight from the sidebar and choose your profile. The original PC profile is the first one in the list.

After the move, the private data is only in `/data`. Make sure that `share/daylight-import` is gone. Do not use the PC version on the old data any more: the two copies do not synchronize.

To start again with an empty Daylight, uninstall the app (this deletes `/data`) and install it again.

## Backups

- Home Assistant backups include the app and its `/data` folder. That is the whole Daylight database, including the ChatGPT and Fastmail sign-ins and any MCP access tokens. Protect backup files like passwords. Use backup encryption.
- The app uses cold backups. Home Assistant stops Daylight for the backup and starts it again afterwards. This keeps the SQLite files consistent.
- Restoring a backup restores pending work too. Check scheduled tasks and open approvals after a restore.
- **Settings → Household → Backup** also downloads and restores portable `.daylight` files, up to 200 MB. Chat files count towards this limit. These files are unencrypted and contain household logins. Anyone with access to Daylight can use this card; profiles are not passwords. Home Assistant protects access with its own login.
- A restore preview expires after 15 minutes. Cancel removes the uploaded copy. Old safety copies stay in the data folder and are excluded from portable downloads. They use disk space and contain secrets too. Keep enough free space for the upload, unpacked data and safety copy. Remove old copies only after checking the restored data, with Daylight stopped.
- If shutdown cannot finish within 10 seconds, Daylight exits without replacing the data. Restart it before trying again. If file replacement is interrupted, the next startup uses the safety copy to roll back the incomplete restore.

## Network access

- Port 8099 is ingress-only. Optional direct access uses mapped port 8100 behind Tailscale HTTPS, with its own required sign-in. The dashboard card uses ingress.
- The ingress listener answers only the Home Assistant ingress proxy (`172.30.32.2`) and its own loopback. The separate direct listener never trusts HA identity headers.
- The app uses the Home Assistant API through the Supervisor (`homeassistant_api: true`). The Supervisor gives the app a token in `SUPERVISOR_TOKEN`. Only Daylight's Home Assistant client uses it. The client reads, and makes one write: `notify.mobile_app_<device>` for the devices that you chose for notifications.
- MVG departure questions make read-only requests to `https://www.mvg.de`. No API key or extra sign-in is needed.

## S-Bahn departures

Ask, for example, “When are the next S1 departures from Lohhof toward Freising?” The assistant uses `s1_departures` for S1, and `mvg_api` for other MVG station and departure lookups. Both tools are available to every profile without a Settings switch.

Station names accept case differences, ß/ss and umlaut spelling variants. Donnersbergerbrücke, Lohhof, Unterschleißheim, Feldmoching and Hirschgarten (München) have fixed name aliases. Only Lohhof has a fixed ID. Other names are looked up and must identify one S-Bahn station. Ambiguous names return candidates so you can specify the station and city.

Direction matches text in the destination, ignoring case and umlaut spelling differences. Use a destination such as Freising, Flughafen or Ostbahnhof. Innenstadt and stadteinwärts have no special mapping; they match only if they appear in the destination text.

S1 results show up to 6 departures by default, at most 15, filtered from MVG's next 20 S-Bahn departures. An empty result means no matching S1 was returned in that window. It does not prove there is no service later. This is a departure board, not route planning or a promise that MVG has reported every service change.

Times are in Europe/Berlin, with ISO timestamps too. “Live” means MVG marks the row as realtime. “Timetable only” does not confirm the train is on time and has no expected time. Replies mention cancellations, reported delays, platform changes and when the data was fetched. Missing delay or platform data stays unknown. Departures are cached for 60 seconds and station resolutions for 24 hours. Cache hits retain the original fetch time and show their age. A failed request reports unavailable and does not serve expired departures. No other transport service or relay is used.

## Memory

On a PC, the server uses about 130 MB at rest and about 160 MB under heavy synthetic load (two profiles, 300 conversations, 120 documents, 400 list items). The Node heap is limited to 256 MB. A Raspberry Pi 4 with 4 GB has enough memory for this.

## Files in chat

- Attach photos, screenshots, PDF files and text files with the paperclip in the chat. On the phone, the camera button takes a photo. This works over plain http and in the Home Assistant app.
- Large photos are made smaller on the phone before upload (2048 px, JPEG). A file can have at most 10 MB; a message can have 5 files.
- A scanned PDF without text cannot be read. Send photos of the pages instead.
- Files are stored in `/data/attachments`, so backups include them. Only the profile that sent a file can see it. In a shared chat, both people can see the files of its messages.
- **Add photo** puts photos into the note of a visible list item, or into a Markdown document. The iPhone offers the camera and the photo library. Everybody who can see the item or the document sees its photos. Photos are in `/data/attachments` too, so backups include them.

## Images from chat

Ask Daylight to generate an image. It uses the household ChatGPT sign-in and its allowance, and saves one private 1024×1024 PNG with the reply. Select it to enlarge or download it. Images stay through reloads, conversation forks and backups.

Quality defaults to low. Ask for medium or high quality, or say "Regenerate that in high quality" to create a new image from the earlier prompt. Higher quality can take longer and use more allowance. Editing and reference photos are not supported yet, and scheduled tasks cannot generate images.

Image generation is experimental and depends on the account and conversation model. If generation is interrupted, Daylight never sends that request again automatically. A saved image remains available; otherwise, send a new message to try again.

## Groceries in Apple Reminders

Groceries can stay the same as one Apple Reminders list, so Siri and the Reminders app keep working. Home Assistant's iCloud integration connects the list; Daylight changes it through Home Assistant.

1. Set up the iCloud integration in Home Assistant with the Apple account that owns the list. Home Assistant shows only lists of that account, also when they are shared.
2. In Daylight, open **Settings → Household → Connect Groceries to a Home Assistant list**. Every profile can do this.
3. Select **Choose a list**, choose the to-do list, for example `todo.<account>_einkauf`, and select **Preview**.
4. Check the preview. Apple reminders become Daylight items, unless you match them with an existing item. Items with the same name are not matched by themselves. Existing Daylight items stay only in Daylight unless you tick them. Select **Connect**.

Daylight then adds, renames, edits notes, completes and reopens linked items in Apple Reminders. Deleting a linked grocery or moving it out of Groceries marks its Apple reminder done. New items from the iPhone or Watch arrive after some minutes, because Home Assistant checks iCloud every five minutes. They show **via Apple Reminders**. Sections, order, photos and who is assigned stay only in Daylight. Due dates in Apple Reminders stay as they are.

Groceries starts with ten editable sections. Daylight sorts unfamiliar names in the background and remembers the results. Your manual section choice is remembered for the same name and takes priority. Choose **Section** in an item's details to correct it. Without a model login, manual sections still work. Adding and checking off never wait for sorting.

Choose **Aldi** or **Lidl** above the Groceries add field to follow that shop's section order, or **No grouping** for one list in the order added. Each device remembers its own choice, with no server write. Both shops use the same sections and item placements. **Other** stays last before the basket. Open **Sections** to add, rename or remove shops and sections, and change each shop's order with the arrows. Existing custom sections keep their original order in both seeded shops. Shop walks vary between stores, so adjust these orders to your local branches.

Each item shows when a change waits, failed, is uncertain, or kept the Apple version because both sides changed at the same time. Settings shows the last successful check and the items that need a decision. **Disconnect** stops all waiting and future changes. Items and history stay in Daylight.

## Known limits

- Fastmail sign-in needs a browser with an address bar so you can copy the return address. If the companion app hides it, open Home Assistant in your phone or computer browser.
- Browser push notifications do not work over plain http. Use **Send to my phone through Home Assistant** instead.
- A notification tap opens Daylight's start page in the Home Assistant app, not a specific chat. Browser push opens the chat of a chat reply.
- A phone on its side, and any window lower than 500 pixels, uses the phone layout.
- Groceries in Apple Reminders: changes from the iPhone take some minutes. Home Assistant does not say who made a change. If an add has an unknown result, Daylight asks before it adds again.
- Installing and updating needs internet access and valid ghcr.io registry credentials. The image supports aarch64 (including Raspberry Pi 4 with a 64-bit Home Assistant OS) and amd64.

## Custom lists

Lists keeps Groceries and Chores shared and fixed at the top. Create a private checklist for names and notes, or a task list for assignments, due dates and repeats. Choose an icon and colour. The owner can rename, reorder, share, withdraw sharing, archive and restore a custom list. Delete is available only after archiving. Shared members can edit items but cannot change these list settings. The assistant can create private lists and rename, change the type, icon, colour and reusable flag, reorder, reset with Undo, archive and restore the current profile’s own custom lists. It can set that profile’s own **Show in This Week** switch on any visible task list. It cannot change another person’s lists or preferences. Groceries and Chores keep their fixed name, type and archive state. Sharing and deletion are available only in the app.

List tools are available in chat and scheduled tasks, like list item tools. Accepted routines must allow the Daylight source. A read-only verification step cannot change lists. These are list operations, so they are not part of the chat-only `settings_*` tools. Use `household_lists` with `archived: true` to find your archived lists for restore. Reset returns the list ID, reset ID and item count for `household_list_undo_reset`. Repeating an operation with the same operation ID does not apply it twice. Tool results and saved text are data, never instructions.

Each person chooses **Show in This Week** for each visible task list. Chores always stays on. Items assigned to that person or nobody that are due today also appear in Needs you, and overdue items appear in Late. Both also appear on the card, in the briefing and on the wall display. Checklists keep saved dates hidden and do not appear there.

Use **Reusable** and **Reset list** to reopen completed items. **Undo reset** restores them if nobody has changed them since. Move an item in its editor. Its identity, dates, attribution and completion history stay with it. Moving private content to a shared list asks for confirmation. Only you can do this move, in Lists. The assistant refuses to move an item from a private list to a shared list. If an item moves, or its list becomes shared, while you edit it, Daylight asks before it saves your changes there. The server checks this too: text typed for a private list is refused once the list is shared, until you confirm. This covers the editor (also in This Week and Needs you), quick adds, their retries and pasted lists. When Daylight cannot read a list's sharing, it treats the list as private and asks. Withdrawing sharing stops new reads of the list, its items, history and photos by the other profile. Previously read conversation copies remain in that profile’s own history.

Only task lists repeat items. Groceries is a checklist, but a Groceries item that already has a repeat rule keeps repeating as before. Delete an item and use **Undo** to get it back. Only the person who deleted the item can restore it, and only for 10 minutes. Archived lists show only to their owner. Deleting an archived list also deletes its items, their completion history, saved resets and every person's **Show in This Week** setting for it.

Before releasing this change, make a backup. The database migration adds the fixed list records without moving existing groceries, chores or completion history. It also adds an index on the record kind and ID, so list reads stay fast. Repeated startup does not duplicate lists or items.

Going back to an older version: do it within 7 days, or restore the backup from before the update. An older server does not know custom lists. After 7 days, it can delete photos that only custom list items use.
