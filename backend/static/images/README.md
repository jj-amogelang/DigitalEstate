# Static Area Images

Place per-area photos here so the backend can automatically serve them to the frontend.

## Folder structure

- This directory should contain an `areas` subfolder.
- Inside `areas`, create a folder named after the numeric Area ID, and put your image files there.

Example (Windows paths):

- `c:\Users\amoge\Digital Estate\backend\static\images\areas\123\sandton.jpeg`

Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`

If multiple files exist, the first file in alphabetical order is treated as the primary image for that area.

## How to find the Area ID

Use either endpoint while the backend is running on your machine (default http://localhost:5000):

1) Quick search by name
- GET `/api/areas/search?q=Sandton`
- Response includes `[{ id, name, ... }]`; use the `id` value.

2) Browse areas by city
- GET `/api/areas/Johannesburg`
- Look for the object where `name` is `Sandton`, then use its `id`.

## How it’s used by the API

- `GET /api/area/<area_id>` returns `primary_image_url` built from the first static file it finds in `static/images/areas/<area_id>/`.
- `GET /api/area/<area_id>/images` returns all images in that folder with absolute URLs.
- If nothing is found in static, the API falls back to the `area_images` table (if used), and finally to a placeholder.

No code changes are required—just drop the image file into the correct folder.
Area images go here.

Two options:

1) Folder-per-area (recommended for quick local use)
   - Create a folder named with the Area ID under `backend/static/images/areas/`
   - Example: backend/static/images/areas/42/
   - Put JPG/PNG/WEBP files inside that folder
   - The endpoint GET /api/area/<id>/images will serve them at /static/images/areas/<id>/<filename>

2) Database-backed images
   - Use table `area_images` (see `AreaImage` model)
   - Columns: area_id, image_url, is_primary, image_order, etc.
   - The endpoint will return these when no local static files are present

How to find Area IDs:
- Call GET /api/areas?limit=50 to list areas (or use your Explore UI)
- Or GET /api/areas/<city_ref> to list areas by city

Notes:
- In production, consider storing images in an object store (S3/Cloudinary) and saving the URLs in the `area_images` table.
