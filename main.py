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

# --- UNCHANGED: Analysis logic and helper functions ---
STATION_COORDS = {
    "KLAX": (33.9416, -118.4085), "KSFO": (37.6188, -122.3750),
    "KJFK": (40.6413, -73.7781), "KORD": (41.9742, -87.9073),
    "KATL": (33.6407, -84.4277)
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
    if not coords or not isinstance(coords, list) or len(coords) != 4:
        return False
    lat, lon = station_coord
    lat_min, lat_max, lon_min, lon_max = coords
    return lat_min <= lat <= lat_max and lon_min <= lon <= lon_max

def analyze_station(metar: dict, sigmets: list) -> dict:
    temp = parse_temp(metar.get("temperature", ""))
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

# --- UNCHANGED: Your existing data endpoints ---
@app.get("/metar/{icao}")
def get_metar(icao: str, hours: float = 1.5) -> List[Any]:
    url = f"{METAR_URL}?ids={icao}&format=json&hours={hours}"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

@app.get("/pirep/{icao}")
def get_pirep(icao: str, hours: float = 2, distance: int = 100) -> List[Any]:
    url = f"{PIREP_URL}?format=json&hours={hours}&center={icao}&distance={distance}"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

@app.get("/sigmet")
def get_sigmet(hazard: str = "turb", level: int = 3000, date: str = "2025-09-20T00:00:00Z") -> List[Any]:
    url = f"{SIGMET_URL}?format=json&hazard={hazard}&level={level}&date={date}"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

@app.get("/airsigmet")
async def get_airsigmet() -> List[Any]:
    url = f"{AIRSIGMET_URL}?format=json"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()

@app.get("/taf/{icao}")
def get_taf(icao: str) -> List[Any]:
    url = f"{TAF_URL}?ids={icao}&format=json"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

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
        sigmets = get_sigmet()
    except Exception:
        sigmets = []
    analysis = analyze_station(decoded_metar, sigmets)
    return {"analysis": analysis, "decoded_metar": decoded_metar}

# --- ✅ NEW: The Route Summary Endpoint ---
@app.get("/route-weather/{departure_icao}/{arrival_icao}")
def get_route_weather(departure_icao: str, arrival_icao: str):
    """
    Provides a full weather briefing for a flight route, including summaries.
    """
    try:
        departure_weather = get_metar_analyzed(departure_icao)
        arrival_weather = get_metar_analyzed(arrival_icao)

        # Create simple summary sentences
        dep_summary = f"Weather at departure airport {departure_icao} is currently {departure_weather['analysis']['overall']}."
        arr_summary = f"Weather at arrival airport {arrival_icao} is currently {arrival_weather['analysis']['overall']}."

        return {
            "departure": {
                "summary_text": dep_summary,
                "analysis": departure_weather['analysis']
            },
            "arrival": {
                "summary_text": arr_summary,
                "analysis": arrival_weather['analysis']
            }
        }
    except HTTPException as e:
        raise e # Re-raise exceptions from the analysis function
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")
