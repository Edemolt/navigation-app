import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';

import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import './styles.scss';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const App = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [routeData, setRouteData] = useState(null);

  const lightStyle = 'mapbox://styles/mapbox/streets-v11';
  const darkStyle = 'mapbox://styles/mapbox/dark-v10';

  // Refs for controls (we no longer need navControlRef)
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
    // Remove NavigationControl so zoom in/out buttons are not added.

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

    // Add the Directions control only after the style is loaded.
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
      style: isDarkMode ? darkStyle : lightStyle,
      center: [77.2295, 28.6129],
      zoom: 9,
    });
    mapRef.current = map;

    // Add initial controls
    addControls(map);

    // Cleanup on unmount
    return () => map.remove();
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      // Remove old controls before applying the new style.
      removeControls(mapRef.current);

      const newStyle = isDarkMode ? darkStyle : lightStyle;
      mapRef.current.setStyle(newStyle);

      // Once the new style loads, re-add the controls.
      mapRef.current.once('style.load', () => {
        addControls(mapRef.current);
      });
    }
  }, [isDarkMode]);

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

  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  return (
    <>
      <button className="toggle-button" onClick={toggleDarkMode}>
        {isDarkMode ? (
          // If dark mode is active, show a sun icon (click to switch to light mode)
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4.354a.75.75 0 0 1 .75.75v2.292a.75.75 0 0 1-1.5 0V5.104A.75.75 0 0 1 12 4.354zM12 16.604a.75.75 0 0 1 .75.75v2.292a.75.75 0 0 1-1.5 0v-2.292a.75.75 0 0 1 .75-.75zM4.354 12a.75.75 0 0 1 .75-.75h2.292a.75.75 0 0 1 0 1.5H5.104a.75.75 0 0 1-.75-.75zM16.604 12a.75.75 0 0 1 .75-.75h2.292a.75.75 0 0 1 0 1.5h-2.292a.75.75 0 0 1-.75-.75zM6.223 6.223a.75.75 0 0 1 1.06 0l1.623 1.623a.75.75 0 0 1-1.06 1.06L6.223 7.283a.75.75 0 0 1 0-1.06zM15.094 15.094a.75.75 0 0 1 1.06 0l1.623 1.623a.75.75 0 0 1-1.06 1.06l-1.623-1.623a.75.75 0 0 1 0-1.06zM6.223 17.777a.75.75 0 0 1 0 1.06l-1.623 1.623a.75.75 0 1 1-1.06-1.06l1.623-1.623a.75.75 0 0 1 1.06 0zM15.094 8.906a.75.75 0 0 1 0 1.06l-1.623 1.623a.75.75 0 1 1-1.06-1.06l1.623-1.623a.75.75 0 0 1 1.06 0zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
          </svg>
        ) : (
          // If light mode is active, show a moon icon (click to switch to dark mode)
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21.752 15.002A9 9 0 0 1 12 3a9.002 9.002 0 0 0 0 18 9 9 0 0 0 9.752-5.998z" />
          </svg>
        )}
      </button>
      <div className="map-container" ref={mapContainerRef} />
    </>
  );
};

export default App;
