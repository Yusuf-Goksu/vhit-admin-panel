"use client";

import { useEffect } from "react";

import Button from "./Button";

type ImageLightboxProps = {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
};

export default function ImageLightbox({ open, onClose, src, alt }: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:bg-white/10"
          aria-label="Kapat"
        >
          ✕ Kapat
        </Button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}
