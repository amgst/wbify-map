
export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number; // in m/s
  altitude: number | null;
}

export interface RideStats {
  totalDistance: number; // meters
  avgSpeed: number; // m/s
  maxSpeed: number; // m/s
  duration: number; // seconds
  startTime: number | null;
  elevationGain: number;
}

export interface AIInsight {
  title: string;
  summary: string;
  recommendations: string[];
}

export interface GroundingLink {
  title: string;
  uri: string;
}
