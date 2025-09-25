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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      let url = `http://127.0.0.1:8000/${dataType}`;

      // Handle advanced PIREP separately
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
        // Append ICAO for endpoints that require it
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

      {/* ICAO input for endpoints that need it except advanced pirep */}
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

      {/* Advanced PIREP inputs */}
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
          <h3 style={{ color: "#004aad" }}>Advanced PIREP Parameters</h3>

          <div style={{ marginBottom: 10 }}>
            <label>
              ID (ICAO Code):{" "}
              <input
                type="text"
                value={pirepId}
                maxLength={4}
                onChange={(e) => setPirepId(e.target.value.toUpperCase())}
                style={{ marginLeft: 10, padding: 6, width: 120 }}
                placeholder="KLAX"
              />
            </label>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>
              Distance (NM):{" "}
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                style={{ marginLeft: 10, padding: 6, width: 120 }}
              />
            </label>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>
              Age (hours):{" "}
              <input
                type="number"
                step="0.1"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                style={{ marginLeft: 10, padding: 6, width: 120 }}
              />
            </label>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>
              Level (feet):{" "}
              <input
                type="number"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                style={{ marginLeft: 10, padding: 6, width: 120 }}
              />
            </label>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>
              Intensity:{" "}
              <select
                value={inten}
                onChange={(e) => setInten(e.target.value)}
                style={{ marginLeft: 10, padding: 6, width: 130 }}
              >
                <option value="lgt">Light</option>
                <option value="mod">Moderate</option>
                <option value="sev">Severe</option>
                <option value="ext">Extreme</option>
              </select>
            </label>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>
              Date (ISO 8601):{" "}
              <input
                type="datetime-local"
                value={date.slice(0, 16)}
                onChange={(e) => setDate(e.target.value + ":00Z")}
                style={{ marginLeft: 10, padding: 6, width: 230 }}
              />
            </label>
          </div>
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
