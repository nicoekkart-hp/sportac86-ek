"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GalleryPhoto } from "@/lib/types";
import { deleteGalleryPhoto, reorderGalleryPhotos } from "./actions";

export function SortableGallery({ initialPhotos }: { initialPhotos: GalleryPhoto[] }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(photos, oldIndex, newIndex);
    setPhotos(next);
    startTransition(() => {
      reorderGalleryPhotos(next.map((p) => p.id));
    });
  }

  if (photos.length === 0) {
    return <p className="text-gray-sub text-sm">Nog geen foto&apos;s in de gallerij.</p>;
  }

  return (
    <>
      <p className="text-xs text-gray-sub mb-3">
        Sleep een kaart aan het grijphandvat om de volgorde aan te passen.
        {isPending && <span className="ml-2 italic">Opslaan…</span>}
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <SortableCard key={photo.id} photo={photo} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}

function SortableCard({ photo }: { photo: GalleryPhoto }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-[#e8e4df] rounded-sm overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-[#ddd8d0]">
        <Image
          src={photo.image_url}
          alt={photo.alt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {!photo.is_published && (
          <div className="absolute top-2 left-2 text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm">
            Verborgen
          </div>
        )}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Sleep om de volgorde te wijzigen"
          className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-dark rounded-sm p-1.5 cursor-grab active:cursor-grabbing shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
      </div>
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-sub truncate">
            #{photo.sort_order} · {photo.alt || "geen alt-tekst"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link
            href={`/admin/foto-gallerij/${photo.id}`}
            className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-2.5 py-1 rounded-sm hover:border-gray-400 transition-colors"
          >
            Bewerken
          </Link>
          <form action={deleteGalleryPhoto.bind(null, photo.id)}>
            <button
              type="submit"
              className="text-xs text-red-sportac border border-red-sportac/30 px-2.5 py-1 rounded-sm hover:bg-red-sportac/10 transition-colors"
            >
              Verwijderen
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
