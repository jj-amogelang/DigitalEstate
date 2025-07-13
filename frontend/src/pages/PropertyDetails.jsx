import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function PropertyDetails() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/property/${id}`)
      .then(res => setProperty(res.data));
  }, [id]);

  if (!property) return <p>Loading...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <img src={property.image_url} alt={property.name} className="rounded-lg mb-4 w-full h-80 object-cover" />
      <h1 className="text-2xl font-bold mb-2">{property.name}</h1>
      <p className="text-gray-700 mb-2">Erf Size: {property.erf_size}</p>
      <p className="text-gray-700 mb-2">Cost: R {property.cost.toLocaleString()}</p>
      <p className="text-gray-700">Developer: {property.developer}</p>
    </div>
  );
}
