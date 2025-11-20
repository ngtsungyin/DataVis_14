// Q1: National Trends in Speeding Fines
const margin = { top: 40, right: 80, bottom: 60, left: 60 };
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

let data = [];
let activeMethods = ['Camera_Issued', 'Police_Issued', 'Others', 'Unknown'];

// Color scale for detection methods
const colorScale = d3.scaleOrdinal()
  .domain(['Camera_Issued', 'Police_Issued', 'Others', 'Unknown'])
  .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']);

// Method labels for display
const methodLabels = {
  'Camera_Issued': 'Camera Issued',
  'Police_Issued': 'Police Issued',
  'Others': 'Other Methods',
  'Unknown': 'Unknown Methods'
};

// Initialize the chart
async function initChart() {
  await loadData();
  createChart();
  setupInteractions();
}

// Load and process data
async function loadData() {
  try {
    const rawData = await d3.csv('data/q1.csv');
    
    data = rawData.map(d => ({
      year: +d.YEAR,
      Camera_Issued: d.Camera_Issued ? +d.Camera_Issued : 0,
      Police_Issued: d.Police_Issued ? +d.Police_Issued : 0,
      Others: d.Others ? +d.Others : 0,
      Unknown: d.Unknown ? +d.Unknown : 0
    })).sort((a, b) => a.year - b.year);
    
  } catch (error) {
    console.error('Error loading data:', error);
    document.querySelector('.chart-loading').textContent = 'Error loading data';
  }
}

// Create the line chart
function createChart() {
  const svg = d3.select('#line-chart')
    .html('') // Clear loading message
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Scales
  const xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => Math.max(d.Camera_Issued, d.Police_Issued, d.Others, d.Unknown)) * 1.1])
    .range([height, 0]);

  // Lines
  const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);

  // Add lines for each method
  activeMethods.forEach(method => {
    const methodData = data.map(d => ({ year: d.year, value: d[method] }));
    
    svg.append('path')
      .datum(methodData)
      .attr('class', `line line-${method.toLowerCase()}`)
      .attr('d', line)
      .style('stroke', colorScale(method))
      .style('stroke-width', 2)
      .style('fill', 'none');
  });

  // Add circles for data points
  activeMethods.forEach(method => {
    svg.selectAll(`.dot-${method.toLowerCase()}`)
      .data(data)
      .enter().append('circle')
      .attr('class', `dot dot-${method.toLowerCase()}`)
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d[method]))
      .attr('r', 4)
      .style('fill', colorScale(method))
      .style('opacity', 0.8);
  });

  // Axes
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d3.format('d'))
    .tickValues(data.map(d => d.year).filter((d, i) => i % 2 === 0)); // Show every 2nd year

  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => d3.format(',')(d));

  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis);

  svg.append('g')
    .attr('class', 'y-axis')
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

  // Legend
  const legend = svg.selectAll('.legend')
    .data(activeMethods)
    .enter().append('g')
    .attr('class', 'legend')
    .attr('transform', (d, i) => `translate(${width - 150}, ${i * 25})`);

  legend.append('rect')
    .attr('x', 0)
    .attr('width', 18)
    .attr('height', 18)
    .style('fill', d => colorScale(d));

  legend.append('text')
    .attr('x', 25)
    .attr('y', 9)
    .attr('dy', '.35em')
    .style('text-anchor', 'start')
    .text(d => methodLabels[d]);

  // Title
  svg.append('text')
    .attr('class', 'chart-title')
    .attr('x', width / 2)
    .attr('y', -margin.top / 2)
    .style('text-anchor', 'middle')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .text('National Speeding Fines by Detection Method (2008-2024)');

  // Tooltip
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);

  // Add hover effects - SIMPLIFIED VERSION
  svg.selectAll('.dot')
    .on('mouseover', function(event, d) {
      // Find which method this dot belongs to by checking its Y position
      const yPos = d3.select(this).attr('cy');
      const xPos = d3.select(this).attr('cx');
      
      // Find which method has this value at this year
      let methodFound = '';
      let valueFound = 0;
      
      activeMethods.forEach(method => {
        if (Math.abs(yScale(d[method]) - parseFloat(yPos)) < 1) {
          methodFound = method;
          valueFound = d[method];
        }
      });
      
      if (methodFound) {
        tooltip.transition().duration(200).style('opacity', .9);
        tooltip.html(`
          <strong>${d.year}</strong><br/>
          ${methodLabels[methodFound]}: ${d3.format(',')(valueFound)} fines
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      }
    })
    .on('mouseout', function() {
      tooltip.transition().duration(500).style('opacity', 0);
    });

// Setup interactive controls
function setupInteractions() {
  d3.selectAll('.toggle-btn').on('click', function() {
    const method = this.getAttribute('data-method');
    
    // Update active buttons
    d3.selectAll('.toggle-btn').classed('active', false);
    d3.select(this).classed('active', true);
    
    // Update visible lines
    if (method === 'all') {
      activeMethods = ['Camera_Issued', 'Police_Issued', 'Others', 'Unknown'];
    } else if (method === 'camera') {
      activeMethods = ['Camera_Issued'];
    } else if (method === 'police') {
      activeMethods = ['Police_Issued'];
    }
    
    // Recreate chart with new filters
    createChart();
  });
}
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initChart);