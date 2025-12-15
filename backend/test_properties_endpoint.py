#!/usr/bin/env python3
"""Test the properties endpoint locally"""
from main import app, db
from area_models import Property

if __name__ == '__main__':
    with app.app_context():
        # Test query for area_id=1, commercial, featured
        area_id = 1
        print(f"Testing properties for area_id={area_id}")
        
        all_props = Property.query.filter(Property.area_id == area_id).all()
        print(f"Total properties in area {area_id}: {len(all_props)}")
        
        commercial = Property.query.filter(
            Property.area_id == area_id,
            Property.property_type.ilike('commercial')
        ).all()
        print(f"Commercial properties: {len(commercial)}")
        
        featured_commercial = Property.query.filter(
            Property.area_id == area_id,
            Property.property_type.ilike('commercial'),
            Property.is_featured == True
        ).all()
        print(f"Featured commercial: {len(featured_commercial)}")
        
        if featured_commercial:
            print("\nFeatured commercial properties:")
            for p in featured_commercial:
                print(f"  - {p.name} by {p.developer}")
                print(f"    Type: {p.property_type}, Featured: {p.is_featured}")
                try:
                    d = p.to_dict()
                    print(f"    to_dict() works: ✓")
                except Exception as e:
                    print(f"    to_dict() ERROR: {e}")
        
        # Test endpoint simulation
        print("\n--- Simulating endpoint logic ---")
        try:
            qry = Property.query.filter(Property.area_id == area_id)
            qry = qry.filter(Property.property_type.ilike('commercial'))
            qry = qry.filter(Property.is_featured == True)
            items = [p.to_dict() for p in qry.order_by(Property.created_at.desc()).limit(24).all()]
            print(f"Endpoint would return {len(items)} items")
            if items:
                print(f"Sample: {items[0]['name']}")
        except Exception as e:
            print(f"ERROR in endpoint logic: {e}")
            import traceback
            traceback.print_exc()
