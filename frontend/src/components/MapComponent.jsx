import {Circle, GeoJSON, MapContainer, Marker, TileLayer, useMapEvents} from 'react-leaflet';

// Fix für Leaflet Icons in React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import luzernBorder from '../config/luzern_border.json';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import {point} from '@turf/helpers';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Grobe Bounding Box für den Kanton Luzern
const LUCERNE_BOUNDS = [
    [46.77, 7.87], // South-West
    [47.30, 8.48]  // North-East
];

// Komponente zum Setzen des Markers bei Klick
function MapEventsHandler({setPosition}) {
    useMapEvents({
        click(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            // Exakte Validierung, ob der Klick innerhalb des Polygons von Luzern liegt
            const pt = point([lng, lat]); // Turf erwartet [longitude, latitude]
            const isInside = booleanPointInPolygon(pt, luzernBorder);

            if (isInside) {
                setPosition(e.latlng);
            } else {
                alert("Dieser Punkt liegt ausserhalb der Kantonsgrenze. Bitte wählen Sie einen Punkt innerhalb des Kantons Luzern aus, da die API nur Luzerner Geodaten unterstützt.");
            }
        },
    });
    return null;
}

export default function MapComponent({
                                         markerPosition,
                                         markerPosition2,
                                         setMarkerPosition,
                                         radius,
                                         parcelGeometry,
                                         highlightFeature
                                     }) {
    // Start-Zentrum (Region Luzern als Default)
    const center = [47.050168, 8.309307];

    return (
        <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom={true}
            style={{height: '100%', width: '100%'}}
            maxBounds={LUCERNE_BOUNDS}
            maxBoundsViscosity={1.0}
            minZoom={10}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Exakte Kantonsgrenze einzeichnen */}
            <GeoJSON
                data={luzernBorder}
                style={() => ({
                    color: '#2b6cb0',
                    weight: 2,
                    fillColor: 'transparent',
                    dashArray: '5, 5'
                })}
                interactive={false}
            />

            <MapEventsHandler setPosition={setMarkerPosition}/>

            {/* Marker A (Blau) */}
            {markerPosition && (
                <>
                    <Marker position={markerPosition}></Marker>
                    {!parcelGeometry && (
                        <Circle center={markerPosition} radius={radius}
                                pathOptions={{color: '#3182ce', fillColor: '#3182ce', fillOpacity: 0.2}}/>
                    )}
                    {parcelGeometry && (
                        <GeoJSON
                            key={JSON.stringify(parcelGeometry)}
                            data={parcelGeometry}
                            style={() => ({color: '#b7791f', weight: 3, fillColor: '#ecc94b', fillOpacity: 0.5})}
                        />
                    )}
                </>
            )}

            {/* Marker B (Rot) */}
            {markerPosition2 && (
                <>
                    <Marker position={markerPosition2}></Marker>
                    <Circle center={markerPosition2} radius={radius}
                            pathOptions={{color: '#e53e3e', fillColor: '#e53e3e', fillOpacity: 0.2}}/>
                </>
            )}

            {/* Hover-Highlight aus den Rohdaten */}
            {highlightFeature && (
                <GeoJSON
                    key={`highlight-${JSON.stringify(highlightFeature)}`}
                    data={highlightFeature}
                    style={() => ({color: '#dd6b20', weight: 4, fillColor: '#ed8936', fillOpacity: 0.5})}
                />
            )}
        </MapContainer>
    );
}
