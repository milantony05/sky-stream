import React, { useState } from "react";
import axios from "axios";

function App() {
  const [icao, setIcao] = useState("");
  const [dataType, setDataType] = useState("airsigmet");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      let url = `http://127.0.0.1:8000/${dataType}`;

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

      const response = await axios.get(url);
      setData(response.data);
    } catch (e) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Aviation Weather Data</h1>

      <label>
        Select Data Type:
        <select
          value={dataType}
          onChange={(e) => setDataType(e.target.value)}
          style={{ marginLeft: 10 }}
        >
          <option value="airsigmet">AIR/SIGMET (US)</option>
          <option value="sigmet">ISIGMET (International)</option>
          <option value="metar">METAR</option>
          <option value="pirep">PIREP</option>
          <option value="taf">TAF</option>
        </select>
      </label>

      {(dataType === "metar" || dataType === "taf" || dataType === "pirep") && (
        <div style={{ marginTop: 10 }}>
          <label>
            ICAO Code:
            <input
              type="text"
              value={icao}
              onChange={(e) => setIcao(e.target.value)}
              style={{ marginLeft: 10, textTransform: "uppercase" }}
              maxLength={4}
            />
          </label>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <button onClick={fetchData} disabled={loading}>
          {loading ? "Loading..." : "Fetch Data"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {data && (
        <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word", marginTop: 20 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default App;
