"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

interface Photo {
  src: string;
  alt: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  initialVisible?: number;
}

export function PhotoGallery({ photos, initialVisible = 6 }: PhotoGalleryProps) {
  const [showAll, setShowAll] = useState(false);
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  const visiblePhotos = showAll ? photos : photos.slice(0, initialVisible);
  const hasMore = photos.length > initialVisible;

  const openModal = (index: number) => setModalIndex(index);
  const closeModal = () => setModalIndex(null);

  const prev = useCallback(() => {
    setModalIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }, [photos.length]);

  const next = useCallback(() => {
    setModalIndex((i) => (i === null ? null : (i + 1) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    if (modalIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalIndex, prev, next]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (modalIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [modalIndex]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {visiblePhotos.map((photo, i) => (
          <button
            key={photo.src}
            onClick={() => openModal(i)}
            className="relative aspect-square overflow-hidden rounded-sm bg-[#ddd8d0] group focus:outline-none focus-visible:ring-2 focus-visible:ring-red-sportac"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, 33vw"
              priority={i === 0}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <svg className="w-8 h-8 text-white drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-sm text-sm font-semibold text-gray-sub hover:border-red-sportac hover:text-red-sportac transition-colors"
        >
          + {photos.length - initialVisible} meer foto&apos;s
        </button>
      )}

      {modalIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeModal}
        >
          {/* Close */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
            aria-label="Sluiten"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-semibold">
            {modalIndex + 1} / {photos.length}
          </div>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors z-10 p-2"
            aria-label="Vorige foto"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Image */}
          <div
            className="relative max-w-4xl max-h-[85vh] w-full mx-16"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[modalIndex].src}
              alt={photos[modalIndex].alt}
              width={1200}
              height={800}
              className="object-contain max-h-[85vh] w-full rounded-sm"
              priority
            />
          </div>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors z-10 p-2"
            aria-label="Volgende foto"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
