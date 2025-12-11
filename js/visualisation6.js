// visualisation6.js — Heatmap of fines by location type and year
// Requires D3.js v7 and data/visualisation6.csv

d3.csv("data/visualisation6.csv").then(function(data) {
  // Parse data

  // Normalize data keys and parse numeric value into `VALUE`
  data.forEach(d => {
    // ensure YEAR and LOCATION are strings
    d.YEAR = String(d.YEAR).trim();
    d.LOCATION = String(d.LOCATION).trim();
    // find the numeric column (any column that's not YEAR or LOCATION)
    const valKey = Object.keys(d).find(k => k !== 'YEAR' && k !== 'LOCATION');
    d.VALUE = valKey ? +d[valKey] : 0;
  });

  // Extract sorted years (numeric sort) and locations (keep order as in data unique)
  const years = Array.from(new Set(data.map(d => d.YEAR))).sort((a,b) => +a - +b);
  const locations = Array.from(new Set(data.map(d => d.LOCATION)));

  // Prepare matrix — only use values present for the specific LOCATION & YEAR
  // Do NOT fill missing cells with 'All regions' totals; leave them as 0 so they appear white
  const matrix = locations.map(loc => {
    return years.map(year => {
      const entry = data.find(d => d.LOCATION === loc && d.YEAR === year);
      return entry ? entry.VALUE : 0;
    });
  });

  // Chart dimensions (responsive to container width)
  // increase margins to give more breathing room on larger charts
  const margin = {top: 80, right: 40, bottom: 90, left: 220};

  // Compute available container width so the chart doesn't overflow
  const containerNode = d3.select('#heatmap-chart').node();
  // allow a larger maximum so the SVG can expand on wide screens
  const containerWidth = Math.min((containerNode && containerNode.getBoundingClientRect().width) || 1200, 1400);

  // cell size depends on number of years and container width
  // increase max cell dimensions so cells are more readable
  const maxCellWidth = 90;
  const maxCellHeight = 60;
  const availableForCells = Math.max(200, containerWidth - margin.left - margin.right);
  const cellWidth = Math.max(28, Math.min(maxCellWidth, Math.floor(availableForCells / years.length)));
  const cellHeight = Math.max(40, Math.min(maxCellHeight, Math.floor(maxCellHeight)));

  const width = margin.left + margin.right + years.length * cellWidth;
  const height = margin.top + margin.bottom + locations.length * cellHeight;

  // Color scale: keep zeros white, map colors from smallest non-zero to max
  const allValues = matrix.flat();
  const maxFines = d3.max(allValues);
  const minNonZero = d3.min(allValues.filter(v => v > 0));
  // If there are no non-zero values, fall back to [0,1]
  const colorDomainMin = minNonZero || 1;
  const colorScale = d3.scaleSequential(d3.interpolateReds)
    .domain([colorDomainMin, maxFines]);

  // SVG
  const svg = d3.select("#heatmap-chart")
    .html("")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // X axis (years)
  const x = d3.scaleBand()
    .domain(years)
    .range([margin.left, width - margin.right])
    .padding(0.05);

  svg.append("g")
    .attr("transform", `translate(0,${margin.top})`)
    .call(d3.axisTop(x).tickSizeOuter(0))
    .selectAll("text")
    .attr("font-size", Math.max(10, Math.min(14, Math.floor(cellWidth * 0.35)) ) + "px")
    .attr("transform", "rotate(-45)")
    .attr("text-anchor", "start")
    .attr("dx", "0.2em")
    .attr("dy", "-0.5em");

  // Y axis (locations)
  const y = d3.scaleBand()
    .domain(locations)
    .range([margin.top, height - margin.bottom])
    .padding(0.05);

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSizeOuter(0))
    .selectAll("text")
    .attr("font-size", "13px");

  // Draw cells
  svg.append("g")
    .selectAll("g")
    .data(matrix)
    .join("g")
    .attr("transform", (d, i) => `translate(0,${y(locations[i])})`)
    .selectAll("rect")
    .data((row, i) => row.map((val, j) => ({val, year: years[j], loc: locations[i]})))
    .join("rect")
    .attr("x", d => x(d.year))
    .attr("width", cellWidth)
    .attr("height", cellHeight)
    .attr("fill", d => d.val > 0 ? colorScale(d.val) : "#ffffff")
    .attr("stroke", "#ececec")
    .attr("stroke-width", 1)
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("stroke", "#222")
        .attr("stroke-width", 2.5)
        .style("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.3))")
        .style("cursor", "pointer");
      tooltip.style("display", "block")
        .html(`
          <div style='font-weight:700;font-size:16px;margin-bottom:10px;color:#c53030;border-bottom:2px solid #e53e3e;padding-bottom:8px;'>${d.loc}</div>
          <div style='margin-bottom:6px;font-size:14px;color:#555;'><strong>Year:</strong> ${d.year}</div>
          <div style='font-size:18px;font-weight:700;color:#e53e3e;margin-top:8px;'>${d.val > 0 ? d3.format(",")(d.val) + ' fines' : 'No data available'}</div>
          ${d.val === 0 ? "<div style='font-size:12px;color:#999;margin-top:6px;font-style:italic;'>⚠️ Missing data for this period</div>" : ""}
          ${d.val > 0 ? "<div style='font-size:11px;color:#888;margin-top:8px;'>Click cell for more details</div>" : ""}
        `)
        .style("left", (event.pageX + 16) + "px")
        .style("top", (event.pageY - 24) + "px");
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("stroke", "#ececec")
        .attr("stroke-width", 1)
        .style("filter", "none")
        .style("cursor", "default");
      tooltip.style("display", "none");
    });

  // Add fine numbers — only for values above a threshold to reduce clutter
  const showThreshold = 0; // show numbers for any non-zero cell (matches reference)
  svg.append("g")
    .selectAll("g")
    .data(matrix)
    .join("g")
    .attr("transform", (d, i) => `translate(0,${y(locations[i])})`)
    .selectAll("text")
    .data((row, i) => row.map((val, j) => ({val, year: years[j], loc: locations[i]})))
    .join("text")
    .attr("x", d => x(d.year) + cellWidth / 2)
    .attr("y", cellHeight / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("font-size", Math.max(10, Math.min(14, Math.floor(cellWidth * 0.28))) + "px")
    .attr("fill", d => d.val > maxFines * 0.6 ? "#fff" : "#222")
    .text(d => d.val > showThreshold ? d3.format(",d")(d.val) : "");

  // Add a subtle background card so chart appears contained
  svg.insert("rect", ":first-child")
    .attr("x", margin.left - 20)
    .attr("y", margin.top - 30)
    .attr("width", width - margin.left - margin.right + 40)
    .attr("height", height - margin.top - margin.bottom + 70)
    .attr("rx", 8)
    .attr("ry", 8)
    .attr("fill", "#fff")
    .attr("stroke", "#f0f0f0")
    .attr("filter", "")
    .attr("opacity", 1);

  // Make svg responsive by setting viewBox and width 100%
  svg.attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");
  d3.select(svg.node()).style("width", "100%").style("height", "auto");

  // Axis labels with improved clarity
  svg.append("text")
    .attr("x", margin.left + (width - margin.left - margin.right) / 2)
    .attr("y", margin.top - 45)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "700")
    .attr("fill", "#333")
    .text("YEAR");

  // Position the Y-axis label further left so it doesn't overlap the chart
  const labelX = Math.max(20, margin.left - 180);
  const labelY = margin.top + (height - margin.top - margin.bottom) / 2;
  svg.append("text")
    .attr("x", labelX)
    .attr("y", labelY)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "700")
    .attr("fill", "#333")
    .attr("transform", `rotate(-90,${labelX},${labelY})`)
    .text("LOCATION TYPE");

  // Enhanced tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "heatmap-tooltip")
    .style("position", "absolute")
    .style("background", "linear-gradient(135deg, #ffffff 0%, #fff5f5 100%)")
    .style("border", "2px solid #fc8181")
    .style("padding", "14px 20px")
    .style("border-radius", "12px")
    .style("box-shadow", "0 4px 16px rgba(0,0,0,0.15)")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("font-family", "Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif")
    .style("z-index", "10000")
    .style("min-width", "220px");

  // Enhanced color legend with better clarity
  const legendWidth = Math.min(320, years.length * cellWidth * 0.65);
  const legendX = margin.left + 20;
  const legendY = height - margin.bottom + 35;

  // Legend title
  svg.append("text")
    .attr("x", legendX)
    .attr("y", legendY - 10)
    .attr("font-size", "13px")
    .attr("font-weight", "600")
    .attr("fill", "#333")
    .text("Number of Fines (Intensity Scale):");

  const defs = svg.append("defs");
  const grad = defs.append("linearGradient").attr("id","grad-heat").attr("x1","0%").attr("x2","100%");
  grad.append("stop").attr("offset","0%").attr("stop-color","#fee");
  grad.append("stop").attr("offset","40%").attr("stop-color","#fc8181");
  grad.append("stop").attr("offset","100%").attr("stop-color","#c53030");

  svg.append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width", legendWidth)
    .attr("height", 14)
    .attr("rx", 3)
    .style("fill", "url(#grad-heat)")
    .style("stroke", "#ddd")
    .style("stroke-width", 1);

  // legend ticks with improved formatting
  const legendScale = d3.scaleLinear().domain([0, maxFines]).range([legendX, legendX + legendWidth]);
  const legendAxis = d3.axisBottom(legendScale).ticks(5).tickFormat(d3.format(",.0f"));
  svg.append("g")
    .attr("transform", `translate(0,${legendY + 14})`)
    .call(legendAxis)
    .selectAll("text")
    .attr("font-size","12px")
    .attr("fill", "#555");
});
