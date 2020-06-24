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

  let analysis = new ConvAnalysis({ parentElement: "#main" })

  let sentiments = [[], [], [], [], []];
  let prev = 0;

  // Sort by datetime ascending
  conversations.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  conversations.forEach((d, i) => {
    d.sentWidth = Array(5).fill(0);
    d.sentTotal = 0;
    d.sent.forEach(s => {
      d.sentWidth[analysis.sentimentBin(s.linePolarity)]++;
      d.sentTotal++;
    })
    prev = 0;
    d.sentWidth.forEach((width, j) => {
      curr = prev + width / d.sentTotal;
      sentiments[j].push([prev, curr]);
      prev = curr;
    })
  })
  analysis.focusData = conversations;
  analysis.contextData = sentiments;
  analysis.updateVis();
})