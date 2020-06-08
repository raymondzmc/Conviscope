class ConvAnalysis {
  constructor(_config) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || screen.width,
      containerHeight: _config.containerHeight || screen.height,
      margin: { top: 10, bottom: 30, right: 10, left: 30 }
    }

    this.initVis();
  }

  initVis() {
    let vis = this;
    vis.config.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;
    vis.config.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.svgContainer = d3.select(vis.config.parentElement).append("svg")
      .attr("height", vis.config.containerHeight)
      .attr("width", vis.config.containerWidth);
  }

  updateVis() {
    let vis = this;
    console.log(vis.data);
    vis.renderVis()
  }

  renderVis() {
    console.log("rendered")
    // draw SVG
    // add code here using vis.config.height?
  }
}