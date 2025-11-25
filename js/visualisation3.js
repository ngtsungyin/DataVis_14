// visualisation3.js
// D3 v7 visualization for Q3 (national camera vs police mix)
// Expects CSV at "data/visualisation3.csv" with columns: YEAR, Camera_Issued, Police_Issued

// Config / layout
const margin = { top: 40, right: 120, bottom: 50, left: 70 };
const container = d3.select("#q3-chart");
const WIDTH = Math.min(1100, container.node().getBoundingClientRect().width || 980);
const HEIGHT = 460;
const width = WIDTH - margin.left - margin.right;
const height = HEIGHT - margin.top - margin.bottom;

const svg = container
  .append("svg")
  .attr("width", WIDTH)
  .attr("height", HEIGHT)
  .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

// scales
const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);
const color = d3.scaleOrdinal().domain(["Camera", "Police"]).range(["#4C8CF5", "#E35B5B"]);

// axes groups
const gx = g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
const gy = g.append("g").attr("class", "y-axis");

// group containers
const layer = g.append("g").attr("class", "layers");
const linesG = g.append("g").attr("class", "lines");
const legendG = svg.append("g").attr("transform", `translate(${margin.left + width + 10},${margin.top})`);
const tooltip = d3.select("body").append("div").attr("class", "q2-tooltip").style("opacity", 0);

// vertical guideline
const vline = g.append("line")
  .attr("class", "q3-vline")
  .attr("stroke", "#666")
  .attr("stroke-width", 1)
  .attr("stroke-dasharray", "3 3")
  .style("opacity", 0);

// overlay to capture mouse and enlarge hover area
g.append("rect")
  .attr("class", "q3-overlay")
  .attr("width", width)
  .attr("height", height)
  .attr("fill", "transparent")
  .style("pointer-events", "all");

// state
let mode = "line"; // default to line view
let percentMode = false;
let showCamera = true;
let showPolice = true;
let prevShowCamera = true;
let prevShowPolice = true;
let dataAll = [];

// utility for formatting big numbers
const numFormat = d3.format(",");

// ensure UI initial active states synced
d3.select("#btn-line").classed("active", true);
d3.select("#btn-stacked").classed("active", false);

// load data
d3.csv("data/visualisation3.csv").then(raw => {
  raw.forEach(d => {
    d.YEAR = +d.YEAR;
    d.Camera_Issued = +d.Camera_Issued;
    d.Police_Issued = +d.Police_Issued;
  });

  // sort ascending by year
  dataAll = raw.sort((a,b) => a.YEAR - b.YEAR);

  // initial draw
  draw();
}).catch(err => {
  console.error("Failed loading data:", err);
  container.append("div").text("Failed to load data/visualisation3.csv");
});

function draw() {
  // filter series status and build plotData
  const plotData = dataAll.map(d => {
    const rawCam = d.Camera_Issued;
    const rawPol = d.Police_Issued;
    const rawTotal = rawCam + rawPol; // ALWAYS use this as denominator for percent mode

    // compute values to plot:
    // - when percentMode: compute percentage = raw / rawTotal (rawTotal could be 0 -> handle)
    // - when absolute mode: show raw value only if the series is toggled on; otherwise 0
    const Camera = percentMode ? (rawTotal ? rawCam / rawTotal : 0) : (showCamera ? rawCam : 0);
    const Police = percentMode ? (rawTotal ? rawPol / rawTotal : 0) : (showPolice ? rawPol : 0);

    // Keep raw total for stacked absolute y-domain computation
    return {
      YEAR: d.YEAR,
      Camera: Camera,
      Police: Police,
      rawCam,
      rawPol,
      totalRaw: rawTotal
    };
  });

  // x domain
  x.domain(d3.extent(plotData, d => d.YEAR));

  // y domain
  if (percentMode) {
    y.domain([0, 1]);
  } else if (mode === "stacked") {
    const maxSum = d3.max(plotData, d => d.Camera + d.Police);
    y.domain([0, maxSum ? maxSum * 1.05 : 1]);
  } else { // line & absolute
    const maxVal = d3.max(plotData, d => Math.max(d.Camera, d.Police));
    y.domain([0, (maxVal || 1) * 1.05]);
  }

  // draw axes
  gx.transition().call(d3.axisBottom(x).ticks(plotData.length).tickFormat(d3.format("d")));
  gy.transition().call(d3.axisLeft(y).tickFormat(d => percentMode ? (d * 100) + "%" : numFormat(d)));

  // clear layers
  layer.selectAll("*").remove();
  linesG.selectAll("*").remove();
  legendG.selectAll("*").remove();

  // ---------- stacked area ----------
  if (mode === "stacked") {
    const stackKeys = ["Camera", "Police"];
    const stack = d3.stack().keys(stackKeys);
    const stacked = stack(plotData);

    const area = d3.area()
      .x(d => x(d.data.YEAR))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]));

    layer.selectAll(".area")
      .data(stacked)
      .enter()
      .append("path")
      .attr("class", "area")
      .attr("fill", d => color(d.key))
      .attr("opacity", 0.95)
      .attr("d", area);

    // draw legend
    drawLegend(["Camera", "Police"]);
  }

  // ---------- multi-line ----------
  if (mode === "line") {
    const lineGen = d3.line()
      .x(d => x(d.YEAR))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    ["Camera","Police"].forEach(key => {
      // skip drawing a series entirely if in absolute (non-percent) mode and it's toggled off
      if (!percentMode && ((key === "Camera" && !showCamera) || (key === "Police" && !showPolice))) return;

      const series = plotData.map(d => ({ YEAR: d.YEAR, value: d[key] }));
      linesG.append("path")
        .datum(series)
        .attr("class", "q3-line")
        .attr("d", lineGen)
        .attr("fill", "none")
        .attr("stroke", color(key))
        .attr("stroke-width", 2.5)
        .attr("opacity", 0.95);

      // dots for hover (only for visible points)
      linesG.selectAll(`.dot-${key}`)
        .data(series)
        .enter()
        .append("circle")
        .attr("class", `q3-dot dot-${key}`)
        .attr("cx", d => x(d.YEAR))
        .attr("cy", d => y(d.value))
        .attr("r", 3.5)
        .attr("fill", color(key))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);
    });

    drawLegend(["Camera","Police"]);
  }

  // ------ interactive overlay / tooltip handling ------
  const bisect = d3.bisector(d => d.YEAR).left;

  g.select(".q3-overlay")
    .on("mousemove", function (event) {
      const [mx, my] = d3.pointer(event, this);
      const x0 = x.invert(mx);
      let i = bisect(plotData, x0);
      // bisector returns insertion index; choose nearest actual index
      if (i > 0 && i < plotData.length) {
        const a = plotData[i - 1], b = plotData[i];
        i = (Math.abs(x0 - a.YEAR) <= Math.abs(b.YEAR - x0)) ? i - 1 : i;
      } else if (i >= plotData.length) {
        i = plotData.length - 1;
      } else {
        i = 0;
      }
      const dL = plotData[i];

      // vertical line
      vline.attr("x1", x(dL.YEAR)).attr("x2", x(dL.YEAR)).attr("y1", 0).attr("y2", height).style("opacity", 1);

      // build tooltip text
      const year = dL.YEAR;
      const cam = percentMode ? (dL.Camera * 100).toFixed(1) + "%" : numFormat(Math.round(dL.Camera));
      const pol = percentMode ? (dL.Police * 100).toFixed(1) + "%" : numFormat(Math.round(dL.Police));
      const html = `<strong style="font-size:15px">${year}</strong><br>
                    <span style="color:${color("Camera")}">●</span> Camera: ${cam}<br>
                    <span style="color:${color("Police")}">●</span> Police: ${pol}`;

      tooltip.html(html)
        .style("left", (event.pageX + 14) + "px")
        .style("top", (event.pageY - 12) + "px")
        .style("opacity", 1);
    })
    .on("mouseleave", function () {
      tooltip.style("opacity", 0);
      vline.style("opacity", 0);
    });

  // helper: draw legend with click toggles
  function drawLegend(keys) {
    const spacing = 24;
    keys.forEach((k, i) => {
      const gLeg = legendG.append("g").attr("transform", `translate(0, ${i * spacing})`).attr("class", `legend-${k}`);
      gLeg.append("rect")
        .attr("width", 14).attr("height", 14)
        .attr("rx", 3).attr("ry", 3)
        .attr("fill", color(k))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .on("click", () => {
          // clicking legend toggles series only when not percentMode
          if (percentMode) return;
          if (k === "Camera") showCamera = !showCamera;
          if (k === "Police") showPolice = !showPolice;
          // sync checkboxes UI
          d3.select("#filter-camera").property("checked", showCamera);
          d3.select("#filter-police").property("checked", showPolice);
          draw();
        });

      gLeg.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(k)
        .attr("fill", "#111")
        .style("font-size", "13px")
        .style("cursor", "pointer")
        .on("click", () => {
          if (percentMode) return;
          if (k === "Camera") showCamera = !showCamera;
          if (k === "Police") showPolice = !showPolice;
          d3.select("#filter-camera").property("checked", showCamera);
          d3.select("#filter-police").property("checked", showPolice);
          draw();
        });
    });
  }
}

// UI bindings
d3.select("#btn-line").on("click", () => {
  mode = "line";
  d3.selectAll(".q3-view-btn").classed("active", false);
  d3.select("#btn-line").classed("active", true);
  draw();
});
d3.select("#btn-stacked").on("click", () => {
  mode = "stacked";
  d3.selectAll(".q3-view-btn").classed("active", false);
  d3.select("#btn-stacked").classed("active", true);
  draw();
});

// percent mode checkbox: when enabled, force both series visible and disable toggles
d3.select("#percentMode").on("change", function() {
  const checked = this.checked;
  percentMode = checked;

  if (percentMode) {
    // save previous states
    prevShowCamera = showCamera;
    prevShowPolice = showPolice;
    showCamera = true;
    showPolice = true;
    // disable checkboxes (prevent user confusion)
    d3.select("#filter-camera").property("disabled", true).property("checked", true);
    d3.select("#filter-police").property("disabled", true).property("checked", true);
  } else {
    // restore previous states
    showCamera = prevShowCamera;
    showPolice = prevShowPolice;
    d3.select("#filter-camera").property("disabled", false).property("checked", showCamera);
    d3.select("#filter-police").property("disabled", false).property("checked", showPolice);
  }

  draw();
});

// checkboxes for toggling series (only active when not percentMode)
d3.select("#filter-camera").on("change", function() {
  // if percentMode is on, ignore (should be disabled anyway)
  if (percentMode) {
    d3.select(this).property("checked", true);
    return;
  }
  showCamera = this.checked;
  draw();
});
d3.select("#filter-police").on("change", function() {
  if (percentMode) {
    d3.select(this).property("checked", true);
    return;
  }
  showPolice = this.checked;
  draw();
});

// redraw on window resize (basic)
window.addEventListener("resize", () => {
  const newW = Math.min(1100, container.node().getBoundingClientRect().width || 980);
  // simple strategy: if width changed a lot reload so viewBox/scales recalc
  if (Math.abs(newW - WIDTH) > 60) location.reload();
});
