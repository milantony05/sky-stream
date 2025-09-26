import React, { useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- STYLING & ICONS ---
const styles = {
  // Main dashboard styles
  app: {
    display: 'flex', height: '100vh', width: '100vw',
    backgroundColor: '#1a1a1a', color: '#f0f0f0',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  mapPanel: { flex: 1, height: '100vh' },
  dashboardPanel: {
    width: '450px', height: '100vh', padding: '20px',
    backgroundColor: '#242424', overflowY: 'auto',
    borderLeft: '1px solid #333'
  },
  // Component styles
  inputContainer: { display: 'flex', gap: '10px', marginBottom: '15px' },
  input: {
    width: '100%', padding: '10px', fontSize: '16px',
    backgroundColor: '#333', border: '1px solid #555',
    color: '#f0f0f0', borderRadius: '5px', textTransform: 'uppercase'
  },
  button: {
    width: '100%', padding: '12px', fontSize: '18px', fontWeight: 'bold',
    backgroundColor: '#005f73', color: 'white', border: 'none',
    borderRadius: '5px', cursor: 'pointer'
  },
  card: {
    backgroundColor: '#2c2c2c', padding: '15px',
    borderRadius: '8px', marginBottom: '20px'
  },
  metricGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '10px', marginTop: '15px'
  },
  metricItem: {
    backgroundColor: '#333', padding: '10px',
    borderRadius: '5px', textAlign: 'center'
  }
};

// Custom airplane icon using SVG
const airplaneIcon = new L.DivIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="36px" height="36px" style="transform: rotate(90deg); filter: drop-shadow(0 0 3px black);">
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>`,
  className: '', // important to clear default styling
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});



const LoadingSpinner = () => <div style={{ textAlign: "center", marginTop: 20 }}>Loading...</div>;

const WeatherBar = ({ level }) => {
  const colors = { Clear: "#4caf50", "Significant Weather": "#ff9800", "Severe Weather": "#f44336" };
  return <div style={{ marginTop: 5, padding: '8px', borderRadius: 5, backgroundColor: colors[level] || "#555", color: "white", fontWeight: "bold", textAlign: "center" }}>{level || "Unavailable"}</div>;
};

const Metric = ({ label, value }) => (
  <div style={styles.metricItem}>
    <div style={{ fontSize: '14px', color: '#aaa' }}>{label}</div>
    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{value || 'N/A'}</div>
  </div>
);


const WeatherMap = ({ departure, arrival }) => {
  if (!departure?.coords || !arrival?.coords) {
    return (
        <MapContainer center={[39.82, -98.57]} zoom={4} style={styles.mapPanel}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>' />
        </MapContainer>
    );
  }
  
  const positions = [departure.coords, arrival.coords];
  const worstWeather = (departure.analysis.overall === 'Severe Weather' || arrival.analysis.overall === 'Severe Weather') ? 'Severe Weather' :
                       (departure.analysis.overall === 'Significant Weather' || arrival.analysis.overall === 'Significant Weather') ? 'Significant Weather' : 'Clear';
  const routeColor = { Clear: "#4caf50", "Significant Weather": "#ff9800", "Severe Weather": "#f44336" }[worstWeather];

  return (
    <MapContainer bounds={positions} style={styles.mapPanel} padding={[50, 50]}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>' />
      <Marker position={departure.coords} icon={airplaneIcon}>
        <Tooltip>{departure.icao}</Tooltip>
      </Marker>
      <Marker position={arrival.coords}>
        <Tooltip>{arrival.icao}</Tooltip>
      </Marker>
      <Polyline positions={positions} color={routeColor} weight={5} opacity={0.8} />
    </MapContainer>
  );
};

// --- MAIN APP COMPONENT ---
function App() {
  const [departureIcao, setDepartureIcao] = useState("");
  const [arrivalIcao, setArrivalIcao] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!departureIcao || !arrivalIcao) { setError("Both airport codes are required."); return; }
    setLoading(true); setError(null); setData(null);
    try {
      const url = `http://127.0.0.1:8000/route-weather/${departureIcao.toUpperCase()}/${arrivalIcao.toUpperCase()}`;
      const response = await axios.get(url);
      setData(response.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to fetch route data");
    } finally { setLoading(false); }
  };
  
  const depMetar = data?.departure?.decoded_metar;
  const arrMetar = data?.arrival?.decoded_metar;

  return (
    <div style={styles.app}>
      <WeatherMap departure={data?.departure} arrival={data?.arrival} />
      <div style={styles.dashboardPanel}>
        <h2 style={{ textAlign: 'center', margin: '0 0 20px 0' }}>Flight Weather Briefing</h2>
        <div style={styles.inputContainer}>
          <input type="text" value={departureIcao} onChange={(e) => setDepartureIcao(e.target.value)} style={styles.input} maxLength={4} placeholder="Departure ICAO" />
          <input type="text" value={arrivalIcao} onChange={(e) => setArrivalIcao(e.target.value)} style={styles.input} maxLength={4} placeholder="Arrival ICAO" />
        </div>
        <button onClick={fetchData} disabled={loading} style={styles.button}>{loading ? "Loading..." : "Get Briefing"}</button>
        {error && <p style={{ color: "#f44336", textAlign: 'center', marginTop: '10px' }}>{error}</p>}
        
        {loading && <LoadingSpinner />}

        {data && !loading && (
          <div>
            <div style={styles.card}>
              <h3>Departure: {data.departure.icao}</h3>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5' }}>{data.departure.summary_text}</pre>
              <WeatherBar level={data.departure.analysis.overall} />
              <div style={styles.metricGrid}>
                <Metric label="Wind" value={depMetar?.wind} />
                <Metric label="Visibility" value={depMetar?.visibility} />
                <Metric label="Temperature" value={depMetar?.temperature} />
                <Metric label="Pressure" value={depMetar?.pressure} />
              </div>
            </div>

            <div style={styles.card}>
              <h3>Arrival: {data.arrival.icao}</h3>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5' }}>{data.arrival.summary_text}</pre>
              <WeatherBar level={data.arrival.analysis.overall} />
              <div style={styles.metricGrid}>
                <Metric label="Wind" value={arrMetar?.wind} />
                <Metric label="Visibility" value={arrMetar?.visibility} />
                <Metric label="Temperature" value={arrMetar?.temperature} />
                <Metric label="Pressure" value={arrMetar?.pressure} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;



