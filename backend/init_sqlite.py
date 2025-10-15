"""SQLite sample data initializer (fallback).

This file was empty causing import failure. We add a minimal
init_sample_data() function so that the main app can proceed
without raising an ImportError. Extend as needed.
"""

def init_sample_data():
	"""Placeholder that does nothing (no-op)."""
	print("init_sample_data: placeholder - no sample data inserted.")

