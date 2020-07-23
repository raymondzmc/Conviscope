Promise.all([
  d3.json('resources/ConvexJSON/omega_2.json'),
  d3.json('resources/ConvexJSON/omega_3.json'),
  d3.json('resources/ConvexJSON/omega_4.json')
]).then(files => {
  let conversations = [];

  files.forEach(f => {
    f.children.forEach(c => {
      conversations.push(c);
    })
  })

  let numTopics = 25;
  let numFocused = 50;

  let analysis = new ConvAnalysis({
    parentElement: "#main",
    numTopics: numTopics,
    numFocused: numFocused
  })

  let sentiments = [[], [], [], [], []];
  let prev = 0;


  // Sort by datetime ascending
  conversations.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  conversations.forEach((d, i) => {

    d.sentHeight = Array(5).fill(0); // The start and end y-value of each sentiment sub-bar
    d.topicHeatmap = Array(numTopics).fill(0); // The topical heatmap grids that activates
    d.sentTotal = 0; // Total number of messages in the conversation
    d.sent.forEach(s => {
      d.sentHeight[analysis.sentimentBin(s.linePolarity)]++;
      d.sentTotal++;
    })
    prev = 0;
    d.sentHeight.forEach((width, j) => {
      curr = prev + width / d.sentTotal;
      sentiments[j].push([prev, curr]);
      prev = curr;
    })
    d.systemtopicid.forEach((topicIndex, j) => {
      d.topicHeatmap[topicIndex] = 1;
    })
  })

  // Assign values and update the visualization
  analysis.data = conversations;
  analysis.updateVis();
})