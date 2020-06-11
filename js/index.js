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

  // Sort by datetime ascending
  conversations.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  conversations.forEach(d => {
    d.sent0 = d.sent1 = d.sent2 = d.sent3 = d.sent4 = d.sentTotal = 0;
    d.sent.forEach(s => {
      d[`sent${analysis.sentimentBin(s.linePolarity)}`]++;
      d.sentTotal++;
    })
  })
  console.log(conversations);
  analysis.data = conversations;
  analysis.updateVis();
})