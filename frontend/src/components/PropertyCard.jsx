import React from "react";
import { useNavigate } from "react-router-dom";

export default function PropertyCard({ property }) {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate(`/property/${property.id}`)} className="cursor-pointer shadow-md rounded-lg overflow-hidden">
      <img src={property.image_url} alt={property.name} className="w-full h-48 object-cover" />
      <div className="p-4">
        <h3 className="text-lg font-semibold">{property.name}</h3>
        <p className="text-sm text-gray-600">Erf Size: {property.erf_size}</p>
      </div>
    </div>
  );
}
