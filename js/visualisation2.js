// Q2: Jurisdictional Speeding Fines Analysis - WITH BOTH FILTERS
let jurisdictionData = [];
let selectedJurisdictions = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
let highlightedJurisdiction = null;

// Map-related variables
let australiaTopoJSON = null;
let currentMapYear = 2024;

// Color scheme for jurisdictions
const jurisdictionColors = {
  'NSW': '#1f77b4', 'VIC': '#ff7f0e', 'QLD': '#2ca02c', 
  'WA': '#d62728', 'SA': '#9467bd', 'TAS': '#8c564b',
  'NT': '#e377c2', 'ACT': '#7f7f7f'
};

const jurisdictionNames = {
  'NSW': 'New South Wales', 'VIC': 'Victoria', 'QLD': 'Queensland',
  'WA': 'Western Australia', 'SA': 'South Australia', 'TAS': 'Tasmania',
  'NT': 'Northern Territory', 'ACT': 'Australian Capital Territory'
};

// Initialize the visualization
async function initQ2() {
  console.log('Initializing Q2 visualization...');
  await loadJurisdictionData();
  console.log('Jurisdiction data loaded:', jurisdictionData.length, 'records');
  await loadMapData();
  console.log('Map data loaded:', australiaTopoJSON ? 'Yes' : 'No');
  createYearButtons();
  createChoroplethMap();
  createLineChart();
  setupInteractions();
  console.log('Q2 initialization complete');
}

// Load and process jurisdiction data
async function loadJurisdictionData() {
  try {
    const rawData = await d3.csv('data/q2.csv');
    
    // Transform the data from wide to long format
    jurisdictionData = [];
    const years = [...new Set(rawData.map(d => +d.YEAR))];
    
    years.forEach(year => {
      const yearData = rawData.find(d => +d.YEAR === year);
      if (yearData) {
        ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].forEach(jurisdiction => {
          const columnName = `${jurisdiction}_TotalFines`;
          const fines = yearData[columnName] && yearData[columnName] !== '' ? 
                       +yearData[columnName] : 0;
          
          jurisdictionData.push({
            year: year,
            jurisdiction: jurisdiction,
            totalFines: fines
          });
        });
      }
    });
    
    console.log('Jurisdiction data loaded:', jurisdictionData.length, 'records');
    
  } catch (error) {
    console.error('Error loading jurisdiction data:', error);
  }
}

// Create the multi-line chart
function createLineChart() {
  const container = d3.select('#q2-linechart');
  container.html(''); // Clear loading message
  
  const width = 800;
  const height = 500;
  const margin = { top: 40, right: 120, bottom: 60, left: 80 };
  
  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  // Store SVG reference for updates
  window.q2LineSvg = svg;
  window.q2LineMargin = margin;
  window.q2LineWidth = width;
  window.q2LineHeight = height;
  
  updateLineChart();
}

// Update the line chart based on current selections
function updateLineChart() {
  const svg = window.q2LineSvg;
  const margin = window.q2LineMargin;
  const width = window.q2LineWidth;
  const height = window.q2LineHeight;
  
  if (!svg) return;
  
  // Clear existing chart elements
  svg.selectAll('.q2-line').remove();
  svg.selectAll('.q2-dot').remove();
  svg.selectAll('.x-axis').remove();
  svg.selectAll('.y-axis').remove();
  svg.selectAll('.q2-legend').remove();
  
  // Filter data for selected jurisdictions
  const filteredData = jurisdictionData.filter(d => 
    selectedJurisdictions.includes(d.jurisdiction)
  );
  
  // Group data by jurisdiction for line chart
  const jurisdictionGroups = d3.groups(filteredData, d => d.jurisdiction)
    .map(([jurisdiction, data]) => ({
      jurisdiction,
      data: data.sort((a, b) => a.year - b.year)
    }));
  
  // Scales
  const xScale = d3.scaleLinear()
    .domain(d3.extent(jurisdictionData, d => d.year))
    .range([0, width]);
  
  const maxValue = d3.max(jurisdictionGroups, group => 
    d3.max(group.data, d => d.totalFines)
  );
  
  const yScale = d3.scaleLinear()
    .domain([0, maxValue * 1.1])
    .range([height, 0]);
  
  // Line generator
  const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.totalFines))
    .curve(d3.curveMonotoneX);
  
  // Add lines
  jurisdictionGroups.forEach(group => {
    svg.append('path')
      .datum(group.data)
      .attr('class', `q2-line line-${group.jurisdiction.toLowerCase()}`)
      .attr('d', line)
      .style('stroke', jurisdictionColors[group.jurisdiction])
      .style('stroke-width', 3)
      .style('fill', 'none')
      .style('opacity', 0.8);
  });
  
  // Add dots
  jurisdictionGroups.forEach(group => {
    svg.selectAll(`.dot-${group.jurisdiction.toLowerCase()}`)
      .data(group.data)
      .enter().append('circle')
      .attr('class', `q2-dot dot-${group.jurisdiction.toLowerCase()}`)
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d.totalFines))
      .attr('r', 4)
      .style('fill', jurisdictionColors[group.jurisdiction])
      .style('opacity', 0.8)
      .style('stroke', 'white')
      .style('stroke-width', 1.5);
  });
  
  // Axes
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d3.format('d'))
    .tickValues(jurisdictionData.map(d => d.year).filter((d, i) => i % 2 === 0));

  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => d3.format(',')(d));

  svg.append('g')
    .attr('class', 'x-axis q2-axis')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis);

  svg.append('g')
    .attr('class', 'y-axis q2-axis')
    .call(yAxis);
  
  // Axis labels
  svg.append('text')
    .attr('class', 'axis-label')
    .attr('transform', `translate(${width / 2},${height + margin.bottom - 10})`)
    .style('text-anchor', 'middle')
    .text('Year');

  svg.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('y', -margin.left + 15)
    .attr('x', -height / 2)
    .style('text-anchor', 'middle')
    .text('Number of Fines');

  // Legend with click functionality
  const legend = svg.selectAll('.q2-legend')
    .data(jurisdictionGroups)
    .enter().append('g')
    .attr('class', 'q2-legend')
    .attr('transform', (d, i) => `translate(${width + 10}, ${i * 25})`)
    .style('cursor', 'pointer')
    .on('click', function(event, d) {
      const jurisdiction = d.jurisdiction;
      const index = selectedJurisdictions.indexOf(jurisdiction);
      
      if (index > -1) {
        // Remove from selection
        selectedJurisdictions.splice(index, 1);
        d3.select(this).style('opacity', 0.3);
      } else {
        // Add to selection
        selectedJurisdictions.push(jurisdiction);
        d3.select(this).style('opacity', 1);
      }
      
      // Update checkboxes to match
      updateCheckboxes();
      updateLineChart();
    });

  legend.append('rect')
    .attr('x', 0)
    .attr('width', 18)
    .attr('height', 18)
    .style('fill', d => jurisdictionColors[d.jurisdiction]);

  legend.append('text')
    .attr('x', 25)
    .attr('y', 9)
    .attr('dy', '.35em')
    .style('text-anchor', 'start')
    .text(d => d.jurisdiction);

  // Tooltip
  const tooltip = d3.select('body').append('div')
    .attr('class', 'q2-tooltip')
    .style('opacity', 0);

  // Add hover effects to dots
  svg.selectAll('.q2-dot')
    .on('mouseover', function(event, d) {
      const jurisdiction = d.jurisdiction;
      
      tooltip.transition().duration(200).style('opacity', .9);
      tooltip.html(`
        <strong>${jurisdictionNames[jurisdiction]}</strong><br/>
        Year: ${d.year}<br/>
        Total Fines: ${d3.format(',')(d.totalFines)}
      `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      tooltip.transition().duration(500).style('opacity', 0);
    });
}

// Update checkboxes based on selected jurisdictions
function updateCheckboxes() {
  d3.selectAll('.q2-jurisdiction-checkboxes input').each(function() {
    const checkbox = d3.select(this);
    const jurisdiction = checkbox.attr('value');
    checkbox.property('checked', selectedJurisdictions.includes(jurisdiction));
  });
}

// Update button states based on selection
function updateButtonStates() {
  d3.selectAll('.q2-filter-btn').classed('active', false);
  
  if (selectedJurisdictions.length === 3) {
    d3.select('#q2-top3-btn').classed('active', true);
  } else if (selectedJurisdictions.length === 5) {
    d3.select('#q2-top5-btn').classed('active', true);
  } else if (selectedJurisdictions.length === 8) {
    d3.select('#q2-all-btn').classed('active', true);
  }
}

// Setup interactions
function setupInteractions() {
d3.selectAll('.q2-view-btn').on('click', function() {
  const view = this.getAttribute('data-view');
  
  // Update active button
  d3.selectAll('.q2-view-btn').classed('active', false);
  d3.select(this).classed('active', true);
  
  // Show/hide views
  d3.selectAll('.q2-view-content').classed('active', false);
  d3.select(`#q2-${view}-view`).classed('active', true);
  
  // For CSS targeting
  d3.select('body').classed('line-view-active', view === 'linechart');
  d3.select('body').classed('map-view-active', view === 'map');
  
  if (view === 'linechart') {
    updateLineChart();
  }
});

  // Quick filter buttons (line chart only)
  d3.select('#q2-top3-btn').on('click', function() {
    // Find top 3 jurisdictions by latest year (2024)
    const latestYearData = jurisdictionData.filter(d => d.year === 2024);
    const top3 = latestYearData
      .sort((a, b) => b.totalFines - a.totalFines)
      .slice(0, 3)
      .map(d => d.jurisdiction);
    
    selectedJurisdictions = top3;
    updateCheckboxes();
    updateButtonStates();
    updateLineChart();
  });
  
  d3.select('#q2-top5-btn').on('click', function() {
    // Find top 5 jurisdictions by latest year (2024)
    const latestYearData = jurisdictionData.filter(d => d.year === 2024);
    const top5 = latestYearData
      .sort((a, b) => b.totalFines - a.totalFines)
      .slice(0, 5)
      .map(d => d.jurisdiction);
    
    selectedJurisdictions = top5;
    updateCheckboxes();
    updateButtonStates();
    updateLineChart();
  });
  
  d3.select('#q2-all-btn').on('click', function() {
    selectedJurisdictions = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
    updateCheckboxes();
    updateButtonStates();
    updateLineChart();
  });
  
  // Jurisdiction checkboxes (line chart only)
  d3.selectAll('.q2-jurisdiction-checkboxes input').on('change', function() {
    selectedJurisdictions = Array.from(d3.selectAll('.q2-jurisdiction-checkboxes input:checked'))
      .map(checkbox => checkbox.value);
    
    updateButtonStates();
    updateLineChart();
  });
}

// Load Australia map data
async function loadMapData() {
  try {
    console.log('Loading Australia map data...');
    
    // Use a reliable GeoJSON source for Australia states
    const response = await fetch('https://raw.githubusercontent.com/tonywr71/GeoJson-Data/master/australian-states.json');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const geoData = await response.json();
    console.log('Raw GeoJSON data:', geoData);
    
    // Transform the data to match our jurisdiction codes
    australiaTopoJSON = {
      type: "FeatureCollection",
      features: geoData.features.map(feature => {
        // Map state names to codes
        const stateName = feature.properties.STATE_NAME;
        let stateCode = '';
        
        switch(stateName) {
          case 'New South Wales': stateCode = 'NSW'; break;
          case 'Victoria': stateCode = 'VIC'; break;
          case 'Queensland': stateCode = 'QLD'; break;
          case 'Western Australia': stateCode = 'WA'; break;
          case 'South Australia': stateCode = 'SA'; break;
          case 'Tasmania': stateCode = 'TAS'; break;
          case 'Northern Territory': stateCode = 'NT'; break;
          case 'Australian Capital Territory': stateCode = 'ACT'; break;
          default: stateCode = stateName;
        }
        
        return {
          ...feature,
          properties: {
            ...feature.properties,
            STATE_CODE: stateCode,
            STATE_NAME: stateName
          }
        };
      })
    };
    
    console.log('Processed Australia map data:', australiaTopoJSON);
    
  } catch (error) {
    console.error('Error loading map data:', error);
    console.log('Creating simplified Australia map as fallback...');
    // Create a simple fallback map
    createSimplifiedAustraliaMap();
  }
}

// Fallback function for simplified Australia map
function createSimplifiedAustraliaMap() {
  console.log('Creating simplified Australia map');
  
  // More accurate simplified Australia states
  australiaTopoJSON = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { STATE_NAME: "New South Wales", STATE_CODE: "NSW" },
        geometry: { 
          type: "Polygon", 
          coordinates: [[[141, -37], [154, -37], [154, -28], [141, -28], [141, -37]]] 
        }
      },
      {
        type: "Feature", 
        properties: { STATE_NAME: "Victoria", STATE_CODE: "VIC" },
        geometry: { 
          type: "Polygon", 
          coordinates: [[[141, -39], [150, -39], [150, -34], [141, -34], [141, -39]]] 
        }
      },
      {
        type: "Feature",
        properties: { STATE_NAME: "Queensland", STATE_CODE: "QLD" },
        geometry: { 
          type: "Polygon", 
          coordinates: [[[138, -29], [154, -29], [154, -10], [138, -10], [138, -29]]] 
        }
      },
      {
        type: "Feature",
        properties: { STATE_NAME: "Western Australia", STATE_CODE: "WA" },
        geometry: { 
          type: "Polygon", 
          coordinates: [[[113, -35], [129, -35], [129, -14], [113, -14], [113, -35]]] 
        }
      },
      {
        type: "Feature",
        properties: { STATE_NAME: "South Australia", STATE_CODE: "SA" },
        geometry: { 
          type: "Polygon", 
          coordinates: [[[129, -38], [141, -38], [141, -26], [129, -26], [129, -38]]] 
        }
      },
      {
        type: "Feature",
        properties: { STATE_NAME: "Tasmania", STATE_CODE: "TAS" },
        geometry: { 
          type: "Polygon", 
          coordinates: [[[144.5, -43.5], [148.5, -43.5], [148.5, -40.5], [144.5, -40.5], [144.5, -43.5]]] 
        }
      },
      {
        type: "Feature",
        properties: { STATE_NAME: "Northern Territory", STATE_CODE: "NT" },
        geometry: { 
          type: "Polygon", 
          coordinates: [[[129, -26], [138, -26], [138, -11], [129, -11], [129, -26]]] 
        }
      },
      {
        type: "Feature",
        properties: { STATE_NAME: "Australian Capital Territory", STATE_CODE: "ACT" },
        geometry: { 
          type: "Polygon", 
          coordinates: [[[149.0, -35.5], [149.3, -35.5], [149.3, -35.2], [149.0, -35.2], [149.0, -35.5]]] 
        }
      }
    ]
  };
}

// Create the choropleth map
function createChoroplethMap() {
  const container = d3.select('#q2-map');
  container.html(''); // Clear loading message
  
  const width = Math.min(1100, window.innerWidth - 100);
  const height = 550;
  const margin = { top: 80, right: 120, bottom: 100, left: 120 };
  
  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  // Store references
  window.q2MapSvg = svg;
  window.q2MapMargin = margin;
  window.q2MapWidth = width;
  window.q2MapHeight = height;
  
  updateChoroplethMap();
}

// Update the choropleth map based on current year
function updateChoroplethMap() {
  const svg = window.q2MapSvg;
  const margin = window.q2MapMargin;
  const width = window.q2MapWidth;
  const height = window.q2MapHeight;
  
  if (!svg || !australiaTopoJSON) {
    console.log('Map not ready yet');
    return;
  }
  
  console.log('Updating choropleth map for year:', currentMapYear);
  
  // Clear existing map
  svg.selectAll('*').remove();
  
  // Get data for current year
  const yearData = jurisdictionData.filter(d => d.year === currentMapYear);
  
  if (yearData.length === 0) {
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .text('No data available for ' + currentMapYear);
    return;
  }
  
  // Create color scale
  const maxFines = d3.max(yearData, d => d.totalFines);
  
  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, maxFines]);
  
  // Create projection for Australia
  const projection = d3.geoMercator()
    .center([136, -28])
    .scale(1100)
    .translate([width / 2, height / 2]);
  
  const path = d3.geoPath().projection(projection);
  
  // Draw states with proper data matching
  const states = svg.selectAll('.australia-state')
    .data(australiaTopoJSON.features)
    .enter().append('path')
    .attr('class', d => `australia-state state-${d.properties.STATE_CODE.toLowerCase()}`)
    .attr('d', path)
    .style('fill', d => {
      const stateCode = d.properties.STATE_CODE;
      const stateData = yearData.find(y => y.jurisdiction === stateCode);
      const fines = stateData ? stateData.totalFines : 0;
      return colorScale(fines);
    })
    .style('stroke', '#fff')
    .style('stroke-width', 1.5)
    .style('opacity', 0.8);
  
  // Add state labels with better visibility
  svg.selectAll('.state-label')
    .data(australiaTopoJSON.features)
    .enter().append('text')
    .attr('class', 'state-label')
    .attr('transform', d => {
      const centroid = path.centroid(d);
      return `translate(${centroid[0]},${centroid[1]})`;
    })
    .attr('text-anchor', 'middle')
    .attr('dy', '.35em')
    .style('font-size', '11px')
    .style('font-weight', 'bold')
    .style('fill', '#333')
    .text(d => d.properties.STATE_CODE);

  // Add vertical color legend
const colorLegend = svg.append('g')
  .attr('class', 'color-legend')
  .attr('transform', `translate(${width - 40}, 50)`); // Move further right to accommodate larger legend

// Make legend title bigger
colorLegend.append('text')
  .attr('class', 'color-legend-title')
  .attr('x', 15) // Adjusted for larger legend
  .attr('y', -25) // Move title up
  .attr('text-anchor', 'start')
  .style('font-size', '14px') // Increased from 12px
  .style('font-weight', 'bold')
  .text('Number of Fines');

// Create vertical gradient
const defs = svg.append('defs');
const gradient = defs.append('linearGradient')
  .attr('id', 'vertical-gradient')
  .attr('x1', '0%')
  .attr('y1', '100%')  // Bottom
  .attr('x2', '0%')
  .attr('y2', '0%');   // Top

// Add gradient stops
const stops = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
gradient.selectAll('stop')
  .data(stops)
  .enter().append('stop')
  .attr('offset', d => `${d * 100}%`)
  .attr('stop-color', d => colorScale(d * maxFines));

// Make the legend rectangle larger
colorLegend.append('rect')
  .attr('x', 0)
  .attr('y', 0)
  .attr('width', 30) // Increased from 20
  .attr('height', 200) // Increased from 150
  .style('fill', 'url(#vertical-gradient)')
  .style('rx', 5); // Slightly larger border radius

// Update legend scale for larger size
const legendScale = d3.scaleLinear()
  .domain([maxFines, 0])  // Reverse for vertical
  .range([0, 200]); // Increased from 150

// Make axis text larger
const legendAxis = d3.axisRight(legendScale)
  .tickFormat(d => {
    if (maxFines > 1000000) return d3.format('.1s')(d);
    return d3.format(',')(d);
  })
  .ticks(6); // Increased from 5

colorLegend.append('g')
  .attr('transform', `translate(30, 0)`) // Adjusted for wider rectangle
  .call(legendAxis)
  .selectAll('text')
  .style('font-size', '12px'); // Increased from 10px
    
  // Create jurisdiction data table (HTML, not SVG)
  createJurisdictionTable(yearData);
  
  // Add choropleth map tooltip
// Remove any existing tooltip first
d3.select('.q2-tooltip').remove();

// Create tooltip
const tooltip = d3.select('body').append('div')
  .attr('class', 'q2-tooltip')
  .style('opacity', 0)
  .style('position', 'absolute')
  .style('background', 'rgba(0, 0, 0, 0.85)')
  .style('color', 'white')
  .style('padding', '12px')
  .style('border-radius', '6px')
  .style('pointer-events', 'none')
  .style('font-size', '13px')
  .style('line-height', '1.4')
  .style('z-index', '1000')
  .style('backdrop-filter', 'blur(4px)')
  .style('border', '1px solid rgba(255,255,255,0.1)');
  
 // Enhanced hover effects for map states only
states.on('mouseover', function(event, d) {
  const stateCode = d.properties.STATE_CODE;
  const stateData = yearData.find(y => y.jurisdiction === stateCode);
  
  // Highlight the state only (not the table)
  d3.select(this)
    .style('stroke-width', '3px')
    .style('stroke', '#333')
    .style('filter', 'brightness(1.1)');
  
  if (stateData) {
    tooltip
      .style('opacity', 1)
      .html(`
        <div style="font-weight: bold; margin-bottom: 5px;">${jurisdictionNames[stateCode]}</div>
        <div>Year: ${currentMapYear}</div>
        <div>Total Fines: ${d3.format(',')(stateData.totalFines)}</div>
      `)
      .style('left', (event.pageX + 15) + 'px')
      .style('top', (event.pageY - 35) + 'px');
  }
})
.on('mousemove', function(event) {
  tooltip
    .style('left', (event.pageX + 15) + 'px')
    .style('top', (event.pageY - 35) + 'px');
})
.on('mouseout', function(event, d) {
  const stateCode = d.properties.STATE_CODE;
  
  // Remove highlight unless this is the clicked jurisdiction
  if (stateCode !== highlightedJurisdiction) {
    d3.select(this)
      .style('stroke-width', '1.5px')
      .style('stroke', '#fff')
      .style('filter', 'brightness(1)');
  }
  
  tooltip.style('opacity', 0);
});
  
  console.log('Choropleth map updated successfully');
}

// Create year buttons for map view
function createYearButtons() {
  const years = [...new Set(jurisdictionData.map(d => d.year))].sort();
  const yearContainer = d3.select('#year-buttons');
  yearContainer.html('');
  
  yearContainer.selectAll('.year-btn')
    .data(years)
    .enter()
    .append('button')
    .attr('class', d => `year-btn ${d === currentMapYear ? 'active' : ''}`)
    .text(d => d)
    .on('click', function(event, d) {
      currentMapYear = d;
      
      // Update button states
      d3.selectAll('.year-btn').classed('active', false);
      d3.select(this).classed('active', true);
      
      // Update map
      updateChoroplethMap();
    });
}

// Create jurisdiction data table
function createJurisdictionTable(yearData) {
  const tableContainer = d3.select('#q2-map-view .q2-chart-container');
  
  // Remove existing table if any
  tableContainer.select('.data-table-container').remove();
  
  // Create table container
  const tableDiv = tableContainer.append('div')
    .attr('class', 'data-table-container');
  
  // Sort data by fines (descending)
  const sortedData = [...yearData].sort((a, b) => b.totalFines - a.totalFines);
  
  // Create table
  const table = tableDiv.append('table')
    .attr('class', 'jurisdiction-table');
  
  // Create table header
  table.append('thead')
    .append('tr')
    .selectAll('th')
    .data(['Jurisdiction', 'Fines Count'])
    .enter()
    .append('th')
    .text(d => d);
  
  // Create table body
  const tbody = table.append('tbody');
  
  const rows = tbody.selectAll('tr')
    .data(sortedData)
    .enter()
    .append('tr')
    .attr('class', d => `table-row table-${d.jurisdiction.toLowerCase()}`)
    .on('click', function(event, d) {
      const stateCode = d.jurisdiction;
      highlightedJurisdiction = highlightedJurisdiction === stateCode ? null : stateCode;
      
      // Update all states
      window.q2MapSvg.selectAll('.australia-state')
        .classed('highlighted', state => state.properties.STATE_CODE === highlightedJurisdiction);
      
      // Update all table rows
      d3.selectAll('.table-row')
        .classed('highlighted', row => row.jurisdiction === highlightedJurisdiction);
    })
    .on('mouseover', function(event, d) {
      const stateCode = d.jurisdiction;
      
      // Highlight the state on the map
      window.q2MapSvg.select(`.state-${stateCode.toLowerCase()}`)
        .classed('highlighted', true);
    })
    .on('mouseout', function(event, d) {
      const stateCode = d.jurisdiction;
      
      // Only remove highlight if this isn't the clicked jurisdiction
      if (stateCode !== highlightedJurisdiction) {
        window.q2MapSvg.select(`.state-${stateCode.toLowerCase()}`)
          .classed('highlighted', false);
      }
    });
  
  // Add jurisdiction cells
  rows.append('td')
    .text(d => jurisdictionNames[d.jurisdiction])
    .style('font-weight', '600');
  
  // Add fines count cells
  rows.append('td')
    .text(d => d3.format(',')(d.totalFines))
    .style('text-align', 'center');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initQ2);