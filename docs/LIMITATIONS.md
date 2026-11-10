# Known Limitations & Platform Constraints

Per Rule 6 ("Honesty in UI and Docs"), this document records all known technical constraints, free-tier quotas, and deterrence boundaries.

## Client-Side Download Deterrence vs. DRM
- **Constraint**: Pure client-side deterrents (disabling right-click context menus, intercepting save shortcuts, blocking drag-and-drop, avoiding `<img>` tags in favour of WebGL/canvas rendering) **do not and cannot prevent** screenshots, OS-level screen capture, or network traffic inspection (DevTools Network tab).
- **Security & Privacy Boundary**: These measures prevent casual one-click saving and ensure 4K full-resolution originals never leave the local admin machine. Public variants are capped at 2048 px long edge.

## Storage Provider Limits & Terms (Checked: 10 November 2026)

### 1. Hugging Face Datasets (Primary Storage)
- **Source**: [Hugging Face Storage Terms](https://huggingface.co/docs/hub/repositories-getting-started)
- **Free Quota**: Unlimited dataset repositories; Git LFS tracking for media files up to 50 GB per file.
- **Directory Limit**: Recommended maximum of 5,000 to 10,000 files per directory.
- **Mitigation**: Managed by `buildContentAddressedPath` which automatically shards files into monthly folders (`photos/YYYY-MM/`) and switches to prefix subfolders (`photos/YYYY-MM/ab/`) if folder file count approaches 5,000.
- **Security**: Tokens live in volatile memory only and are wiped on browser tab close (Rule 7).

### 2. jsDelivr GitHub CDN Mirror (Secondary Storage)
- **Source**: [jsDelivr Limits](https://www.jsdelivr.com/)
- **File Size Cap**: Maximum 20 MB per file.
- **Repository Size Limit**: Target repository size under 1 GB.
- **Mirroring Policy**: Dedicated public repository (`thengnioh-photos`) used strictly as a mirror for selected highlights (1280 px and 2048 px variants). Masters and raw files are never pushed to the mirror.

### 3. Cloudflare R2 (Optional Tertiary Storage)
- **Source**: [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- **Free Tier**: 10 GB storage per month, 1,000,000 Class A operations, 10,000,000 Class B operations, $0 egress fees.

### 4. GitHub Pages Hosting
- **Repository Size**: Target < 1 GB.
- **Published Site Size**: Limit 1 GB.
- **Bandwidth**: Soft limit of 100 GB per month.
- **Custom Headers**: GitHub Pages does not support custom HTTP response headers (`X-Frame-Options` or server-sent CSP). All security policies are enforced via `<meta http-equiv="Content-Security-Policy">`.

## Browser Colour and Image Encoding Limits
- **Canvas AVIF Encoding**: Native `canvas.convertToBlob({ type: 'image/avif' })` is unsupported or inconsistent across major browsers. A WASM AVIF encoder running inside a dedicated Web Worker is required in the admin ingest pipeline.
- **16-bit Master Export**: Browsers cannot write 16-bit TIFF files. Masters are exported locally as JPEG (quality 95) or 8-bit PNG with embedded sRGB ICC profile.
- **Lighting Estimation**: Lighting direction and diagrams derived from luminance gradients in the inspector are mathematical approximations ("Estimated") and labelled as such.
- **Failover Latency**: Failover cannot be instantaneous ("under 50 ms") because it requires network timeout detection (adaptive 1.5s–2.5s) before triggering the hedged mirror request.
