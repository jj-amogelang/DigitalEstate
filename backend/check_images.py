#!/usr/bin/env python3
"""
Quick check for image data in the Excel file
"""

import pandas as pd

def check_images():
    df = pd.read_excel("property_research_sample.xlsx", sheet_name="properties")
    
    print("🖼️ Checking images column:")
    print("=" * 40)
    
    # Check all rows for image data
    for idx, row in df.iterrows():
        images_value = row['images']
        if pd.notna(images_value) and str(images_value).strip() != '':
            print(f"Row {idx + 1}: {images_value}")
    
    # Count non-null images
    non_null_images = df['images'].notna() & (df['images'] != '') & (df['images'] != 'NULL')
    print(f"\n📊 Properties with images: {non_null_images.sum()}")
    print(f"📊 Properties without images: {len(df) - non_null_images.sum()}")

if __name__ == "__main__":
    check_images()
