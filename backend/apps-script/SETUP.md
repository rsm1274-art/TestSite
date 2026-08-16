# Contact form backend — setup

The QPI contact form posts to a Google Apps Script running in your own
Workspace account. No third-party form service is involved.

On each submission the script:

1. appends a row to a Google Sheet (lead log)
2. emails the lead to `info@qpi-inspect.com`, with Reply-To set to the submitter
3. sends an auto-reply to the submitter

Budget about 15 minutes. You do steps 1–6 once; after that the only thing that
ever needs repeating is the redeploy in step 7, and only if you edit the script.

---

## 1. Create the script

1. Go to <https://script.google.com> — signed in as the Workspace account that
   owns `info@qpi-inspect.com`, not a personal Gmail.
2. **New project**.
3. Rename it (top left) to **QPI Contact Form** so you can find it later.
4. Delete the sample `function myFunction() {}` in the editor.
5. Open `Code.gs` from this folder, copy the whole file, paste it in.
6. Click the save icon.

## 2. Read the config block

The top of the file has a CONFIGURATION section. Defaults are already correct
for QPI, but confirm:

| Setting | Default | Change it if… |
|---|---|---|
| `CONTACT_EMAIL` | `info@qpi-inspect.com` | leads should go somewhere else |
| `BUSINESS_PHONE` | `901.300.0626` | the number changes |
| `FORM_TOKEN` | `qpi-web-2026` | you start getting spam (see step 8) |
| `SHEET_ID` | empty | you want to use a spreadsheet you already made |

Leaving `SHEET_ID` empty is fine — the script creates a spreadsheet called
**QPI Website Leads** on the first submission and remembers it.

## 3. Test it before deploying

This catches problems while they're still easy to diagnose.

1. In the toolbar dropdown, select **`runSelfTest`**.
2. Click **Run**.
3. Google asks for authorization the first time. Choose your Workspace account.
   You'll see **"Google hasn't verified this app."** That's expected — *you* are
   the developer, and the app is yours. Click **Advanced** → **Go to QPI Contact
   Form (unsafe)** → **Allow**. It's asking for permission to send mail as you
   and edit your spreadsheets, which is exactly what it does.
4. Check `info@qpi-inspect.com`. You should have **two** emails: the lead
   notification and the auto-reply.
5. Open **View → Logs** to see the lead sheet URL. Open it and confirm the row
   landed. Delete the test row.

If you got both emails and the row, the backend works. Everything after this is
just exposing it to the website.

## 4. Deploy as a web app

1. **Deploy → New deployment**.
2. Click the gear next to "Select type" → **Web app**.
3. Set:
   - **Description:** `v1`
   - **Execute as:** **Me** *(so it can send mail as you)*
   - **Who has access:** **Anyone**
4. **Deploy**, then authorize again if prompted.
5. Copy the **Web app URL**. It ends in `/exec`.

### About "Who has access: Anyone"

This one setting is the difference between a working form and a silently broken
one, and it looks alarming, so: it means anyone can send data *to* this script.
It does **not** give anyone access to your Drive, your mail, or the script's
source. The script runs as you and only ever does the three things listed at the
top of this file. Any public form endpoint works this way.

Set to "Anyone with Google account" instead and the form will fail for every
visitor who isn't signed in to Google — which is most of them.

## 5. Verify the deployment is live

Paste the `/exec` URL into a browser. You should see JSON:

```json
{"success":true,"message":"QPI contact form endpoint is live.","leadSheet":"https://docs.google.com/..."}
```

Bookmark the `leadSheet` link — that's your lead log.

If you get a Google sign-in page instead, "Who has access" is not set to
**Anyone**. Go back to step 4.

## 6. Point the website at it

Open `assets/site.js`. Near the top:

```js
var FORM_ENDPOINT = ''; // <-- paste the /exec URL here
```

Paste the URL between the quotes:

```js
var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycb.../exec';
```

Save. That's the only website change needed — no CSS rebuild, no HTML edit.

Then test the real form, ideally from the preview build before you push.

## 7. Redeploying after any script edit

**Saving the script does not update the live web app.** This is the single most
common way to spend twenty minutes confused.

After editing `Code.gs`:

1. **Deploy → Manage deployments**
2. Click the pencil (edit) icon on the existing deployment
3. **Version:** → **New version**
4. **Deploy**

The URL stays the same, so `site.js` never needs changing again.

## 8. If spam starts arriving

In order of escalation:

1. Change `FORM_TOKEN` in `Code.gs` **and** the matching `FORM_TOKEN` in
   `assets/site.js`. They must match exactly. Redeploy. This defeats any bot
   that harvested your endpoint earlier.
2. Add a CAPTCHA. Cloudflare Turnstile is free and invisible to most visitors;
   it needs a verification call added to `doPost`.

The token is obfuscation, not security — it's visible to anyone who reads the
site's JavaScript. It raises the cost of automated abuse; it does not stop a
person who wants to get through.

---

## Troubleshooting

| What you see | Cause | Fix |
|---|---|---|
| Form says "sent, but we could not confirm it" | Browser couldn't read the response — almost always "Who has access" is not **Anyone** | Redo step 4, then step 5 |
| Google sign-in page at the `/exec` URL | Same cause | Redo step 4 |
| "Something went wrong sending that" | Script returned `success: false`. Open the browser console (F12) — the reason is logged | Usually a token mismatch between `Code.gs` and `site.js` |
| Form opens an email app instead of submitting | `FORM_ENDPOINT` is still empty in `site.js` | Step 6 |
| Emails stop after heavy use | Workspace caps Apps Script at 1,500 recipients/day. Each submission sends 2 | You'd need ~750 submissions in a day to hit this |
| Edits to the script have no effect | You saved but didn't redeploy | Step 7 |
| Auto-reply lands in spam | Rare, since it's sent from your authenticated Workspace domain | Ask a recipient to mark it "not spam"; consider shortening the copy |

## Console diagnostics

The form logs failures to the browser console prefixed `[QPI contact form]`.
Press F12 on the site, submit, and read the message — it names the actual cause
rather than making you guess.

## What to change if you outgrow this

Nothing here scales badly at QPI's volume. The limits you'd hit first:

- 1,500 email recipients/day (≈750 submissions)
- Apps Script execution time of 6 minutes per run — irrelevant here; this
  script finishes in under a second

If you ever want submission analytics, spam scoring, or file uploads, that's the
point to reconsider a hosted service — not before.
