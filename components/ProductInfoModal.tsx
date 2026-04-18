"use client";

import Image from "next/image";
import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import { PackGroup, Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export function ProductInfoModal({
  product,
  group,
}: {
  product: Product;
  group: PackGroup | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  const priceLine = group
    ? `${formatPrice(group.unit_price_cents)} per fles · doos van ${group.pack_size}: ${formatPrice(group.pack_price_cents)}`
    : formatPrice(product.price_cents);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="text-xs font-semibold text-red-sportac hover:underline"
      >
        Meer info
      </button>
      <dialog
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="backdrop:bg-black/40 rounded-sm max-w-lg w-[calc(100%-2rem)] p-0 m-auto fixed inset-0"
      >
        <div className="flex flex-col">
          {product.image_url && (
            <div className="relative w-full aspect-[4/3] bg-[#f5f3f0]">
              <Image src={product.image_url} alt={product.name} fill className="object-contain" sizes="(max-width: 640px) 100vw, 512px" />
            </div>
          )}
          <div className="p-6 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-condensed font-black italic text-2xl text-gray-dark">{product.name}</h2>
                <p className="text-sm text-gray-sub mt-1">{priceLine}</p>
              </div>
              <button
                type="button"
                onClick={() => ref.current?.close()}
                aria-label="Sluiten"
                className="text-gray-sub hover:text-gray-dark text-2xl leading-none"
              >
                ×
              </button>
            </div>
            {product.description && (
              <div className="prose prose-sm max-w-none text-gray-body [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold">
                <ReactMarkdown>{product.description}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
