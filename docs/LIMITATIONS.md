# Known Limitations & Platform Constraints

Per Rule 6 ("Honesty in UI and Docs"), this document records all known technical constraints, free-tier quotas, and deterrence boundaries.

## Client-Side Download Deterrence vs. DRM
- **Constraint**: Pure client-side deterrents (disabling right-click context menus, intercepting save shortcuts, blocking drag-and-drop, avoiding `<img>` tags in favour of WebGL/canvas rendering) **do not and cannot prevent** screenshots, OS-level screen capture, or network traffic inspection (DevTools Network tab).
- **Security & Privacy Boundary**: These measures prevent casual one-click saving and ensure 4K full-resolution originals never leave the local admin machine. Public variants are capped at 2048 px long edge.

## GitHub Pages Free-Tier Limits (Checked: 10 November 2026)
- **Repository Size**: Target < 1 GB.
- **Published Site Size**: Limit 1 GB.
- **Bandwidth**: Soft limit of 100 GB per month.
- **Custom Headers**: GitHub Pages does not support custom HTTP headers (such as `X-Frame-Options` or server-sent `Content-Security-Policy`). All security policies are enforced via `<meta http-equiv="Content-Security-Policy">`. Frame-ancestors directives cannot be enforced via meta tags.
- **Mitigation**: Photos are never committed to the GitHub Pages repository. Full imagery resides in free external content-addressed storage (Hugging Face Datasets) with jsDelivr/Cloudflare R2 mirrors.

## Hugging Face Datasets & jsDelivr Storage Limits
- **Hugging Face**: Free dataset repository with Git LFS. Soft limit of 50,000 files per dataset and recommended maximum of 5,000 files per subdirectory. Sharded paths (`photos/YYYY-MM/`) are used to stay comfortably within folder limits.
- **jsDelivr Mirror**: Maximum file size of 20 MB per file, repository size ideally under 1 GB. Only 1280 px and 2048 px variants for selected portfolio highlights are mirrored on jsDelivr.

## Browser Colour and Image Encoding Limits
- **Canvas AVIF Encoding**: Native `canvas.convertToBlob({ type: 'image/avif' })` is unsupported or inconsistent across major browsers. A WASM AVIF encoder running inside a dedicated Web Worker is required in the admin ingest pipeline.
- **16-bit Master Export**: Browsers cannot write 16-bit TIFF files. Masters are exported locally as JPEG (quality 95) or 8-bit PNG with embedded sRGB ICC profile.
- **Lighting Estimation**: Lighting direction and diagrams derived from luminance gradients in the inspector are mathematical approximations ("Estimated") and labelled as such.
