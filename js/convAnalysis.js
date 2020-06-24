class ConvAnalysis {
  constructor(_config) {

    // TODO: Make height/width relative to the screen size
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1920,
      containerHeight: _config.containerHeight || 1080,
      margin: { top: 50, bottom: 50, right: 10, left: 100 }
    }

    // Number of conversations in the focused view
    // TODO: Could be a passed-in parameter
    this.numFocused = 50;

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
    vis.config.innerHeight = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;
    vis.config.innerWidth = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.config.focusHeight = 0.7 * vis.config.innerHeight;
    vis.config.contextHeight = 0.15 * vis.config.innerHeight;
    vis.config.barWidth = vis.config.containerWidth / 4;
    vis.svgContainer = d3.select(vis.config.parentElement).append("svg")
      .attr("height", vis.config.containerHeight)
      .attr("width", vis.config.containerWidth);
  }

  updateVis() {
    let vis = this;

    vis.numConv = vis.focusData.length;

    // Use the latest 50 conversations for current view
    vis.focusIndex = {'start': vis.numConv - vis.numFocused, 'end': vis.numConv};
    vis.focusContainer = vis.svgContainer.append('g');
    vis.contextContainer = {
      'top': vis.svgContainer.append('g'),
      'bottom': vis.svgContainer.append('g')
    }
    vis.renderContext();
    vis.renderFocus();
    vis.renderSelector();
  }


  renderContext() {
    let vis = this;
    let beforeData = vis.focusData.slice(0, vis.focusIndex.start);
    let afterData = vis.focusData.slice(vis.focusIndex.end);

    // The starting height of the top and bottom context
    let contextStart = [
      vis.config.margin.top,
      vis.config.margin.top + 0.85 * vis.config.innerHeight
    ]

    let contextHeight = vis.config.contextHeight;

    let stack = d3.stack()
      .keys([0, 1, 2, 3, 4])
      .value((d, key) => d.sentWidth[key])
      .offset(d3.stackOffsetExpand); // Normalize between 0 and 1

    let stackTop = stack(beforeData);
    let stackBottom = stack(afterData);

    // Define the y-scale for top and bottom context
    const yScaleTop = d3.scaleBand()
      .domain(beforeData.map(d => d.title))
      .range([contextStart[0], contextStart[0] + contextHeight]);

    const yScaleBottom = d3.scaleBand()
      .domain(afterData.map(d => d.title))
      .range([contextStart[1], contextStart[1] + contextHeight]);

    const width = vis.config.barWidth;
    const xScale = d3.scaleLinear()
      .range([0, width]);

    let areaTop = d3.area()
      .y(d => yScaleTop(d.data.title))
      .x0(d => xScale(d[0]))
      .x1(d => xScale(d[1]));

    let areaBottom = d3.area()
      .y(d => yScaleBottom(d.data.title))
      .x0(d => xScale(d[0]))
      .x1(d => xScale(d[1]));

    let subgroups = ["sent0", "sent1", "sent2", "sent3", "sent4"];
    const colorScale = d3.scaleOrdinal()
      .domain(subgroups)
      .range(['#7d57bd','#aaa3cd','#f0f0f0', '#fdb863', '#e66101'])

    let pathTop = vis.contextContainer.top.selectAll('path').data(stackTop);
    let pathBottom = vis.contextContainer.bottom.selectAll('path').data(stackBottom);

    console.log(pathTop);
    let pathTopEnter = pathTop.enter()
      .append('path')
      .merge(pathTop)
        .attr('fill', d => colorScale(d.key))
        .attr('d', areaTop);

    let pathBottomEnter = pathBottom.enter()
      .append('path')
      .merge(pathBottom)
        .attr('fill', d => colorScale(d.key))
        .attr('d', areaBottom);
      // .join('path')
      //   .attr('fill', d => colorScale(d.key))
      //   .attr('d', area);

  }

  renderFocus() {
    let vis = this;
    let data = vis.focusData.slice(vis.focusIndex.start, vis.focusIndex.end);
    console.log("rendering focus");

    let subgroups = ["sent0", "sent1", "sent2", "sent3", "sent4"];

    // Define stack for different sentiments
    let stack = d3.stack()
      .keys([0, 1, 2, 3, 4])
      .value((d, key) => d.sentWidth[key])
      .order(d3.stackOrderNone);

    let stackedData = stack(data);

    stackedData = stackedData[0].map((_, colIndex) =>
      stackedData.map((row) => row[colIndex])
    );

    // console.log(stackedData);

    let yRange = [
      vis.config.margin.top + vis.config.contextHeight,
      vis.config.margin.top + vis.config.contextHeight + vis.config.focusHeight
    ]

    // Define scales
    const yScale = d3.scaleBand()
      .domain(data.map(d => d.title))
      .range(yRange)
      .padding(0.05);

    const xScale = d3.scaleLinear()
      .range([0, vis.config.barWidth]);

    const colorScale = d3.scaleOrdinal()
      .domain(subgroups)
      .range(['#7d57bd','#aaa3cd','#f0f0f0', '#fdb863', '#e66101'])

    // Draw SVG
    let rows = vis.focusContainer.selectAll('g').data(stackedData);
    let rowsEnter = rows.enter()
      .append("g")
      .attr('transform', d => `translate(0, ${yScale(d[0].data.title)})`);

    let rect = rowsEnter.merge(rows).selectAll('rect').data(d => d);
    let rectEnter = rect.enter();

    rectEnter
      .append('rect')
      .merge(rect)
      .attr("class", "sentiment-bar")
      .attr("width", d => xScale((d[1] - d[0]) / d.data.sentTotal))
      .attr("height", yScale.bandwidth())
      .attr("x", d => xScale(d[0] / d.data.sentTotal))
      .attr('fill', (d, i) => colorScale(i));
  }

  renderSelector() {
    let vis = this;

    let yRange = [
      vis.config.margin.top + vis.config.contextHeight,
      vis.config.margin.top + vis.config.contextHeight + vis.config.focusHeight
    ]
    let yScale = d3.scaleLinear().range([0, vis.config.focusHeight]);
    let selectorHeight = yScale(vis.numFocused / vis.numConv);

    const drag = () => {
      let dy = yRange[0] + (vis.config.focusHeight - selectorHeight / 2);
      let selectRange = [selectorHeight - vis.config.focusHeight, 0];
      let yValue = d3.event.y - dy;
      if (yValue < selectRange[0]) {
        yValue = selectRange[0];
      } else if (yValue > selectRange[1]) {
        yValue = selectRange[1];
      }

      d3.select('.scroll-selector').attr('y', yValue);

      let dataScale = d3.scaleLinear()
        .domain([selectRange[0], selectRange[1]])
        .range([vis.numFocused, vis.numConv]);

      let endIndex = Math.round(dataScale(yValue));
      vis.focusIndex = {'start': endIndex - vis.numFocused, 'end': endIndex};
      vis.renderFocus();
      vis.renderContext();
    }

    const end = () => {
      console.log("drag ended");
      
    }

    let selector = vis.svgContainer.append('rect')
      .attr('transform', `translate(${vis.config.barWidth}, ${yRange[1] - selectorHeight})`)
      .attr('class', 'scroll-selector')
      .attr('height', selectorHeight)
      .attr('width', 30)
      .attr('pointer-events', 'all') // Any part of the element
      .attr('cursor', 'ns-resize') // Bidirectional resize cursor
      .call(d3.drag()
        .on('drag', drag));
  }

}

