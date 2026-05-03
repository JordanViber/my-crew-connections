import { ExternalLink } from "@/components/external-link";

export function PhotoAlbumFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2">
        <span className="field-label">Photo album label</span>
        <input className="field-input" name="photoAlbumLabel" type="text" placeholder="Shared Google Photos album" />
      </label>
      <label className="grid gap-2">
        <span className="field-label inline-flex items-center gap-2">
          Photo album link
          <ExternalLink className="text-xs font-semibold normal-case tracking-normal" href="https://photos.google.com/albums">
            Open Google Photos
          </ExternalLink>
        </span>
        <input className="field-input" name="photoAlbumUrl" type="url" placeholder="https://..." />
      </label>
    </div>
  );
}