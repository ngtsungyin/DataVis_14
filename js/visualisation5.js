// D3.js line plot for monthly fines by detection method (2024)
// Responsive design: calculate width based on container
const containerNode = d3.select('#line-chart').node();
const containerWidth = containerNode ? containerNode.getBoundingClientRect().width : 900;
const responsiveWidth = Math.min(containerWidth - 40, 950);

const margin = {top: 70, right: 50, bottom: 90, left: 90};
const width = responsiveWidth - margin.left - margin.right;
const height = Math.min(540, width * 0.65) - margin.top - margin.bottom;

const svg = d3.select('#line-chart')
  .append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
  .attr('preserveAspectRatio', 'xMidYMid meet')
  .style('max-width', '100%')
  .style('height', 'auto')
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

  // Chart title - improved clarity with subtitle
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -50)
    .attr('font-size', '18px')
    .attr('font-weight', '700')
    .attr('text-anchor', 'middle')
    .attr('fill', '#333')
    .text('Monthly Seasonality Patterns by Detection Method');
  
  // Subtitle for context
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -30)
    .attr('font-size', '13px')
    .attr('font-weight', '400')
    .attr('text-anchor', 'middle')
    .attr('fill', '#666')
    .text('Hover over data points for exact values | Use filters to compare methods');

  // Y axis label (rotated, left of chart) - refined spacing
  svg.append('text')
    .attr('transform', `translate(-65, ${height / 2}) rotate(-90)`)
    .attr('font-size', '14px')
    .attr('font-weight', '600')
    .attr('text-anchor', 'middle')
    .attr('fill', '#333')
    .text('Number of Fines Issued');

  // X axis label - refined spacing
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 65)
    .attr('font-size', '14px')
    .attr('font-weight', '600')
    .attr('text-anchor', 'middle')
    .attr('fill', '#333')
    .text('Month (2024)');

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

  // Enhanced tooltip setup with improved interactivity
  const tooltip = d3.select('body').append('div')
    .attr('class', 'chart-tooltip vis5-tooltip')
    .style('position', 'absolute')
    .style('background', 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)')
    .style('border', '2px solid #e0e0e0')
    .style('border-radius', '12px')
    .style('box-shadow', '0 4px 16px rgba(0,0,0,0.15)')
    .style('padding', '14px 20px')
    .style('color', '#222')
    .style('font-size', '14px')
    .style('font-family', 'Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif')
    .style('pointer-events', 'none')
    .style('display', 'none')
    .style('z-index', '10000')
    .style('min-width', '200px');

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
            .html(`
              <div style='font-weight:700;font-size:15px;margin-bottom:8px;color:#111;border-bottom:2px solid ${methodMap[method].color};padding-bottom:6px;'>${d.Month} 2024</div>
              <div style='margin-bottom:4px;display:flex;align-items:center;'><span style='display:inline-block;width:10px;height:10px;border-radius:50%;background:${methodMap[method].color};margin-right:8px;'></span><strong>${methodMap[method].label}</strong></div>
              <div style='font-size:17px;font-weight:700;color:${methodMap[method].color};margin-top:8px;'>${d.value.toLocaleString()} fines</div>
              <div style='font-size:11px;color:#888;margin-top:6px;font-style:italic;'>Click to view details</div>
            `);
          d3.select(this)
            .attr('r', 9)
            .attr('stroke-width', 3)
            .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))');
        })
        .on('mousemove', function(event) {
          tooltip.style('left', (event.pageX + 15) + 'px')
                 .style('top', (event.pageY - 30) + 'px');
        })
        .on('mouseout', function() {
          tooltip.style('display', 'none');
          d3.select(this)
            .attr('r', 5)
            .attr('stroke-width', 1.5)
            .style('filter', 'none');
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

