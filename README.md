# ARMS site

The public website for ARMS, a local-first, open-source gateway that gives
AI agents real tools, starting with a native Gmail connector.

The site is plain HTML and CSS with no build step and no dependencies. It
hosts the landing page plus the privacy policy and terms of service that
the Gmail connector's Google OAuth consent screen links to.

- **Landing page.** `public/index.html` introduces ARMS, its
  approval-gated Gmail connector and its bring-your-own-OAuth model.
- **Privacy policy.** `public/privacy/` covers which Gmail scopes the
  connector requests, where data is stored and how to revoke access.
- **Terms of service.** `public/terms/` sets out the self-hosted terms,
  user responsibilities and the warranty disclaimer.
- **Static output.** Everything lives under `public/`; any static file
  host or CDN can serve the directory as-is.

## Run it

Needs any static file server. No runtime, toolchain or services.

```bash
npx serve public
# or
python3 -m http.server --directory public 8000
```

Then open the printed URL (`http://localhost:8000` for the Python
command).

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
