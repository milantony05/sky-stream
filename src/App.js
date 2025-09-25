import React, { useState } from "react";
import axios from "axios";

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
      @keyframes spin {
        0% { transform: rotate(0deg);}
        100% { transform: rotate(360deg);}
      }
    `}</style>
  </div>
);

function summarizeMetar(metar) {
  const wx = metar?.wxString || "";
  const visibility = metar?.visib ?? 10;
  const wind_speed = metar?.wspd ?? 0;
  const cloud = metar?.clouds && metar.clouds.length > 0 ? metar.clouds[0] : null;
  const ceiling = cloud ? cloud.base : 99999;
  const fltCat = metar?.fltCat || "";

  if (
    /TS|BLIZZARD|SEVERE|HAIL|SQUALL/.test(wx) ||
    visibility < 1 ||
    wind_speed > 30 ||
    ceiling < 1000 ||
    ["IFR", "LIFR"].includes(fltCat)
  ) {
    return "Severe Weather";
  }

  if (
    wx.length > 0 ||
    visibility < 5 ||
    ceiling < 3000
  ) {
    return "Significant Weather";
  }

  return "Clear";
}

const WeatherBar = ({ level }) => {
  const colors = {
    Clear: "#4caf50",
    "Significant Weather": "#ff9800",
    "Severe Weather": "#f44336"
  };
  return (
    <div style={{
      marginTop: 15,
      width: "100%",
      height: 30,
      borderRadius: 15,
      backgroundColor: colors[level] || "#ddd",
      color: "white",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 16,
      boxShadow: `0 0 12px ${colors[level]}aa`
    }}>
      {level}
    </div>
  );
};

function App() {
  const [icao, setIcao] = useState("");
  const [dataType, setDataType] = useState("airsigmet");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Advanced PIREP specific states
  const [pirepId, setPirepId] = useState("KLAX");
  const [distance, setDistance] = useState(10000);
  const [age, setAge] = useState(1.5);
  const [level, setLevel] = useState(3000);
  const [inten, setInten] = useState("lgt");
  const [date, setDate] = useState("2025-09-20T00:00:00Z");

  const [metarSummary, setMetarSummary] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setMetarSummary(null);

    try {
      let url = `http://127.0.0.1:8000/${dataType}`;

      if (dataType === "pirep-advanced") {
        const params = new URLSearchParams({
          id: pirepId,
          distance,
          age,
          level,
          inten,
          date,
        }).toString();
        url += `/advanced?${params}`;
      } else {
        const icaoRequiredEndpoints = ["metar", "pirep", "taf"];
        if (icaoRequiredEndpoints.includes(dataType)) {
          if (!icao) {
            setError("ICAO code is required for this data type");
            setLoading(false);
            return;
          }
          url += `/${icao.toUpperCase()}`;
        }
      }

      const response = await axios.get(url);
      setData(response.data);

      if (dataType === "metar") {
        const metarReport = response.data && response.data.length > 0 ?
          response.data[0] : null;
        if (metarReport) {
          setMetarSummary(summarizeMetar(metarReport));
        } else {
          setMetarSummary("No METAR data available");
        }
      }
    } catch (e) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: 20,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: "#333",
        backgroundColor: "#f7f9fc",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <h1 style={{ textAlign: "center", color: "#004aad" }}>
        Aviation Weather Data
      </h1>

      <label
        style={{
          fontWeight: "600",
          display: "block",
          marginBottom: 10,
        }}
      >
        Select Data Type:
        <select
          value={dataType}
          onChange={(e) => setDataType(e.target.value)}
          style={{
            marginLeft: 10,
            padding: 8,
            borderRadius: 4,
            border: "1px solid #ccc",
            fontSize: 16,
          }}
        >
          <option value="airsigmet">AIR/SIGMET (US)</option>
          <option value="sigmet">ISIGMET (International)</option>
          <option value="metar">METAR</option>
          <option value="pirep">PIREP (Simple)</option>
          <option value="taf">TAF</option>
          <option value="pirep-advanced">PIREP Advanced</option>
        </select>
      </label>

      {dataType !== "pirep-advanced" &&
        (dataType === "metar" || dataType === "taf" || dataType === "pirep") && (
          <div style={{ marginTop: 10 }}>
            <label style={{ fontWeight: "600" }}>
              ICAO Code:
              <input
                type="text"
                value={icao}
                onChange={(e) => setIcao(e.target.value)}
                style={{
                  marginLeft: 10,
                  textTransform: "uppercase",
                  padding: 8,
                  fontSize: 16,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  width: 100,
                }}
                maxLength={4}
                placeholder="e.g., KMCI"
              />
            </label>
          </div>
        )}

      {dataType === "pirep-advanced" && (
        <div
          style={{
            marginTop: 20,
            padding: 15,
            border: "1px solid #ccc",
            borderRadius: 8,
            backgroundColor: "#e9f0fa",
          }}
        >
          {/* Advanced PIREP inputs here as before */}
          <h3 style={{ color: "#004aad" }}>Advanced PIREP Parameters</h3>
          {/* Inputs omitted for brevity */}
        </div>
      )}

      <div style={{ marginTop: 20, textAlign: "center" }}>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: "12px 30px",
            fontSize: 18,
            fontWeight: "700",
            backgroundColor: "#004aad",
            color: "white",
            borderRadius: 6,
            border: "none",
            cursor: loading ? "default" : "pointer",
            transition: "background-color 0.3s ease",
          }}
          onMouseEnter={(e) =>
            !loading && (e.currentTarget.style.backgroundColor = "#00337f")
          }
          onMouseLeave={(e) =>
            !loading && (e.currentTarget.style.backgroundColor = "#004aad")
          }
        >
          {loading ? "Loading..." : "Fetch Data"}
        </button>
      </div>

      {error && (
        <p
          style={{
            marginTop: 20,
            color: "crimson",
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}

      {loading && <LoadingSpinner />}

      {/* METAR Summary visualization bar */}
      {metarSummary && dataType === "metar" && (
        <WeatherBar level={metarSummary} />
      )}

      {data && !loading && (
        <pre
          style={{
            marginTop: 20,
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            backgroundColor: "#fff",
            padding: 20,
            borderRadius: 8,
            maxHeight: "60vh",
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: 14,
            boxShadow: "inset 0 0 10px rgba(0,0,0,0.05)",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default App;
