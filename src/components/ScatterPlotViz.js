import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { regressionLinear } from 'd3-regression';

const STAT_OPTIONS = {
  // Batting
  battingAverage: "Batting Average",
  onBasePercentage: "On-base Percentage",
  sluggingPct: "Slugging Percentage",
  ops: "OPS",
  homeRunsPerGame: "Home Runs per Game",
  runsPerGame: "Runs per Game",
  rbi: "RBIs",
  stolenBases: "Stolen Bases",
  
  // Pitching
  era: "ERA",
  whip: "WHIP",
  strikeoutsPerGame: "Strikeouts per Game",
  walksPerGame: "Walks per Game",
  hitsPerGame: "Hits per Game",
  savePct: "Save Percentage",
  
  // Team
  winPct: "Win Percentage",
  totalRuns: "Total Runs",
  runDifferential: "Run Differential"
};

// Add helper function for safe number formatting
const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  return Number(num).toFixed(3);
};

export const ScatterPlotViz = ({ data, onFilterChange }) => {
  const svgRef = useRef(null);
  const [xStat, setXStat] = React.useState('era');
  const [yStat, setYStat] = React.useState('winPct');

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    console.log('Data received:', data);
    console.log('Sample point:', data[0]);
    console.log(`X stat (${xStat}):`, data.map(d => d[xStat]));
    console.log(`Y stat (${yStat}):`, data.map(d => d[yStat]));

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Set dimensions
    const margin = { top: 20, right: 20, bottom: 60, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales with padding
    const xScale = d3.scaleLinear()
      .domain([
        d3.min(data, d => d[xStat]) * 0.9 || 0,
        d3.max(data, d => d[xStat]) * 1.1 || 1
      ])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([
        d3.min(data, d => d[yStat]) * 0.9 || 0,
        d3.max(data, d => d[yStat]) * 1.1 || 1
      ])
      .range([height, 0]);

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('fill', 'black')
      .text(xStat);

    svg.append('g')
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -60)
      .attr('x', -height / 2)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .text(yStat);

    // Create tooltip
    const tooltip = d3.select('body')
      .append('div')
      .style('position', 'absolute')
      .style('background', 'white')
      .style('padding', '10px')
      .style('border', '1px solid #ccc')
      .style('border-radius', '5px')
      .style('visibility', 'hidden');

    // Add dots
    svg.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d[xStat]))
      .attr('cy', d => yScale(d[yStat]))
      .attr('r', 5)
      .style('fill', '#69b3a2')
      .style('opacity', 0.7)
      .on('mouseover', (event, d) => {
        tooltip
          .style('visibility', 'visible')
          .html(`
            Year: ${d.year}<br/>
            ${STAT_OPTIONS[xStat]}: ${formatNumber(d[xStat])}<br/>
            ${STAT_OPTIONS[yStat]}: ${formatNumber(d[yStat])}
          `);
      })
      .on('mousemove', (event) => {
        tooltip
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', () => {
        tooltip.style('visibility', 'hidden');
      });

    // Add trend line
    const line = d3.line()
      .x(d => {
        console.log('x value:', d[0], xScale(d[0]));
        return xScale(d[0]);
      })
      .y(d => {
        console.log('y value:', d[1], yScale(d[1]));
        return yScale(d[1]);
      })
      .defined(d => !isNaN(d[0]) && !isNaN(d[1]));

    const regression = regressionLinear()
      .x(d => {
        const value = d[xStat];
        return value === null || value === undefined ? NaN : Number(value);
      })
      .y(d => {
        const value = d[yStat];
        return value === null || value === undefined ? NaN : Number(value);
      });

    const regressionData = regression(data);
    console.log('regression data:', regressionData);

    if (regressionData && regressionData.length > 0) {
      svg.append('path')
        .datum(regressionData)
        .attr('d', line)
        .style('stroke', 'red')
        .style('stroke-width', 2)
        .style('stroke-dasharray', '4,4')
        .style('opacity', 0.5);
    }

    return () => {
      tooltip.remove();
    };
  }, [data, xStat, yStat]);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <label>
          X Axis:
          <select value={xStat} onChange={(e) => setXStat(e.target.value)}>
            {Object.entries(STAT_OPTIONS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label style={{ marginLeft: '20px' }}>
          Y Axis:
          <select value={yStat} onChange={(e) => setYStat(e.target.value)}>
            {Object.entries(STAT_OPTIONS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      <svg ref={svgRef}></svg>
    </div>
  );
}; 