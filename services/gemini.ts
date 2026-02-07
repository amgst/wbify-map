
import { GoogleGenAI, Type } from "@google/genai";
import { RideStats, RoutePoint, AIInsight } from "../types";

export const getAIAnalysis = async (stats: RideStats, route: RoutePoint[]): Promise<AIInsight> => {
  // Always use process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Create a condensed route for the AI to analyze (sampling)
  const sampledRoute = route.filter((_, i) => i % 5 === 0).map(p => ({
    lat: p.latitude.toFixed(4),
    lon: p.longitude.toFixed(4),
    spd: (p.speed * 3.6).toFixed(1) // km/h
  }));

  const prompt = `Analyze this bike ride and provide professional coaching feedback.
  Stats:
  - Distance: ${(stats.totalDistance / 1000).toFixed(2)} km
  - Avg Speed: ${(stats.avgSpeed * 3.6).toFixed(1)} km/h
  - Max Speed: ${(stats.maxSpeed * 3.6).toFixed(1)} km/h
  - Duration: ${(stats.duration / 60).toFixed(1)} minutes
  - Elevation Gain: ${stats.elevationGain.toFixed(1)} m

  Route Points (lat, lon, speed km/h): ${JSON.stringify(sampledRoute)}

  Provide a professional summary, a catchy title for the ride, and 3 specific recommendations for improvement.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "summary", "recommendations"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const findNearbyStops = async (lat: number, lon: number): Promise<{ text: string, links: any[] }> => {
  // Always use process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Find high-rated cafes, bike shops, or scenic viewpoints near latitude ${lat}, longitude ${lon}. Suggest 3 places for a cyclist to stop.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
    title: chunk.web?.title || "Search Result",
    uri: chunk.web?.uri || "#"
  })) || [];

  return {
    text: response.text,
    links
  };
};
