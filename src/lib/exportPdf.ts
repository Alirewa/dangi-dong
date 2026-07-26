import { captureCanvas } from './capture';
import { STATEMENT_CARD_ID, STATEMENT_WIDTH } from './exportImage';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * Renders the statement card to a multi-page A4 PDF.
 *
 * The slicing loop is adapted from resume-saz/lib/pdf.ts: a monthly statement
 * with 20+ expenses exceeds one page, and scaling it down to fit (which
 * factor-saz does) would make it unreadable.
 *
 * jsPDF is dynamically imported so it stays out of the initial bundle — export
 * is a rare action in an app that must load fast on a phone.
 */
export async function exportStatementPdf(filename: string, dir: 'rtl' | 'ltr'): Promise<void> {
  const { jsPDF } = await import('jspdf');

  const canvas = await captureCanvas(STATEMENT_CARD_ID, {
    width: STATEMENT_WIDTH,
    pixelRatio: 2,
    dir,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // How many source pixels correspond to one A4 page at this width.
  const pxPerMm = canvas.width / A4_WIDTH_MM;
  const pageHeightPx = Math.floor(A4_HEIGHT_MM * pxPerMm);

  if (canvas.height <= pageHeightPx) {
    const heightMm = canvas.height / pxPerMm;
    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.95),
      'JPEG',
      0,
      0,
      A4_WIDTH_MM,
      heightMm,
      undefined,
      'FAST'
    );
    pdf.save(filename);
    return;
  }

  const slice = document.createElement('canvas');
  const ctx = slice.getContext('2d');
  if (!ctx) throw new Error('CANVAS_CONTEXT_UNAVAILABLE');
  slice.width = canvas.width;

  let offset = 0;
  let first = true;

  while (offset < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - offset);
    slice.height = sliceHeight;

    // Repaint the background: JPEG has no alpha, and an unpainted slice
    // encodes as black rather than white.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, sliceHeight);
    ctx.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    if (!first) pdf.addPage();
    pdf.addImage(
      slice.toDataURL('image/jpeg', 0.95),
      'JPEG',
      0,
      0,
      A4_WIDTH_MM,
      sliceHeight / pxPerMm,
      undefined,
      'FAST'
    );

    first = false;
    offset += sliceHeight;
  }

  pdf.save(filename);
}
