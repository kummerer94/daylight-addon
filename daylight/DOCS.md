# Daylight as a Home Assistant app

Daylight is the household assistant for two adults. This app runs it on the Home Assistant host. You open it from the Home Assistant sidebar. Home Assistant's login decides which Daylight profile opens.

Home Assistant calls add-ons "apps" since version 2026.2. This app is an add-on in the developer documentation.

## Install

1. To move existing PC data, first download its backup (see "Move the data from the PC").
2. In Home Assistant, open **Settings → Apps → App store**.
3. Open the menu (three dots) and select **Registries**. Add registry **ghcr.io**, username **kummerer94**, and a GitHub **personal access token (classic)** as the password. Give the token only **read:packages**, with no repository scope. The image is private. Save these credentials once; replace the password here when the token expires or is revoked. Create the token at https://github.com/settings/tokens/new?scopes=read:packages.
4. In the same app store menu, select **Repositories** and add `https://github.com/kummerer94/daylight-addon`. This repository is public and needs no token.
5. Find **Daylight** in the app store and select **Install**. Home Assistant downloads the prebuilt image for your device. It does not build or compile anything on the Raspberry Pi.
6. Select **Start**. Turn on **Show in sidebar**.
7. Open **Daylight** in the sidebar.

If Daylight is already installed from the private repository, download a portable backup from its **Settings → Backup**, then stop that app. Install from the public repository and restore the file in the new app's **Settings → Backup**. Home Assistant treats the new repository as a separate app with separate data. Keep the old app stopped, and uninstall it only after checking the restored data.

## First start

1. Each person opens Daylight once with their own Home Assistant login. If your Home Assistant name, or its first word, is the name of exactly one free profile, Daylight opens that profile directly. Otherwise Daylight asks "Which Daylight profile is yours?". Choose your profile, or add a new one. You choose only once.
2. If you restored a PC backup, you are done. The ChatGPT and Fastmail sign-ins and the Home Assistant MCP connection move with the backup. Daylight connects to the MCP address by itself (see below).
3. Without a backup, connect the services in **Settings**:
   - **ChatGPT account → Sign in**. Daylight shows a code and a link. Open the link on any device, sign in to ChatGPT, and enter the code.
   - **Home Assistant MCP**, if the assistant should use it. Enter the MCP server address and its access token.
   - **Fastmail → Sign in to Fastmail**. Each person connects their own account (see below).

The MCP address needs no change. For a webhook address such as `http://<any-host>:8123/api/webhook/mcp_...`, the app connects to `http://homeassistant:8123` with the same path.

Fastmail sign-in: select **Open Fastmail** and allow access in the new tab. The next page may not open; this is expected. Copy its full address from the address bar. It starts with `http://127.0.0.1:49152/daylight/fastmail-return`. Paste it into **Return address** in Daylight and select **Connect** within 10 minutes. Paste it only there, never into chat or a bug report. Daylight renews the sign-in by itself.

## Profiles and Home Assistant users

- Each Home Assistant user opens one Daylight profile. Each profile belongs to one Home Assistant user.
- The first Home Assistant user who chooses a profile gets it. The other person cannot open it afterwards.
- To use another free profile, switch profile in Daylight. Your old profile then becomes free.
- **Settings → Home Assistant users** shows which user opens which profile.
- Home Assistant's login is the only protection. Daylight profiles have no passwords. Anybody who can sign in to Home Assistant with your user can open your profile.
- The app shows in the sidebar for all Home Assistant users, also non-administrators, so that both adults can use it.

You can also ask Daylight in chat to change your own settings, for example "Add my calendar.family from Home Assistant". It changes only your own calendars, notification devices, profile name, and display link (off), and only when you ask. Logins, tokens, and backups stay in Settings.

## Notifications on the phone

Daylight sends its notifications through the Home Assistant Companion app. Browser push needs HTTPS, and Home Assistant opens over plain http here, so browser push does not work in the Home Assistant app or on an iPhone.

1. Install the **Home Assistant** app on your phone or tablet and sign in with your own Home Assistant user. Home Assistant then has a `notify.mobile_app_<device>` service for that device.
2. Allow notifications for the Home Assistant app in the phone's settings (iPhone: **Settings → Notifications → Home Assistant**). Without this permission, nothing arrives.
3. In Daylight, open **Settings → Notifications → Send to my phone through Home Assistant**. Tick your own devices. Each person chooses their own devices.
4. Select **Send test notification**.

You get reminders, finished or failed background tasks, and new chores from the house. They arrive as notifications of the Home Assistant app. A tap opens Daylight in the Home Assistant app (`/app/<app slug>`). It opens the start page, not a specific chat. A new background task notification replaces the previous one.

While a device is chosen, Daylight sends no browser notification to your profile. This prevents the same message twice on one phone. If every Home Assistant delivery fails, Daylight tries browser push instead. Settings shows the last error.

## Dashboard card

The Daylight card shows Daylight on a Home Assistant dashboard, in the look of the other cards. It has two parts:

- **What matters** today and in the next two days: appointments, bins, chores that are due or late, dinner, approvals that wait, reminders, expiring documents, and weather that changes plans. Late or cancelled trains in the next 45 minutes show as a warning line.
- **Ask Daylight**: a box for a quick question. The question becomes a normal chat in Daylight. The answer shows in the card. **Open in Daylight** opens the app; the chat is at the top of the chat list. Approvals stay in Daylight: the card only says that an action waits.

Set it up once:

1. Install [HACS](https://www.hacs.xyz/docs/use/) if it is not already installed. Keep the Daylight app running with **Show in sidebar** on.
2. Open **HACS → ⋮ → Custom repositories**. Add `https://github.com/kummerer94/daylight-addon`, choose type **Dashboard**, and select **Add**.
3. Find **Daylight card** in HACS and select **Download**. HACS adds the resource automatically: `/hacsfiles/daylight-addon/daylight-card.js`, type **JavaScript module**. Reload the dashboard when prompted. If you manage resources in YAML, add that URL with `type: module` yourself.
4. If you used the old app-installed card, remove its `/local/daylight/daylight-card.js` resource under **Settings → Dashboards → ⋮ → Resources**. Load only the HACS resource, then reload the page. Existing card YAML still works.
5. On a dashboard, select **Edit dashboard → Add card → Manual** and paste:

   ```yaml
   type: custom:daylight-card
   grid_options:
     columns: full
   ```

Card options:

| Option        | Default         | Meaning                                                                         |
| ------------- | --------------- | ------------------------------------------------------------------------------- |
| `title`       | `Daylight`      | The card title                                                                  |
| `show_prompt` | `true`          | `false` hides the question box                                                  |
| `app`         | found by itself | The app slug, such as `a1b2c3d4_daylight`, if the card does not find Daylight |

How it works:

- The card finds Daylight in the sidebar, so keep **Show in sidebar** on. It makes its own ingress session through Home Assistant, like the app panel does, also for users who are not administrators. It renews the session while the dashboard is open, and makes a new one after the tablet slept. You do not need to open Daylight first.
- Your Home Assistant user selects the linked profile. If there is no link, Daylight links the one free profile whose name matches your Home Assistant name or its first word. The card shows that person's own and shared calendars, chores, approvals and reminders, and a question box.
- If no profile matches, or Home Assistant sends no user, the card uses the household's original profile (`local`). A tablet user without a match therefore sees that person's briefing and can ask as that person. This fallback does not link the tablet user. The main app still asks unmatched users to choose a profile.
- Daylight writes the "what matters" text with the model in the background: early in the morning and after the facts changed, at most every 30 minutes and 12 times a day for each person. A card load never starts a model call. Without a model text for today, the card shows a plain list of the same facts.
- The card uses the language of your Home Assistant user (your profile in Home Assistant). German languages get German texts, all other languages get English. The "what matters" text, the dates and the train warnings come in the same language. Daylight keeps one text for each language. It writes a text in a language only while a card shows that language, so a second language costs model calls only when somebody uses it. A quick question gets its answer in the language of the question.
- After an app update, download the card update in HACS and reload the dashboard page. Update the app and card together.
- HACS installs the public card. The Daylight app has no access to Home Assistant's config folder. All other app code and the image stay private.
- This repository uses HACS's default-branch updates, without GitHub releases. HACS shows a short commit ID as the installed version. The card's own version is stamped from the app version during publication. See [HACS versions](https://www.hacs.xyz/docs/publish/start/#versions).

## Wall display link

The older way to show Daylight on a dashboard. Use the dashboard card above instead. The display link shows one person's day in an iframe, but it needs an ingress session in the tablet's browser that only the app panel makes.

1. In **Settings → Display link**, select **Make link** and copy the card.
2. In Home Assistant, open the tablet's dashboard: **Edit dashboard → Add card → Manual**. Paste the card. Its address has the form `/api/hassio_ingress/<ingress-token>/api/display/<secret>`.
3. On the tablet, open **Daylight** in the sidebar once. This starts the ingress session that the card needs. The page then keeps the session alive. After the tablet was off for more than 15 minutes, do this step again.

## Options

| Option      | Default         | Meaning                                                         |
| ----------- | --------------- | --------------------------------------------------------------- |
| `time_zone` | `Europe/Berlin` | Household time zone for chore days, daily task times, and dates |
| `model`     | `gpt-6.1-sol`   | The ChatGPT model that the assistant uses                       |

Restart the app after you change an option.

## Move the data from the PC

Use **Settings → Backup** to move the data with one file.

1. On the PC, open **Settings → Backup → Download backup**. Save the `.daylight` file.
2. Stop the PC server. Keep it stopped so the two installations do not diverge.
3. Install and open Daylight in Home Assistant. Choose a temporary profile if asked, then open **Settings → Backup → Restore from backup** and select the file.
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
- **Settings → Backup** also downloads and restores portable `.daylight` files, up to 200 MB. Chat files count towards this limit. These files are unencrypted and contain household logins. Anyone with access to Daylight can use this card; profiles are not passwords. Home Assistant protects access with its own login.
- A restore preview expires after 15 minutes. Cancel removes the uploaded copy. Old safety copies stay in the data folder and are excluded from portable downloads. They use disk space and contain secrets too. Keep enough free space for the upload, unpacked data and safety copy. Remove old copies only after checking the restored data, with Daylight stopped.
- If shutdown cannot finish within 10 seconds, Daylight exits without replacing the data. Restart it before trying again. If file replacement is interrupted, the next startup uses the safety copy to roll back the incomplete restore.

## Network access

- Daylight has no open port. It is reachable only through Home Assistant ingress. The dashboard card uses ingress too.
- Inside the container it answers only the Home Assistant ingress proxy (`172.30.32.2`) and its own loopback.
- The app uses the Home Assistant API through the Supervisor (`homeassistant_api: true`). The Supervisor gives the app a token in `SUPERVISOR_TOKEN`. Only Daylight's Home Assistant client uses it. The client reads, and makes one write: `notify.mobile_app_<device>` for the devices that you chose for notifications.

## Memory

On a PC, the server uses about 130 MB at rest and about 160 MB under heavy synthetic load (two profiles, 300 conversations, 120 documents, 400 list items). The Node heap is limited to 256 MB. A Raspberry Pi 4 with 4 GB has enough memory for this.

## Files in chat

- Attach photos, screenshots, PDF files and text files with the paperclip in the chat. On the phone, the camera button takes a photo. This works over plain http and in the Home Assistant app.
- Large photos are made smaller on the phone before upload (2048 px, JPEG). A file can have at most 10 MB; a message can have 5 files.
- A scanned PDF without text cannot be read. Send photos of the pages instead.
- Files are stored in `/data/attachments`, so backups include them. Only the profile that sent a file can see it.
- **Add photo** puts photos into the note of a Groceries or Chores item, or into a Markdown document. The iPhone offers the camera and the photo library. Everybody who can see the item or the document sees its photos. Photos are in `/data/attachments` too, so backups include them.

## Known limits

- Fastmail sign-in needs a browser with an address bar so you can copy the return address. If the companion app hides it, open Home Assistant in your phone or computer browser.
- Browser push notifications do not work over plain http. Use **Send to my phone through Home Assistant** instead.
- A notification tap opens Daylight's start page in the Home Assistant app, not a specific chat.
- Installing and updating needs internet access and valid ghcr.io registry credentials. The image supports aarch64 (including Raspberry Pi 4 with a 64-bit Home Assistant OS) and amd64.
