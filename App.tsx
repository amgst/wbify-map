
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bike, 
  Play, 
  Square, 
  Map as MapIcon, 
  Activity, 
  Cpu, 
  Navigation, 
  Clock, 
  ArrowUp, 
  TrendingUp,
  Search,
  ChevronRight,
  RefreshCw,
  Award
} from 'lucide-react';
import { RoutePoint, RideStats, AIInsight, GroundingLink } from './types';
import { calculateDistance, formatDuration } from './utils/geo';
import StatsCard from './components/StatsCard';
import RouteVisualizer from './components/RouteVisualizer';
import { getAIAnalysis, findNearbyStops } from './services/gemini';

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [stats, setStats] = useState<RideStats>({
    totalDistance: 0,
    avgSpeed: 0,
    maxSpeed: 0,
    duration: 0,
    startTime: null,
    elevationGain: 0,
  });
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [nearbyStops, setNearbyStops] = useState<{text: string, links: GroundingLink[]} | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isLoadingStops, setIsLoadingStops] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const lastPointRef = useRef<RoutePoint | null>(null);
  const timerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Request wake lock to keep screen on
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('Wake Lock active');
      }
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
        console.log('Wake Lock released');
      });
    }
  };

  const startRecording = useCallback(async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    // Attempt to keep screen on
    await requestWakeLock();

    setIsRecording(true);
    setRoute([]);
    setStats({
      totalDistance: 0,
      avgSpeed: 0,
      maxSpeed: 0,
      duration: 0,
      startTime: Date.now(),
      elevationGain: 0,
    });
    setAiInsight(null);
    setNearbyStops(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPoint: RoutePoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp,
          speed: position.coords.speed || 0,
          altitude: position.coords.altitude,
        };

        setRoute((prev) => [...prev, newPoint]);

        if (lastPointRef.current) {
          const distance = calculateDistance(lastPointRef.current, newPoint);
          const elev = (newPoint.altitude || 0) - (lastPointRef.current.altitude || 0);
          
          setStats((prev) => {
            const newDist = prev.totalDistance + distance;
            const newMaxSpd = Math.max(prev.maxSpeed, newPoint.speed);
            const newElev = elev > 0 ? prev.elevationGain + elev : prev.elevationGain;
            return {
              ...prev,
              totalDistance: newDist,
              maxSpeed: newMaxSpd,
              elevationGain: newElev,
            };
          });
        }
        lastPointRef.current = newPoint;
      },
      (error) => console.error(error),
      { enableHighAccuracy: true }
    );

    timerRef.current = window.setInterval(() => {
      setStats((prev) => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    releaseWakeLock();
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    lastPointRef.current = null;
  }, []);

  const handleGetAIAnalysis = async () => {
    if (route.length < 5) {
      alert("Ride longer to get meaningful AI insights!");
      return;
    }
    setIsLoadingAI(true);
    try {
      const insight = await getAIAnalysis(stats, route);
      setAiInsight(insight);
    } catch (err) {
      console.error(err);
      alert("Failed to generate AI insights.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleFindNearby = async () => {
    if (route.length === 0) return;
    const last = route[route.length - 1];
    setIsLoadingStops(true);
    try {
      const stops = await findNearbyStops(last.latitude, last.longitude);
      setNearbyStops(stops);
    } catch (err) {
      console.error(err);
      alert("Failed to find nearby stops.");
    } finally {
      setIsLoadingStops(false);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (isRecording && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      releaseWakeLock();
    };
  }, [isRecording]);

  const currentSpeedKmH = route.length > 0 ? (route[route.length - 1].speed * 3.6).toFixed(1) : "0.0";
  const avgSpeedKmH = stats.duration > 0 ? ((stats.totalDistance / stats.duration) * 3.6).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      <header className="flex justify-between items-center py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neon rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(132,204,22,0.3)]">
            <Bike className="text-slate-900 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">VELO<span className="text-neon">AI</span></h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Smart Tracking System</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-red-500 uppercase tracking-tighter">Live Recording</span>
            </div>
          )}
          <button className="w-10 h-10 rounded-full glass flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <Activity className="w-5 h-5" />
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatsCard label="Speed" value={currentSpeedKmH} unit="km/h" icon={<TrendingUp className="w-3 h-3" />} />
            <StatsCard label="Distance" value={(stats.totalDistance / 1000).toFixed(2)} unit="km" icon={<Navigation className="w-3 h-3" />} />
            <StatsCard label="Time" value={formatDuration(stats.duration)} icon={<Clock className="w-3 h-3" />} />
            <StatsCard label="Avg Spd" value={avgSpeedKmH} unit="km/h" icon={<Activity className="w-3 h-3" />} />
          </div>
          <RouteVisualizer route={route} />
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-3xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-neon" /> AI Assistant
            </h3>
            
            {aiInsight ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="p-3 bg-neon/10 rounded-xl border border-neon/20">
                    <h4 className="text-lime-400 font-bold text-lg mb-1">{aiInsight.title}</h4>
                    <p className="text-slate-300 text-xs leading-relaxed">{aiInsight.summary}</p>
                </div>
                <div className="space-y-2">
                    {aiInsight.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-3 p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                            <div className="flex-shrink-0 w-5 h-5 bg-slate-800 rounded flex items-center justify-center text-[10px] font-bold text-neon">{i+1}</div>
                            <p className="text-xs text-slate-400 leading-tight">{rec}</p>
                        </div>
                    ))}
                </div>
                <button 
                  onClick={handleGetAIAnalysis}
                  className="w-full py-3 rounded-xl glass border border-slate-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingAI ? 'animate-spin' : ''}`} /> Refresh Analysis
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-800">
                    <Award className="w-8 h-8 text-slate-700" />
                </div>
                <p className="text-slate-500 text-xs px-4 mb-6">Complete your ride to generate a professional AI analysis of your performance.</p>
                <button 
                  disabled={isRecording || route.length < 5 || isLoadingAI}
                  onClick={handleGetAIAnalysis}
                  className="w-full py-4 rounded-2xl bg-white text-slate-950 font-bold text-sm hover:bg-neon transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoadingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                  {isLoadingAI ? 'Processing...' : 'Analyze My Ride'}
                </button>
              </div>
            )}
          </div>

          <div className="glass p-6 rounded-3xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" /> Nearby Stops
            </h3>
            {nearbyStops ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 leading-relaxed italic">"{nearbyStops.text.slice(0, 100)}..."</p>
                <div className="space-y-2">
                  {nearbyStops.links.slice(0, 3).map((link, i) => (
                    <a key={i} href={link.uri} target="_blank" rel="noopener noreferrer" className="block p-3 bg-slate-900 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-all flex items-center justify-between group">
                      <span className="text-xs font-medium text-slate-200">{link.title}</span>
                      <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transform group-hover:translate-x-1 transition-all" />
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <button 
                onClick={handleFindNearby}
                disabled={route.length === 0 || isLoadingStops}
                className="w-full py-3 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold border border-slate-800 hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoadingStops ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                Locate Points of Interest
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md">
        <div className="glass p-4 rounded-full border border-white/10 shadow-2xl flex items-center gap-4 justify-between">
            <div className="flex-1 flex flex-col pl-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Current Trip</span>
                <span className="text-lg font-bold text-white tabular-nums">{formatDuration(stats.duration)}</span>
            </div>

            <div className="flex gap-2">
                {!isRecording ? (
                    <button 
                        onClick={startRecording}
                        className="w-14 h-14 rounded-full bg-neon flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(132,204,22,0.4)] hover:scale-105 active:scale-95 transition-all"
                    >
                        <Play className="w-6 h-6 fill-current" />
                    </button>
                ) : (
                    <button 
                        onClick={stopRecording}
                        className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-95 transition-all"
                    >
                        <Square className="w-6 h-6 fill-current" />
                    </button>
                )}
            </div>

            <div className="flex-1 flex flex-col items-end pr-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Distance</span>
                <span className="text-lg font-bold text-white tabular-nums">{(stats.totalDistance / 1000).toFixed(2)}<span className="text-xs text-slate-500 ml-1">km</span></span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;
