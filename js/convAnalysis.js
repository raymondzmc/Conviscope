export class ConvAnalysis {
  constructor(_config) {

    let containerWidth = d3.select(_config.parentElement).node().getBoundingClientRect().width;
    let containerHeight = d3.select(_config.parentElement).node().getBoundingClientRect().height;

    // TODO: Make height/width relative to the screen size
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || containerWidth,
      containerHeight: _config.containerHeight || containerHeight,
      margin: { top: 50, bottom: 50, right: 10, left: 10 }
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
    vis.config.barWidth = vis.config.focusWidth / vis.numFocused;

    // Define height s.t. each grid is a square
    vis.config.heatMapHeight = (vis.config.focusWidth / vis.numFocused) * vis.numTopics;
    vis.svgContainer = d3.select(vis.config.parentElement).append("svg")
      .attr('id', 'analysis-view')
      // .attr("preserveAspectRatio", "xMinYMin meet")
      // .attr("viewBox", "0 0 600 400")
      // .classed("svg-content-responsive", true); 
      .attr("height", '90%')
      .attr("width", '100%');
  }

  updateVis() {
    let vis = this;

    vis.numConv = vis.data.length;

    if (vis.numConv > vis.numFocused){

      // Use the latest 50 conversations for current view
      vis.focusIndex = {'start': vis.numConv - vis.numFocused, 'end': vis.numConv};
      vis.renderSelector();
    } else {
      vis.focusIndex = {'start': 0, 'end': vis.numConv};
      vis.config.focusWidth = vis.config.barWidth * vis.numConv;
    }

    
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


    if (((beforeData.length - 1) * vis.config.barWidth) < contextWidth) {
      xRangeLeft = [
        contextStart[0] + contextWidth - beforeData.length * vis.config.barWidth + vis.config.barWidth,
        contextStart[0] + contextWidth + vis.config.barWidth
      ];
    } else {
      xRangeLeft = [
        contextStart[0], 
        contextStart[0] + contextWidth + contextMarkWidth.left
      ];
    }

    if (((afterData.length - 1) * vis.config.barWidth) < contextWidth) {
      xRangeRight = [
        contextStart[1],
        contextStart[1] + (afterData.length * vis.config.barWidth)
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
      .range([vis.config.margin.top, height]);

    let areaLeft = d3.area()
      .x(d => xScaleLeft(d.data.title))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveStepAfter);


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
      .range([vis.config.margin.top, vis.config.barHeight]);

    const colorScale = d3.scaleOrdinal()
      .domain(subgroups)
      .range(['#7d57bd','#aaa3cd','#f0f0f0', '#fdb863', '#e66101'])

    // Draw SVG
    let cols = vis.focusContainer.selectAll('g').data(stackedData);
    let colsEnter = cols.enter()
      .append('g')
      .attr('transform', d => `translate(${xScale(d[0].data.title)}, 0)`);

    // Smooth scroll to the corresponding conversation in content-view
    colsEnter.merge(cols)
      .on('click', (d) => {
        let contentElement = document.getElementById(`${d[0].data.title}-content`);
        let contentView = contentElement.parentNode.parentNode;
        let targetOffset = contentElement.offsetTop - 5;
        let offset = contentView.scrollTop;
        d3.select(`#${contentView.id}`)
          .transition()
          .duration(500)
          .tween('scroll', () => {
            let i = d3.interpolateNumber(offset, targetOffset);
            return t => {
              contentView.scrollTop = i(t);
            }
          })
      });

    let rect = colsEnter.merge(cols).selectAll('rect').data(d => d);
    let rectEnter = rect.enter();

    rectEnter
      .append('rect')
      .merge(rect)
      .attr("class", "sentiment-bar")
      .attr("height", d => yScale((d[1] - d[0]) / d.data.sentTotal))
      .attr("width", vis.config.barWidth)
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
      .attr("width", vis.config.barWidth)
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

    if ((beforeData.length * vis.config.barWidth) < contextWidth) {
      xRangeLeft = [
        contextStart[0] + contextWidth - beforeData.length * vis.config.barWidth,
        contextStart[0] + contextWidth
      ];
    } else {
      xRangeLeft = [contextStart[0], contextStart[0] + contextWidth];
    }

    if ((afterData.length * vis.config.barWidth) < contextWidth) {
      xRangeRight = [
        contextStart[1],
        contextStart[1] + (afterData.length * vis.config.barWidth)
      ];
    } else {
      xRangeRight = [contextStart[1], contextStart[1] + contextWidth];
    }

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
    rectRight.exit().remove();
  }

  renderSelector() {
    let vis = this;

    const xRange = [
      vis.config.margin.left + vis.config.contextWidth,
      vis.config.margin.left + vis.config.contextWidth + vis.config.focusWidth
    ]
    const xScale = d3.scaleLinear().range([0, vis.config.focusWidth]);
    const brushWidth = xScale(vis.numFocused / vis.numConv);
    const brushHeight = 30;

    const yRange = [
      vis.config.barHeight + vis.config.heatMapHeight,
      vis.config.barHeight + vis.config.heatMapHeight + brushHeight
    ]

    // Essentially rerender the entire view when the brush is activated
    const renderView = (x0, x1) => {
      const scale = d3.scaleLinear()
        .domain(xRange)
        .range([0, vis.numConv]);

      let startIndex = Math.round(scale(x0));
      let endIndex = Math.round(scale(x1));
      let numFocused = endIndex - startIndex;

      if (startIndex != vis.focusIndex.start && endIndex != vis.focusIndex.end && numFocused === vis.numFocused){
        vis.focusIndex = {'start': startIndex, 'end': endIndex};
        vis.renderFocus();
        vis.renderContext();
        vis.renderTopicFocus();
        vis.renderTopicContext();
      }

    }

    // Move the brush to the corresponding location when clicking the overlay
    const beforebrushstarted = () => {
      const cx = d3.mouse(d3.event.currentTarget)[0];
      const [x0, x1] = [cx - brushWidth / 2, cx + brushWidth / 2];

      d3.select('#scroll-bar')
          .call(brush.move, x1 > xRange[1] ? [xRange[1] - brushWidth, xRange[1]] 
              : x0 < xRange[0] ? [xRange[0], xRange[0] + brushWidth] 
              : [x0, x1]);
      renderView(x0, x1)
    }

    // Re-render the view when brush is activated
    const brushed = () => {
      const selection = d3.event.selection;
      let [x0, x1] = selection;
      renderView(x0, x1)
    }

    // Create the brush object
    const brush = d3.brushX()
      .extent([[xRange[0], yRange[0]], [xRange[1], yRange[1]]])
      .on('start brush end', brushed);

    // Bind the brush to the group object
    vis.svgContainer.append('g')
      .attr('id', 'scroll-bar')
      .call(brush)
      .call(brush.move, [xRange[1] - brushWidth, xRange[1]])
      .call(g => g.select(".overlay")
          .datum({type: "selection"})
          .on("mousedown touchstart", beforebrushstarted));


    // Remove resize handles
    d3.selectAll('#scroll-bar>.handle').remove();
    // d3.selectAll('#scroll-bar>.overlay').remove();
  }
}

