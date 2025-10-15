import os
from sqlalchemy import text
from app_config import Config
from db_core import db
from flask import Flask

"""
Seed representative images for key areas into area_images table.
- Idempotent: skips if an identical image_url already exists for the area.
- Uses local static files if present; otherwise, uses Unsplash placeholders.

Areas covered: Sandton, Rosebank, Sea Point, Claremont
"""

SEED_IMAGES = {
	'Sandton': [
		# Prefer local static if available
		'/static/images/areas/SANDTON/sandton.JPEG',
		'https://source.unsplash.com/featured/?sandton,city&sig=1001',
	],
	'Rosebank': [
		'/static/images/areas/ROSEBANK/WhatsApp Image 2025-10-12 at 18.15.28_028ab3c1.jpg',
		'https://source.unsplash.com/featured/?rosebank,johannesburg&sig=1002',
	],
	'Sea Point': [
		'https://source.unsplash.com/featured/?sea%20point,cape%20town&sig=1003',
	],
	'Claremont': [
		'https://source.unsplash.com/featured/?claremont,cape%20town&sig=1004',
	],
}

def seed_images():
	app = Flask(__name__)
	app.config.from_object(Config)
	db.init_app(app)
	with app.app_context():
		engine = db.engine
		with engine.begin() as conn:
			# Ensure tables exist (dev SQLite); on Postgres assume schema is present
			try:
				from sqlalchemy import inspect
				insp = inspect(engine)
				if not insp.has_table('areas') or not insp.has_table('area_images'):
					print('Required tables missing; aborting image seeding.')
					return
			except Exception:
				pass

			# Helper to resolve area id by exact name
			def get_area_id(name):
				row = conn.execute(text('SELECT id FROM areas WHERE lower(name) = lower(:n) LIMIT 1'), {'n': name}).first()
				return row.id if row else None

			for area_name, images in SEED_IMAGES.items():
				aid = get_area_id(area_name)
				if not aid:
					print(f"⚠️ Skipping '{area_name}' (area not found)")
					continue
				print(f"🌆 Seeding images for {area_name} (id={aid}) ...")
				order = 0
				for url in images:
					# Idempotency: skip if exact url exists
					exists = conn.execute(text('SELECT 1 FROM area_images WHERE area_id=:a AND image_url=:u'), {'a': aid, 'u': url}).first()
					if exists:
						print(f"  • already present: {url}")
						order += 1
						continue
					conn.execute(text('''
						INSERT INTO area_images (area_id, image_url, title, caption, is_primary, sort_order)
						VALUES (:a, :u, :t, :c, :p, :o)
					'''), {
						'a': aid,
						'u': url,
						't': f'{area_name} Image',
						'c': f'{area_name} view',
						'p': order == 0,
						'o': order,
					})
					print(f"  ✓ inserted: {url}")
					order += 1
		print('✅ Image seeding complete.')

if __name__ == '__main__':
	seed_images()
