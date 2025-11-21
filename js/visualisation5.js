// D3.js line plot for monthly fines by detection method (2024)
// Uses data/cleaned_speeding_data.csv

const margin = {top: 60, right: 40, bottom: 80, left: 80};
const width = 900 - margin.left - margin.right;
const height = 540 - margin.top - margin.bottom;

const colors = {
  Camera: '#43b02a', // green
  Police: '#f7b500', // yellow
  Unknown: '#e94f37', // red
  Other: '#2a6edb'   // blue
};

const svg = d3.select('#vis5-chart')
  .append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', `translate(${margin.left},${margin.top})`);

// Load and process data
// CSV columns: YEAR, START_DATE, JURISDICTION, PREDICTION_DETECTION_METHOD, METRIC, LOCATION, FINES, END_DATE, DETECTION_METHOD, AGE_GROUP
// Only use METRIC === 'speed_fines'
d3.csv('data/cleaned_speeding_data.csv').then(raw => {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function getMonth(dateStr) {
    const d = new Date(dateStr);
    return monthNames[d.getMonth()];
  }

  // Group and sum
  const monthly = {};
  raw.forEach(d => {
    const month = getMonth(d.START_DATE);
    let method = 'Unknown';
    if (d.DETECTION_METHOD && d.DETECTION_METHOD.toLowerCase().includes('police')) method = 'Police';
    else if (d.DETECTION_METHOD && d.DETECTION_METHOD.toLowerCase().includes('camera')) method = 'Camera';
    else if (d.DETECTION_METHOD && d.DETECTION_METHOD.toLowerCase().includes('other')) method = 'Other';
    if (d.METRIC !== 'speed_fines') return;
    if (!monthly[month]) monthly[month] = {Camera:0, Police:0, Unknown:0, Other:0};
    monthly[month][method] += +d.FINES;
  });

  // Prepare data for plotting
  const months = monthNames.filter(m => monthly[m]);
  const data = months.map(month => ({
    Month: month,
    Camera: monthly[month].Camera,
    Police: monthly[month].Police,
    Unknown: monthly[month].Unknown,
    Other: monthly[month].Other
  }));

  const maxY = d3.max(data, d => Math.max(d.Camera, d.Police, d.Unknown, d.Other));

  // Scales
  const x = d3.scalePoint()
    .domain(months)
    .range([0, width])
    .padding(0.5);

  const y = d3.scaleLinear()
    .domain([0, maxY * 1.15])
    .range([height, 0]);

  // Grid lines
  svg.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y)
      .tickSize(-width)
      .tickFormat(''));

  // Title
  svg.append('text')
    .attr('x', width/2)
    .attr('y', -30)
    .attr('font-size', '20px')
    .attr('font-weight', 'bold')
    .attr('text-anchor', 'middle')
    .text('What is the monthly seasonality in 2024, and how does it differ by detection method?');

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('font-size', '16px');

  svg.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('font-size', '16px');

  // Axis labels
  svg.append('text')
    .attr('x', -60)
    .attr('y', -10)
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .text('Total Fines per Detection Method');

  svg.append('text')
    .attr('x', width/2)
    .attr('y', height + 60)
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .attr('text-anchor', 'middle')
    .text('Month');

  // Line generator
  const line = d3.line()
    .x(d => x(d.Month))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  // Draw lines for each method
  ['Other', 'Camera', 'Police', 'Unknown'].forEach(method => {
    const lineData = data.map(d => ({Month: d.Month, value: d[method]}));
    svg.append('path')
      .datum(lineData)
      .attr('fill', 'none')
      .attr('stroke', colors[method])
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Dots
    svg.selectAll(`.dot-${method}`)
      .data(lineData)
      .enter()
      .append('circle')
      .attr('class', `dot dot-${method}`)
      .attr('cx', d => x(d.Month))
      .attr('cy', d => y(d.value))
      .attr('r', 3.5)
      .attr('fill', colors[method])
      .attr('stroke', colors[method])
      .attr('stroke-width', 1.5);
  });

  // Legend in HTML below chart
  const legendData = [
    {label: 'Other+Sum(Sum(FINES))', color: colors.Other},
    {label: 'camera_issued+Sum(Sum(FINES))', color: colors.Camera},
    {label: 'police_issued+Sum(Sum(FINES))', color: colors.Police},
    {label: 'unknown+Sum(Sum(FINES))', color: colors.Unknown}
  ];
  const legendDiv = document.getElementById('vis5-legend');
  legendDiv.innerHTML = legendData.map(d =>
    `<span style="display:inline-flex;align-items:center;margin-right:32px;font-size:15px;white-space:nowrap;">
      <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${d.color};margin-right:8px;"></span>
      ${d.label}
    </span>`
  ).join('');
});

// Minimal grid line style
const style = document.createElement('style');
style.innerHTML = `
.grid line {
  stroke: #eee;
  stroke-width: 2px;
}
`;
document.head.appendChild(style);
