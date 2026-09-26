"use client";

import { useEffect, useState } from "react";
import {
  TABLE_GEOFENCE_RADIUS_M,
  distanceMeters,
  geoOriginStorageKey,
  readGeoOrigin,
  writeGeoOrigin,
  type GeoOrigin,
} from "@/lib/geofence";

export type TableGeofenceStatus =
  | "unsupported"
  | "requesting"
  | "denied"
  | "error"
  | "active";

export type TableGeofenceState = {
  status: TableGeofenceStatus;
  locked: boolean;
  distanceM: number | null;
  message: string | null;
};

const INITIAL: TableGeofenceState = {
  status: "requesting",
  locked: true,
  distanceM: null,
  message: null,
};

export function useTableGeofence(slug: string, tableNumber: number): TableGeofenceState {
  const [state, setState] = useState<TableGeofenceState>(INITIAL);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setState({
        status: "unsupported",
        locked: true,
        distanceM: null,
        message: "Location is required to use this menu. Please use a GPS-enabled browser.",
      });
      return;
    }

    const key = geoOriginStorageKey(slug, tableNumber);
    let origin: GeoOrigin | null = readGeoOrigin(key);
    let watchId: number | null = null;
    let cancelled = false;

    const applyPosition = (pos: GeolocationPosition) => {
      if (cancelled) return;
      const { latitude: lat, longitude: lng } = pos.coords;
      if (!origin) {
        origin = { lat, lng };
        writeGeoOrigin(key, origin);
      }
      const distanceM = distanceMeters(origin.lat, origin.lng, lat, lng);
      setState({
        status: "active",
        locked: distanceM > TABLE_GEOFENCE_RADIUS_M,
        distanceM,
        message: null,
      });
    };

    const onError = (err: GeolocationPositionError) => {
      if (cancelled) return;
      if (err.code === err.PERMISSION_DENIED) {
        setState({
          status: "denied",
          locked: true,
          distanceM: null,
          message: "Location permission is required. Allow location access and reload.",
        });
        return;
      }
      setState({
        status: "error",
        locked: true,
        distanceM: null,
        message: "Could not read your location. Move closer to the table and try again.",
      });
    };

    const opts: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    };

    setState(INITIAL);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyPosition(pos);
        watchId = navigator.geolocation.watchPosition(applyPosition, onError, opts);
      },
      onError,
      opts
    );

    return () => {
      cancelled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [slug, tableNumber]);

  return state;
}
