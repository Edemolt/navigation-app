import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';

import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import './styles.scss';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Use a dark style that includes a colorful sprite for navigation
const darkStyle = 'mapbox://styles/mapbox/navigation-guidance-night-v4';

const App = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [routeData, setRouteData] = useState(null);

  // Refs for controls
  const geoControlRef = useRef(null);
  const directionsControlRef = useRef(null);

  // Helper: Add the Directions control after the style is loaded.
  const addDirectionsControl = (map) => {
    directionsControlRef.current = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: 'metric',
      profile: 'mapbox/driving',
      interactive: false,
    });
    map.addControl(directionsControlRef.current, 'top-left');

    directionsControlRef.current.on('route', (e) => {
      if (e.route && e.route.length > 0) {
        const newRoute = e.route[0].geometry;
        setRouteData(newRoute);
        console.log('Route selected:', e.route[0]);
      }
    });
  };

  // Function to add controls
  const addControls = (map) => {
    // Geolocate control
    geoControlRef.current = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
    });
    map.addControl(geoControlRef.current, 'top-right');

    // When geolocation is successful, set the current location as the origin.
    geoControlRef.current.on('geolocate', (e) => {
      const coords = [e.coords.longitude, e.coords.latitude];
      if (directionsControlRef.current) {
        directionsControlRef.current.setOrigin(coords);
      }
    });

    // Add the Directions control after the style is loaded.
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => {
        addDirectionsControl(map);
      });
    } else {
      addDirectionsControl(map);
    }

    // When the map loads, trigger geolocation and (if present) re-add the route layer.
    map.on('load', () => {
      geoControlRef.current.trigger();
      if (routeData && !map.getSource('route')) {
        map.addSource('route', {
          type: 'geojson',
          data: routeData,
        });
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#3887be', 'line-width': 5 },
        });
      }
    });
  };

  // Function to remove controls and any leftover sources/layers.
  const removeControls = (map) => {
    if (geoControlRef.current) {
      map.removeControl(geoControlRef.current);
      geoControlRef.current = null;
    }
    if (directionsControlRef.current) {
      map.removeControl(directionsControlRef.current);
      directionsControlRef.current = null;
    }
    // Remove any leftover Directions internal layers/sources.
    if (map.getLayer('directions-route')) {
      map.removeLayer('directions-route');
    }
    if (map.getSource('directions')) {
      map.removeSource('directions');
    }
  };

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: darkStyle,
      center: [77.2295, 28.6129],
      zoom: 9,
    });
    mapRef.current = map;

    // Add initial controls
    addControls(map);

    // Cleanup on unmount
    return () => map.remove();
  }, []);

  // Update (or add) the route layer whenever routeData changes.
  useEffect(() => {
    if (mapRef.current && routeData) {
      const updateRouteLayer = () => {
        if (mapRef.current.getSource('route')) {
          mapRef.current.getSource('route').setData(routeData);
        } else {
          mapRef.current.addSource('route', {
            type: 'geojson',
            data: routeData,
          });
          mapRef.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#3887be', 'line-width': 5 },
          });
        }
      };

      if (!mapRef.current.isStyleLoaded()) {
        mapRef.current.once('style.load', updateRouteLayer);
      } else {
        updateRouteLayer();
      }
    }
  }, [routeData]);

  return <div className="map-container" ref={mapContainerRef} />;
};

export default App;
