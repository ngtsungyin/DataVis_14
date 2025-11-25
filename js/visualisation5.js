// D3.js line plot for monthly fines by detection method (2024)
const margin = {top: 60, right: 40, bottom: 80, left: 80};
const width = 900 - margin.left - margin.right;
const height = 540 - margin.top - margin.bottom;

const svg = d3.select('#line-chart')
  .append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', `translate(${margin.left},${margin.top})`);

d3.csv('data/v5.csv').then(raw => {
  const data = raw.map(d => ({
    Month: d.Month,
    Others: +d.Others,
    Camera_Issued: +d.Camera_Issued,
    Police_Issued: +d.Police_Issued,
    Unknown: +d.Unknown
  }));
  const months = data.map(d => d.Month);
  const methodMap = {
    Camera_Issued: {label: 'Camera Issued', color: '#43b02a'},
    Police_Issued: {label: 'Police Issued', color: '#f7b500'},
    Unknown: {label: 'Unknown', color: '#e94f37'}
  };

  // Axis
  const x = d3.scalePoint()
    .domain(months)
    .range([0, width])
    .padding(0.5);
  const maxY = d3.max(data, d => Math.max(d.Camera_Issued, d.Police_Issued, d.Others, d.Unknown));
  const y = d3.scaleLinear()
    .domain([0, maxY * 1.15])
    .range([height, 0]);

  // Grid lines
  svg.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y)
      .tickSize(-width)
      .tickFormat(''));

  // Style grid lines
  svg.selectAll('.grid line')
    .attr('stroke', '#e6e6e6')
    .attr('stroke-opacity', 0.9);
  svg.selectAll('.grid path').remove();

  // Chart title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -40)
    .attr('font-size', '20px')
    .attr('font-weight', 'bold')
    .attr('text-anchor', 'middle')
    .text('What is the monthly seasonality in 2024, and how does it differ by detection method?');

  // Y axis label (rotated, left of chart)
  svg.append('text')
    .attr('transform', `translate(-60, ${height / 2}) rotate(-90)`)
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .attr('text-anchor', 'middle')
    .text('Total Fines per Detection Method');

  // X axis label
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 60)
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .attr('text-anchor', 'middle')
    .text('Month');

  // Axes
  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y).ticks(6).tickFormat(d3.format(','));

  svg.append('g')
    .attr('class', 'x axis')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .selectAll('text')
    .style('font-size', '12px');

  svg.append('g')
    .attr('class', 'y axis')
    .call(yAxis)
    .selectAll('text')
    .style('font-size', '12px');

  // Tooltip setup (moved before drawing dots so handlers can use it)
  const tooltip = d3.select('body').append('div')
    .attr('class', 'chart-tooltip')
    .style('position', 'absolute')
    .style('background', '#fff')
    .style('border-radius', '10px')
    .style('box-shadow', '0 2px 8px rgba(0,0,0,0.12)')
    .style('padding', '12px 18px')
    .style('color', '#111')
    .style('font-size', '14px')
    .style('font-family', 'Inter, Arial, sans-serif')
    .style('pointer-events', 'none')
    .style('display', 'none')
    .style('z-index', '1000');

  // Line generator
  const line = d3.line()
    .x(d => x(d.Month))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  // Function to draw lines based on selected method
  function drawLines(selectedMethod) {
    // determine which methods to show
    let methodsToShow = Object.keys(methodMap);
    if (selectedMethod === 'camera') methodsToShow = ['Camera_Issued'];
    if (selectedMethod === 'police') methodsToShow = ['Police_Issued'];

    // remove previous lines and dots
    svg.selectAll('.line').remove();
    svg.selectAll('.dot').remove();

    methodsToShow.forEach(method => {
      const lineData = data.map(d => ({Month: d.Month, value: d[method]}));

      // draw path
      svg.append('path')
        .datum(lineData)
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', methodMap[method].color)
        .attr('stroke-width', 2.5)
        .attr('d', line);

      // draw dots
      svg.selectAll(`.dot-${method}`)
        .data(lineData)
        .enter()
        .append('circle')
        .attr('class', `dot dot-${method}`)
        .attr('cx', d => x(d.Month))
        .attr('cy', d => y(d.value))
        .attr('r', 5)
        .attr('fill', methodMap[method].color)
        .attr('stroke', methodMap[method].color)
        .attr('stroke-width', 1.5)
        .on('mouseover', function(event, d) {
          tooltip.style('display', 'block')
            .html(`<div style='font-weight:600'>${d.Month}</div><div>${methodMap[method].label}</div><div>Fines: ${d.value.toLocaleString()}</div>`);
          d3.select(this).attr('r', 8);
        })
        .on('mousemove', function(event) {
          tooltip.style('left', (event.pageX + 15) + 'px')
                 .style('top', (event.pageY - 30) + 'px');
        })
        .on('mouseout', function() {
          tooltip.style('display', 'none');
          d3.select(this).attr('r', 5);
        });
    });
  }

  // initial draw - show all
  drawLines('all');

  // wire up filter buttons
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // update active class
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      // call drawLines with data-method
      const method = this.getAttribute('data-method');
      drawLines(method);
    });
  });

  // Legend in HTML below chart
  const legendDiv = document.getElementById('vis5-legend');
  if (legendDiv) {
    legendDiv.innerHTML = Object.keys(methodMap).map(k => {
      const m = methodMap[k];
      return `<span style="display:inline-flex;align-items:center;margin-right:28px;font-size:13px;white-space:nowrap;">
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${m.color};margin-right:8px;"></span>
        ${m.label}
      </span>`;
    }).join('');
  }

  // Remove loading message
  const loadingDiv = document.querySelector('#line-chart .chart-loading');
  if (loadingDiv) loadingDiv.style.display = 'none';

}).catch(error => {
  const loadingDiv = document.querySelector('#line-chart .chart-loading');
  if (loadingDiv) {
    loadingDiv.textContent = 'Error loading chart data. Please check that data/v5.csv exists and is accessible.';
    loadingDiv.style.color = 'red';
  }
});

