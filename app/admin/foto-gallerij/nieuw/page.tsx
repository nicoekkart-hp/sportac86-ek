import { GalleryPhotoForm } from "../_GalleryPhotoForm";
import { createGalleryPhoto } from "../actions";

export default function NieuwGalleryPhotoPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">
          Foto toevoegen
        </h1>
      </div>
      <GalleryPhotoForm action={createGalleryPhoto} />
    </div>
  );
}
