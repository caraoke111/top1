"use client";

import { useState } from "react";

// Muestra la foto; si no hay o falla al cargar, cae en las iniciales del nombre.
export default function Avatar({
  src,
  name,
  imgClassName = "h-full w-full object-cover",
}: {
  src?: string;
  name: string;
  imgClassName?: string;
}) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        onError={() => setErr(true)}
        className={imgClassName}
      />
    );
  }
  return <>{(name || "?").slice(0, 2).toUpperCase()}</>;
}
