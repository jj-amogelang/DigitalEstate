"""
Overpass API integration for amenity density scoring.

Fetches school, clinic, hospital, retail, transport stop counts
from OpenStreetMap, normalizes per km², and scores 0-100.
"""

import requests
import logging
from typing import Dict, List, Optional, Tuple, Any
from math import radians, sin, cos, sqrt, atan2

logger = logging.getLogger(__name__)

OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter"

# Amenity tags → Overpass filter
AMENITY_QUERIES = {
    'schools': 'node["amenity"="school"]',
    'clinics': 'node["amenity"~"clinic|community_centre"]',
    'hospitals': 'node["amenity"="hospital"]',
    'retail': 'node["shop"~"supermarket|mall|retail|clothing|electronics|books"]',
    'transport': 'node["public_transport"="stop_position"]',
}


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in km between two lat/lng points."""
    R = 6371.0  # Earth radius km
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


def area_from_bbox(lat_min: float, lat_max: float, lng_min: float, lng_max: float) -> float:
    """Approximate area in km² for a lat/lng bbox (simple spherical model)."""
    # Distance in degrees per km at equator ≈ 0.009
    lat_span_km = haversine_distance(lat_min, 0, lat_max, 0)
    lng_span_km = haversine_distance(0, lng_min, 0, lng_max)
    return lat_span_km * lng_span_km


def query_overpass(bbox: Tuple[float, float, float, float], 
                   amenity_type: str, 
                   timeout_s: int = 30) -> List[Dict[str, Any]]:
    """
    Query Overpass API for amenities in a bbox.
    
    Args:
        bbox: (lat_min, lng_min, lat_max, lng_max)
        amenity_type: key from AMENITY_QUERIES
        timeout_s: Overpass timeout
    
    Returns:
        List of {lat, lng, name, tags} dicts
    """
    if amenity_type not in AMENITY_QUERIES:
        logger.warning(f"Unknown amenity_type: {amenity_type}")
        return []
    
    lat_min, lng_min, lat_max, lng_max = bbox
    filter_expr = AMENITY_QUERIES[amenity_type]
    
    # Overpass QL query
    query = f"""
    [bbox:{lat_min},{lng_min},{lat_max},{lng_max}];
    ({filter_expr};);
    out center;
    """
    
    try:
        headers = {'User-Agent': 'DigitalEstate/1.0 (OSM Amenity Analyzer)'}
        resp = requests.post(
            OVERPASS_ENDPOINT,
            data={'data': query},
            headers=headers,
            timeout=timeout_s
        )
        resp.raise_for_status()
        data = resp.json()
        
        result: List[Dict[str, Any]] = []
        for elem in data.get('elements', []):
            if elem['type'] == 'node':
                lat = elem.get('lat')
                lng = elem.get('lon')
                if lat is not None and lng is not None:
                    result.append({
                        'lat': lat,
                        'lng': lng,
                        'name': elem.get('tags', {}).get('name', 'unnamed'),
                        'tags': elem.get('tags', {}),
                    })
        
        logger.info(f"Overpass query for {amenity_type}: {len(result)} results")
        return result
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Overpass API error ({amenity_type}): {e}")
        return []


def compute_amenity_density(area_id: int, 
                            bbox: Tuple[float, float, float, float],
                            cache: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Fetch all amenity types for area, compute densities (count/km²), normalize to 0-100 score.
    
    Returns:
        {
            'schools': {'count': 15, 'density': 2.3, 'score': 75},
            'clinics': {'count': 8, 'density': 1.2, 'score': 60},
            ...
            'combined_footfall_score': 68,  # weighted average
        }
    """
    area_km2 = area_from_bbox(*bbox)
    if area_km2 < 0.01:
        logger.warning(f"Area {area_id} bbox too small: {area_km2} km²")
        return {}
    
    results: Dict[str, Any] = {}
    total_weighted = 0.0
    weights_sum = 0.0
    
    # Weights for each amenity type (subjective, tunable)
    amenity_weights = {
        'schools': 0.15,
        'clinics': 0.20,
        'hospitals': 0.15,
        'retail': 0.30,
        'transport': 0.20,
    }
    
    # Baseline thresholds for 100-point scoring (tunable per geography)
    baseline_thresholds = {
        'schools': 10.0,       # 10 per km² = score 100
        'clinics': 2.0,
        'hospitals': 0.5,
        'retail': 15.0,
        'transport': 8.0,
    }
    
    for amenity_type in AMENITY_QUERIES.keys():
        amenities = query_overpass(bbox, amenity_type)
        count = len(amenities)
        density = count / area_km2
        
        # Normalize to 0-100: density / baseline * 100, capped at 100
        baseline = baseline_thresholds.get(amenity_type, 1.0)
        score = min(100, (density / baseline) * 100) if baseline > 0 else 0
        
        results[amenity_type] = {
            'count': count,
            'density': round(density, 2),
            'score': round(score, 1),
        }
        
        # Weighted average for footfall
        weight = amenity_weights.get(amenity_type, 0)
        total_weighted += score * weight
        weights_sum += weight
    
    # Combined footfall/amenity score
    combined = (total_weighted / weights_sum) if weights_sum > 0 else 0
    results['combined_footfall_score'] = round(combined, 1)
    
    logger.info(f"Area {area_id}: footfall_score={results['combined_footfall_score']}, density={results}")
    return results


def update_area_amenities_from_osm(db_session: Any, area_id: int, 
                                    lat: float, lng: float, 
                                    radius_km: float = 1.5) -> None:
    """
    Fetch OSM amenities for area around (lat, lng) and populate area_amenities table.
    This is typically called once per area during seeding or sync.
    
    Args:
        db_session: SQLAlchemy session
        area_id: target area
        lat, lng: area center
        radius_km: radius to query
    """
    from area_models import AreaAmenity
    
    # Build bbox: approximate ±radius_km around center
    lat_span = radius_km / 111.0  # 1 degree ≈ 111 km
    lng_span = radius_km / (111.0 * cos(radians(lat)))
    
    bbox = (lat - lat_span, lng - lng_span, lat + lat_span, lng + lng_span)
    
    # Clear old amenities for this area (optional)
    db_session.query(AreaAmenity).filter_by(area_id=area_id).delete()
    
    # Fetch & insert for each type
    for amenity_type in AMENITY_QUERIES.keys():
        amenities = query_overpass(bbox, amenity_type)
        for entry in amenities[:50]:  # Cap at 50 per type to avoid bloat
            dist_km = haversine_distance(lat, lng, entry['lat'], entry['lng'])
            amenity = AreaAmenity(
                area_id=area_id,  # type: ignore
                amenity_type=amenity_type,  # type: ignore
                name=entry.get('name', 'unnamed'),  # type: ignore
                distance_km=dist_km,  # type: ignore
                rating=None,  # type: ignore  # OSM doesn't provide ratings in basic query
            )
            db_session.add(amenity)
    
    db_session.commit()
    logger.info(f"Area {area_id} amenities synced from OSM")
