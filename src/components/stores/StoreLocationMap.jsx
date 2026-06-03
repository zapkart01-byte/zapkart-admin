import React from 'react'
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import { MapPin } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * StoreLocationMap - Renders store coordinates on MapLibre GL using MapTiler maps.
 * All functions are documented with one-line comments.
 */

// Renders interactive map containing a single marker representing store location
export default function StoreLocationMap({ latitude, longitude, storeName }) {
  const maptilerKey = import.meta.env.VITE_MAPTILER_KEY

  // Default coordinate set targeting central Bengaluru if parameters are absent
  const lat = latitude ? parseFloat(latitude) : 12.9716
  const lng = longitude ? parseFloat(longitude) : 77.5946

  // Construct map styles url using the MapTiler API Key
  const mapStyleUrl = `https://api.maptiler.com/maps/streets/style.json?key=${maptilerKey}`

  return (
    <div className="w-full h-64 rounded-xl overflow-hidden border border-surface-variant relative shadow-sm">
      <Map
        initialViewState={{
          latitude: lat,
          longitude: lng,
          zoom: 14
        }}
        mapLib={maplibregl}
        mapStyle={mapStyleUrl}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        
        {/* Render a custom orange pin marker at the store coordinate */}
        <Marker latitude={lat} longitude={lng}>
          <div className="flex flex-col items-center group">
            <div className="bg-primary text-white text-xs font-semibold px-2.5 py-1 rounded shadow-md border border-white whitespace-nowrap animate-fade-in">
              {storeName || 'Store Location'}
            </div>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center border-2 border-white shadow-md text-white mt-1 transform transition-transform group-hover:scale-110">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
        </Marker>
      </Map>
    </div>
  )
}
