Signing and Publishing Windows Installer

To sign the Windows installer and publish a release automatically follow these steps.

1) Create a code signing certificate (PFX) and store it as a GitHub secret named `CSC_LINK`.
   - Upload the PFX to GitHub Secrets using `gh secret` or via the repo settings.
   - Example: `gh secret set CSC_LINK --body-file ./mycert.pfx` (or use S3/HTTP link)

2) Set the PFX password in `CSC_KEY_PASSWORD` secret.

3) Trigger the workflow `Publish Release Artifacts` from Actions → Run workflow. Provide:
   - `tag` (e.g. v1.0.0)
   - `release_name` (e.g. PayrollPro v1.0)

Notes:
- If `CSC_LINK` / `CSC_KEY_PASSWORD` are not present, the build will produce an unsigned installer.
- The workflow builds on `windows-latest`, runs `npm ci`, builds the frontend and runs `electron-builder`, then creates a GitHub Release and uploads the installer.

Local testing:
- Build unsigned locally (we already built in WSL):

```bash
npm run build:front
npx electron-builder --win --x64 --publish never
```

- To sign locally during build you can set env vars before running electron-builder:

```bash
export CSC_LINK=/path/to/cert.pfx
export CSC_KEY_PASSWORD=yourpassword
npx electron-builder --win --x64 --publish never
```

If you want, puedo attempt to run the workflow for you (requires a GitHub token) or help create the `CSC_LINK` secret from a PFX file you provide.
