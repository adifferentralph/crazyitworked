"use client";

import Image from "next/image";
import { useState } from "react";

type GalleryImage = {
  id: string;
  signedUrl: string | null;
  type: string;
};

const imageLabels: Record<string, string> = {
  ANGLE: "Additional angle",
  DETAIL: "Detail",
  OTHER: "Product photo",
  PACKAGING: "Another photo",
  PART_NUMBER: "Extra photo",
  PRIMARY: "Main photo",
};

function getImageLabel(type: string) {
  return imageLabels[type] ?? type.replaceAll("_", " ").toLocaleLowerCase();
}

export function ProductImageGallery({
  images,
  initialImageId,
  productName,
}: {
  images: GalleryImage[];
  initialImageId?: string;
  productName: string;
}) {
  const availableImages = images.filter(
    (image): image is GalleryImage & { signedUrl: string } => Boolean(image.signedUrl),
  );
  const [selectedImageId, setSelectedImageId] = useState(
    initialImageId ?? availableImages[0]?.id ?? "",
  );
  const selectedImage =
    availableImages.find((image) => image.id === selectedImageId) ?? availableImages[0];

  if (!selectedImage) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-lg border border-stone-200 bg-stone-100 text-sm text-stone-500">
        No marketplace image available
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
        <Image
          alt={`${productName} ${getImageLabel(selectedImage.type).toLocaleLowerCase()}`}
          className="object-contain"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 58vw"
          src={selectedImage.signedUrl}
          unoptimized
        />
      </div>

      {availableImages.length > 1 ? (
        <div
          aria-label="Choose a product image"
          className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5"
          role="group"
        >
          {availableImages.map((image) => {
            const selected = image.id === selectedImage.id;
            const label = getImageLabel(image.type);
            return (
              <button
                aria-label={`Show ${label.toLocaleLowerCase()}`}
                aria-pressed={selected}
                className={`overflow-hidden rounded-md border bg-white text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  selected ? "border-primary ring-1 ring-primary" : "border-stone-200"
                }`}
                key={image.id}
                onClick={() => setSelectedImageId(image.id)}
                type="button"
              >
                <span className="relative block aspect-square bg-stone-100">
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="object-cover"
                    fill
                    sizes="160px"
                    src={image.signedUrl}
                    unoptimized
                  />
                </span>
                <span className="block px-2 py-1.5 text-[11px] font-semibold text-stone-600">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
