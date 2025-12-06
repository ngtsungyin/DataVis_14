// visualisation4.js — updated for: no-year control; bar-only / pie-only switching;
// pie = full-year distribution (ignores age checkboxes); pie legend shows color+value+%
// Keep file at: js/visualisation4.js

const BAR_TARGET = "#barChart";
const PIE_TARGET = "#pieChart";
const AGE_CHECKBOX_CONTAINER = "#q4-age-checkboxes";

// colour mapping for age groups
const colorMap = {
  "0-16": "#7FB069",
  "17-25": "#F4A261",
  "26-39": "#E76F51",
  "40-64": "#9B2C2C",
  "65 and over": "#A66DA6"
};
const defaultColor = "#6FA8DC";

// tooltip
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "dv-tooltip")
  .style("position", "absolute")
  .style("background", "#fff")
  .style("padding", "10px")
  .style("border-radius", "8px")
  .style("box-shadow", "0 8px 30px rgba(0,0,0,0.12)")
  .style("pointer-events", "none")
  .style("display", "none")
  .style("font-size", "14px");

// load CSV
d3.csv("data/visualisation4.csv").then(raw => {

  const cols = raw.columns.map(c => c.toLowerCase());
  const has2023 = cols.some(c => c.includes("2023"));
  const has2024 = cols.some(c => c.includes("2024"));
  const hasYear = cols.includes("year");
  const hasTotal = cols.some(c => c.includes("total")) || cols.includes("total_fines");

  const yearMap = { "2023": [], "2024": [] };

  if (has2023 || has2024) {
    raw.forEach(r => {
      const age = r.AGE_GROUP || r.Age || r.age_group || r.age;
      const v2023 = +(r.Fines_2023 ?? r["2023"] ?? r.fines_2023 ?? 0);
      const v2024 = +(r.Fines_2024 ?? r["2024"] ?? r.fines_2024 ?? 0);
      if (age) {
        yearMap["2023"].push({ AGE_GROUP: age, value: v2023 });
        yearMap["2024"].push({ AGE_GROUP: age, value: v2024 });
      }
    });

  } else if (hasYear && hasTotal) {

    const agg = {};
    raw.forEach(r => {
      const age = r.AGE_GROUP || r.Age || r.age_group || r.age;
      const yr = String(r.YEAR || r.year || r.Year || "");
      const val = +(r.Total_Fines || r.total_fines || r.Total || r.TotalFines || 0);
      if (!age || !yr) return;
      agg[yr] = agg[yr] || {};
      agg[yr][age] = (agg[yr][age] || 0) + val;
    });

    ["2023","2024"].forEach(yr => {
      if (agg[yr]) {
        for (const age in agg[yr]) yearMap[yr].push({ AGE_GROUP: age, value: agg[yr][age] });
      }
    });

  } else if (hasTotal) {
    raw.forEach(r => {
      const age = r.AGE_GROUP || r.Age || r.age_group || r.age;
      const val = +(r.Total_Fines || r.total_fines || r.Total || r.TotalFines || 0);
      if (age) yearMap["2023"].push({ AGE_GROUP: age, value: val });
    });

  } else {
    raw.forEach(r => {
      const age = r.AGE_GROUP || r.Age || r.age_group || r.age;
      const numericCols = raw.columns.filter(c => !["AGE_GROUP","Age","age_group","age"].includes(c));
      const v = numericCols.length ? +r[numericCols[0]] : 0;
      if (age) yearMap["2023"].push({ AGE_GROUP: age, value: v });
    });
  }

  // normalise age groups
  const ageSet = new Set();
  Object.values(yearMap).forEach(arr => arr.forEach(d => ageSet.add(d.AGE_GROUP)));
  const ageGroups = Array.from(ageSet);

  ["2023","2024"].forEach(yr => {
    const m = new Map(yearMap[yr].map(d => [d.AGE_GROUP, d.value]));
    yearMap[yr] = ageGroups.map(age => ({ AGE_GROUP: age, value: m.get(age) || 0 }));
  });

  // build checkboxes
  const cbContainer = d3.select(AGE_CHECKBOX_CONTAINER);
  ageGroups.forEach(age => {
    const id = `q4-age-${age.replace(/\s+/g,'_')}`;
    const label = cbContainer.append("label").attr("class","q3-pill").style("margin-right","8px");
    label.append("input")
      .attr("type","checkbox")
      .attr("id", id)
      .property("checked", true);
    label.append("span").text(" " + age);
  });

  let selectedAges = new Set(ageGroups);
  let currentView = "bar";
  const defaultBarYear = "2023";

  ageGroups.forEach(age => {
    const id = `q4-age-${age.replace(/\s+/g,'_')}`;
    d3.select(`#${CSS.escape(id)}`).on("change", function() {
      if (this.checked) selectedAges.add(age);
      else selectedAges.delete(age);
      if (currentView === "bar") updateBar();
    });
  });

  d3.select("#q4-btn-bar").on("click", () => {
    currentView = "bar";
    d3.selectAll(".q3-view-btn").classed("active", false);
    d3.select("#q4-btn-bar").classed("active", true);

    d3.select("#barChart").style("display","block");
    d3.select("#pieChart").style("display","none");

    enableAgeCheckboxes(true);
    updateBar();
  });

  d3.select("#q4-btn-pie").on("click", () => {
    currentView = "pie";
    d3.selectAll(".q3-view-btn").classed("active", false);
    d3.select("#q4-btn-pie").classed("active", true);

    d3.select("#barChart").style("display","none");
    d3.select("#pieChart").style("display","block");

    enableAgeCheckboxes(false);
    updatePie();
  });

  function enableAgeCheckboxes(enabled) {
    ageGroups.forEach(age => {
      const id = `q4-age-${age.replace(/\s+/g,'_')}`;
      d3.select(`#${CSS.escape(id)}`).property("disabled", !enabled);
      d3.select(`#${CSS.escape(id)}`).node().parentElement.style.opacity = enabled ? 1 : 0.55;
    });
  }

  drawBarChart(yearMap[defaultBarYear]);
  drawPieChart(combineAllYearsForPie(yearMap));
  d3.select("#q4-btn-bar").dispatch("click");

  function combineAllYearsForPie(yearMap) {
    const totals = {};
    Object.keys(yearMap).forEach(yr => {
      yearMap[yr].forEach(d => totals[d.AGE_GROUP] = (totals[d.AGE_GROUP] || 0) + d.value);
    });
    return ageGroups.map(age => ({ AGE_GROUP: age, value: totals[age] || 0 }));
  }

  function updateBar() {
    const data = yearMap[defaultBarYear] || [];
    drawBarChart(data);
  }

  function updatePie() {
    const data = combineAllYearsForPie(yearMap);
    drawPieChart(data);
  }

  // -------------------------------------------------------
  // BAR CHART (ENLARGED VERSION)
  // -------------------------------------------------------
  function drawBarChart(dataForYear) {
    d3.select(BAR_TARGET).selectAll("*").remove();

    const filtered = dataForYear.filter(d => selectedAges.has(d.AGE_GROUP));

    const margin = { top: 28, right: 20, bottom: 120, left: 80 };
    const width = 820 - margin.left - margin.right;     // ← enlarged width
    const height = 520 - margin.top - margin.bottom;    // ← enlarged height

    const svgBar = d3.select(BAR_TARGET)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom + 80)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(filtered.map(d => d.AGE_GROUP))
      .range([0, width]).padding(0.28);

    const y = d3.scaleLinear()
      .domain([0, d3.max(filtered, d => d.value) || 1])
      .range([height, 0]).nice();

    svgBar.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svgBar.append("g")
      .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));

    svgBar.selectAll("rect")
  .data(filtered)
  .enter()
  .append("rect")
  .attr("x", d => x(d.AGE_GROUP))
  .attr("width", x.bandwidth())
  .attr("y", d => y(d.value))
  .attr("height", d => height - y(d.value))
  .attr("fill", d => colorMap[d.AGE_GROUP] || defaultColor)
  .style("cursor", "pointer")
  .on("mousemove", (event, d) => {
    tooltip.style("display", "block")
      .html(`<strong>${d.AGE_GROUP}</strong><div style="margin-top:6px">Fines: ${d3.format(",")(d.value)}</div>`)
      .style("left", (event.pageX + 14) + "px")
      .style("top", (event.pageY + 14) + "px");
  })
  .on("mouseout", () => tooltip.style("display","none"));


    svgBar.selectAll(".val-label")
      .data(filtered)
      .enter()
      .append("text")
      .attr("class","val-label")
      .attr("x", d => x(d.AGE_GROUP) + x.bandwidth()/2)
      .attr("y", d => y(d.value) - 8)
      .attr("text-anchor","middle")
      .text(d => d3.format(",")(d.value))
      .style("font-size","12px")
      .style("fill","#333");

      // --- X-axis Label ---
svgBar.append("text")
  .attr("class", "q4-x-label")
  .attr("x", width / 2)
  .attr("y", height + 30)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .text("Age Group");

// --- Y-axis Label ---
svgBar.append("text")
  .attr("class", "q4-y-label")
  .attr("transform", `translate(-65, ${height / 2}) rotate(-90)`)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .text("Number of Fines");

// --- Chart Title ---
svgBar.append("text")
  .attr("class", "q4-chart-title")
  .attr("x", width / 2)
  .attr("y", -10)
  .attr("text-anchor", "middle")
  .style("font-size", "18px")
  .style("font-weight", "600")
  .text("Age-group Patterns of Speeding Fines (2023–2024)");

    const legend = svgBar.append("g").attr("transform", `translate(0, ${height + 40})`);
    filtered.forEach((d, i) => {
      const g = legend.append("g").attr("transform", `translate(${i*120},0)`);
      g.append("rect").attr("width",14).attr("height",14).attr("fill", colorMap[d.AGE_GROUP] || defaultColor).attr("rx",3);
      g.append("text").attr("x",18).attr("y",12).text(d.AGE_GROUP).style("font-size","13px");
    });
  }

  // -------------------------------------------------------
  // PIE CHART (unchanged)
  // -------------------------------------------------------
  function drawPieChart(dataFull) {

    d3.select(PIE_TARGET).selectAll("*").remove();

    const total = d3.sum(dataFull, d => d.value) || 1;
    const pieData = dataFull.map(d => ({ AGE_GROUP: d.AGE_GROUP, value: d.value }));

    const w = 360, h = 360, r = Math.min(w,h)/2 - 10;
    const svgPie = d3.select(PIE_TARGET)
      .append("svg")
      .attr("width", w + 40)
      .attr("height", h + 40)
      .append("g")
      .attr("transform", `translate(${(w/2)+20}, ${(h/2)+10})`);

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(0).outerRadius(r);
    const arcLabel = d3.arc().innerRadius(r*0.6).outerRadius(r*0.9);

    const arcs = svgPie.selectAll("arc").data(pie(pieData)).enter();

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", d => colorMap[d.data.AGE_GROUP] || defaultColor)
      .attr("stroke","#fff")
      .attr("stroke-width",1.2)
      .on("mousemove",(event,d)=>{
        const pct = total?((d.data.value/total)*100).toFixed(1)+"%":"0%";
        tooltip.style("display","block")
          .html(`<strong>${d.data.AGE_GROUP}</strong><div style="margin-top:6px">Fines: ${d3.format(",")(d.data.value)} (${pct})</div>`)
          .style("left",(event.pageX+14)+"px")
          .style("top",(event.pageY+14)+"px");
      })
      .on("mouseout",()=>tooltip.style("display","none"));

    arcs.append("text")
      .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
      .attr("text-anchor","middle")
      .style("font-size","12px")
      .style("fill","#fff")
      .style("font-weight","700")
      .text(d=>{
        const pct = total?(d.data.value/total*100):0;
        return d.data.value>0?`${pct.toFixed(1)}%`:"";
      });

    const legend = svgPie.append("g").attr("transform",`translate(${r+20},${-r})`);
    pieData.forEach((d,i)=>{
      const pct = total?((d.value/total)*100).toFixed(1)+"%":"0%";
      const g = legend.append("g").attr("transform",`translate(0,${i*26})`);
      g.append("rect").attr("width",14).attr("height",14).attr("fill",colorMap[d.AGE_GROUP]||defaultColor).attr("rx",2);
      g.append("text").attr("x",18).attr("y",12)
        .text(`${d.AGE_GROUP}`)
        .style("font-size","13px");
    });
  }

}).catch(err=>{
  console.error("Failed to load visualisation4.csv:", err);
  d3.select(BAR_TARGET).append("div").text("Failed to load data/visualisation4.csv");
});
