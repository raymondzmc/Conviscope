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
    this.numFocused = _config.numFocused;
    this.numTopics = _config.numTopics;

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
    vis.config.focusWidth = 0.7 * vis.config.innerWidth;
    vis.config.contextWidth = 0.15 * vis.config.innerWidth;
    vis.config.barHeight = vis.config.containerHeight / 4;

    // Define height s.t. each grid is a square
    vis.config.heatMapHeight = (vis.config.focusWidth / vis.numFocused) * vis.numTopics;
    vis.svgContainer = d3.select(vis.config.parentElement).append("svg")
      .attr("height", vis.config.containerHeight)
      .attr("width", vis.config.containerWidth);
  }

  updateVis() {
    let vis = this;

    vis.numConv = vis.data.length;

    // Use the latest 50 conversations for current view
    vis.focusIndex = {'start': vis.numConv - vis.numFocused, 'end': vis.numConv};
    vis.focusContainer = vis.svgContainer.append('g');
    vis.topicFocusContainer = vis.svgContainer.append('g');
    vis.contextContainer = {
      'left': vis.svgContainer.append('g'),
      'right': vis.svgContainer.append('g')
    }
    vis.topicContextContainer = {
      'left': vis.svgContainer.append('g'),
      'right': vis.svgContainer.append('g')
    }
    vis.renderContext();
    vis.renderFocus();
    vis.renderTopicFocus();
    vis.renderSelector();
    vis.renderTopicContext();
  }


  renderContext() {
    let vis = this;
    let beforeData = vis.data.slice(0, vis.focusIndex.start + 1);
    let afterData = vis.data.slice(vis.focusIndex.end - 1);

    // The starting point of the left and right context
    let contextStart = [
      vis.config.margin.left,
      vis.config.margin.left + 0.85 * vis.config.innerWidth
    ]
    let contextWidth = vis.config.contextWidth;
    let xRangeLeft;
    let xRangeRight;

    let contextMarkWidth = {
      'left': (beforeData.length > 1)? contextWidth / (beforeData.length - 1) : contextWidth,
      'right': (afterData.length > 1)? contextWidth / (afterData.length - 1) : contextWidth
    }

    if (((beforeData.length - 1) * vis.markWidth) < contextWidth) {
      xRangeLeft = [
        contextStart[0] + contextWidth - beforeData.length * vis.markWidth + vis.markWidth,
        contextStart[0] + contextWidth + vis.markWidth
      ];
    } else {
      xRangeLeft = [
        contextStart[0], 
        contextStart[0] + contextWidth + contextMarkWidth.left
      ];
    }

    if (((afterData.length - 1) * vis.markWidth) < contextWidth) {
      xRangeRight = [
        contextStart[1],
        contextStart[1] + (afterData.length * vis.markWidth)
      ];
    } else {
      xRangeRight = [
        contextStart[1],
        contextStart[1] + contextWidth + contextMarkWidth.right
      ];
    }

    let stack = d3.stack()
      .keys([0, 1, 2, 3, 4])
      .value((d, key) => d.sentHeight[key])
      .offset(d3.stackOffsetExpand); // Normalize between 0 and 1

    let stackLeft = stack(beforeData);
    let stackRight = stack(afterData);


    // Define the x-scale for left and right context
    const xScaleLeft = d3.scaleBand()
      .domain(beforeData.map(d => d.title))
      .range(xRangeLeft);

    // console.log(`Context Range Left: ${contextStart[0]}, ${contextStart[0] + contextWidth}`)

    const xScaleRight = d3.scaleBand()
      .domain(afterData.map(d => d.title))
      .range(xRangeRight);

    // console.log(`Context Range Right: ${contextStart[1]}, ${contextStart[1] + contextWidth}`)

    const height = vis.config.barHeight;
    const yScale = d3.scaleLinear()
      .range([0, height]);

    let areaLeft = d3.area()
      .x(d => xScaleLeft(d.data.title))
      // .x1(d => xScaleLeft(d.data.title) + vis.markWidth / 2)
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveStepAfter);

    // areaLeft = areaLeft.curve(d3.curveLinear())
    // console.log(areaLeft)
    // console.log(areaLeft.curve());


    let areaRight = d3.area()
      .x(d => xScaleRight(d.data.title))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveStepBefore);

    let subgroups = ["sent0", "sent1", "sent2", "sent3", "sent4"];
    const colorScale = d3.scaleOrdinal()
      .domain(subgroups)
      .range(['#7d57bd','#aaa3cd','#f0f0f0', '#fdb863', '#e66101'])

    let pathLeft = vis.contextContainer.left.selectAll('path').data(stackLeft);
    let pathRight = vis.contextContainer.right.selectAll('path').data(stackRight);

    let pathLeftEnter = pathLeft.enter()
      .append('path')
      .merge(pathLeft)
        .attr('fill', d => colorScale(d.key))
        .attr('d', areaLeft);

    let pathRightEnter = pathRight.enter()
      .append('path')
      .merge(pathRight)
        .attr('fill', d => colorScale(d.key))
        .attr('d', areaRight);

  }

  renderFocus() {
    let vis = this;
    let data = vis.data.slice(vis.focusIndex.start, vis.focusIndex.end);

    let subgroups = ["sent0", "sent1", "sent2", "sent3", "sent4"];

    // Define stack for different sentiments
    let stack = d3.stack()
      .keys([0, 1, 2, 3, 4])
      .value((d, key) => d.sentHeight[key])
      .order(d3.stackOrderNone);

    let stackedData = stack(data);
    stackedData = stackedData[0].map((_, colIndex) =>
      stackedData.map((row) => row[colIndex])
    );

    let xRange = [
      vis.config.margin.left + vis.config.contextWidth,
      vis.config.margin.left + vis.config.contextWidth + vis.config.focusWidth
    ]

    // Define scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.title))
      .range(xRange)
      .padding(0.05);

    const yScale = d3.scaleLinear()
      .range([0, vis.config.barHeight]);

    const colorScale = d3.scaleOrdinal()
      .domain(subgroups)
      .range(['#7d57bd','#aaa3cd','#f0f0f0', '#fdb863', '#e66101'])

    // Draw SVG
    let cols = vis.focusContainer.selectAll('g').data(stackedData);
    let colsEnter = cols.enter()
      .append("g")
      .attr('transform', d => `translate(${xScale(d[0].data.title)}, 0)`);

    let rect = colsEnter.merge(cols).selectAll('rect').data(d => d);
    let rectEnter = rect.enter();

    rectEnter
      .append('rect')
      .merge(rect)
      .attr("class", "sentiment-bar")
      .attr("height", d => yScale((d[1] - d[0]) / d.data.sentTotal))
      .attr("width", xScale.bandwidth())
      .attr("y", d => yScale(d[0] / d.data.sentTotal))
      .attr('fill', (d, i) => colorScale(i));
  }

  renderTopicFocus() {
    let vis = this;
    let data = vis.data.slice(vis.focusIndex.start, vis.focusIndex.end);

    let xRange = [
      vis.config.margin.left + vis.config.contextWidth,
      vis.config.margin.left + vis.config.contextWidth + vis.config.focusWidth
    ]

    let yRange = [
      vis.config.barHeight,
      vis.config.barHeight + vis.config.heatMapHeight
    ]

    const xScale = d3.scaleBand()
      .domain(data.map(d => d.title))
      .range(xRange)
      .padding(0.05);

    vis.markWidth = xScale.bandwidth();

    const yScale = d3.scaleBand()
      .domain(Array.from(Array(vis.numTopics).keys()))
      .range(yRange)
      .padding(0.05);

    const colorScale = d3.scaleOrdinal()
      .domain([0, 1])
      .range(['#ffffff', '#000000']);

    let cols = vis.topicFocusContainer.selectAll('g').data(data);
    let colsEnter = cols.enter()
      .append("g")
      .attr('transform', d => `translate(${xScale(d.title)}, 0)`);

    let rect = colsEnter.merge(cols).selectAll('rect').data(d => d.topicHeatmap);
    let rectEnter = rect.enter();
    rectEnter
      .append('rect')
      .merge(rect)
      .attr("class", "topic-grid")
      .attr("height", yScale.bandwidth())
      .attr("width", xScale.bandwidth())
      .attr("y", (d, i) => yScale(i))
      .attr('fill', d => colorScale(d));
  }

  renderTopicContext() {
    let vis = this;
    let beforeData = vis.data.slice(0, vis.focusIndex.start);
    let afterData = vis.data.slice(vis.focusIndex.end);


    // The starting point of the left and right context
    let contextStart = [
      vis.config.margin.left,
      vis.config.margin.left + 0.85 * vis.config.innerWidth
    ]
    let contextWidth = vis.config.contextWidth;
    let xRangeLeft;
    let xRangeRight;

    if ((beforeData.length * vis.markWidth) < contextWidth) {
      xRangeLeft = [
        contextStart[0] + contextWidth - beforeData.length * vis.markWidth,
        contextStart[0] + contextWidth
      ];
    } else {
      xRangeLeft = [contextStart[0], contextStart[0] + contextWidth];
    }

    if ((afterData.length * vis.markWidth) < contextWidth) {
      xRangeRight = [
        contextStart[1],
        contextStart[1] + (afterData.length * vis.markWidth)
      ];
    } else {
      xRangeRight = [contextStart[1], contextStart[1] + contextWidth];
    }


    // let stack = d3.stack()
    //   .keys([0, 1, 2, 3, 4])
    //   .value((d, key) => d.sentHeight[key])
    //   .offset(d3.stackOffsetExpand); // Normalize between 0 and 1

    // let stackLeft = stack(beforeData);
    // let stackRight = stack(afterData);

    let yRange = [
      vis.config.barHeight,
      vis.config.barHeight + vis.config.heatMapHeight
    ]

    const xScaleLeft = d3.scaleBand()
      .domain(beforeData.map(d => d.title))
      .range(xRangeLeft);

    const xScaleRight = d3.scaleBand()
      .domain(afterData.map(d => d.title))
      .range(xRangeRight);

    const yScale = d3.scaleBand()
      .domain(Array.from(Array(vis.numTopics).keys()))
      .range(yRange)
      .padding(0.05);

    const colorScale = d3.scaleOrdinal()
      .domain([0, 1])
      .range(['#ffffff', '#000000']);

    let colsLeft = vis.topicContextContainer.left.selectAll('g').data(beforeData);
    let colsRight = vis.topicContextContainer.right.selectAll('g').data(afterData);
    let colsLeftEnter = colsLeft.enter()
      .append("g");
    let colsRightEnter = colsRight.enter()
      .append("g");

    colsLeft.merge(colsLeftEnter)
      .attr('transform', d => `translate(${xScaleLeft(d.title)}, 0)`);
    colsRight.merge(colsRightEnter)
      .attr('transform', d => `translate(${xScaleRight(d.title)}, 0)`);

    let rectLeft = colsLeftEnter.merge(colsLeft).selectAll('rect').data(d => d.topicHeatmap);
    let rectRight = colsRightEnter.merge(colsRight).selectAll('rect').data(d => d.topicHeatmap);

    let rectLeftEnter = rectLeft.enter();
    let rectRightEnter = rectRight.enter();

    rectLeftEnter
      .append('rect')
      .merge(rectLeft)
      .attr("height", yScale.bandwidth())
      .attr("width", xScaleLeft.bandwidth())
      .attr("y", (d, i) => yScale(i))
      .attr('fill', d => colorScale(d));

    rectRightEnter
      .append('rect')
      .merge(rectRight)
      .attr("height", yScale.bandwidth())
      .attr("width", xScaleRight.bandwidth())
      .attr("y", (d, i) => yScale(i))
      .attr('fill', d => colorScale(d));

    colsLeft.exit().remove();
    colsRight.exit().remove();
    rectLeft.exit().remove();
    rectRight.exit().remove()



    // Define the x-scale for left and right context
    // const xScaleLeft = d3.scaleBand()
    //   .domain(beforeData.map(d => d.title))
    //   .range([contextStart[0], contextStart[0] + contextWidth]);

    // console.log(`Context Range Left: ${contextStart[0]}, ${contextStart[0] + contextWidth}`)

    // const xScaleRight = d3.scaleBand()
    //   .domain(afterData.map(d => d.title))
    //   .range([contextStart[1], contextStart[1] + contextWidth]);

    // console.log(`Context Range Right: ${contextStart[1]}, ${contextStart[1] + contextWidth}`)

    // const height = vis.config.barHeight;
    // const yScale = d3.scaleLinear()
    //   .range([0, height]);

    // let areaLeft = d3.area()
    //   .x(d => xScaleLeft(d.data.title))
    //   .y0(d => yScale(d[0]))
    //   .y1(d => yScale(d[1]));

    // let areaRight = d3.area()
    //   .x(d => xScaleRight(d.data.title))
    //   .y0(d => yScale(d[0]))
    //   .y1(d => yScale(d[1]));

    // let subgroups = ["sent0", "sent1", "sent2", "sent3", "sent4"];
    // const colorScale = d3.scaleOrdinal()
    //   .domain(subgroups)
    //   .range(['#7d57bd','#aaa3cd','#f0f0f0', '#fdb863', '#e66101'])

    // let pathLeft = vis.contextContainer.left.selectAll('path').data(stackLeft);
    // let pathRight = vis.contextContainer.right.selectAll('path').data(stackRight);

    // let pathLeftEnter = pathLeft.enter()
    //   .append('path')
    //   .merge(pathLeft)
    //     .attr('fill', d => colorScale(d.key))
    //     .attr('d', areaLeft);

    // let pathRightEnter = pathRight.enter()
    //   .append('path')
    //   .merge(pathRight)
    //     .attr('fill', d => colorScale(d.key))
    //     .attr('d', areaRight);

  }
  renderSelector() {
    let vis = this;

    let xRange = [
      vis.config.margin.left + vis.config.contextWidth,
      vis.config.margin.left + vis.config.contextWidth + vis.config.focusWidth
    ]
    let xScale = d3.scaleLinear().range([0, vis.config.focusWidth]);
    let selectorWidth = xScale(vis.numFocused / vis.numConv);

    const drag = () => {
      let dx = xRange[0] + (vis.config.focusWidth - selectorWidth / 2);
      let selectRange = [selectorWidth - vis.config.focusWidth, 0];
      let xValue = d3.event.x - dx;
      if (xValue < selectRange[0]) {
        xValue = selectRange[0];
      } else if (xValue > selectRange[1]) {
        xValue = selectRange[1];
      }

      d3.select('.scroll-selector').attr('x', xValue);

      let dataScale = d3.scaleLinear()
        .domain([selectRange[0], selectRange[1]])
        .range([vis.numFocused, vis.numConv]);


      let endIndex = Math.round(dataScale(xValue));
      let startIndex = endIndex - vis.numFocused;

      if (startIndex != vis.focusIndex.start && endIndex != vis.focusIndex.end){
        vis.focusIndex = {'start': endIndex - vis.numFocused, 'end': endIndex};
        vis.renderFocus();
        vis.renderContext();
        vis.renderTopicFocus();
        vis.renderTopicContext();
      }
      
    }


    let selector = vis.svgContainer.append('rect')
      .attr('transform', `translate(${xRange[1] - selectorWidth}, ${vis.config.barHeight + vis.config.heatMapHeight})`)
      .attr('class', 'scroll-selector')
      .attr('width', selectorWidth)
      .attr('height', 30)
      .attr('pointer-events', 'all') // Any part of the element
      .attr('cursor', 'ns-resize') // Bidirectional resize cursor
      .call(d3.drag()
        .on('drag', drag));
  }

}

