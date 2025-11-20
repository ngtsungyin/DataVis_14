// Q2: Jurisdictional Speeding Fines Analysis - WITH BOTH FILTERS
let jurisdictionData = [];
let selectedJurisdictions = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initQ2);