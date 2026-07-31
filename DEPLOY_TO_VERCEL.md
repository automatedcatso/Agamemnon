# Deploy Agamemnon to Vercel

## 1. Requirements

- Node.js 22.x
- npm
- A Vercel account
- A Google Gemini API key if you want Odysseus AI enabled

## 2. Local validation

```bash
npm ci
npm run build
npm test
npm run lint
```

The project intentionally does **not** include `node_modules`, `.next`, `.vercel`, or `.env.local`. Install dependencies fresh on each machine/deployment.

## 3. Environment variables

In Vercel: **Project → Settings → Environment Variables** add:

- `GEMINI_API_KEY` = your Gemini API key
- `GEMINI_MODEL` = `gemini-3.1-flash-lite`

Optional:

- `NEXT_PUBLIC_APP_URL` = your final custom production URL, such as `https://agamemnon.example.com`

If `NEXT_PUBLIC_APP_URL` is omitted, the app falls back to Vercel's system URL automatically.

Never commit `.env.local` or paste `GEMINI_API_KEY` into client-side code.

## 4. GitHub → Vercel deployment

1. Create a new GitHub repository.
2. From this project folder:

```bash
git init
git add .
git commit -m "Prepare Agamemnon for Vercel"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

3. Open Vercel → **Add New → Project**.
4. Import the GitHub repository.
5. Vercel should auto-detect **Next.js**.
6. Keep the project root as `./`.
7. Use the default build command (`next build`) and install command.
8. Add the environment variables above.
9. Deploy.

## 5. CLI deployment alternative

```bash
npm i -g vercel@latest
vercel login
vercel deploy --dry
vercel
vercel --prod
```

The dry run is useful for confirming that `public/materials` is included while local secrets/build artifacts are ignored.

## 6. Post-deploy checks

Test these on the production URL:

- Home/dashboard loads without console errors.
- Calendar and Day Orders render.
- Study Vault lists 75 files.
- Open several PDFs/PPTX/DOCX files from Study Vault.
- Odysseus text chat returns a Gemini response when `GEMINI_API_KEY` is configured.
- Vault-only mode works even without Gemini.
- Web Search mode works with Gemini grounding.
- Upload an image smaller than 2.7 MB and confirm analysis works.
- Browser notification permission/test works over HTTPS.

## Notes

- `public/materials` is intentionally deployed with the app so the Study Vault links do not become 404s. The folder is about 147 MB; its largest file is about 33 MB.
- The hosted chat limits image attachments to 2.7 MB because Vercel Functions have a 4.5 MB request/response payload ceiling and base64 encoding expands file size.
- Notes, reminders, personal holidays, and chat history currently use browser storage. They are per-browser/per-device, not synced between devices.
- Browser push scheduling while the site is closed still requires a hosted database, persisted Web Push subscriptions, and a scheduler; the current service worker only supports the notification functionality already implemented by the app.
