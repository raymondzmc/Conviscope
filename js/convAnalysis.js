class ConvAnalysis {
  constructor(_config) {

    // TODO: Make height/width relative to the screen size
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1920,
      containerHeight: _config.containerHeight || 1080,
      margin: { top: 50, bottom: 50, right: 10, left: 30 }
    }

    // Number of conversations in the main view
    // TODO: Could be a passed-in parameter
    this.numConv = 50;

    // Maps line polarity to color bins
    this.sentimentBin = val => {
      if (val <= -2) {
        return 0
      } else if (val < 0) {
        return 1
      } else if (val == 0) {
        return 2
      } else if (val >= 2) {
        return 4
      } else {
        return 3
      }
    }

    this.initVis();
  }

  initVis() {
    let vis = this;
    vis.config.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;
    vis.config.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.svgContainer = d3.select(vis.config.parentElement).append("svg")
      .attr("height", vis.config.height)
      .attr("width", vis.config.width);
  }

  updateVis() {
    let vis = this;

    // Use the latest 50 conversations for current view
    vis.currentView = vis.data.slice(vis.numConv);
    vis.renderVis()
  }

  renderVis() {
    let vis = this;
    let data = vis.currentView;
    console.log("rendering")

    let subgroups = ["sent0", "sent1", "sent2", "sent3", "sent4"];

    // Define stack for different sentiments
    let stack = d3.stack()
      .keys(subgroups)
      .order(d3.stackOrderNone)
    let stackedData = stack(data);

    // Define scales
    const yScale = d3.scaleBand()
      .domain(data.map(d => d.commentid))
      .range([0, vis.config.height])
      .padding(0.05);

    let barWidth = vis.config.width / 8;

    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([barWidth - barWidth/2, barWidth + barWidth/2]);

    const colorScale = d3.scaleOrdinal()
      .domain(subgroups)
      .range(['#7d57bd','#aaa3cd','#f0f0f0', '#fdb863', '#e66101'])

    // draw SVG
    let series = vis.svgContainer.append('g').selectAll("g").data(stackedData);
    let seriesEnter = series.enter()
      .append("g")
      .attr("fill", d => colorScale(d.key));

    let conv = seriesEnter.selectAll(".rect").data(d => d);
    let convEnter = conv.enter();

    console.log(seriesEnter);

    // console.log(yScale.domain);
    convEnter
      .append('rect')
      .attr("class", "sentimentBar")
      .attr("width", d => xScale((d[1] - d[0]) / d.data.sentTotal))
      .attr("height", yScale.bandwidth())
      .attr("x", d => xScale(d[0] / d.data.sentTotal))
      .attr("y", d => yScale(d.data.commentid));
  }
}