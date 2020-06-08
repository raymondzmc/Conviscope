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

  // Sort by datetime ascending
  conversations.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))

  let analysis = new ConvAnalysis({ parentElement: "#main" })
  analysis.data = conversations;
  analysis.updateVis();
})