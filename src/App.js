import React, { useState } from "react";
import axios from "axios";

// --- UNCHANGED: Helper Components ---
const LoadingSpinner = () => (
  <div style={{ textAlign: "center", marginTop: 20 }}>
    <div className="spinner" />
    <style>{`
      .spinner {
        margin: auto;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #004aad;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        animation: spin 1s linear infinite;
      }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
  </div>
);

const WeatherBar = ({ level }) => {
  const colors = {
    Clear: "#4caf50",
    "Significant Weather": "#ff9800",
    "Severe Weather": "#f44336"
  };
  const displayLevel = level || "Unavailable";
  return (
    <div style={{
      marginTop: 5, width: "100%", height: 30, borderRadius: 15,
      backgroundColor: colors[displayLevel] || "#ddd", color: "white",
      fontWeight: "bold", display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: 16,
      boxShadow: `0 0 12px ${colors[displayLevel] || '#ddd'}aa`
    }}>
      {displayLevel}
    </div>
  );
};

// --- NEW: Summary Card Component ---
const SummaryCard = ({ title, data }) => {
  if (!data) return null;
  return (
    <div style={{
      marginTop: 20, padding: 15, backgroundColor: '#fff',
      borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <h3 style={{ margin: 0, color: '#004aad' }}>{title}</h3>
      <p style={{ margin: '10px 0 5px 0', fontSize: 16 }}>{data.summary_text}</p>
      <WeatherBar level={data.analysis.overall} />
    </div>
  );
};

// --- UPDATED: Main App Component ---
function App() {
  const [departureIcao, setDepartureIcao] = useState("");
  const [arrivalIcao, setArrivalIcao] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!departureIcao || !arrivalIcao) {
      setError("Both Departure and Arrival airport codes are required.");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
  
    try {
      const url = `http://127.0.0.1:8000/route-weather/${departureIcao.toUpperCase()}/${arrivalIcao.toUpperCase()}`;
      const response = await axios.get(url);
      setData(response.data);
    } catch (e) {
      const errorMessage = e.response?.data?.detail || "Failed to fetch route data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 720, margin: "40px auto", padding: 20,
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      color: "#333", backgroundColor: "#f7f9fc",
      borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    }}>
      <h1 style={{ textAlign: "center", color: "#004aad" }}>
        Flight Route Weather Briefing
      </h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontWeight: '600', display: 'block', marginBottom: 5 }}>Departure ICAO:</label>
          <input
            type="text"
            value={departureIcao}
            onChange={(e) => setDepartureIcao(e.target.value)}
            style={{ width: '100%', padding: 8, fontSize: 16, borderRadius: 4, border: '1px solid #ccc', textTransform: 'uppercase' }}
            maxLength={4}
            placeholder="e.g., KLAX"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontWeight: '600', display: 'block', marginBottom: 5 }}>Arrival ICAO:</label>
          <input
            type="text"
            value={arrivalIcao}
            onChange={(e) => setArrivalIcao(e.target.value)}
            style={{ width: '100%', padding: 8, fontSize: 16, borderRadius: 4, border: '1px solid #ccc', textTransform: 'uppercase' }}
            maxLength={4}
            placeholder="e.g., KJFK"
          />
        </div>
      </div>

      <div style={{ marginTop: 20, textAlign: "center" }}>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: "12px 30px", fontSize: 18, fontWeight: "700",
            backgroundColor: "#004aad", color: "white", borderRadius: 6,
            border: "none", cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Loading..." : "Get Briefing"}
        </button>
      </div>

      {error && <p style={{ marginTop: 20, color: "crimson", fontWeight: "700", textAlign: "center" }}>{error}</p>}
      {loading && <LoadingSpinner />}

      {data && !loading && (
        <div>
          <SummaryCard title="Departure Weather" data={data.departure} />
          <SummaryCard title="Arrival Weather" data={data.arrival} />
        </div>
      )}
    </div>
  );
}

export default App;


