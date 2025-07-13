from app import app, db
from models import Country, Province, City, Area, Property

with app.app_context():
    # Don't drop all - just check if location data exists and add if missing
    
    # Check if we already have location data
    existing_countries = Country.query.count()
    if existing_countries > 0:
        print("Location data already exists, skipping location seeding...")
    else:
        print("Creating location hierarchy...")
        
        # South Africa Data
        sa = Country(name='South Africa')
        db.session.add(sa)
        db.session.flush()

        provinces = [
            'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State'
        ]
        cities_map = {
            'Gauteng': ['Johannesburg', 'Pretoria'],
            'Western Cape': ['Cape Town'],
            'KwaZulu-Natal': ['Durban', 'Pietermaritzburg'],
            'Eastern Cape': ['Port Elizabeth', 'East London'],
            'Free State': ['Bloemfontein']
        }
        areas_map = {
            'Johannesburg': ['Sandton', 'Soweto', 'Midrand'],
            'Pretoria': ['Centurion', 'Hatfield'],
            'Cape Town': ['Sea Point', 'Claremont'],
            'Durban': ['Umhlanga', 'Morningside'],
            'Port Elizabeth': ['Summerstrand'],
            'East London': ['Vincent'],
            'Bloemfontein': ['Westdene']
        }

        province_objs = {}
        city_objs = {}

        for province in provinces:
            p = Province(name=province, country_id=sa.id)
            db.session.add(p)
            db.session.flush()
            province_objs[province] = p

            for city in cities_map.get(province, []):
                c = City(name=city, province_id=p.id)
                db.session.add(c)
                db.session.flush()
                city_objs[city] = c

                for area in areas_map.get(city, []):
                    a = Area(name=area, city_id=c.id)
                    db.session.add(a)

        # Commit all location data
        db.session.commit()
        print("Location hierarchy created successfully!")
    
    # Check current property count
    existing_properties = Property.query.count()
    print(f"Current properties in database: {existing_properties}")
    
    print("Your existing properties are ready to use!")
    print("Frontend location dropdowns should now work!")
    print("Available at: http://localhost:3001")
