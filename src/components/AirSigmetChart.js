import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const AirsigmetChart = ({ data }) => {
  const ref = useRef();

  useEffect(() => {
    if (!data) return;

    // Example: count SIGMET occurrences by 'state' or a similar property — adjust based on actual data keys
    const counts = {};
    if (data.features) {
      data.features.forEach((feature) => {
        const state = feature.properties.state || "Unknown";
        counts[state] = (counts[state] || 0) + 1;
      });
    }

    const parsedData = Object.entries(counts).map(([key, value]) => ({
      region: key,
      count: value,
    }));

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 70, left: 60 };

    svg.attr("width", width).attr("height", height);

    const x = d3
      .scaleBand()
      .domain(parsedData.map((d) => d.region))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(parsedData, (d) => d.count)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg
      .selectAll(".bar")
      .data(parsedData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.region))
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => y(0) - y(d.count))
      .attr("fill", "#004aad");
  }, [data]);

  return <svg ref={ref}></svg>;
};

export default AirsigmetChart;
