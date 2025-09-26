from fastapi import FastAPI, HTTPException
import requests
import httpx
from typing import List, Any, Dict
from fastapi.middleware.cors import CORSMiddleware
from metar import Metar
import numpy as np

app = FastAPI(title="Aviation Weather API")

# --- UNCHANGED: Your existing URLs and CORS setup ---
METAR_URL = "https://aviationweather.gov/api/data/metar"
PIREP_URL = "https://aviationweather.gov/api/data/pirep"
SIGMET_URL = "https://aviationweather.gov/api/data/isigmet"
AIRSIGMET_URL = "https://aviationweather.gov/api/data/airsigmet"
TAF_URL = "https://aviationweather.gov/api/data/taf"

origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


STATION_COORDS = {
    "KLAX": [33.9416, -118.4085], "KSFO": [37.6188, -122.3750],
    "KJFK": [40.6413, -73.7781], "KORD": [41.9742, -87.9073],
    "KATL": [33.6407, -84.4277], "VOBL": [13.1989, 77.7068]
}

def parse_temp(t_str: str):
    try: return float(t_str.replace("C", ""))
    except: return np.nan

def parse_wind(w_str: str):
    try: return float(w_str.split(' at ')[1].split(' ')[0])
    except: return 0

def parse_visibility(v_str: str):
    try: return float(v_str.split(' miles')[0])
    except: return 10

def sigmet_affects_station(station_coord, sigmet):
    coords = sigmet.get("bbox")
    if not coords or not isinstance(coords, list) or len(coords) != 4: return False
    lat, lon = station_coord
    lat_min, lat_max, lon_min, lon_max = coords
    return lat_min <= lat <= lat_max and lon_min <= lon <= lon_max

def analyze_station(metar: dict, sigmets: list) -> dict:
    wind = parse_wind(metar.get("wind", ""))
    vis = parse_visibility(metar.get("visibility", ""))
    weather = [w.lower() for w in metar.get("weather", [])]
    overall = "Clear"
    hazards = []
    if wind >= 25 or vis < 3 or any("thunderstorm" in w or "tornado" in w for w in weather):
        overall = "Severe Weather"
    elif wind >= 15 or vis < 6 or any("rain" in w or "snow" in w or "ice" in w for w in weather):
        overall = "Significant Weather"
    station_coord = STATION_COORDS.get(metar.get("station"))
    if station_coord and sigmets:
        for s in sigmets:
            if sigmet_affects_station(station_coord, s):
                hazards.append(f"SIGMET: {s.get('hazard', 'Unknown')}")
                overall = "Severe Weather"
    return {"overall": overall, "hazards": hazards if hazards else ["None"]}

# --- NEW: Enhanced Summary Generation ---
def generate_summary_text(analysis: dict, metar: dict) -> str:
    """Generates a multi-line, human-readable weather summary."""
    overall = analysis.get('overall', 'Unknown')
    wind = metar.get('wind', 'N/A')
    visibility = metar.get('visibility', 'N/A')
    weather_phenomena = ", ".join(metar.get('weather', [])) or "No significant phenomena"

    summary_lines = [
        f"Overall condition is assessed as: {overall}.",
        f"Winds are currently {wind}.",
        f"Visibility is reported at {visibility}.",
        f"Current weather includes: {weather_phenomena}."
    ]
    if "Severe" in overall and analysis.get('hazards'):
        summary_lines.append(f"Active hazards: {', '.join(analysis['hazards'])}.")
    
    return "\n".join(summary_lines)

# --- UNCHANGED: Existing data endpoints ---
# (get_metar, get_pirep, etc. remain here, unchanged for brevity)
@app.get("/metar/decoded/{icao}")
def get_metar_decoded(icao: str) -> Dict[str, Any]:
    url = f"https://tgftp.nws.noaa.gov/data/observations/metar/stations/{icao.upper()}.TXT"
    response = requests.get(url)
    response.raise_for_status()
    lines = response.text.strip().split("\n")
    if len(lines) < 2: return {"error": "No METAR report available"}
    raw_metar = lines[1]
    try:
        obs = Metar.Metar(raw_metar)
        return {"station": obs.station_id, "time": str(obs.time), "temperature": str(obs.temp), "dew_point": str(obs.dewpt), "wind": str(obs.wind()), "visibility": str(obs.vis), "pressure": str(obs.press), "weather": [str(w) for w in obs.weather], "sky": [str(layer) for layer in obs.sky], "raw": raw_metar}
    except Exception as e:
        return {"error": str(e), "raw": raw_metar}

@app.get("/metar/analyzed/{icao}")
def get_metar_analyzed(icao: str) -> Dict[str, Any]:
    decoded_metar = get_metar_decoded(icao)
    if "error" in decoded_metar: raise HTTPException(status_code=404, detail=decoded_metar["error"])
    try:
        sigmets = requests.get(f"{SIGMET_URL}").json()
    except Exception:
        sigmets = []
    analysis = analyze_station(decoded_metar, sigmets)
    return {"analysis": analysis, "decoded_metar": decoded_metar}

# --- ✅ UPDATED AND ENHANCED: Route Weather Endpoint ---
@app.get("/route-weather/{departure_icao}/{arrival_icao}")
def get_route_weather(departure_icao: str, arrival_icao: str):
    """
    Provides a full weather briefing for a flight route, including detailed summaries and coordinates.
    """
    try:
        departure_weather = get_metar_analyzed(departure_icao)
        arrival_weather = get_metar_analyzed(arrival_icao)

        dep_summary = generate_summary_text(departure_weather['analysis'], departure_weather['decoded_metar'])
        arr_summary = generate_summary_text(arrival_weather['analysis'], arrival_weather['decoded_metar'])

        return {
            "departure": {
                "icao": departure_icao.upper(),
                "coords": STATION_COORDS.get(departure_icao.upper()),
                "summary_text": dep_summary,
                "analysis": departure_weather['analysis'],
                "decoded_metar": departure_weather['decoded_metar']
            },
            "arrival": {
                "icao": arrival_icao.upper(),
                "coords": STATION_COORDS.get(arrival_icao.upper()),
                "summary_text": arr_summary,
                "analysis": arrival_weather['analysis'],
                "decoded_metar": arrival_weather['decoded_metar']
            }
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

