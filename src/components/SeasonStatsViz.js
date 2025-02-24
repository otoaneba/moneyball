import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const STAT_GROUPS = {
  hitting: {
    label: "Hitting",
    stats: {
      avg: "Batting Average",
      obp: "On-base Percentage",
      slg: "Slugging Percentage",
      ops: "OPS",
      homeRuns: "Home Runs",
      runs: "Runs",
      rbi: "RBIs",
      strikeOuts: "Strikeouts",
      stolenBases: "Stolen Bases",
      hits: "Hits",
      doubles: "Doubles",
      triples: "Triples",
      atBats: "At Bats",
      plateAppearances: "Plate Appearances",
      baseOnBalls: "Walks",
      hitByPitch: "Hit By Pitch",
      groundOuts: "Ground Outs",
      airOuts: "Air Outs"
    }
  },
  pitching: {
    label: "Pitching",
    stats: {
      era: "ERA",
      whip: "WHIP",
      strikeoutsPer9Inn: "K/9",
      walksPer9Inn: "BB/9",
      hitsPer9Inn: "H/9",
      homeRunsPer9: "HR/9",
      strikeoutWalkRatio: "K/BB Ratio",
      winPercentage: "Win %",
      saves: "Saves",
      strikeOuts: "Strikeouts",
      baseOnBalls: "Walks",
      hits: "Hits",
      earnedRuns: "Earned Runs",
      inningsPitched: "Innings Pitched",
      gamesStarted: "Games Started",
      completeGames: "Complete Games",
      shutouts: "Shutouts"
    }
  }
};

// Add stat type configurations
const STAT_CONFIGS = {
  avg: { min: 0, max: 0.4, isInverted: false },
  obp: { min: 0, max: 0.5, isInverted: false },
  era: { min: 0, max: 6, isInverted: true },
  whip: { min: 0, max: 2, isInverted: true },
  strikeoutsPer9Inn: { min: 0, max: 15, isInverted: false },
  homeRuns: { min: 0, max: 300, isInverted: false },
  // Add more stat configurations as needed
};

// Add a helper function for safe number formatting
const formatNumber = (num) => {
  if (typeof num === 'number' && !isNaN(num)) {
    // For small numbers (like batting averages), use 3 decimal places
    return num < 1 ? num.toFixed(3) : num.toFixed(1);
  }
  return 'N/A';
};

// Helper function to convert mixed stats to numbers
const parseStatValue = (value) => {
  // If it's already a number, return it
  if (typeof value === 'number') return value;
  
  // If it's a string
  if (typeof value === 'string') {
    // Remove any quotes
    const cleanValue = value.replace(/['"]/g, '');
    
    // If it starts with a dot (like ".276"), add a leading zero
    if (cleanValue.startsWith('.')) {
      return parseFloat('0' + cleanValue);
    }
    
    return parseFloat(cleanValue);
  }
  
  return 0; // fallback
};

// Add stat categories for better scaling
const STAT_CATEGORIES = {
  large: ['runs', 'hits', 'plateAppearances', 'atBats', 'totalBases', 'rbi'],
  medium: ['homeRuns', 'doubles', 'strikeOuts', 'baseOnBalls', 'stolenBases'],
  small: ['avg', 'obp', 'slg', 'ops', 'era', 'whip'],
};

// Add manager data at the top of the file
const MANAGERS = [
  { name: 'Bobby Cox', startYear: 2006, endYear: 2011, color: '#90e0ef' },
  { name: 'Fredi González', startYear: 2011, endYear: 2016.4, color: '#faedcd' },
  { name: 'Brian Snitker', startYear: 2016.4, endYear: 2024, color: '#ffcad4' }
];

export function SeasonStatsViz({ data, isDarkMode }) {
  const [statGroup, setStatGroup] = useState('hitting');
  const [yStat, setYStat] = useState('homeRuns');
  const [sizeStat, setSizeStat] = useState('avg');
  const [activeTab, setActiveTab] = useState('none');  // 'gm' or 'manager' or 'none'
  const svgRef = useRef(null);
  
  // Modify getStatRange to handle different stat categories
  const getStatRange = (stat, group) => {
    const values = data.map(yearData => 
      parseStatValue(group === 'hitting' ? yearData.batting[stat] : yearData.pitching[stat])
    ).filter(Boolean);

    const min = d3.min(values);
    const max = d3.max(values);
    
    // Determine the category of the stat
    const category = STAT_CATEGORIES.large.includes(stat) ? 'large' :
                    STAT_CATEGORIES.medium.includes(stat) ? 'medium' :
                    STAT_CATEGORIES.small.includes(stat) ? 'small' : 'medium';
    
    return {
      min,
      max,
      category,
      isInverted: ['era', 'whip', 'walksPer9Inn', 'hitsPer9Inn', 'homeRunsPer9'].includes(stat)
    };
  };

  useEffect(() => {
    // Create tooltip div if it doesn't exist
    const tooltip = d3.select('body').selectAll('.tooltip').data([0])
      .join('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    return () => {
      // Cleanup tooltip when component unmounts
      d3.select('.tooltip').remove();
    };
  }, []);

  useEffect(() => {
    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    // Define theme colors first
    const textColor = isDarkMode ? '#ffffff' : '#333333';
    const axisColor = isDarkMode ? '#666666' : '#cccccc';

    // Get data for all years first
    const plotData = data.map(yearData => ({
      year: yearData.year,
      y: parseStatValue(statGroup === 'hitting' ? yearData.batting[yStat] : yearData.pitching[yStat]),
      size: parseStatValue(statGroup === 'hitting' ? yearData.batting[sizeStat] : yearData.pitching[sizeStat])
    }));

    // Get dynamic size range
    const sizeConfig = getStatRange(sizeStat, statGroup);
    
    // Add padding to the range (10%)
    const padding = (sizeConfig.max - sizeConfig.min) * 0.1;
    sizeConfig.min = Math.max(0, sizeConfig.min - padding);
    sizeConfig.max = sizeConfig.max + padding;

    // Modify the size scale creation
    const sizeScale = (() => {
      const category = sizeConfig.category;
      const range = sizeConfig.max - sizeConfig.min;
      
      switch(category) {
        case 'large':
          // For large numbers (like runs)
          return d3.scaleLog()
            .domain([Math.max(1, sizeConfig.min), sizeConfig.max])
            .range(sizeConfig.isInverted ? [50, 5] : [5, 50])
            .clamp(true);
        
        case 'medium':
          // For medium numbers (like home runs)
          if (range < 20) {
            // Use linear scale for small differences
            return d3.scaleLinear()
              .domain([sizeConfig.min, sizeConfig.max])
              .range(sizeConfig.isInverted ? [40, 10] : [10, 40]);
          } else {
            // Use power scale for larger ranges
            return d3.scalePow()
              .exponent(0.7) // More sensitive to changes
              .domain([sizeConfig.min, sizeConfig.max])
              .range(sizeConfig.isInverted ? [45, 5] : [5, 45]);
          }
        
        case 'small':
          // For percentages and small numbers
          return d3.scalePow()
            .exponent(0.1) // Very sensitive to small changes
            .domain([sizeConfig.min, sizeConfig.max])
            .range(sizeConfig.isInverted ? [35, 5] : [5, 35]);
        
        default:
          return d3.scaleLinear()
            .domain([sizeConfig.min, sizeConfig.max])
            .range(sizeConfig.isInverted ? [30, 5] : [5, 30]);
      }
    })().clamp(true);

    // Set up dimensions
    const width = 1300;  // Increased from 1000
    const height = 600;  // Increased from 400
    const margin = { 
      top: 40,     // Increased from 20
      right: 300,  // Increased from 250
      bottom: 60,  // Increased from 40
      left: 80     // Increased from 60
    };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales with padding for x-axis
    const yearPadding = 0.5; // padding between years
    const xScale = d3.scaleLinear()
      .domain([
        d3.min(plotData, d => d.year) - yearPadding,
        d3.max(plotData, d => d.year) + yearPadding
      ])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(plotData, d => d.y) * 1.1])
      .range([innerHeight, 0]);

    // Add axes with adjusted ticks and rotation
    svg.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .tickFormat(d3.format('d')) // Format as integers
          .ticks(plotData.length) // Show all years
          .tickValues(plotData.map(d => d.year)) // Only show actual years
      )
      .selectAll("text")  
      .style("text-anchor", "middle")
      .attr("dx", "0em")
      .attr("dy", "1em");

    // Add axis labels with formatted values
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)
      .style('text-anchor', 'middle')
      .text('Year');

    // Y-axis label with formatted values
    const yAxis = svg.append('g')
      .call(d3.axisLeft(yScale)
        .tickFormat(d => formatNumber(d))  // Format the tick values
      );

    // Y-axis title
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .style('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .text(STAT_GROUPS[statGroup].stats[yStat]);

    // Add title
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -5)
      .style('text-anchor', 'middle')
      .style('font-size', '16px')
      .text(`${STAT_GROUPS[statGroup].label} Stats Over Time`);

    // Add background highlights based on active tab
    const eras = activeTab === 'gm' ? [
      { name: 'Frank Wren Era', startYear: 2007, endYear: 2014, color: '#13274F' },
      { name: 'John Hart Era', startYear: 2014, endYear: 2015, color: '#1982FC' },
      { name: 'John Coppolella Era', startYear: 2015, endYear: 2017, color: '#eaaa00' },
      { name: 'Alex Anthopoulos Era', startYear: 2017, endYear: 2024, color: '#CE1141' }
    ] : activeTab === 'manager' ? MANAGERS : [];  // Empty array when 'none' is selected

    // Add background highlights for each era
    eras.forEach(era => {
      svg.append('rect')
        .attr('x', xScale(era.startYear))
        .attr('y', 0)
        .attr('width', xScale(era.endYear) - xScale(era.startYear))
        .attr('height', innerHeight)
        .style('fill', era.color)
        .style('opacity', activeTab === 'manager' ? 0.15 : 0.05);  // Increased opacity for managers
    });

    // Add grid lines
    // Vertical grid lines (x-axis)
    svg.append('g')
      .attr('class', 'grid x-grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .tickFormat('')
          .tickSize(-innerHeight)
          .tickValues(plotData.map(d => d.year))
      )
      .style('stroke-opacity', isDarkMode ? 0.2 : 0.35);  // Slightly darker in light mode

    // Horizontal grid lines (y-axis)
    svg.append('g')
      .attr('class', 'grid y-grid')
      .call(
        d3.axisLeft(yScale)
          .tickFormat('')
          .tickSize(-innerWidth)
      )
      .style('stroke-opacity', isDarkMode ? 0.2 : 0.35);  // Slightly darker in light mode

    // Remove the domain lines from the grid
    svg.selectAll('.grid')
      .selectAll('.domain')
      .remove();

    // Style the grid lines
    svg.selectAll('.grid line')
      .style('stroke', isDarkMode ? '#ffffff' : '#666666')  // Darker color in light mode
      .style('stroke-dasharray', '1,0');  // Solid lines

    // Add data points with transitions
    const circles = svg.selectAll('circle.data-point')
      .data(plotData, d => d.year);

    // Remove old circles with fade out
    circles.exit()
      .transition()
      .duration(500)
      .style('opacity', 0)
      .remove();

    // Filter out 2020 for calculations but keep it for display
    const filteredPlotData = plotData.filter(d => d.year !== 2020);

    // Modify the circles code to handle both 2020 and 2021
    const circlesEnter = circles.enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d.y))
      .attr('r', 0)
      .style('fill', d => {
        if (d.year === 2020) return '#999999';  // Gray for 2020
        if (d.year === 2021) return '#CE1141';  // Braves red for World Series
        return '#69b3a2';  // Default color
      })
      .style('opacity', 0);

    // Update all circles with transition
    circles.merge(circlesEnter)
      .transition()
      .duration(1000)
      .ease(d3.easeCubicOut)
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d.y))
      .attr('r', d => sizeScale(d.size))
      .style('fill', d => {
        if (d.year === 2020) return '#999999';  // Gray for 2020
        if (d.year === 2021) return '#CE1141';  // Braves red for World Series
        return '#69b3a2';  // Default color
      })
      .style('opacity', d => d.year === 2020 ? 0.3 : 0.6);

    // Add tooltips (after transition to avoid duplicates)
    circles.merge(circlesEnter)
      .on('mouseover', function(event, d) {
        const tooltip = d3.select('.tooltip');
        
        d3.select(this)
          .transition()
          .duration(200)
          .style('opacity', 0.8)
          .attr('stroke', isDarkMode ? '#ffffff' : '#000')  // Light stroke in dark mode
          .attr('stroke-width', 2);
        
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        
        tooltip.html(`
          <strong>Year: ${d.year}</strong><br/>
          ${STAT_GROUPS[statGroup].stats[yStat]}: ${formatNumber(d.y)}<br/>
          ${STAT_GROUPS[statGroup].stats[sizeStat]}: ${formatNumber(d.size)}
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .style('opacity', d => d.year === 2020 ? 0.3 : 0.6)
          .attr('stroke-width', 0);
        
        d3.select('.tooltip')
          .transition()
          .duration(500)
          .style('opacity', 0);
      });

    // Find min, middle, and max points based on size value (excluding 2020 and 2021)
    const sortedData = [...plotData]
      .filter(d => d.year !== 2020 && d.year !== 2021)  // Exclude both special years
      .sort((a, b) => a.size - b.size);

    // Only include min/mid/max points for vertical lines and labels
    const labelPoints = [
      sortedData[0],  // min size
      sortedData[Math.floor(sortedData.length / 2)],  // middle size
      sortedData[sortedData.length - 1]  // max size
    ].filter(Boolean);

    // Update the legendData to only include special years
    const legendData = [
      plotData.find(d => d.year === 2020)?.size,  // 2020 COVID season
      plotData.find(d => d.year === 2021)?.size   // 2021 World Series
    ].filter(Boolean);

    // Animate vertical lines
    const lines = svg.selectAll('line.vertical-line')
      .data(labelPoints);

    lines.exit()
      .transition()
      .duration(500)
      .style('opacity', 0)
      .remove();

    const linesEnter = lines.enter()
      .append('line')
      .attr('class', 'vertical-line')
      .attr('x1', d => xScale(d.year))
      .attr('y1', innerHeight)
      .attr('x2', d => xScale(d.year))
      .attr('y2', innerHeight)  // Start from bottom
      .style('stroke', isDarkMode ? '#ffffff' : '#333')  // Use theme color
      .style('stroke-width', 1.5)
      .style('stroke-opacity', 0.5)
      .style('stroke-dasharray', '5,4');

    // Animate lines growing upward
    lines.merge(linesEnter)
      .transition()
      .duration(1000)
      .delay(500)
      .ease(d3.easeCubicOut)
      .attr('x1', d => xScale(d.year))
      .attr('y1', innerHeight)
      .attr('x2', d => xScale(d.year))
      .attr('y2', d => yScale(d.y))
      .style('stroke', isDarkMode ? '#ffffff' : '#333')  // Use theme color
      .style('stroke-width', 1.5)
      .style('stroke-opacity', 0.5)
      .style('stroke-dasharray', '5,4');

    // Animate point labels
    const labels = svg.selectAll('text.point-label')
      .data(labelPoints);

    labels.exit()
      .transition()
      .duration(500)
      .style('opacity', 0)
      .remove();

    const labelsEnter = labels.enter()
      .append('text')
      .attr('class', 'point-label')
      .attr('x', d => xScale(d.year))
      .attr('y', d => yScale(d.y) - sizeScale(d.size) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#333')
      .style('opacity', 0)  // Start fully transparent
      .text((d, i) => {
        if (i === 0) return 'min';
        if (i === 1) return 'middle';
        return 'max';
      });

    // Fade in labels after lines reach their positions
    labels.merge(labelsEnter)
      .transition()
      .duration(500)
      .delay(1500)
      .ease(d3.easeLinear)
      .style('opacity', 1);

    // Move legend further right
    const legendGroup = svg.append('g')
      .attr('transform', `translate(${innerWidth + 50}, ${margin.top})`);  // Increased from 60

    // Calculate legend dimensions dynamically
    const maxCircleSize = sizeScale(sizeConfig.max);
    const legendPadding = 20;
    const legendWidth = maxCircleSize + 160;  // Space for circle + label

    // Calculate heights for different sections
    const titleHeight = 30;  // Space for "Size: stat" title
    const dotLegendHeight = (legendData.length * 50) + 20;  // Space for size dots
    const eraLegendHeight = (activeTab === 'none' ? 0 : 
                            activeTab === 'gm' ? 4 : 3) * 25 + 
                           (activeTab === 'none' ? 0 : 20);  // No padding when no eras shown
    const spaceBetweenSections = 30;

    // Total height is sum of all sections plus padding
    const legendHeight = titleHeight + 
                        dotLegendHeight + 
                        spaceBetweenSections + 
                        eraLegendHeight;

    // Update era labels position to be dynamic
    const eraLabelsY = titleHeight + dotLegendHeight + spaceBetweenSections;

    // Add legend background and border
    legendGroup.append('rect')
      .attr('x', -legendPadding)
      .attr('y', -legendPadding)
      .attr('width', legendWidth + (legendPadding * 2))
      .attr('height', legendHeight)
      .attr('fill', isDarkMode ? '#2d2d2d' : 'white')
      .attr('stroke', isDarkMode ? '#444' : '#ccc')
      .attr('stroke-width', 1)
      .attr('rx', 5)
      .attr('ry', 5);

    // Add legend title with more prominence
    legendGroup.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(`Size: ${STAT_GROUPS[statGroup].stats[sizeStat]}`);

    // Update the legend circles
    legendGroup.selectAll('circle')
      .data(legendData)
      .enter()
      .append('circle')
      .attr('cx', maxCircleSize)
      .attr('cy', (d, i) => i * 50 + 50)
      .attr('r', d => sizeScale(d))
      .style('fill', (d, i) => {
        if (i === 0) return '#999999';  // 2020 COVID season
        return '#CE1141';  // 2021 World Series
      })
      .style('opacity', (d, i) => i === 0 ? 0.3 : 0.6);

    // Update the legend labels
    legendGroup.selectAll('text.legend-label')
      .data(legendData)
      .enter()
      .append('text')
      .attr('class', 'legend-label')
      .attr('x', maxCircleSize * 2 + 10)
      .attr('y', (d, i) => i * 50 + 55)
      .style('font-size', '12px')
      .text((d, i) => i === 0 ? "60-Game Season" : "World Series Champs");

    // Update the era labels based on active tab
    if (activeTab !== 'none') {
      legendGroup.append('g')
        .attr('transform', `translate(0, ${eraLabelsY})`)
        .call(g => {
          const eras = activeTab === 'gm' ? [
            { name: 'Frank Wren Era', color: '#13274F' },
            { name: 'John Hart Era', color: '#1982FC' },
            { name: 'John Coppolella Era', color: '#eaaa00' },
            { name: 'Alex Anthopoulos Era', color: '#CE1141' }
          ] : MANAGERS;
          
          eras.forEach((era, i) => {
            // Add colored rectangle
            g.append('rect')
              .attr('x', 0)
              .attr('y', i * 25)
              .attr('width', 10)
              .attr('height', 10)
              .attr('fill', era.color)
              .attr('opacity', activeTab === 'manager' ? 0.3 : 0.1);  // Increased opacity for managers
            
            // Add label
            g.append('text')
              .attr('x', 20)
              .attr('y', i * 25 + 9)
              .style('font-size', '12px')
              .style('fill', era.color)
              .text(era.name);
          });
        });
    }

    // Inside useEffect, after creating plotData
    console.log('2023 Data:', data.find(d => d.year === 2023));
    console.log('Plot Data:', plotData);

    // Update text colors
    svg.selectAll('text')
      .style('fill', textColor);

    // Update axis colors
    svg.selectAll('.tick line')
      .style('stroke', axisColor);
    svg.selectAll('.tick text')
      .style('fill', textColor);
    svg.selectAll('.domain')
      .style('stroke', axisColor);

    // Update legend background
    legendGroup.select('rect')
      .attr('fill', isDarkMode ? '#2d2d2d' : 'white')
      .attr('stroke', isDarkMode ? '#444' : '#ccc');

  }, [statGroup, yStat, sizeStat, data, isDarkMode, activeTab]);

  return (
    <div className="chart-container">
      <div className="controls">
        <div className="controls-text">
          <span>View </span>
          <select value={statGroup} onChange={e => setStatGroup(e.target.value)}>
            {Object.entries(STAT_GROUPS).map(([value, { label }]) => (
              <option key={value} value={value}>{label.toLowerCase()}</option>
            ))}
          </select>
          <span> stats from 2006 to 2024, </span>
        </div>
        <div className="controls-text">
          <span>analyzing </span>
          <select value={yStat} onChange={e => setYStat(e.target.value)}>
            {Object.entries(STAT_GROUPS[statGroup].stats).map(([value, label]) => (
              <option key={value} value={value}>{label.toLowerCase()}</option>
            ))}
          </select>
        <span> on the y-axis, and how it relates to</span>
        </div>
        <div className="controls-text">
        <select value={sizeStat} onChange={e => setSizeStat(e.target.value)}>
          {Object.entries(STAT_GROUPS[statGroup].stats).map(([value, label]) => (
            <option key={value} value={value}>{label.toLowerCase()}</option>
          ))}
        </select>
        
        <span> as the size of the dot.</span>
        </div>
        <div className="controls-text">
        <span>Optionally, highlight </span>
        <select value={activeTab} onChange={e => setActiveTab(e.target.value)}>
          <option value="none">No era</option>
          <option value="gm">General Manager eras</option>
          <option value="manager">Manager eras</option>
        </select>
        <span> to see how the Braves fared in those eras.</span>
        
        </div>
      </div>
      <svg ref={svgRef}></svg>
    </div>
  );
} 