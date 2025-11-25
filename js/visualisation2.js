// Q2: Jurisdictional Speeding Fines Analysis - WITH BOTH FILTERS
let jurisdictionData = [];
let selectedJurisdictions = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

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
  await loadJurisdictionData();
  await loadMapData(); // Load map data
  createLineChart();
  setupInteractions();
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
  // View toggle buttons (Line Chart vs Map)
  d3.selectAll('.q2-view-btn').on('click', function() {
    const view = this.getAttribute('data-view');
    
    // Update active button
    d3.selectAll('.q2-view-btn').classed('active', false);
    d3.select(this).classed('active', true);
    
    // Show/hide views
    d3.selectAll('.q2-view-content').classed('active', false);
    d3.select(`#q2-${view}-view`).classed('active', true);
    
    // Initialize map if switching to map view
    if (view === 'map') {
      createChoroplethMap();
    }
  });
  
  // Quick filter buttons
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
  
  // Jurisdiction checkboxes
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
    // Using a reliable Australia GeoJSON source
    const response = await fetch('https://raw.githubusercontent.com/tonywr71/GeoJson-Data/master/australian-states.json');
    australiaTopoJSON = await response.json();
    console.log('Australia map data loaded successfully');
  } catch (error) {
    console.error('Error loading map data:', error);
    // Create a simple fallback map
    createSimplifiedAustraliaMap();
  }
}

// Fallback function for simplified Australia map
function createSimplifiedAustraliaMap() {
  console.log('Creating simplified Australia map');
  // Simple bounding boxes for each state/territory
  australiaTopoJSON = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { STATE_NAME: "New South Wales", STATE_CODE: "NSW" }, geometry: { type: "Polygon", coordinates: [[[141, -37.5], [154, -37.5], [154, -28], [141, -28], [141, -37.5]]] } },
      { type: "Feature", properties: { STATE_NAME: "Victoria", STATE_CODE: "VIC" }, geometry: { type: "Polygon", coordinates: [[[141, -39.5], [150, -39.5], [150, -34], [141, -34], [141, -39.5]]] } },
      { type: "Feature", properties: { STATE_NAME: "Queensland", STATE_CODE: "QLD" }, geometry: { type: "Polygon", coordinates: [[[138, -29], [153, -29], [153, -10], [138, -10], [138, -29]]] } },
      { type: "Feature", properties: { STATE_NAME: "Western Australia", STATE_CODE: "WA" }, geometry: { type: "Polygon", coordinates: [[[113, -35], [129, -35], [129, -14], [113, -14], [113, -35]]] } },
      { type: "Feature", properties: { STATE_NAME: "South Australia", STATE_CODE: "SA" }, geometry: { type: "Polygon", coordinates: [[[129, -38], [141, -38], [141, -26], [129, -26], [129, -38]]] } },
      { type: "Feature", properties: { STATE_NAME: "Tasmania", STATE_CODE: "TAS" }, geometry: { type: "Polygon", coordinates: [[[144.5, -43.5], [148.5, -43.5], [148.5, -40.5], [144.5, -40.5], [144.5, -43.5]]] } },
      { type: "Feature", properties: { STATE_NAME: "Northern Territory", STATE_CODE: "NT" }, geometry: { type: "Polygon", coordinates: [[[129, -26], [138, -26], [138, -11], [129, -11], [129, -26]]] } },
      { type: "Feature", properties: { STATE_NAME: "Australian Capital Territory", STATE_CODE: "ACT" }, geometry: { type: "Polygon", coordinates: [[[149, -35.5], [149.3, -35.5], [149.3, -35.2], [149, -35.2], [149, -35.5]]] } }
    ]
  };
}

// Create the choropleth map
function createChoroplethMap() {
  const container = d3.select('#q2-map-view .q2-chart-container');
  container.html(''); // Clear "Coming Soon" message
  
  const width = 800;
  const height = 500;
  const margin = { top: 40, right: 20, bottom: 80, left: 20 };
  
  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  // Store references
  window.q2MapSvg = svg;
  window.q2MapWidth = width;
  window.q2MapHeight = height;
  
  updateChoroplethMap();
}

// Update the choropleth map based on current year
function updateChoroplethMap() {
  const svg = window.q2MapSvg;
  const width = window.q2MapWidth;
  const height = window.q2MapHeight;
  
  if (!svg || !australiaTopoJSON) {
    console.log('Map not ready yet');
    return;
  }
  
  // Clear existing map
  svg.selectAll('*').remove();
  
  // Get data for current year
  const yearData = jurisdictionData.filter(d => d.year === currentMapYear);
  
  // Create color scale
  const maxFines = d3.max(yearData, d => d.totalFines);
  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, maxFines]);
  
  // Create projection for Australia
  const projection = d3.geoMercator()
    .center([134, -25]) // Center on Australia
    .scale(1000)
    .translate([width / 2, height / 2]);
  
  const path = d3.geoPath().projection(projection);
  
  // Draw states
  const states = svg.selectAll('.australia-state')
    .data(australiaTopoJSON.features)
    .enter().append('path')
    .attr('class', 'australia-state')
    .attr('d', path)
    .style('fill', d => {
      const stateCode = d.properties.STATE_CODE;
      const stateData = yearData.find(y => y.jurisdiction === stateCode);
      return stateData ? colorScale(stateData.totalFines) : '#ccc';
    })
    .style('stroke', '#fff')
    .style('stroke-width', 1)
    .style('opacity', 0.8);
  
  // Add state labels
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
    .style('font-size', '10px')
    .style('font-weight', 'bold')
    .style('fill', '#333')
    .text(d => d.properties.STATE_CODE);
  
  // Add year slider for map
  const years = [...new Set(jurisdictionData.map(d => d.year))].sort();
  const yearSlider = svg.append('g')
    .attr('class', 'year-slider')
    .attr('transform', `translate(${width / 2 - 100}, ${height + 50})`);
  
  yearSlider.selectAll('.year-option')
    .data(years)
    .enter().append('rect')
    .attr('class', 'year-option')
    .attr('x', (d, i) => i * 25)
    .attr('y', 0)
    .attr('width', 20)
    .attr('height', 15)
    .style('fill', d => d === currentMapYear ? '#1f77b4' : '#ddd')
    .style('cursor', 'pointer')
    .on('click', function(event, d) {
      currentMapYear = d;
      updateChoroplethMap();
    });
  
  yearSlider.selectAll('.year-text')
    .data(years)
    .enter().append('text')
    .attr('class', 'year-text')
    .attr('x', (d, i) => i * 25 + 10)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .style('font-size', '9px')
    .text(d => d);
  
  yearSlider.append('text')
    .attr('class', 'slider-label')
    .attr('x', -10)
    .attr('y', -10)
    .style('text-anchor', 'start')
    .style('font-size', '12px')
    .text('Select Year:');
  
  // Add legend
  const legendWidth = 150;
  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${width - legendWidth - 10}, 10)`);
  
  legend.append('text')
    .attr('class', 'legend-title')
    .attr('x', legendWidth / 2)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .text('Number of Fines');
  
  const legendScale = d3.scaleLinear()
    .domain([0, maxFines])
    .range([0, legendWidth]);
  
  const legendAxis = d3.axisBottom(legendScale)
    .tickFormat(d3.format(','))
    .ticks(4);
  
  // Create gradient for legend
  const defs = svg.append('defs');
  const gradient = defs.append('linearGradient')
    .attr('id', 'legend-gradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%');
  
  gradient.selectAll('stop')
    .data(d3.range(0, 1.01, 0.1))
    .enter().append('stop')
    .attr('offset', d => `${d * 100}%`)
    .attr('stop-color', d => colorScale(d * maxFines));
  
  legend.append('rect')
    .attr('x', 0)
    .attr('y', 10)
    .attr('width', legendWidth)
    .attr('height', 15)
    .style('fill', 'url(#legend-gradient)');
  
  legend.append('g')
    .attr('transform', `translate(0, 25)`)
    .call(legendAxis);
  
  // Tooltip for map
  const tooltip = d3.select('body').select('.q2-tooltip');
  if (tooltip.empty()) {
    d3.select('body').append('div')
      .attr('class', 'q2-tooltip')
      .style('opacity', 0);
  }
  
  states.on('mouseover', function(event, d) {
    const stateCode = d.properties.STATE_CODE;
    const stateData = yearData.find(y => y.jurisdiction === stateCode);
    if (stateData) {
      d3.select('.q2-tooltip')
        .transition().duration(200).style('opacity', .9)
        .html(`
          <strong>${jurisdictionNames[stateCode]}</strong><br/>
          Year: ${currentMapYear}<br/>
          Total Fines: ${d3.format(',')(stateData.totalFines)}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    }
  })
  .on('mouseout', function() {
    d3.select('.q2-tooltip').transition().duration(500).style('opacity', 0);
  });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initQ2);