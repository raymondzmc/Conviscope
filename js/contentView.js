export class ContentView {
  constructor(_config) {

    // TODO: Make height/width relative to the screen size
    this.config = {
      parentElement: _config.parentElement,
      margin: { top: 50, bottom: 50, right: 10, left: 10 }
    }

    this.initVis();
  }

  initVis() {
    let vis = this;
    vis.container = d3.select(vis.config.parentElement)
      .append('ol')
      .attr('class', 'conv-list');
  }

  updateVis() {
    let vis = this;

    let conv = vis.container.selectAll('li > ol').data(vis.data);
    let convEnter = conv.enter()
      .append('li')
      .attr('id', d => `${d.title}-content`)
      .attr('class', 'conv-list-item')
      .append('ol')
      .attr('class', 'msg-list');


    let msg = conv.merge(convEnter).selectAll('li').data(d => d.text);

    // Should probably clean this to avoid XSS attacks
    let msgEnter = msg.enter()
      .append('li')
      .attr('class', 'msg-list-item')
      .html(d => d);
    console.log(vis.data);
  }
}