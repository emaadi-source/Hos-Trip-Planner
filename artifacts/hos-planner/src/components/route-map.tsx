import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import type { RouteInfo, Stop } from '@workspace/api-client-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: iconShadow,
});

// Custom colored markers
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const getStopColor = (type: Stop['type']) => {
  switch (type) {
    case 'start':
      return '#64748b'; // gray
    case 'pickup':
      return '#3b82f6'; // blue
    case 'dropoff':
      return '#22c55e'; // green
    case 'rest':
      return '#f97316'; // orange
    case 'fuel':
      return '#eab308'; // yellow
    case 'break':
      return '#a855f7'; // purple
    default:
      return '#64748b';
  }
};

function FitBounds({ route }: { route: RouteInfo }) {
  const map = useMap();

  useEffect(() => {
    if (route.polyline && route.polyline.length > 0) {
      const bounds = L.latLngBounds(route.polyline as [number, number][]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [route, map]);

  return null;
}

interface RouteMapProps {
  route: RouteInfo;
  stops: Stop[];
}

export function RouteMap({ route, stops }: RouteMapProps) {
  const center: [number, number] =
    route.polyline && route.polyline.length > 0
      ? [route.polyline[0][0], route.polyline[0][1]]
      : [39.8283, -98.5795]; // Center of US

  return (
    <div className="w-full h-[500px] relative" data-testid="map-container">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ background: '#f1f5f9' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {route.polyline && route.polyline.length > 0 && (
          <Polyline
            positions={route.polyline as [number, number][]}
            pathOptions={{
              color: '#1e40af',
              weight: 4,
              opacity: 0.7,
            }}
          />
        )}
        {stops.map((stop, idx) => (
          <Marker
            key={idx}
            position={[stop.lat, stop.lng]}
            icon={createColoredIcon(getStopColor(stop.type))}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold capitalize mb-1">{stop.type}</div>
                <div className="text-xs text-gray-600 mb-2">{stop.location}</div>
                <div className="text-xs space-y-1">
                  <div>
                    <span className="font-medium">Day:</span> {stop.arrivalDay}
                  </div>
                  <div>
                    <span className="font-medium">Arrival:</span> {stop.arrivalHour.toFixed(2)}:00
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {stop.durationHours.toFixed(1)}h
                  </div>
                  <div>
                    <span className="font-medium">Miles:</span> {stop.cumulativeMiles.toFixed(1)}
                  </div>
                  {stop.notes && (
                    <div className="mt-2 pt-2 border-t">
                      <span className="font-medium">Notes:</span> {stop.notes}
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds route={route} />
      </MapContainer>
    </div>
  );
}
