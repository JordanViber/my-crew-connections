export function PhotoAlbumFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2">
        <span className="field-label">Photo album label</span>
        <input className="field-input" name="photoAlbumLabel" type="text" placeholder="Shared Google Photos album" />
      </label>
      <label className="grid gap-2">
        <span className="field-label">Photo album link</span>
        <input className="field-input" name="photoAlbumUrl" type="url" placeholder="https://..." />
      </label>
    </div>
  );
}