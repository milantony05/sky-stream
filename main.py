from fastapi import FastAPI
import requests
import httpx
from typing import List, Any,Dict
from fastapi.middleware.cors import CORSMiddleware
from metar import Metar  # python-metar library

app = FastAPI(title="Aviation Weather API")

METAR_URL = "https://aviationweather.gov/api/data/metar"
PIREP_URL = "https://aviationweather.gov/api/data/pirep"
SIGMET_URL = "https://aviationweather.gov/api/data/isigmet"
AIRSIGMET_URL = "https://aviationweather.gov/api/data/airsigmet"
TAF_URL = "https://aviationweather.gov/api/data/taf"

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows requests from these origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

@app.get("/metar/{icao}")
def get_metar(icao: str, hours: float = 1.5) -> List[Any]:
    """Fetch METAR data for a given ICAO station."""
    url = f"{METAR_URL}?ids={icao}&format=json&hours={hours}"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()


@app.get("/pirep/{icao}")
def get_pirep(icao: str, hours: float = 2, distance: int = 100) -> List[Any]:
    """
    Fetch PIREPs near an airport/NAVAID ICAO within a given radius (NM) and time window (hours).
    Example: /pirep/KMCI?hours=2&distance=100
    """
    url = f"{PIREP_URL}?format=json&hours={hours}&center={icao}&distance={distance}"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()


@app.get("/sigmet")
def get_sigmet(
    hazard: str = "turb",
    level: int = 3000,
    date: str = "2025-09-20T00:00:00Z"
) -> List[Any]:
    """
    Fetch International SIGMET (ISIGMET) data.
    Example: /sigmet?hazard=turb&level=3000&date=2025-09-20T00:00:00Z
    """
    url = f"{SIGMET_URL}?format=json&hazard={hazard}&level={level}&date={date}"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()


@app.get("/airsigmet")
async def get_airsigmet() -> List[Any]:
    """
    Fetch domestic AIR/SIGMET data (U.S. only).
    Example: /airsigmet
    """
    url = f"{AIRSIGMET_URL}?format=json"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()


@app.get("/taf/{icao}")
def get_taf(icao: str) -> List[Any]:
    """
    Fetch TAF (Terminal Aerodrome Forecast) for a given ICAO station.
    Example: /taf/KMCI
    """
    url = f"{TAF_URL}?ids={icao}&format=json"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

@app.get("/metar/decoded/{icao}")
@app.get("/metar/decoded/{icao}")
def get_metar_decoded(icao: str) -> Dict[str, Any]:
    """
    Fetch and decode the latest METAR report for a given ICAO station using python-metar.
    Example: /metar/decoded/KEWR
    """
    # NOAA text source (always latest report)
    url = f"https://tgftp.nws.noaa.gov/data/observations/metar/stations/{icao.upper()}.TXT"
    response = requests.get(url)
    response.raise_for_status()

    lines = response.text.strip().split("\n")
    if len(lines) < 2:
        return {"error": "No METAR report available"}

    raw_metar = lines[1]  # second line is the METAR report string

    try:
        obs = Metar.Metar(raw_metar)
        decoded = {
            "station": obs.station_id,
            "time": str(obs.time),
            "temperature": str(obs.temp),
            "dew_point": str(obs.dewpt),
            "wind": str(obs.wind()),
            "visibility": str(obs.vis),
            "pressure": str(obs.press),
            "weather": [str(w) for w in obs.weather],   # ✅ FIXED
            "sky": [str(layer) for layer in obs.sky],
            "raw": raw_metar
        }
        return decoded
    except Exception as e:
        return {"error": str(e), "raw": raw_metar}