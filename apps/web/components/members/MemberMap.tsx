"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import Map, { Marker, Popup, NavigationControl, MapRef } from "react-map-gl";
import Supercluster from "supercluster";
import Link from "next/link";
import { Avatar } from "../ui/avatar";
import { levelColor, levelName } from "../../lib/utils";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type MemberFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    level: number;
    points: number;
  };
};

type GeoJsonCollection = {
  type: "FeatureCollection";
  features: MemberFeature[];
};

type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

type ClusterProperties = {
  cluster: true;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: string | number;
};

type PointProperties = MemberFeature["properties"] & { cluster: false };

function ClusterMarker({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  const size = count > 50 ? 56 : count > 10 ? 46 : 36;
  return (
    <button
      onClick={onClick}
      className="rounded-full flex items-center justify-center font-bold text-white shadow-lg cursor-pointer border-2 border-white transition-transform hover:scale-110 active:scale-95"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #FF6B2B, #E55A1C)",
        fontSize: count > 99 ? 11 : 13,
      }}
    >
      {count > 999 ? "999+" : count}
    </button>
  );
}

function MemberPin({
  member,
  onClick,
  isSelected,
}: {
  member: MemberFeature["properties"];
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center cursor-pointer"
      style={{ transform: "translate(-50%, -100%)" }}
    >
      <div
        className={`rounded-full border-2 overflow-hidden transition-transform group-hover:scale-110 ${
          isSelected ? "scale-125 border-primary shadow-lg" : "border-white shadow-md"
        }`}
        style={{ width: 36, height: 36 }}
      >
        <Avatar src={member.avatar_url} name={member.full_name} size="sm" />
      </div>
      {/* pin tail */}
      <div
        className="w-0 h-0"
        style={{
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: `7px solid ${isSelected ? "#FF6B2B" : "white"}`,
          marginTop: -1,
        }}
      />
    </button>
  );
}

function MemberPopup({
  member,
  onClose,
}: {
  member: MemberFeature["properties"];
  onClose: () => void;
}) {
  return (
    <div className="p-3 min-w-[180px]">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-lg leading-none"
      >
        ×
      </button>
      <Link
        href={`/members/${member.username}`}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <Avatar src={member.avatar_url} name={member.full_name} size="md" />
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{member.full_name}</p>
          <p className="text-xs text-muted-foreground">@{member.username}</p>
          <span
            className="text-xs font-medium"
            style={{ color: levelColor(member.level) }}
          >
            {levelName(member.level)}
          </span>
        </div>
      </Link>
    </div>
  );
}

export default function MemberMap({ data }: { data: GeoJsonCollection }) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState<ViewState>({
    longitude: -51.9253,
    latitude: -14.235,
    zoom: 3.5,
  });
  const [selectedMember, setSelectedMember] =
    useState<MemberFeature["properties"] | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);

  const supercluster = useMemo(() => {
    const sc = new Supercluster<MemberFeature["properties"]>({
      radius: 60,
      maxZoom: 16,
    });
    sc.load(data.features);
    return sc;
  }, [data.features]);

  const bounds = useMemo((): [number, number, number, number] => {
    return [-180, -85, 180, 85];
  }, []);

  const clusters = useMemo(() => {
    try {
      return supercluster.getClusters(bounds, Math.floor(viewState.zoom));
    } catch {
      return [];
    }
  }, [supercluster, bounds, viewState.zoom]);

  const handleClusterClick = useCallback(
    (clusterId: number, lng: number, lat: number) => {
      const expansionZoom = Math.min(
        supercluster.getClusterExpansionZoom(clusterId),
        20
      );
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom: expansionZoom,
        duration: 600,
      });
    },
    [supercluster]
  );

  return (
    <div className="relative w-full rounded-xl overflow-hidden border" style={{ height: 480 }}>
      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/80 rounded-xl">
          <p className="text-sm text-muted-foreground font-medium">
            Configure <code className="bg-muted px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> para exibir o mapa.
          </p>
        </div>
      )}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <NavigationControl position="top-right" />

        {clusters.map((cluster) => {
          const [lng, lat] = cluster.geometry.coordinates;
          const props = cluster.properties as ClusterProperties | PointProperties;

          if ((props as ClusterProperties).cluster) {
            const cp = props as ClusterProperties;
            return (
              <Marker key={`cluster-${cp.cluster_id}`} longitude={lng} latitude={lat}>
                <ClusterMarker
                  count={cp.point_count}
                  onClick={() => handleClusterClick(cp.cluster_id, lng, lat)}
                />
              </Marker>
            );
          }

          const mp = props as PointProperties;
          const isSelected = selectedMember?.id === mp.id;
          return (
            <Marker
              key={`member-${mp.id}`}
              longitude={lng}
              latitude={lat}
              anchor="bottom"
            >
              <MemberPin
                member={mp}
                isSelected={isSelected}
                onClick={() => {
                  setSelectedMember(mp);
                  setSelectedCoords([lng, lat]);
                }}
              />
            </Marker>
          );
        })}

        {selectedMember && selectedCoords && (
          <Popup
            longitude={selectedCoords[0]}
            latitude={selectedCoords[1]}
            anchor="bottom"
            offset={[0, -40]}
            closeButton={false}
            closeOnClick={false}
            onClose={() => {
              setSelectedMember(null);
              setSelectedCoords(null);
            }}
          >
            <MemberPopup
              member={selectedMember}
              onClose={() => {
                setSelectedMember(null);
                setSelectedCoords(null);
              }}
            />
          </Popup>
        )}
      </Map>

      {/* Member count badge */}
      <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur text-xs font-medium px-2.5 py-1 rounded-full border shadow-sm">
        {data.features.length} membros no mapa
      </div>
    </div>
  );
}
