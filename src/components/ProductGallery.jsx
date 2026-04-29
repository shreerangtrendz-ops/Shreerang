import { useEffect, useState } from 'react';
import { getImagesForDesign } from '../../lib/productImages';

/*
  ProductGallery — display all images for a design number.

  Props:
    designNo (string | number) — required. The numeric design number (e.g., "769" or 769).
    maxHeight (string | number) — optional, default 420. CSS size for main image container.
    compact (bool) — if true, shows a single small thumb (for inline table rows).

  Data:
    Queries public.product_images via supabase client.
    One "primary" image shown first; additional angles show as thumbnail strip below.

  Example:
    <ProductGallery designNo={rowData.design_no} />
    <ProductGallery designNo="1763" compact />
*/

const T = {
  border: '#E4E4E7',
  bg: '#F8F9FA',
  text: '#18181B',
  muted: '#71717A',
  faint: '#A1A1AA',
  accent: '#1D9E75',
  surface: '#FFFFFF',
};

export default function ProductGallery({ designNo, maxHeight = 420, compact = false }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (designNo == null || String(designNo).trim() === '') {
      setImages([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getImagesForDesign(designNo)
      .then(imgs => {
        if (cancelled) return;
        setImages(imgs);
        setActive(0);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[ProductGallery]', err);
        setError(err.message || 'Failed to load images');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [designNo]);

  // Compact mode = one small thumbnail, no gallery
  if (compact) {
    if (loading) return <Skeleton size={48} />;
    if (!images.length) return <NoImage compact />;
    return (
      <img
        src={images[0].cdn_url}
        alt={`Design ${designNo}`}
        loading="lazy"
        style={{
          width: 48, height: 48,
          objectFit: 'cover',
          borderRadius: 4,
          border: `1px solid ${T.border}`,
          flexShrink: 0,
        }}
        onError={e => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, padding: 12 }}>
        Loading images for design {designNo}…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: 12, fontSize: 12, color: '#B91C1C',
        background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
      }}>
        Failed to load images: {error}
      </div>
    );
  }

  if (!images.length) {
    return <NoImage designNo={designNo} />;
  }

  const current = images[active];
  const sizeStyle = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
      {/* Primary image */}
      <div style={{
        background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: sizeStyle,
      }}>
        <img
          src={current.cdn_url}
          alt={`Design ${designNo} — ${current.filename}`}
          style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
          onError={e => { e.currentTarget.src = '/placeholder-image.svg'; }}
        />
      </div>

      {/* Caption */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 6, fontSize: 11, color: T.muted,
      }}>
        <span>
          Design <strong style={{ color: T.text }}>{designNo}</strong>
          {current.category && <> · {current.category}</>}
          {current.width && <> · {current.width}</>}
          {current.style && <> · {current.style}</>}
        </span>
        <span>
          {active + 1} of {images.length}
          {current.is_primary && <span style={{ marginLeft: 6, padding: '1px 5px', background: T.accent, color: '#fff', borderRadius: 3, fontSize: 9, fontWeight: 700 }}>PRIMARY</span>}
        </span>
      </div>

      {/* Thumbnail strip (only if > 1 image) */}
      {images.length > 1 && (
        <div style={{
          display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto',
          paddingBottom: 4,
        }}>
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              title={img.filename}
              style={{
                flexShrink: 0, width: 64, height: 64,
                border: i === active ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                borderRadius: 6, overflow: 'hidden',
                padding: 0, cursor: 'pointer', background: T.surface,
              }}
            >
              <img
                src={img.cdn_url}
                alt=""
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Skeleton({ size = 48 }) {
  return (
    <div style={{
      width: size, height: size,
      background: T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: 4,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

function NoImage({ designNo, compact }) {
  if (compact) {
    return (
      <div style={{
        width: 48, height: 48,
        background: T.bg, border: `1px dashed ${T.border}`, borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: T.faint, flexShrink: 0,
      }} title="No image">
        🎨
      </div>
    );
  }
  return (
    <div style={{
      padding: '32px 16px', textAlign: 'center',
      background: T.bg, border: `1px dashed ${T.border}`, borderRadius: 10,
      fontSize: 12, color: T.muted,
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🎨</div>
      <div>No images uploaded yet for design {designNo}</div>
      <div style={{ fontSize: 10, marginTop: 6, color: T.faint }}>
        Add images to Drive and run <code>npm run sync-images</code>
      </div>
    </div>
  );
}
