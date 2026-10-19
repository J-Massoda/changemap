# ChangeMap

**A decision changes once. Its instructions live in many places.** ChangeMap helps a team follow an approved change through pages, forms, emails, documents and staff guidance, so an old instruction does not quietly survive in one channel.

For example, a school extends an admissions deadline. A web page can show the new date while the application form still closes on the old one. In this interactive demo, the team records the decision, maps each place where the date appears, names an owner, marks the update and records a human verification note. A later revision reopens every check because the earlier verification applied to an earlier version.

## Try it locally

Install Node.js 22 or newer. This project has **no third-party packages** and needs no account or API key.

```bash
npm run dev
```

Open the local address printed by the server (normally `http://localhost:5173`). In a second terminal:

```bash
npm test
npm run build
```

`dist/` is the static deployment output. `npm install` is optional; there are no dependencies to install.

## Five-minute walkthrough

1. Open the fictional admissions change. Choose **Application form closing rule** and note that it has been updated but has not been checked.
2. Select **Verify actual experience**, add a reviewer and describe what was inspected. Watch the confirmed count change.
3. Add a new affected touchpoint, such as a partner information page. It begins as pending.
4. Choose **Revise decision**, change the date and see every touchpoint return to pending. The decision history retains the old actions.
5. Export a JSON report or reset the fictional workspace.

## What the prototype covers

- Several changes, each with its own approved wording, effective date, approver and version.
- Mapped touchpoints, owners, priorities and pending → working → updated → verified progression.
- Verification with reviewer, timestamp and evidence note; revisions invalidate earlier verification.
- Withdrawal, decision history, readiness summary, local persistence and downloadable JSON report.

All example organizations and records are fictional. Browser storage keeps your edits on **that browser only**. Do not enter confidential company data. The tool does not connect to your real website, send notifications, detect all affected places, or independently prove an update is live. “Ready” means all **mapped** touchpoints have reviewer notes, and still calls for human judgment.

## Files

- `src/model.js` — decision rules and report generation.
- `src/app.js` — interface, local browser storage and export.
- `src/styles.css` — responsive presentation.
- `tests/model.test.mjs` — workflow tests.
- `.github/workflows/pages.yml` — optional GitHub Pages deployment after you push to a repository.

## Hosting

For GitHub Pages, enable **Settings → Pages → Source: GitHub Actions**. The workflow tests, builds and deploys `dist` on a push to `main`. You can also upload `dist` to Cloudflare Pages as a static site (build command `npm run build`, output directory `dist`). No database is needed for this demo. A real pilot involving team accounts, customer data or authoritative publication would need authentication, shared storage, access controls, audit retention and a carefully scoped integration. This code does not claim those capabilities.
