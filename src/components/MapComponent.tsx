import { useEffect, useRef, memo } from "react";
import { MapContainer, TileLayer, GeoJSON, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MunicipalityFeature, SpeedTestData, MetricType } from "../types";
import { getColor } from "../utils";

interface MapComponentProps {
  geoData: MunicipalityFeature[];
  baseMuniData?: MunicipalityFeature[];
  dataVersion?: number;
  onFeatureHover: (data: SpeedTestData) => void;
  onFeatureOut: () => void;
  activeMetric: MetricType;
  selectedFeatureName?: string;
  zoomBounds?: [[number, number], [number, number]] | null;
  viewType: 'municipality' | 'points';
  connectionType: 'fixed' | 'mobile';
}

function GeoJsonLayer({ geoData, dataVersion, onFeatureHover, onFeatureOut, activeMetric, selectedFeatureName, zoomBounds, viewType, connectionType }: MapComponentProps) {
  const map = useMap();
  const geoJsonRef = useRef<L.GeoJSON>(null);

  const previouslySelectedLayerRef = useRef<any>(null);

  const getStyleForFeature = (feature: any) => {
    const value = feature.properties[activeMetric];
    const isPoints = viewType === 'points';
    
    // For missing data points
    if (value === 0 || value === undefined) {
      return {
        fillColor: '#94a3b8',
        weight: 1,
        opacity: isPoints ? 0 : 0.8,
        color: isPoints ? 'transparent' : 'rgba(255,255,255,0.6)',
        fillOpacity: isPoints ? 0 : 0.4
      };
    }

    const color = getColor(value, activeMetric, connectionType);
    return {
      fillColor: color,
      weight: 1,
      opacity: isPoints ? 0.8 : 1,
      color: isPoints ? color : 'rgba(255,255,255,0.1)',
      fillOpacity: isPoints ? 0.8 : 0.7
    };
  };

  const style = (feature: any) => getStyleForFeature(feature);

  const highlightFeature = (e: L.LeafletMouseEvent) => {
    if (e.target.feature.properties.download > 0) {
      onFeatureHover(e.target.feature.properties);
    }
  };

  const resetHighlight = (e: L.LeafletMouseEvent) => {
    onFeatureOut();
  };

  const zoomToFeature = (e: L.LeafletMouseEvent) => {
    if (e.target.feature.properties.download > 0) {
      map.fitBounds(e.target.getBounds(), { padding: [50, 50], maxZoom: viewType === 'points' ? 12 : 9 });
      onFeatureHover(e.target.feature.properties);
    }
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: zoomToFeature
    });

    if (feature.properties.download > 0) {
      layer.bindPopup(`
        <div class="text-sm font-semibold mb-1 font-sans">${feature.properties.name}</div>
        <div class="text-xs flex flex-col font-sans gap-1">
          <span class="flex justify-between w-36"><span><span class="text-emerald-400">⬇️</span> ჩამოტვირთვა:</span> <span class="font-bold">${feature.properties.download.toFixed(1)}</span></span> 
          <span class="flex justify-between w-36"><span><span class="text-blue-400">⬆️</span> ატვირთვა:</span> <span class="font-bold">${feature.properties.upload.toFixed(1)}</span></span>
          <span class="flex justify-between w-36"><span><span class="text-purple-400">📡</span> დაყოვნება:</span> <span class="font-bold">${feature.properties.ping.toFixed(0)}</span></span>
        </div>
      `);
    }
  };

  const pointToLayer = (feature: any, latlng: L.LatLng) => {
    return L.circleMarker(latlng, {
      radius: feature.properties.download > 0 ? 5 : 3,
      ...getStyleForFeature(feature)
    });
  };

  useEffect(() => {
    if (geoData.length > 0 && geoJsonRef.current) {
      map.fitBounds(geoJsonRef.current.getBounds(), { padding: [20, 20], maxZoom: viewType === 'points' ? 10 : 8 });
    }
  }, [viewType, map]); // Recenter map if viewType changes to 'points' or back
  
  // React to explicit zoom requests
  useEffect(() => {
    if (zoomBounds) {
      map.fitBounds(zoomBounds, { padding: [50, 50], maxZoom: viewType === 'points' ? 12 : 9 });
    }
  }, [zoomBounds, map]);

  // Handle activeMetric changes
  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.setStyle(style);
      if (previouslySelectedLayerRef.current) {
        const isPoints = viewType === 'points';
        if (previouslySelectedLayerRef.current instanceof L.CircleMarker) {
          previouslySelectedLayerRef.current.setRadius(8);
        } else {
          previouslySelectedLayerRef.current.setStyle({
            weight: 3,
            color: '#fff',
            fillOpacity: isPoints ? 1 : 0.9
          });
        }
      }
    }
  }, [activeMetric, viewType]);

  // Optimize hover styling by targeting specific layers
  useEffect(() => {
    if (!geoJsonRef.current) return;
    
    // Revert previous selection
    if (previouslySelectedLayerRef.current) {
      geoJsonRef.current.resetStyle(previouslySelectedLayerRef.current);
      if (previouslySelectedLayerRef.current instanceof L.CircleMarker) {
        previouslySelectedLayerRef.current.setRadius(previouslySelectedLayerRef.current.feature.properties.download > 0 ? 5 : 3);
      }
      previouslySelectedLayerRef.current = null;
    }

    if (selectedFeatureName) {
      const layers = geoJsonRef.current.getLayers();
      const targetLayer = layers.find((l: any) => l.feature?.properties?.name === selectedFeatureName);
      
      if (targetLayer) {
        const isPoints = viewType === 'points';
        if (targetLayer instanceof L.CircleMarker) {
          targetLayer.setRadius(8);
          targetLayer.setStyle({ fillOpacity: 1, weight: 2, color: '#fff' });
        } else {
          targetLayer.setStyle({
            weight: 3,
            color: '#fff',
            fillOpacity: isPoints ? 1 : 0.9
          });
        }
        
        if (!L.Browser.ie && !L.Browser.edge && targetLayer.feature.properties.download > 0) {
          targetLayer.bringToFront();
        }
        previouslySelectedLayerRef.current = targetLayer;
      }
    }
  }, [selectedFeatureName, viewType]);

  return (
    <GeoJSON
      key={`${viewType}-${connectionType}-${geoData.length}-${dataVersion}`} // Re-render when data or view type changes
      ref={geoJsonRef}
      data={geoData as any}
      style={style}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
    />
  );
}

export const MapComponent = memo(function MapComponent(props: MapComponentProps) {
  return (
    <MapContainer
      center={[42.0, 43.5]}
      zoom={6}
      zoomSnap={0.5}
      zoomControl={false}
      style={{ height: "100%", width: "100%", zIndex: 1 }}
    >
      <ZoomControl position="bottomleft" />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={20}
        subdomains="abcd"
      />
      {props.viewType === 'points' && props.baseMuniData && props.baseMuniData.length > 0 && (
        <GeoJSON
          key={`base-muni-${props.baseMuniData.length}`}
          data={props.baseMuniData as any}
          style={() => ({
            fillColor: 'transparent',
            weight: 1,
            opacity: 0.8,
            color: 'rgba(255,255,255,0.4)',
            fillOpacity: 0
          })}
          interactive={false}
        />
      )}
      {props.geoData.length > 0 && (
        <GeoJsonLayer {...props} />
      )}
    </MapContainer>
  );
});

