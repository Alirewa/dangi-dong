/**
 * Shared off-screen capture pipeline, derived from factor-saz/src/lib/pdfExport.ts.
 *
 * Every step here exists because of a specific failure mode:
 *  - cloning into a fixed off-screen container escapes any parent transform,
 *    zoom or scroll offset, which otherwise corrupt the captured coordinates
 *  - explicitly loading each font weight is required because `fonts.ready`
 *    resolves without having loaded weights that no *rendered* text has
 *    demanded yet, producing tofu boxes in the PNG
 *  - the double rAF lets the clone actually paint before we read it
 *  - cleanup lives in `finally` so a thrown capture cannot leak a DOM node
 */

export interface CaptureOpts {
  width: number;
  pixelRatio?: number;
  dir?: 'rtl' | 'ltr';
  backgroundColor?: string;
}

const FONT_WEIGHTS = ['400', '500', '600', '700'];

/** Hard ceiling so a stalled capture can never leave the UI spinning forever. */
const CAPTURE_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Wait for two animation frames, but never block on them.
 *
 * requestAnimationFrame does not fire while the document is hidden, so a user
 * who backgrounds the app mid-export would otherwise wait forever on a promise
 * that can never settle. Racing against a timer keeps the paint-settling
 * benefit when visible and still makes progress when not.
 */
function settleFrames(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const timer = setTimeout(finish, 150);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        clearTimeout(timer);
        finish();
      })
    );
  });
}

async function withClone<T>(
  sourceId: string,
  opts: CaptureOpts,
  run: (el: HTMLElement) => Promise<T>
): Promise<T> {
  const source = document.getElementById(sourceId);
  if (!source) throw new Error('CAPTURE_TARGET_MISSING');

  const background = opts.backgroundColor ?? '#ffffff';
  const container = document.createElement('div');
  container.style.cssText =
    `position:fixed;top:-99999px;left:0;width:${opts.width}px;background:${background};` +
    `overflow:visible;z-index:-1;direction:${opts.dir ?? 'rtl'}`;

  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.style.cssText += `;transform:none;zoom:1;min-height:unset;width:${opts.width}px;display:block`;

  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    if (document.fonts) {
      // Bounded: font loading is best-effort, and a font that never resolves
      // must not block the export.
      await withTimeout(
        Promise.all(
          FONT_WEIGHTS.map((w) => document.fonts.load(`${w} 16px Vazirmatn`).catch(() => undefined))
        ).then(() => document.fonts.ready),
        5_000,
        'FONTS_TIMEOUT'
      ).catch(() => undefined);
    }
    await settleFrames();
    return await withTimeout(run(clone), CAPTURE_TIMEOUT_MS, 'CAPTURE_TIMEOUT');
  } finally {
    if (document.body.contains(container)) document.body.removeChild(container);
  }
}

/**
 * Chunk loading is bounded too: offline, a chunk the service worker failed to
 * precache would otherwise leave the export button spinning with no error.
 */
function loadHtmlToImage() {
  return withTimeout(import('html-to-image'), 15_000, 'EXPORT_LIB_TIMEOUT');
}

export async function captureBlob(sourceId: string, opts: CaptureOpts): Promise<Blob> {
  const { toBlob } = await loadHtmlToImage();
  return withClone(sourceId, opts, async (el) => {
    const blob = await toBlob(el, {
      pixelRatio: opts.pixelRatio ?? 2,
      backgroundColor: opts.backgroundColor ?? '#ffffff',
      width: opts.width,
      height: el.scrollHeight,
      cacheBust: true,
      style: { transform: 'none', zoom: '1', minHeight: 'unset' },
    });
    if (!blob) throw new Error('CAPTURE_FAILED');
    return blob;
  });
}

export async function captureCanvas(
  sourceId: string,
  opts: CaptureOpts
): Promise<HTMLCanvasElement> {
  const { toCanvas } = await loadHtmlToImage();
  return withClone(sourceId, opts, (el) =>
    toCanvas(el, {
      pixelRatio: opts.pixelRatio ?? 2,
      backgroundColor: opts.backgroundColor ?? '#ffffff',
      width: opts.width,
      height: el.scrollHeight,
      cacheBust: true,
      style: { transform: 'none', zoom: '1', minHeight: 'unset' },
    })
  );
}
