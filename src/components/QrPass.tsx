import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrPass({ code, size = 144 }: { code: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(`CRITICARE:${code}`, { width: size, margin: 1 })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => setSrc(null));
    return () => {
      alive = false;
    };
  }, [code, size]);

  return (
    <div className="flex flex-col items-center gap-1">
      {src ? (
        <img
          src={src}
          width={size}
          height={size}
          alt={`Reservation pass QR code for ${code}`}
          className="rounded-md border border-border bg-card"
        />
      ) : (
        <div
          className="grid place-items-center rounded-md border border-border text-xs text-muted-foreground"
          style={{ width: size, height: size }}
        >
          …
        </div>
      )}
      <span className="font-mono text-sm tracking-widest text-foreground">{code}</span>
    </div>
  );
}
