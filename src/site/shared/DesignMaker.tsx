import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ImagePlus, LoaderCircle, Lock, Trash2, Type } from 'lucide-react';
import { CUSTOM_PRODUCTS, MAX_CUSTOM_QUANTITY, type CustomProduct, type CustomProductKey } from '../../lib/customDesign';
import { formatMoney } from '../../lib/format';

/** Design-your-own: the customer picks a piece, adds a picture and/or text, sees it live, and pays. Printify prints it. */

type Box = { x: number; y: number; w: number; h: number };
/** Each mockup is drawn in a 400 x 440 box; `print` is where the design sits, before it is fitted to Printify's exact shape. */
const MOCKUPS: Record<CustomProductKey, { print: Box; draw: (fill: string, line: string) => string }> = {
  tee: {
    print: { x: 135, y: 118, w: 130, h: 156 },
    draw: (fill, line) => `<path d="M150 40 Q200 70 250 40 L330 72 L382 152 L322 182 L300 150 L300 420 L100 420 L100 150 L78 182 L18 152 L70 72 Z" fill="${fill}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/><path d="M150 40 Q200 88 250 40" fill="none" stroke="${line}" stroke-width="2"/>`,
  },
  hoodie: {
    print: { x: 140, y: 160, w: 120, h: 120 },
    draw: (fill, line) => `<path d="M140 52 Q200 6 260 52 L330 80 Q358 150 374 396 L334 404 L304 196 L304 420 L96 420 L96 196 L66 404 L26 396 Q42 150 70 80 Z" fill="${fill}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/><path d="M146 54 Q200 120 254 54 Q234 20 200 18 Q166 20 146 54 Z" fill="${fill}" stroke="${line}" stroke-width="2"/><path d="M186 104 L182 150 M214 104 L218 150" stroke="${line}" stroke-width="2" fill="none"/><path d="M150 330 L250 330 L262 392 L138 392 Z" fill="none" stroke="${line}" stroke-width="1.6" opacity=".7"/>`,
  },
  tote: {
    print: { x: 120, y: 190, w: 160, h: 160 },
    draw: (fill, line) => `<path d="M150 140 L150 60 Q150 30 200 30 Q250 30 250 60 L250 140" fill="none" stroke="${line}" stroke-width="10" stroke-linecap="round"/><path d="M150 140 L150 60 Q150 30 200 30 Q250 30 250 60 L250 140" fill="none" stroke="${fill}" stroke-width="6" stroke-linecap="round"/><rect x="80" y="130" width="240" height="290" rx="6" fill="${fill}" stroke="${line}" stroke-width="2"/>`,
  },
  mug: {
    print: { x: 96, y: 180, w: 186, h: 87 },
    draw: (fill, line) => `<path d="M290 170 Q360 170 360 240 Q360 310 290 310" fill="none" stroke="${line}" stroke-width="22" stroke-linecap="round"/><path d="M290 170 Q360 170 360 240 Q360 310 290 310" fill="none" stroke="${fill}" stroke-width="17" stroke-linecap="round"/><path d="M80 110 L300 110 L300 360 Q300 384 276 384 L104 384 Q80 384 80 360 Z" fill="${fill}" stroke="${line}" stroke-width="2"/><ellipse cx="190" cy="110" rx="110" ry="14" fill="${fill}" stroke="${line}" stroke-width="2"/>`,
  },
};

const FONTS = [
  { id: 'line', label: 'Davinova', family: "'Davinova Line', 'Archivo', sans-serif", weight: 400, style: 'normal', upper: true },
  { id: 'serif', label: 'Playfair', family: "'Playfair Display', serif", weight: 600, style: 'normal', upper: false },
  { id: 'script', label: 'Cormorant', family: "'Cormorant Garamond', serif", weight: 500, style: 'italic', upper: false },
  { id: 'bold', label: 'Archivo', family: "'Archivo', sans-serif", weight: 800, style: 'normal', upper: false },
  { id: 'mono', label: 'Plex Mono', family: "'IBM Plex Mono', monospace", weight: 500, style: 'normal', upper: false },
] as const;
type FontId = typeof FONTS[number]['id'];

const INKS = ['#2E2019', '#FBF1E2', '#8E735B', '#CDB69E', '#111111', '#FFFFFF', '#9C2F3A', '#C8A15A'];

interface TextLayer { value: string; font: FontId; color: string; size: number; x: number; y: number }
interface ImageLayer { img: HTMLImageElement; name: string; w: number; x: number; y: number }
type Layer = 'image' | 'text';
interface Status { ready: boolean; printAreas: Partial<Record<CustomProductKey, { width: number; height: number }>> }

/** Fits the mockup's print box to the real print-area shape, keeping its width and centre. */
function fittedBox(product: CustomProduct, area: { width: number; height: number }): Box {
  const box = MOCKUPS[product.key].print;
  const ratio = area.height / area.width;
  let w = box.w;
  let h = w * ratio;
  if (h > 230) { h = 230; w = h / ratio; }
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

function fontOf(id: FontId) { return FONTS.find((font) => font.id === id) ?? FONTS[0]; }

/** Draws the design into a print-area canvas of any size; used for the live view and the final print file. */
function drawDesign(ctx: CanvasRenderingContext2D, width: number, height: number, image: ImageLayer | null, text: TextLayer) {
  ctx.clearRect(0, 0, width, height);
  if (image) {
    const w = image.w * width;
    const h = w * (image.img.naturalHeight / image.img.naturalWidth);
    ctx.drawImage(image.img, image.x * width - w / 2, image.y * height - h / 2, w, h);
  }
  const value = text.value.trim();
  if (value) {
    const font = fontOf(text.font);
    const px = text.size * width;
    ctx.font = `${font.style} ${font.weight} ${px}px ${font.family}`;
    ctx.fillStyle = text.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = (font.upper ? value.toUpperCase() : value).split('\n').slice(0, 3);
    lines.forEach((line, index) => ctx.fillText(line, text.x * width, text.y * height + (index - (lines.length - 1) / 2) * px * 1.15));
  }
}

function svgMarkup(product: CustomProduct, fill: string, dark: boolean): string {
  const line = dark ? 'rgba(255,255,255,.22)' : 'rgba(46,32,25,.28)';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 440"><defs><linearGradient id="dm-shade" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".10"/><stop offset=".45" stop-color="#fff" stop-opacity=".10"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient></defs>${MOCKUPS[product.key].draw(fill, line)}</svg>`;
}

function isDark(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 110;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('This picture could not be opened. Try a JPG or PNG.')); img.src = src; });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Your design could not be saved on this device.')), type, quality));
}

export function DesignMaker({ dept }: { dept: 'women' | 'men' }) {
  const [params] = useSearchParams();
  const [productKey, setProductKey] = useState<CustomProductKey>(() => (CUSTOM_PRODUCTS.find((item) => item.key === params.get('item'))?.key ?? 'tee'));
  const product = CUSTOM_PRODUCTS.find((item) => item.key === productKey)!;
  const [colorName, setColorName] = useState(product.colors[0].name);
  const color = product.colors.find((item) => item.name === colorName) ?? product.colors[0];
  const [size, setSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState<ImageLayer | null>(null);
  const [text, setText] = useState<TextLayer>({ value: '', font: 'serif', color: product.colors[0].ink, size: 0.12, x: 0.5, y: 0.5 });
  const [active, setActive] = useState<Layer>('text');
  const [rights, setRights] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(params.get('checkout') === 'cancelled' ? 'Checkout was cancelled. Your design is still here if you want to try again.' : '');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ layer: Layer; dx: number; dy: number } | null>(null);
  const [, setFontsReady] = useState(0);

  useEffect(() => {
    fetch('/api/custom/status', { headers: { Accept: 'application/json' } }).then((response) => response.json() as Promise<Status>).then(setStatus).catch(() => setStatus({ ready: false, printAreas: {} }));
    // Canvas text only uses a web font once it has loaded.
    Promise.all(FONTS.map((font) => document.fonts?.load(`${font.style} ${font.weight} 40px ${font.family}`))).then(() => setFontsReady((n) => n + 1)).catch(() => undefined);
  }, []);

  const area = status?.printAreas[productKey] ?? product.print;
  const box = useMemo(() => fittedBox(product, area), [product, area]);
  const dark = isDark(color.hex);

  const pickProduct = (key: CustomProductKey) => {
    const next = CUSTOM_PRODUCTS.find((item) => item.key === key)!;
    setProductKey(key);
    const keep = next.colors.find((item) => item.name === colorName) ?? next.colors[0];
    setColorName(keep.name);
    setText((current) => ({ ...current, color: current.color === color.ink ? keep.ink : current.color }));
    if (next.sizes.length && !next.sizes.includes(size)) setSize('M');
  };
  const pickColor = (name: string) => {
    const next = product.colors.find((item) => item.name === name)!;
    setText((current) => ({ ...current, color: current.color === color.ink ? next.ink : current.color }));
    setColorName(name);
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const ctx = canvas.getContext('2d');
    if (ctx) drawDesign(ctx, canvas.width, canvas.height, image, text);
  }, [image, text]);
  useEffect(() => { redraw(); });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => redraw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError('');
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setError('Please choose a JPG, PNG or WebP picture.'); return; }
    if (file.size > 25 * 1024 * 1024) { setError('This picture is over 25 MB. Please choose a smaller one.'); return; }
    try {
      const img = await loadImage(URL.createObjectURL(file));
      const tall = img.naturalHeight / img.naturalWidth;
      const fit = Math.min(0.9, (0.9 * (area.height / area.width)) / tall);
      setImage({ img, name: file.name, w: fit, x: 0.5, y: 0.5 });
      setActive('image');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'This picture could not be opened.'); }
  }

  // Drag whichever layer is under the finger (or the selected one) around the print area.
  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }
  function hit(p: { x: number; y: number }): Layer | null {
    if (text.value.trim() && Math.abs(p.x - text.x) < 0.45 && Math.abs(p.y - text.y) * (area.height / area.width) < text.size * 1.2) return 'text';
    if (image) {
      const h = image.w * (image.img.naturalHeight / image.img.naturalWidth) * (area.width / area.height);
      if (Math.abs(p.x - image.x) < image.w / 2 && Math.abs(p.y - image.y) < h / 2) return 'image';
    }
    return null;
  }
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  function onDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const p = point(event);
    const layer = hit(p) ?? (active === 'image' && image ? 'image' : text.value.trim() ? 'text' : null);
    if (!layer) return;
    const origin = layer === 'image' ? image! : text;
    drag.current = { layer, dx: p.x - origin.x, dy: p.y - origin.y };
    setActive(layer);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const current = drag.current;
    if (!current) return;
    const p = point(event);
    const x = clamp(p.x - current.dx);
    const y = clamp(p.y - current.dy);
    if (current.layer === 'image') setImage((layer) => layer && { ...layer, x, y });
    else setText((layer) => ({ ...layer, x, y }));
  }
  const onUp = () => { drag.current = null; };

  const dpi = image ? Math.round(image.img.naturalWidth / (image.w * product.print.inches)) : 0;
  const hasDesign = Boolean(image || text.value.trim());

  async function buy() {
    setError('');
    if (!hasDesign) { setError('Add a picture or some text first.'); return; }
    if (!rights) { setError('Please confirm you have the right to print this design.'); return; }
    try {
      setBusy('Saving your design…');
      // Print file at Printify's shape, kept under ~15 MP so phones can draw it.
      const scale = Math.min(1, Math.sqrt(15_000_000 / (area.width * area.height)));
      const print = document.createElement('canvas');
      print.width = Math.round(area.width * scale);
      print.height = Math.round(area.height * scale);
      drawDesign(print.getContext('2d')!, print.width, print.height, image, text);
      const printBlob = await toBlob(print, 'image/png');

      // Preview: the design on the piece, for your approval page and the Stripe checkout.
      const preview = document.createElement('canvas');
      preview.width = 800; preview.height = 880;
      const pctx = preview.getContext('2d')!;
      pctx.fillStyle = dept === 'men' ? '#d6d8d2' : '#f5ece0';
      pctx.fillRect(0, 0, 800, 880);
      const mock = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup(product, color.hex, dark)));
      pctx.drawImage(mock, 0, 0, 800, 880);
      pctx.drawImage(print, box.x * 2, box.y * 2, box.w * 2, box.h * 2);
      const previewBlob = await toBlob(preview, 'image/jpeg', 0.86);

      const form = new FormData();
      form.set('product', product.key);
      form.set('color', color.name);
      form.set('rights', 'yes');
      form.set('print', new File([printBlob], 'print.png', { type: 'image/png' }));
      form.set('preview', new File([previewBlob], 'preview.jpg', { type: 'image/jpeg' }));
      const saved = await fetch('/api/custom/upload', { method: 'POST', body: form });
      const savedBody = await saved.json().catch(() => ({})) as { designId?: string; error?: string };
      if (!saved.ok || !savedBody.designId) throw new Error(savedBody.error || 'Your design could not be saved. Please try again.');

      setBusy('Opening secure checkout…');
      const response = await fetch('/api/custom/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ designId: savedBody.designId, size, quantity, dept, ...(code.trim() ? { code: code.trim() } : {}) }),
      });
      const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !result.url?.startsWith('https://checkout.stripe.com/')) throw new Error(result.error || 'Secure checkout could not be opened.');
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.');
      setBusy('');
    }
  }

  return <section className={`dm dm--${dept}`}>
    <div className="dm__head">
      <span className="nova-chip">Davinova Custom · Design your own</span>
      <h1>Make it <b>yours</b></h1>
      <p>Pick a piece, add your picture or words, and see it live. We print it just for you.</p>
    </div>

    <div className="dm__studio">
      <div className="dm__stage">
        <div className="dm__mock" style={{ ['--dm-fill' as string]: color.hex }}>
          <div className="dm__svg" dangerouslySetInnerHTML={{ __html: svgMarkup(product, color.hex, dark) }} />
          <canvas
            ref={canvasRef}
            className={`dm__canvas${hasDesign ? '' : ' dm__canvas--empty'}`}
            style={{ left: `${box.x / 4}%`, top: `${box.y / 4.4}%`, width: `${box.w / 4}%`, height: `${box.h / 4.4}%` }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            aria-label="Your design. Drag to move it."
          />
        </div>
        <p className="dm__hint">{hasDesign ? 'Drag your design to move it.' : 'Your design appears here.'}</p>
      </div>

      <div className="dm__panel">
        <fieldset className="dm__group">
          <legend>1 · Piece</legend>
          <div className="dm__pieces">{CUSTOM_PRODUCTS.map((item) => <button key={item.key} type="button" className={item.key === productKey ? 'is-on' : ''} onClick={() => pickProduct(item.key)}>
            <b>{item.key[0].toUpperCase() + item.key.slice(1)}</b><span>{formatMoney(item.priceCents)}</span>
          </button>)}</div>
          <p className="dm__note">{product.line}</p>
        </fieldset>

        <fieldset className="dm__group">
          <legend>2 · Colour{product.sizes.length ? ' & size' : ''}</legend>
          <div className="dm__swatches">{product.colors.map((item) => <button key={item.name} type="button" title={item.name} aria-label={item.name} className={item.name === color.name ? 'is-on' : ''} style={{ background: item.hex }} onClick={() => pickColor(item.name)} />)}<span>{color.name}</span></div>
          {product.sizes.length > 0 && <div className="dm__sizes">{product.sizes.map((item) => <button key={item} type="button" className={item === size ? 'is-on' : ''} onClick={() => setSize(item)}>{item}</button>)}</div>}
        </fieldset>

        <fieldset className="dm__group">
          <legend>3 · Picture</legend>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { void onFile(event.target.files?.[0]); event.target.value = ''; }} />
          {!image
            ? <button type="button" className="dm__upload" onClick={() => fileRef.current?.click()}><ImagePlus size={18} /> Upload a picture</button>
            : <div className="dm__layer">
              <div className="dm__row"><span className="dm__file">{image.name}</span><button type="button" className="dm__icon" onClick={() => setImage(null)} aria-label="Remove picture"><Trash2 size={16} /></button></div>
              <label>Size <input type="range" min="0.1" max="1" step="0.01" value={image.w} onChange={(event) => { setActive('image'); setImage({ ...image, w: Number(event.target.value) }); }} /></label>
              {dpi < 150 && <p className="dm__warn">This picture is small for this size ({dpi} dpi), so it may print blurry. Make it smaller or use a larger picture.</p>}
              <p className="dm__note">Tip: a PNG with a transparent background looks best.</p>
            </div>}
        </fieldset>

        <fieldset className="dm__group">
          <legend>4 · Text</legend>
          <div className="dm__layer">
            <label className="dm__text"><Type size={16} /><textarea rows={2} maxLength={60} placeholder="Your words (up to 3 lines)" value={text.value} onFocus={() => setActive('text')} onChange={(event) => setText({ ...text, value: event.target.value.split('\n').slice(0, 3).join('\n') })} /></label>
            <div className="dm__fonts">{FONTS.map((item) => <button key={item.id} type="button" className={item.id === text.font ? 'is-on' : ''} style={{ fontFamily: item.family, fontStyle: item.style, fontWeight: item.weight }} onClick={() => setText({ ...text, font: item.id })}>{item.upper ? 'AA' : 'Aa'}<small>{item.label}</small></button>)}</div>
            <div className="dm__swatches dm__swatches--ink">{INKS.map((ink) => <button key={ink} type="button" aria-label={'Text colour ' + ink} className={ink === text.color ? 'is-on' : ''} style={{ background: ink }} onClick={() => setText({ ...text, color: ink })} />)}</div>
            <label>Size <input type="range" min="0.04" max="0.3" step="0.005" value={text.size} onChange={(event) => { setActive('text'); setText({ ...text, size: Number(event.target.value) }); }} /></label>
          </div>
        </fieldset>

        <div className="dm__buy">
          <div className="dm__row">
            <div className="dm__qty"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="One less">−</button><span>{quantity}</span><button type="button" onClick={() => setQuantity(Math.min(MAX_CUSTOM_QUANTITY, quantity + 1))} aria-label="One more">+</button></div>
            <strong className="dm__price">{formatMoney(product.priceCents * quantity)}</strong>
          </div>
          <input className="dm__code" type="text" placeholder="Promo code (optional)" value={code} maxLength={32} onChange={(event) => setCode(event.target.value.replace(/\s/g, ''))} aria-label="Promo code" />
          <label className="dm__rights"><input type="checkbox" checked={rights} onChange={(event) => setRights(event.target.checked)} /> I own this picture or have the right to print it (no brand logos or other people’s artwork).</label>
          <button type="button" className="dm__cta" disabled={Boolean(busy) || status?.ready === false} onClick={() => void buy()}>
            {busy ? <><LoaderCircle size={16} className="viewer-spinner" /> {busy}</> : status?.ready === false ? 'Custom orders open very soon' : <><Lock size={15} /> Buy now · free delivery</>}
          </button>
          {error && <p className="dm__error" role="alert">{error}</p>}
          <p className="dm__note">Printed for you, then shipped with tracking in about 7–12 business days. Because it is made just for you, a custom piece can only be returned if it arrives damaged or misprinted.</p>
          <Link className="dm__back" to={dept === 'men' ? '/men/custom' : '/custom'}>← Our own designs</Link>
        </div>
      </div>
    </div>
  </section>;
}
