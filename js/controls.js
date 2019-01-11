// TODO: Adjust marker-end to path color
// TODO: Fix the hover (looks ugly atm)


// Buttons to toggle between visualization & clustering
$(document).ready(function () {
    /*$("#btnVisualization").click(function () {
        $("#markovChainVisualization").slideDown("slow");
        $("#sequenceClustering").slideUp("slow");
    });
    $("#btnClustering").click(function () {
        $("#markovChainVisualization").slideUp("slow");
        $("#sequenceClustering").slideDown("slow");
    });*/
    $('#minimumProbabilitySlider').on('input', function () {
        var output = document.getElementById("minimumProbabilityValue");
        output.innerHTML = this.value;
    });
    $('#nrClustersSlider').on('input', function () {
        var output = document.getElementById("nrClustersValue");
        output.innerHTML = this.value;
    });
});

function arraysEqual(arr1, arr2) {
    if(arr1.length !== arr2.length)
        return false;
    for(var i = arr1.length; i--;) {
        if(arr1[i] !== arr2[i])
            return false;
    }

    return true;
}

function clusterSessions(sessions, states, nrClusters){

  Math.seedrandom('2018');

  var sortedSessions  = sessions.sort(sortByLength),
      // Discard outliers in terms of session length
      minLength = 4,//sortedSessions[parseInt(0.1*sessions.length)].length,
      maxLength = 12;

  sessions = sessions.filter(x => x.length >= minLength && x.length <= maxLength);

  if(nrClusters == 1) return [sessions];

  var assignment     = [],
      prevAssignment = [],
      markovChains   = [],
      iterations     = 1;

  // Create a markov chain object for each cluster
  for(var c = 0; c < nrClusters; c++){
    markovChains.push(new MarkovChain(states));
  }

  // Assign each session to random cluster as initialization
  for(var i = 0; i < sessions.length; i++){
    var randomCluster = Math.floor(Math.random() * nrClusters);
    assignment.push(randomCluster);
    markovChains[randomCluster].add_session(sessions[i]);
  }

  // Iterate until convergence (no change)
  while(!arraysEqual(assignment, prevAssignment)){
    // TODO: make 100 a user-setting
    // Limit total number of iterations to avoid infinite loop
    if(iterations == 100){
      alert('Could not converge in 100 iterations!');
      break;
    }

    // Assign each session to the markov chain with maximum likelihood
    prevAssignment = jQuery.extend(true, [], assignment);
    var assignment = [];

    for(var i = 0; i < sessions.length; i++){
      var maxProb     = -99999,
          bestCluster = null,
          prob        = null;

      for(var c = 0; c < nrClusters; c++){
        prob = markovChains[c].get_probability(sessions[i]);
        if(prob > maxProb){
          maxProb = prob;
          bestCluster = c;
        }
      }

      assignment.push(bestCluster);
    }

    // Re-calculate markov chains
    markovChains = [];
    for(var c = 0; c < nrClusters; c++){
      markovChains.push(new MarkovChain(states));
    }

    for(var i = 0; i < sessions.length; i++){
      markovChains[assignment[i]].add_session(sessions[i]);
    }

    iterations++;
  }

  // Return the final clusters
  var clusters = [];
  for(var c = 0; c < nrClusters; c++) {
    clusters.push([]);
  }
  for(var i = 0; i < sessions.length; i++){
    clusters[assignment[i]].push(sessions[i]);
  }

  return clusters;

}

function sortByTime(a, b) {
    if (Date.parse(a[3]) === Date.parse(b[3])) {
        return 0;
    }
    else {
        return (Date.parse(a[3]) < Date.parse(b[3])) ? -1 : 1;
    }
}

function sortByLength(a, b) {
    if (a.length === b.length) {
        return 0;
    }
    else {
        return (a.length < b.length) ? -1 : 1;
    }
}

function getStates(data){
  states = new Set(['start']);
  for(var i = 1; i < data.length; i++){
    if(data[i][0] != '') states.add(data[i][0]);
    if(data[i][1] != '') states.add(data[i][1]);
  }
  if(data[0].length > 2){
    states.add('exit');
  }
  return Array.from(states);
}

function createSessions(data){
  var sessions = [];

  // If the data format is `from,to`, then just link each record to a small session
  if(data[0].length == 2){
    sessions = data.slice(1);
    $('#simulationControls').hide();

  // If the data format is 'from,to,session_id,timestamp' then group by session_id and order by timestamp. Also, add start- and exit- states to each session
  } else if(data[0][2] == 'session_id'){
    var actions_per_session = {};

    data = data.slice(1).sort(sortByTime);

    for(var i = 0; i < data.length; i++){
      if(data[i][1] === ''){
        actions_per_session[data[i][2]] = [];
      } else {
        if(!(data[i][2] in actions_per_session)){
          //actions_per_session[data[i][2]] = [data[i][0], data[i][1]];
          actions_per_session[data[i][2]] = [data[i][1]];
        } else {
          actions_per_session[data[i][2]].push(data[i][1]);
        }
      }
    }

    for(var session_id in actions_per_session){
      sessions.push(['start'].concat(actions_per_session[session_id].concat(['exit'])));
    }

  // If the data format is 'from,to,user_id,timestamp' then heuristically calculate the sessions. Also, add start- and exit- states to each session
  } else{
    // TODO
  }
  return sessions;
}

function zeros(dimensions) {
    var array = [];

    for (var i = 0; i < dimensions[0]; ++i) {
        array.push(dimensions.length == 1 ? 0 : zeros(dimensions.slice(1)));
    }

    return array;
}

class MarkovChain {
    constructor(states) {
        this.countMatrix = zeros([states.length, states.length]);
        this.states = states;
        this.initialProbs = zeros([states.length]);

        this.state_to_id = {};
        this.id_to_state = {};
        for(var i = 0; i < states.length; i++){
          this.state_to_id[states[i]] = i;
          this.id_to_state[i] = states[i];
        }

        this.state = this.id_to_state[0];
    }

    add_session(session){
      this.initialProbs[this.state_to_id[session[0]]]++;
      for(var i = 0; i < session.length - 1; i++){
        this.countMatrix[this.state_to_id[session[i]]][this.state_to_id[session[i + 1]]]++;
      }
    }

    get_transition_matrix(){
      var transitionMatrix = zeros([this.states.length, this.states.length]);
      for(var i=0; i<this.states.length; i++){
        var rowSum = 0;
        for(var j=0; j<this.states.length; j++){
          rowSum += this.countMatrix[i][j];
        }
        if(rowSum == 0) rowSum = 1;
        for(var j=0; j<this.states.length; j++){
          transitionMatrix[i][j] = this.countMatrix[i][j] / rowSum;
        }
      }
      return transitionMatrix;
    }


    transition() {
        var weightedList     = [],
            transitionMatrix = this.get_transition_matrix(),
            randIdx;

        for (var i = 0; i < this.states.length; i++) {
          if(transitionMatrix[this.state_to_id[this.state]][i] >= $('#minimumProbabilitySlider').val() && 
             document.getElementById('checkbox_' + this.states[i]).checked){
            for(var j = 0; j < transitionMatrix[this.state_to_id[this.state]][i]*1000; j++){
              weightedList.push(i);
            }
          }
        }

        randIdx = Math.floor(Math.random() * weightedList.length)
        this.state = this.id_to_state[weightedList[randIdx]];
    }

    transitionUnLoaded(){
        var weightedList     = [],
            transitionMatrix = this.get_transition_matrix(),
            randIdx;

        for (var i = 0; i < this.states.length; i++) {
          if(transitionMatrix[this.state_to_id[this.state]][i]){
            for(var j = 0; j < transitionMatrix[this.state_to_id[this.state]][i]*1000; j++){
              weightedList.push(i);
            }
          }
        }

        randIdx = Math.floor(Math.random() * weightedList.length);
        this.state = this.id_to_state[weightedList[randIdx]];
    }

    get_probability(session){
      var transitionMatrix = this.get_transition_matrix();

      if(session[0] == 'start'){
        var prob = 1.0;
      } else {
        var prob = this.initialProbs[this.state_to_id[session[0]]] / this.initialProbs.reduce((a, b) => a + b, 0);
      }
      for(var i = 0; i < session.length - 1; i++){
        prob *= transitionMatrix[this.state_to_id[session[i]]][this.state_to_id[session[i + 1]]];
      }
      return prob;
    }
}

function createColorMap(markovChain){
  var cmap = {};
  for(var i=0; i<markovChain.states.length;i++){
    cmap[markovChain.id_to_state[i]] = d3.interpolateRainbow(i / markovChain.states.length);
  }
  return cmap;
}

function createSequenceMatrix(sessions, cmap, svgId){
  var div = d3.select("body").append("div")   
                           .attr("class", "tooltip")               
                           .style("opacity", 0);

  var svg = d3.select(svgId),
      height = +svg.attr('height');


  if(svgId == '#simulatedSequence'){
    var width = +$('#controlPanelMarkovChain').width();
    if(width <= 0){
      width = +$('#controlPanelClustering').width();
    }
  } else {
    var width = +$('#mcColumn').width();
    if(width <= 0){
      width = +$('#clusteringColumn').width();
    }
  }

  svg.style("width", width + 'px')

  var maxSessions = 0;
  for(var c = 0; c < sessions.length; c++){
    if(sessions[c].length > maxSessions) maxSessions = sessions[c].length;
  }

  var cellHeight = Math.min(height / maxSessions, 50);


  // Iterate over the sessions and create a new object per element of each session
  // Keep track of name, cluster id, session id and the index within the session
  var actions = [];
  var maxLength = 0;
  for(var c = 0; c < sessions.length; c++){
    sessions[c] = sessions[c].sort(sortByLength).reverse();
    for(var i = 0; i < sessions[c].length; i++){
      if(sessions[c][i].length > maxLength) maxLength = sessions[c][i].length;
      for(var j = 0; j < sessions[c][i].length; j++){
        actions.push({'name': sessions[c][i][j], 'cluster': c, 'session': i, 'index': j});
      }
    }
  }
  if(sessions.length > 1) { maxLength++; }

  var uniqueArray = function(arrArg) {
    return arrArg.filter(function(elem, pos,arr) {
      return arr.indexOf(elem) == pos;
    });
  };

  actions = uniqueArray(actions);

  if(sessions.length > 1) {
    var cellWidth = Math.min(width / (sessions.length * maxLength), 50);
  } else{
    var cellWidth = width / (sessions.length * maxLength);
  }
  var clusterWidth = width / sessions.length;

  cellHeight = Math.min(cellHeight, cellWidth);
  cellWidth = Math.min(cellHeight, cellWidth);

  // Create the D3 matrix
  svg.selectAll('.cell')
     .data(actions)
     .enter().append('rect')
             .attr('fill', function(d){ return cmap[d.name]; })
             .attr('width', cellWidth)
             .attr('height', cellHeight)
             .attr('x', function(d){ return clusterWidth * d.cluster + d.index * cellWidth; })
             .attr('y', function(d){ return d.session * cellHeight; })
             .on("mouseover", function(d) {      
                div.transition()        
                    .duration(200)      
                    .style("opacity", .9);      
                div.html(d.name)  
                   .style("left", (d3.event.pageX) + "px")     
                   .style("top", (d3.event.pageY) + "px");    
              })  
              .on("mouseout", function(d) {       
                div.transition()        
                    .duration(500)      
                    .style("opacity", 0);   
              });

}

function createMarkovChain(markovChain, cmap){

  // The SVG itself
  var svg = d3.select('#markovChain'),
      width = $('#mcColumn').width(),
      height = +svg.attr('height');

  svg.style("width", width + 'px')

  // Create a list of node and edges objects in order to pass to our visualization
  nodesData = [];
  edgesData = [];
  var transitionMatrix = markovChain.get_transition_matrix();
  var name_to_node = {}
  for(var i=0; i<markovChain.states.length;i++){
    var node = {};
    node['id'] = markovChain.id_to_state[i];
    node['x'] = (width / (markovChain.states.length + 1)) + i * (width / (markovChain.states.length + 1));
    node['y'] = (Math.floor(i/2)+1)*(height * 2 / (markovChain.states.length + 2));
    node['color'] = cmap[node['id']];
    
    nodesData.push(node);
    
    name_to_node[markovChain.id_to_state[i]] = node;

    for(var j=0; j<markovChain.states.length;j++){
      edgesData.push({'source': markovChain.id_to_state[i], 'target': markovChain.id_to_state[j], 'prob': transitionMatrix[i][j] });
    }
  }

  // Create a checkbox that enables/disables a node in our markov chain
  for(node in nodesData){
      $('#checkboxes').append('<p style="display: inline-block; text-align: left;">'+nodesData[node].id+': </p>')
      $('#checkboxes').append('<input type="checkbox" style="display: inline-block; margin-left: 5px;" checked=true id="checkbox_'+nodesData[node].id+'"/>')
      $('#checkboxes').append('<br/>')
      $('#checkboxes').append("<script>$('#checkbox_"+nodesData[node].id+"').change( function() {\n$('#circle_"+nodesData[node].id+"').toggle();\n$('#text_"+nodesData[node].id+"').toggle();\n})</script>");
  }

  // Append a div for our edges
  var div = d3.select("body").append("div")   
                             .attr("class", "tooltip")               
                             .style("opacity", 0);

  // Create edge html elements
  // position, width and color or set in drawEdges()
  var edges = svg.selectAll('path')
          .data(edgesData)
      .enter().append('path')
          .on("mouseover", function(d) {      
              div.transition()        
                  .duration(200)      
                  .style("opacity", .9);      
              div.html(Math.round(d.prob * 10000) / 10000)  
                 .style("left", (d3.event.pageX) + "px")     
                 .style("top", (d3.event.pageY - 28) + "px");    
          })  
          .on("mouseout", function(d) {       
              div.transition()        
                  .duration(500)      
                  .style("opacity", 0);   
          })
          .attr('class', 'edge');

  // Create node html elements
  // Put them in parent container for text elements
  var elem = svg.selectAll("g")
          .data(nodesData);

  var elemEnter = elem.enter()
          .append("g");

  var circle = elemEnter.append("circle");
  var text = elemEnter.append("text");

  // Draw edges and nodes
  drawEdges();
  drawNodes();


  function drawNodes() {
      var dropdown = document.getElementById('metricDropdown');

      circle.attr("r", function(d) { return 15; } )
          .attr("stroke","black")
          .attr("fill", function(d) { return d['color']; })
          .style("opacity", .75)
          .attr('cx', function(d) { return d.x; })
          .attr('cy', function(d) { return d.y; })
          .attr('id', function(d){ return 'circle_'+d.id; })
          .style('display', 'block')
          .call(d3.drag()
              .on('drag', drag));

      text.attr("dx", function(d){return d.x - d.id.length*2.5; })
          .attr("dy", function(d){return d.y - 15; })
          .text(function(d){return d.id})
          .style("font-size", "16px")
          .style('display', 'block')
          .attr('id', function(d){ return 'text_'+d.id; })
          .call(d3.drag()
              .on('drag', drag));
  }

  function drawEdges() {
      edges.attr('d', function(d) {
          var source_node = name_to_node[d.source];
          var target_node = name_to_node[d.target];

          source_checkbox_checked = document.getElementById('checkbox_' + source_node.id).checked;
          target_checkbox_checked = document.getElementById('checkbox_' + target_node.id).checked;

          var min_prob = $('#minimumProbabilitySlider').val();
          if(source_checkbox_checked && target_checkbox_checked && d.prob >= min_prob){
              // Initial and final coordinates
              var x1 = source_node.x,
                  y1 = source_node.y,
                  x2 = target_node.x,
                  y2 = target_node.y;

              if (x1 == x2 && y1 == y2) return drawBezierCurve(x1, y1);
              return drawQuadraticCurve(x1, y1, x2, y2);
          }
      });

      // recalculate and back off the distance for the arrowheads
      // FROM: https://stackoverflow.com/questions/41226734/align-marker-on-node-edges-d3-force-layout/41229068#41229068
      edges.attr("d", function(d) {
          var source_node = name_to_node[d.source];
          var target_node = name_to_node[d.target];
          target_checkbox_checked = document.getElementById('checkbox_' + target_node.id).checked;
          source_checkbox_checked = document.getElementById('checkbox_' + source_node.id).checked;
          var min_prob = $('#minimumProbabilitySlider').val();

          if(source_checkbox_checked && target_checkbox_checked && d.prob >= min_prob){
            // length of current path
            var pl = this.getTotalLength(),
            // radius of circle plus marker head
            r = 7.5 * d.prob + 21.213; 
            // position close to where path intercepts circle;
            var m = this.getPointAtLength(pl - r);    

            var dx = m.x - source_node.x,
               dy = m.y - source_node.y,
               dr = Math.sqrt(dx * dx + dy * dy);

            return "M" + source_node.x + "," + source_node.y + "A" + dr + "," + dr + " 0 0,1 " + m.x + "," + m.y;
          }
      });
      edges.attr('stroke-width', function(d){
          return d.prob ** (0.75) * 10;
      });
      edges.attr('stroke', function(d){
          var source_node = name_to_node[d.source];
          return source_node['color'];
      });
      edges.attr('id', function(d){
          var source_node = name_to_node[d.source];
          var target_node = name_to_node[d.target];
          return 'edge_'+source_node.id+'_'+target_node.id;
      });
      edges.attr('fill', "none");
      edges.attr("marker-end","url(#arrow)"); 
  };

  function drawQuadraticCurve(x1, y1, x2, y2, h) {
      var dx = x2 - x1,
          dy = y2 - y1,
          dr = Math.sqrt(dx * dx + dy * dy);

      return "M" + x1 + "," + y1 + "A" + dr + "," + dr + " 0 0,1 " + x2 + "," + y2;
  }

  function drawBezierCurve(x, y) {
      // Creating Bézier curve with fixed size and orientation
      var d = 50;
      return ('M' + x + ' ' + y +
              ' C ' + (x + d) + ' ' + (y + d) +
              ', ' + (x - d) + ' ' + (y + d) +
              ', ' + x + ' ' + y);
  }

  // Reposition nodes and their text
  function drag(d) {
      //if(d3.event.x < )
      d.x = d3.event.x;
      d.y = d3.event.y;

      d3.select(this.parentElement.getElementsByTagName('circle')[0])
          .attr('cx', d.x)
          .attr('cy', d.y);

      d3.select(this.parentElement.getElementsByTagName('text')[0])
          .attr('dx', d.x - d.id.length*2.5)
          .attr('dy', d.y - 15);

      // Redraw edges after dragging a node
      drawEdges();

  }

  // JQuery listeners, redraw edges when checkbox is clicked or slider moves
  $('#minimumProbabilitySlider').on('input', function () {
      drawEdges();
  });

  $('[id^="checkbox_"]').on('input', function () {
      drawEdges();
  });


}

function CSVToArray( strData, strDelimiter ){
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter = (strDelimiter || ",");
    // Create a regular expression to parse the CSV values.
    var objPattern = new RegExp(
        (
            // Delimiters.
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
            // Quoted fields.
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            // Standard fields.
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
        );
    // Create an array to hold our data. Give the array
    // a default empty first row.
    var arrData = [[]];
    // Create an array to hold our individual pattern
    // matching groups.
    var arrMatches = null;
    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while (arrMatches = objPattern.exec( strData )){
        // Get the delimiter that was found.
        var strMatchedDelimiter = arrMatches[ 1 ];
        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (
            strMatchedDelimiter.length &&
            (strMatchedDelimiter != strDelimiter)
            ){
            // Since we have reached a new row of data,
            // add an empty row to our data array.
            arrData.push( [] );
        }
        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[ 2 ]){
            // We found a quoted value. When we capture
            // this value, unescape any double quotes.
            var strMatchedValue = arrMatches[ 2 ].replace(
                new RegExp( "\"\"", "g" ),
                "\""
                );
        } else {
            // We found a non-quoted value.
            var strMatchedValue = arrMatches[ 3 ];
        }
        // Now that we have our value string, let's add
        // it to the data array.
        arrData[ arrData.length - 1 ].push( strMatchedValue );
    }
    for(var i = 0; i < arrData.length; i++){
      if(arrData[i].length <= 1) arrData.splice(i, 1);
    }
    // Return the parsed data.
    return( arrData );
}

var visualizeData = function(theFile) {
  return function(e) {
    data = CSVToArray(e.target.result, ',');

    if(data[0].length != 2 && data[0].length != 4){
      alert('The uploaded file should contain either two or four columns!');
      return;
    }
    else if(data[0].length == 2){
      $('#clusteringTab').remove();
      if(!arraysEqual(data[0], ['from', 'to'])){
        alert('If you upload a file with two columns, these must be from & to!');
        return;
      }
    } else if(data[0].length == 4){
      if(!arraysEqual(data[0], ['from', 'to', 'session_id', 'timestamp'])){
        alert('If you upload a file with four columns, these must be from, to, session_id and timestamp!');
        return;
      }
    }

    $('#mainPanel').show();
    $('#uploadFilePanel').hide();

    states = getStates(data);
    var mc = new MarkovChain(states);
    sessions = createSessions(data);
    for(var j = 0; j < sessions.length; j++){
      mc.add_session(sessions[j]);
    }

    console.log(sessions);

    document.getElementById("nrClustersSlider").max = Math.min(10, sessions.length);

    cmap = createColorMap(mc);

    createMarkovChain(mc, cmap);

    var cluster1 = [];
    var cluster2 = [];
    for(var i = 0; i < sessions.length - 1; i++){
      cluster1.push(sessions[i])
    }
    for(var i = sessions.length - 1; i < sessions.length; i++){
      cluster2.push(sessions[i])
    }
    createSequenceMatrix(clusterSessions(sessions, states, 1), cmap, "#sequenceClusteringVisualization");

    var simulateThread = null;

    // Keep calling simulate with a new timeout variable
    var simulatedSession = []
    function simulate(){
        simulateThread = window.setTimeout(function(){
            simulatedSession.push(mc.state);
            $('#circle_' + mc.states[mc.state_to_id[mc.state]]).removeClass('current-node');
            var prevState = mc.state;
            mc.transition();
            $('#circle_' + mc.states[mc.state_to_id[mc.state]]).addClass('current-node');
            simulate();
            if(mc.state == "exit") {
              clearInterval(simulateThread);
              simulateThread = null;
              $('#circle_' + mc.states[mc.state_to_id[mc.state]]).removeClass('current-node');
              simulatedSession.push("exit");
              createSequenceMatrix([[simulatedSession]], cmap, "#simulatedSequence");
              simulatedSession = [];
            }
        }, 1000);
    }

    $('#btnStartSimulation').click(function () {
      if(simulateThread == null){
        mc.state = "start";
        $('#circle_' + mc.states[mc.state_to_id[mc.state]]).addClass('current-node');
        simulate();
      }
    });

    $('#btnPauseSimulation').click(function () {
      if(simulateThread != null) {
        clearInterval(simulateThread); 
        simulateThread = null;
      }
      $('#circle_' + mc.states[mc.state_to_id[mc.state]]).removeClass('current-node');
    });

    $('#btnCluster').click(function () {
      var nrClusters = $('#nrClustersSlider').val();
      d3.selectAll("#sequenceClusteringVisualization > *").remove();
      createSequenceMatrix(clusterSessions(sessions, states, nrClusters), cmap, "#sequenceClusteringVisualization");
    });

  };
};

// File parsing
function handleFileSelect(evt) {
  // Source: https://www.html5rocks.com/en/tutorials/file/dndfiles/
  var files = evt.target.files; 
  for (var i = 0, f; f = files[i]; i++) {
    name_split = f.name.split('.')
    if(name_split[name_split.length-1] != 'csv'){
      alert('Make sure you upload a CSV file!')
    } else{

      var reader = new FileReader();
      
      reader.onload = visualizeData(f);

      reader.readAsText(f);

    }
  }
}

var test = "from,to,session_id,timestamp\n\
coach,personal,0,2017-09-08 08:35:06.004000000\n\
personal,competition,0,2017-09-08 08:36:26.961999872\n\
competition,coach,0,2017-09-08 08:36:53.768999936\n\
coach,team,0,2017-09-08 08:36:58.555000064\n\
team,coach,0,2017-09-08 08:37:07.880999936\n\
coach,team,0,2017-09-08 08:37:17.601999872\n\
team,coach,0,2017-09-08 08:37:23.156999936\n\
coach,team,0,2017-09-08 08:37:26.510000128\n\
team,routes,0,2017-09-08 08:37:30.551000064\n\
routes,coach,0,2017-09-08 08:37:45.630000128\n\
coach,track,0,2017-09-08 08:37:53.820999936\n\
track,coach,0,2017-09-08 08:37:57.496000000\n\
coach,badges,0,2017-09-08 08:47:27.584000000\n\
badges,competition,0,2017-09-08 08:47:40.116999936\n\
competition,personal,0,2017-09-08 08:47:49.396000000\n\
personal,bugreport,0,2017-09-08 08:48:11.764000000\n\
bugreport,personal,0,2017-09-08 08:48:13.404000000\n\
personal,bugreport,0,2017-09-08 08:48:20.305999872\n\
bugreport,team,0,2017-09-08 08:49:00.126000128\n\
team,competition,0,2017-09-08 08:49:04.552000000\n\
coach,team,1,2017-09-08 12:53:28.579000064\n\
team,coach,1,2017-09-08 12:53:34.704999936\n\
coach,team,1,2017-09-08 12:53:47.872999936\n\
team,personal,1,2017-09-08 15:51:10.867000064\n\
personal,team,1,2017-09-08 15:51:14.863000064\n\
coach,personal,2,2017-09-09 08:53:06.113999872\n\
personal,coach,2,2017-09-09 08:53:10.392999936\n\
coach,team,2,2017-09-09 08:53:26.536999936\n\
coach,personal,3,2017-09-09 15:16:37.392999936\n\
personal,coach,3,2017-09-09 15:16:40.060000000\n\
coach,team,3,2017-09-09 15:16:50.392000000\n\
coach,personal,4,2017-09-10 09:38:41.937999872\n\
personal,coach,4,2017-09-10 09:38:44.600999936\n\
coach,team,4,2017-09-10 09:38:58.708000000\n\
team,competition,4,2017-09-10 09:39:00.668000000\n\
competition,personal,4,2017-09-10 09:39:16.948999936\n\
personal,competition,4,2017-09-10 11:40:41.025999872\n\
competition,track,4,2017-09-10 11:41:02.734000128\n\
track,coach,4,2017-09-10 11:41:09.347000064\n\
coach,track,4,2017-09-10 12:35:44.313999872\n\
track,route,4,2017-09-10 15:28:18.752999936\n\
route,coach,4,2017-09-10 15:28:22.464000000\n\
coach,competition,4,2017-09-10 15:28:45.251000064\n\
competition,coach,4,2017-09-10 15:28:55.240999936\n\
coach,team,4,2017-09-10 15:29:00.296999936\n\
team,competition,4,2017-09-10 15:29:03.273999872\n\
coach,competition,5,2017-09-11 04:58:38.686000128\n\
competition,coach,5,2017-09-11 04:58:45.817999872\n\
coach,team,5,2017-09-11 04:58:51.025999872\n\
coach,,6,2017-09-11 10:05:17.464000000\n\
coach,personal,7,2017-09-11 12:30:55.489999872\n\
personal,coach,7,2017-09-11 12:30:58.116000000\n\
coach,team,7,2017-09-11 12:31:08.460999936\n\
team,competition,7,2017-09-11 12:31:10.808999936\n\
competition,coach,7,2017-09-11 12:31:33.828000000\n\
coach,personal,7,2017-09-11 12:31:44.438000128\n\
personal,coach,7,2017-09-11 12:32:43.656000000\n\
coach,personal,8,2017-09-11 15:44:10.948000000\n\
personal,track,8,2017-09-11 15:44:22.056999936\n\
track,coach,8,2017-09-11 15:44:35.227000064\n\
coach,track,8,2017-09-11 16:39:11.335000064\n\
track,route,8,2017-09-11 17:19:17.430000128\n\
route,track,8,2017-09-11 17:19:21.048999936\n\
track,coach,8,2017-09-11 17:28:38.035000064\n\
coach,competition,8,2017-09-11 17:28:41.160000000\n\
competition,coach,8,2017-09-11 17:29:50.233999872\n\
coach,competition,8,2017-09-11 17:30:03.248000000\n\
competition,team,8,2017-09-11 17:30:11.072000000\n\
team,coach,8,2017-09-11 17:30:13.752000000\n\
coach,competition,8,2017-09-11 17:38:49.889999872\n\
competition,team,8,2017-09-11 18:02:07.500999936\n\
team,routes,8,2017-09-11 18:02:39.900999936\n\
routes,route,8,2017-09-11 18:03:13.272000000\n\
route,routes,8,2017-09-11 18:03:18.030000128\n\
routes,badges,8,2017-09-11 18:03:23.087000064\n\
badges,coach,8,2017-09-11 18:03:29.241999872\n\
coach,personal,8,2017-09-11 18:16:27.190000128\n\
personal,coach,8,2017-09-11 18:17:38.812999936\n\
coach,badges,8,2017-09-11 18:17:43.824999936\n\
badges,team,8,2017-09-11 18:17:49.712999936\n\
team,personal,8,2017-09-11 18:17:56.873999872\n\
personal,team,8,2017-09-11 18:59:05.707000064\n\
team,competition,8,2017-09-11 18:59:23.550000128\n\
competition,team,8,2017-09-11 18:59:33.112000000\n\
team,team,8,2017-09-11 18:59:43.828999936\n\
team,competition,8,2017-09-11 19:19:41.527000064\n\
competition,team,8,2017-09-11 19:21:05.721999872\n\
team,competition,8,2017-09-11 19:21:20.191000064\n\
competition,coach,8,2017-09-11 19:22:17.444000000\n\
coach,competition,8,2017-09-11 19:41:51.636000000\n\
competition,coach,8,2017-09-11 19:41:58.583000064\n\
coach,team,8,2017-09-11 19:42:03.160000000\n\
coach,competition,9,2017-09-12 04:53:51.595000064\n\
coach,,10,2017-09-12 05:24:07.468000000\n\
coach,competition,11,2017-09-12 10:47:46.697999872\n\
competition,coach,11,2017-09-12 10:47:50.535000064\n\
coach,team,11,2017-09-12 10:47:53.831000064\n\
coach,personal,12,2017-09-12 15:56:24.024999936\n\
personal,coach,12,2017-09-12 15:56:32.281999872\n\
coach,personal,12,2017-09-12 15:56:35.174000128\n\
personal,coach,12,2017-09-12 15:56:57.494000128\n\
coach,competition,12,2017-09-12 15:57:09.139000064\n\
competition,coach,12,2017-09-12 15:57:11.456999936\n\
coach,team,12,2017-09-12 15:57:18.788999936\n\
team,competition,12,2017-09-12 15:57:22.564000000\n\
competition,coach,12,2017-09-12 15:57:39.864999936\n\
coach,team,13,2017-09-12 20:46:48.163000064\n\
team,competition,13,2017-09-12 20:46:59.176000000\n\
competition,personal,13,2017-09-12 20:47:25.905999872\n\
personal,competition,13,2017-09-12 20:47:32.612000000\n\
competition,team,13,2017-09-12 20:47:44.936000000\n\
team,personal,13,2017-09-12 20:47:47.073999872\n\
personal,team,13,2017-09-13 05:21:12.396999936\n\
team,competition,13,2017-09-13 05:21:22.088000000\n\
coach,personal,14,2017-09-13 07:53:43.860000000\n\
personal,coach,14,2017-09-13 07:53:49.691000064\n\
coach,competition,14,2017-09-13 07:54:09.241999872\n\
competition,badges,14,2017-09-13 07:54:18.369999872\n\
coach,team,15,2017-09-13 12:37:31.859000064\n\
team,competition,15,2017-09-13 12:37:37.443000064\n\
coach,personal,16,2017-09-13 12:59:56.422000128\n\
personal,coach,16,2017-09-13 13:00:12.680000000\n\
coach,track,16,2017-09-13 13:00:25.044000000\n\
track,track,16,2017-09-13 13:00:25.980000000\n\
track,route,16,2017-09-13 14:22:10.740000000\n\
route,track,16,2017-09-13 14:22:12.655000064\n\
track,team,16,2017-09-13 14:22:19.696999936\n\
team,competition,16,2017-09-13 14:22:22.248999936\n\
competition,competition,16,2017-09-13 14:22:32.276000000\n\
competition,coach,16,2017-09-13 19:10:16.769999872\n\
coach,competition,16,2017-09-13 19:19:18.412999936\n\
competition,team,16,2017-09-14 03:44:42.440000000\n\
coach,personal,17,2017-09-14 06:31:29.097999872\n\
personal,coach,17,2017-09-14 06:31:32.856999936\n\
coach,competition,17,2017-09-14 06:31:44.057999872\n\
coach,competition,18,2017-09-14 10:14:34.265999872\n\
competition,team,18,2017-09-14 10:14:38.590000128\n\
coach,personal,19,2017-09-14 14:21:28.364000000\n\
personal,coach,19,2017-09-14 16:22:01.236999936\n\
coach,track,19,2017-09-14 16:22:10.411000064\n\
track,coach,19,2017-09-14 16:22:12.388999936\n\
coach,track,19,2017-09-14 17:17:01.240000000\n\
track,route,19,2017-09-14 17:51:03.503000064\n\
route,coach,19,2017-09-14 17:51:05.560999936\n\
coach,competition,19,2017-09-14 17:51:24.924000000\n\
competition,team,19,2017-09-14 19:20:20.892999936\n\
team,competition,19,2017-09-14 19:20:39.086000128\n\
competition,competition,19,2017-09-14 19:21:24.152000000\n\
competition,coach,19,2017-09-14 20:30:40.612999936\n\
coach,competition,20,2017-09-15 09:35:42.312000000\n\
competition,personal,20,2017-09-15 09:35:49.296000000\n\
personal,competition,20,2017-09-15 10:26:39.369999872\n\
competition,track,20,2017-09-15 10:26:46.840000000\n\
track,track,20,2017-09-15 10:26:48.700000000\n\
track,route,20,2017-09-15 11:52:08.681999872\n\
route,coach,20,2017-09-15 11:52:10.028000000\n\
coach,competition,20,2017-09-15 11:52:28.295000064\n\
competition,team,20,2017-09-15 12:00:08.259000064\n\
team,badges,20,2017-09-15 12:00:12.903000064\n\
badges,badges,20,2017-09-15 12:00:27.465999872\n\
badges,competition,20,2017-09-15 13:07:58.667000064\n\
coach,personal,21,2017-09-15 13:41:53.560000000\n\
personal,coach,21,2017-09-15 13:54:31.886000128\n\
coach,team,21,2017-09-15 13:54:41.588999936\n\
team,competition,21,2017-09-15 13:54:44.684000000\n\
competition,competition,21,2017-09-15 13:55:07.344000000\n\
competition,team,21,2017-09-16 06:17:13.870000128\n\
coach,competition,22,2017-09-16 08:41:08.012000000\n\
competition,personal,22,2017-09-16 08:41:11.372999936\n\
personal,competition,22,2017-09-16 08:41:20.127000064\n\
coach,competition,23,2017-09-16 12:00:16.904000000\n\
competition,coach,23,2017-09-16 12:00:21.062000128\n\
coach,competition,24,2017-09-16 15:12:52.547000064\n\
coach,competition,25,2017-09-16 20:18:51.000000000\n\
coach,competition,26,2017-09-17 10:04:56.164000000\n\
competition,coach,26,2017-09-17 10:05:00.099000064\n\
coach,team,26,2017-09-17 10:05:15.464000000\n\
team,competition,26,2017-09-17 10:05:20.975000064\n\
competition,competition,26,2017-09-17 10:50:51.519000064\n\
competition,competition,26,2017-09-17 11:20:50.936999936\n\
competition,team,26,2017-09-17 12:51:48.897999872\n\
team,team,26,2017-09-17 12:51:53.064999936\n\
team,competition,26,2017-09-17 15:09:30.236999936\n\
competition,team,26,2017-09-17 15:09:32.308000000\n\
team,personal,26,2017-09-17 15:09:41.072000000\n\
personal,team,26,2017-09-17 15:09:42.932999936\n\
team,competition,26,2017-09-17 15:09:51.644000000\n\
coach,competition,27,2017-09-18 05:41:13.225999872\n\
competition,team,27,2017-09-18 05:41:18.660999936\n\
coach,competition,28,2017-09-18 07:00:01.201999872\n\
coach,competition,29,2017-09-18 08:56:10.248999936\n\
coach,competition,30,2017-09-18 11:22:49.871000064\n\
competition,team,30,2017-09-18 11:23:07.398000128\n\
coach,team,31,2017-09-19 03:45:28.703000064\n\
team,competition,31,2017-09-19 03:45:33.175000064\n\
coach,team,32,2017-09-19 08:38:58.508999936\n\
team,competition,32,2017-09-19 08:39:02.971000064\n\
coach,team,33,2017-09-19 09:25:54.759000064\n\
team,competition,33,2017-09-19 09:26:06.827000064\n\
coach,competition,34,2017-09-19 09:49:31.831000064\n\
competition,competition,34,2017-09-19 09:49:36.288999936\n\
competition,competition,34,2017-09-19 11:07:26.336000000\n\
competition,track,34,2017-09-19 13:37:24.356999936\n\
track,team,34,2017-09-19 13:37:28.488000000\n\
team,personal,34,2017-09-19 13:37:31.060999936\n\
personal,team,34,2017-09-19 15:23:45.972000000\n\
team,track,34,2017-09-19 15:24:03.544000000\n\
track,route,34,2017-09-19 15:24:07.062000128\n\
route,track,34,2017-09-19 16:11:00.444000000\n\
track,team,34,2017-09-19 16:11:06.072999936\n\
team,competition,34,2017-09-19 16:18:46.107000064\n\
competition,competition,34,2017-09-19 16:18:52.780999936\n\
competition,team,34,2017-09-19 16:58:29.328000000\n\
team,competition,34,2017-09-19 18:25:50.360999936\n\
competition,competition,34,2017-09-19 18:25:59.872000000\n\
competition,badges,34,2017-09-19 20:26:33.417999872\n\
badges,badges,34,2017-09-19 20:27:09.171000064\n\
badges,competition,34,2017-09-20 03:40:03.102000128\n\
coach,competition,35,2017-09-20 10:16:37.975000064\n\
competition,team,35,2017-09-20 10:16:49.700000000\n\
team,routes,35,2017-09-20 10:16:58.859000064\n\
routes,route,35,2017-09-20 10:17:25.798000128\n\
route,routes,35,2017-09-20 10:17:32.055000064\n\
routes,coach,35,2017-09-20 10:17:41.020999936\n\
coach,personal,36,2017-09-20 11:57:40.107000064\n\
personal,coach,36,2017-09-20 11:57:43.716999936\n\
coach,track,36,2017-09-20 11:57:51.828000000\n\
track,coach,36,2017-09-20 11:57:53.855000064\n\
coach,track,36,2017-09-20 12:52:40.427000064\n\
track,route,36,2017-09-20 12:53:22.600000000\n\
route,route,36,2017-09-20 12:53:24.128000000\n\
coach,team,37,2017-09-20 20:36:36.356999936\n\
team,competition,37,2017-09-20 20:36:52.769999872\n\
coach,personal,38,2017-09-21 10:13:54.916999936\n\
personal,coach,38,2017-09-21 10:13:58.600000000\n\
coach,track,38,2017-09-21 10:14:08.799000064\n\
track,route,38,2017-09-21 10:14:10.631000064\n\
route,track,38,2017-09-21 10:20:32.080999936\n\
track,coach,38,2017-09-21 10:20:35.032999936\n\
coach,competition,38,2017-09-21 12:40:13.982000128\n\
competition,coach,38,2017-09-21 12:40:19.929999872\n\
coach,team,38,2017-09-21 12:40:24.220000000\n\
coach,competition,39,2017-09-21 16:04:29.727000064\n\
competition,track,39,2017-09-21 16:04:33.420999936\n\
track,coach,39,2017-09-21 16:04:41.792999936\n\
coach,track,39,2017-09-21 16:59:30.177999872\n\
track,route,39,2017-09-21 17:29:29.348999936\n\
route,coach,39,2017-09-21 17:29:33.136999936\n\
coach,competition,39,2017-09-21 17:29:49.811000064\n\
coach,competition,40,2017-09-21 18:56:18.456999936\n\
coach,team,41,2017-09-21 20:20:22.272999936\n\
team,competition,41,2017-09-21 20:20:27.840000000\n\
competition,personal,41,2017-09-21 20:21:17.760999936\n\
personal,coach,41,2017-09-22 08:20:13.252000000\n\
coach,competition,41,2017-09-22 08:20:26.219000064\n\
competition,track,41,2017-09-22 08:20:27.400000000\n\
track,coach,41,2017-09-22 08:20:29.316000000\n\
coach,track,41,2017-09-22 09:15:24.756999936\n\
track,route,41,2017-09-22 09:27:05.686000128\n\
coach,track,42,2017-09-22 10:20:52.596000000\n\
track,route,42,2017-09-22 10:20:56.576000000\n\
route,track,42,2017-09-22 10:32:24.768999936\n\
track,competition,42,2017-09-22 10:32:29.126000128\n\
competition,coach,42,2017-09-22 10:32:31.339000064\n\
coach,personal,42,2017-09-22 10:32:37.588000000\n\
personal,coach,42,2017-09-22 13:23:09.436000000\n\
coach,track,42,2017-09-22 13:23:19.076000000\n\
track,route,42,2017-09-22 13:23:23.304999936\n\
route,track,42,2017-09-22 13:23:39.889999872\n\
track,route,42,2017-09-22 13:23:45.532999936\n\
route,track,42,2017-09-22 13:23:53.748000000\n\
track,team,42,2017-09-22 13:23:57.308999936\n\
team,track,42,2017-09-22 13:24:01.520000000\n\
track,route,42,2017-09-22 13:24:13.456999936\n\
route,coach,42,2017-09-22 13:46:53.980000000\n\
coach,team,42,2017-09-22 13:47:08.320000000\n\
coach,team,43,2017-09-22 20:22:18.280999936\n\
team,competition,43,2017-09-22 20:22:22.729999872\n\
coach,competition,44,2017-09-23 07:55:20.292999936\n\
competition,team,44,2017-09-23 07:55:26.228000000\n\
team,team,44,2017-09-23 07:55:33.619000064\n\
team,competition,44,2017-09-23 09:30:38.633999872\n\
competition,team,44,2017-09-23 09:40:04.600000000\n\
coach,personal,45,2017-09-23 15:18:08.579000064\n\
personal,coach,45,2017-09-23 15:18:11.047000064\n\
coach,track,45,2017-09-23 15:18:23.208999936\n\
track,route,45,2017-09-23 15:18:25.360999936\n\
route,track,45,2017-09-23 15:53:05.622000128\n\
track,track,45,2017-09-23 15:53:08.657999872\n\
track,team,45,2017-09-23 19:32:16.996000000\n\
team,competition,45,2017-09-23 19:32:20.331000064\n\
competition,competition,45,2017-09-23 19:32:41.825999872\n\
competition,team,45,2017-09-24 08:37:09.214000128\n\
team,competition,45,2017-09-24 08:37:14.580000000\n\
competition,competition,45,2017-09-24 08:37:18.152999936\n\
competition,competition,45,2017-09-24 10:22:36.667000064\n\
competition,track,45,2017-09-24 11:40:05.881999872\n\
track,route,45,2017-09-24 11:40:10.168000000\n\
route,track,45,2017-09-24 12:09:02.599000064\n\
track,team,45,2017-09-24 12:09:07.108999936\n\
team,coach,45,2017-09-24 12:09:09.599000064\n\
coach,team,45,2017-09-24 12:09:14.844000000\n\
team,competition,45,2017-09-24 12:09:17.947000064\n\
competition,competition,45,2017-09-24 12:09:31.492000000\n\
competition,team,45,2017-09-24 12:53:32.990000128\n\
team,competition,45,2017-09-24 12:53:45.840999936\n\
competition,badges,45,2017-09-24 12:53:51.151000064\n\
badges,badges,45,2017-09-24 12:53:54.737999872\n\
badges,track,45,2017-09-24 14:44:38.870000128\n\
track,route,45,2017-09-24 14:44:43.764000000\n\
route,track,45,2017-09-24 15:32:33.064999936\n\
track,team,45,2017-09-24 15:32:37.380999936\n\
team,competition,45,2017-09-24 15:32:39.307000064\n\
competition,coach,45,2017-09-24 15:32:48.711000064\n\
coach,competition,45,2017-09-24 15:32:48.715000064\n\
competition,competition,45,2017-09-24 15:32:50.755000064\n\
competition,competition,45,2017-09-24 15:45:34.684000000\n\
competition,team,45,2017-09-24 17:43:54.008999936\n\
team,competition,45,2017-09-24 17:43:58.603000064\n\
coach,competition,46,2017-09-24 22:32:02.264000000\n\
coach,,47,2017-09-25 05:59:26.665999872\n\
coach,coach,48,2017-09-08 11:06:39.484000000\n\
coach,track,48,2017-09-08 11:07:58.520999936\n\
track,route,48,2017-09-08 13:28:18.598000128\n\
route,track,48,2017-09-08 13:28:39.120000000\n\
track,personal,48,2017-09-08 13:28:43.502000128\n\
personal,track,48,2017-09-08 13:29:30.496999936\n\
track,team,48,2017-09-08 13:29:40.000999936\n\
team,coach,48,2017-09-08 13:29:48.073999872\n\
coach,personal,48,2017-09-08 13:30:19.460999936\n\
personal,coach,48,2017-09-08 13:31:25.160000000\n\
coach,track,49,2017-09-10 07:06:46.679000064\n\
track,coach,49,2017-09-10 07:07:08.556999936\n\
coach,track,49,2017-09-10 07:26:52.414000128\n\
track,route,49,2017-09-10 11:00:06.679000064\n\
route,coach,49,2017-09-10 11:00:14.135000064\n\
coach,competition,49,2017-09-10 11:00:43.367000064\n\
competition,coach,49,2017-09-10 11:01:29.751000064\n\
coach,competition,49,2017-09-10 11:11:41.868000000\n\
competition,coach,49,2017-09-10 11:18:55.855000064\n\
coach,competition,49,2017-09-10 11:19:01.504999936\n\
competition,coach,49,2017-09-10 11:19:25.888000000\n\
coach,badges,49,2017-09-10 11:19:36.588000000\n\
badges,team,49,2017-09-10 11:19:47.699000064\n\
coach,,50,2017-09-10 12:11:14.863000064\n\
coach,competition,51,2017-09-12 07:07:28.500999936\n\
competition,team,51,2017-09-12 07:08:09.329999872\n\
team,competition,51,2017-09-12 07:08:44.260000000\n\
competition,coach,51,2017-09-12 07:09:09.416999936\n\
coach,track,51,2017-09-12 07:09:21.507000064\n\
track,badges,51,2017-09-12 07:09:59.532000000\n\
badges,coach,51,2017-09-12 07:10:03.972000000\n\
coach,team,52,2017-09-12 09:27:23.496000000\n\
team,track,52,2017-09-12 09:27:35.384000000\n\
track,coach,52,2017-09-12 10:25:02.564999936\n\
coach,track,52,2017-09-12 10:27:19.566000128\n\
track,route,52,2017-09-12 10:32:42.398000128\n\
route,track,52,2017-09-12 10:33:12.190000128\n\
track,coach,52,2017-09-12 10:33:21.076999936\n\
coach,competition,52,2017-09-12 10:33:39.788999936\n\
competition,coach,52,2017-09-12 10:33:41.607000064\n\
coach,competition,52,2017-09-12 10:33:52.267000064\n\
competition,team,52,2017-09-12 10:34:00.815000064\n\
coach,,53,2017-09-12 11:22:20.190000128\n\
coach,personal,54,2017-09-12 16:09:09.267000064\n\
coach,competition,55,2017-09-13 02:43:51.609999872\n\
competition,coach,55,2017-09-13 02:44:02.209999872\n\
coach,competition,55,2017-09-13 02:44:21.516999936\n\
competition,coach,55,2017-09-13 02:44:30.903000064\n\
coach,routes,55,2017-09-13 02:44:37.004000000\n\
routes,route,55,2017-09-13 02:44:47.652000000\n\
route,routes,55,2017-09-13 02:44:59.438000128\n\
routes,track,55,2017-09-13 02:45:27.364999936\n\
track,competition,55,2017-09-13 02:45:33.452999936\n\
competition,team,55,2017-09-13 02:45:42.984999936\n\
team,personal,55,2017-09-13 02:45:48.651000064\n\
personal,team,55,2017-09-13 02:46:28.172999936\n\
coach,competition,56,2017-09-13 03:27:14.099000064\n\
competition,team,56,2017-09-13 06:40:22.940999936\n\
team,coach,56,2017-09-13 06:40:36.684000000\n\
coach,badges,56,2017-09-13 06:41:14.243000064\n\
badges,routes,56,2017-09-13 06:41:39.784000000\n\
routes,routes,56,2017-09-13 06:42:33.816999936\n\
routes,competition,56,2017-09-13 07:48:02.651000064\n\
competition,team,56,2017-09-13 07:48:08.172000000\n\
team,competition,56,2017-09-13 07:48:15.659000064\n\
competition,team,56,2017-09-13 07:48:36.299000064\n\
coach,,57,2017-09-13 10:32:56.480000000\n\
coach,personal,58,2017-09-13 11:39:14.396999936\n\
personal,track,58,2017-09-13 12:15:21.035000064\n\
track,personal,58,2017-09-13 12:15:39.743000064\n\
personal,track,58,2017-09-13 12:15:59.108000000\n\
track,team,58,2017-09-13 12:16:00.697999872\n\
team,competition,58,2017-09-14 06:46:39.393999872\n\
competition,competition,58,2017-09-14 06:47:05.200999936\n\
competition,team,58,2017-09-14 14:49:54.420000000\n\
team,personal,58,2017-09-14 14:50:00.352999936\n\
personal,bugreport,58,2017-09-14 14:50:27.617999872\n\
bugreport,competition,58,2017-09-14 14:50:36.544000000\n\
competition,team,58,2017-09-14 14:51:18.436000000\n\
team,coach,58,2017-09-14 14:51:25.724000000\n\
coach,team,58,2017-09-14 14:52:50.816999936\n\
team,track,58,2017-09-14 14:53:15.270000128\n\
track,routes,58,2017-09-14 14:53:30.448999936\n\
routes,route,58,2017-09-14 14:53:37.204000000\n\
route,routes,58,2017-09-14 14:53:50.163000064\n\
routes,coach,58,2017-09-14 14:54:05.284999936\n\
coach,personal,58,2017-09-14 14:54:59.577999872\n\
personal,bugreport,58,2017-09-14 14:55:36.043000064\n\
bugreport,coach,58,2017-09-14 14:55:45.113999872\n\
coach,bugreport,58,2017-09-14 15:02:02.492000000\n\
coach,bugreport,59,2017-09-14 21:15:47.377999872\n\
bugreport,team,59,2017-09-15 07:10:37.160999936\n\
team,competition,59,2017-09-15 07:10:42.448000000\n\
competition,coach,59,2017-09-15 07:11:20.507000064\n\
coach,team,59,2017-09-15 07:11:58.182000128\n\
team,competition,59,2017-09-15 17:34:09.334000128\n\
competition,badges,59,2017-09-15 17:34:31.433999872\n\
badges,track,59,2017-09-15 17:35:01.243000064\n\
track,coach,59,2017-09-16 06:04:41.664999936\n\
coach,track,59,2017-09-16 07:01:59.440999936\n\
track,route,59,2017-09-16 08:23:23.404000000\n\
route,track,59,2017-09-16 08:23:30.660999936\n\
track,team,59,2017-09-16 08:23:46.791000064\n\
coach,competition,60,2017-09-16 09:01:55.758000128\n\
competition,competition,60,2017-09-16 10:08:38.360000000\n\
competition,coach,60,2017-09-16 11:59:13.352000000\n\
coach,competition,60,2017-09-16 11:59:35.272999936\n\
competition,coach,60,2017-09-16 12:00:11.566000128\n\
coach,team,60,2017-09-16 12:00:20.606000128\n\
team,competition,60,2017-09-16 12:00:27.185999872\n\
competition,routes,60,2017-09-16 12:02:16.108999936\n\
routes,route,60,2017-09-16 12:02:19.648999936\n\
route,routes,60,2017-09-16 12:02:34.897999872\n\
routes,route,60,2017-09-16 12:02:56.113999872\n\
route,routes,60,2017-09-16 12:03:02.363000064\n\
routes,badges,60,2017-09-16 12:03:17.436999936\n\
coach,competition,61,2017-09-17 06:13:30.844000000\n\
competition,coach,61,2017-09-17 06:13:41.328000000\n\
coach,track,61,2017-09-17 06:14:15.932000000\n\
track,coach,61,2017-09-17 06:14:27.803000064\n\
coach,track,61,2017-09-17 07:08:31.161999872\n\
track,route,61,2017-09-17 08:22:17.265999872\n\
route,coach,61,2017-09-17 08:22:25.239000064\n\
coach,competition,61,2017-09-17 08:22:41.455000064\n\
competition,team,61,2017-09-17 08:22:53.336000000\n\
team,competition,61,2017-09-17 08:23:13.511000064\n\
competition,coach,61,2017-09-17 08:23:53.688000000\n\
coach,competition,61,2017-09-17 08:24:48.743000064\n\
competition,coach,61,2017-09-17 08:25:02.940999936\n\
coach,badges,62,2017-09-17 10:01:54.811000064\n\
badges,coach,62,2017-09-17 10:02:24.995000064\n\
coach,team,62,2017-09-17 10:03:44.691000064\n\
coach,team,63,2017-09-17 11:01:52.167000064\n\
team,personal,63,2017-09-17 16:30:25.510000128\n\
personal,track,63,2017-09-17 16:30:45.113999872\n\
track,coach,63,2017-09-17 16:31:08.988999936\n\
coach,competition,63,2017-09-17 17:28:33.504999936\n\
competition,track,63,2017-09-18 07:17:45.544000000\n\
track,personal,63,2017-09-18 07:40:18.633999872\n\
personal,track,63,2017-09-18 07:40:31.660000000\n\
track,personal,63,2017-09-18 07:40:41.335000064\n\
personal,bugreport,63,2017-09-18 07:41:17.892000000\n\
bugreport,track,63,2017-09-18 07:41:19.564999936\n\
track,coach,63,2017-09-18 07:41:36.472999936\n\
coach,track,63,2017-09-18 07:42:23.905999872\n\
track,team,63,2017-09-18 07:42:33.817999872\n\
team,route,63,2017-09-18 11:48:22.198000128\n\
route,routes,63,2017-09-18 11:48:51.838000128\n\
routes,route,63,2017-09-18 11:49:01.968999936\n\
route,routes,63,2017-09-18 11:49:12.464999936\n\
routes,track,63,2017-09-18 11:49:31.452000000\n\
track,route,63,2017-09-18 11:50:14.192000000\n\
route,track,63,2017-09-18 11:50:36.396999936\n\
track,route,63,2017-09-18 11:50:55.792000000\n\
route,personal,63,2017-09-18 11:51:06.580999936\n\
personal,bugreport,63,2017-09-18 11:51:13.057999872\n\
bugreport,track,63,2017-09-18 11:51:14.179000064\n\
track,route,63,2017-09-18 11:51:35.361999872\n\
route,coach,63,2017-09-18 11:51:58.443000064\n\
coach,team,63,2017-09-18 11:52:41.273999872\n\
team,competition,63,2017-09-18 11:53:45.279000064\n\
competition,coach,63,2017-09-18 11:54:14.614000128\n\
coach,track,63,2017-09-18 11:54:26.758000128\n\
track,route,63,2017-09-18 12:45:13.422000128\n\
route,track,63,2017-09-18 12:45:22.009999872\n\
track,team,63,2017-09-18 12:45:26.334000128\n\
team,competition,63,2017-09-18 12:45:32.455000064\n\
competition,coach,63,2017-09-18 12:47:01.756999936\n\
coach,team,64,2017-09-18 17:22:24.160999936\n\
team,competition,64,2017-09-18 17:22:46.440999936\n\
competition,team,64,2017-09-18 17:27:29.207000064\n\
team,competition,64,2017-09-18 17:28:18.303000064\n\
competition,team,64,2017-09-18 17:28:30.785999872\n\
team,coach,64,2017-09-18 17:28:34.127000064\n\
coach,badges,64,2017-09-18 17:29:57.555000064\n\
badges,track,64,2017-09-18 17:33:57.164999936\n\
track,track,64,2017-09-18 17:35:04.628000000\n\
track,routes,64,2017-09-19 07:47:47.848000000\n\
routes,route,64,2017-09-19 07:47:54.299000064\n\
route,routes,64,2017-09-19 07:48:05.275000064\n\
routes,route,64,2017-09-19 07:48:11.155000064\n\
route,routes,64,2017-09-19 07:48:13.752999936\n\
routes,route,64,2017-09-19 07:48:17.796999936\n\
route,routes,64,2017-09-19 07:48:20.520000000\n\
routes,route,64,2017-09-19 07:48:23.902000128\n\
route,routes,64,2017-09-19 07:48:28.318000128\n\
routes,route,64,2017-09-19 07:48:34.427000064\n\
route,routes,64,2017-09-19 07:48:41.612000000\n\
routes,personal,64,2017-09-19 07:48:44.496999936\n\
personal,coach,64,2017-09-19 07:48:48.912999936\n\
coach,team,64,2017-09-19 07:49:26.174000128\n\
team,coach,64,2017-09-19 07:49:59.169999872\n\
coach,personal,64,2017-09-19 07:50:15.515000064\n\
coach,team,65,2017-09-19 09:24:48.715000064\n\
team,competition,65,2017-09-19 09:25:31.752999936\n\
competition,coach,65,2017-09-19 09:25:50.496000000\n\
coach,personal,65,2017-09-19 09:26:22.777999872\n\
coach,team,66,2017-09-19 12:31:07.535000064\n\
team,competition,66,2017-09-19 12:32:26.937999872\n\
competition,team,66,2017-09-19 12:33:26.191000064\n\
team,coach,66,2017-09-19 12:33:55.225999872\n\
coach,competition,67,2017-09-19 13:24:28.044999936\n\
coach,,68,2017-09-19 14:46:16.088000000\n\
coach,track,69,2017-09-19 17:17:50.556999936\n\
track,route,69,2017-09-19 17:17:59.380999936\n\
route,track,69,2017-09-19 17:30:43.032000000\n\
track,coach,69,2017-09-19 17:30:50.854000128\n\
coach,personal,69,2017-09-19 17:30:56.092000000\n\
personal,coach,69,2017-09-19 17:31:08.635000064\n\
coach,competition,69,2017-09-19 17:46:10.465999872\n\
competition,coach,69,2017-09-19 17:46:25.606000128\n\
coach,team,69,2017-09-19 17:46:53.344000000\n\
team,badges,69,2017-09-19 17:47:16.590000128\n\
badges,coach,69,2017-09-19 17:47:52.969999872\n\
coach,coach,69,2017-09-19 17:48:40.619000064\n\
coach,personal,69,2017-09-19 18:03:01.679000064\n\
personal,bugreport,69,2017-09-19 18:03:25.553999872\n\
bugreport,track,69,2017-09-19 18:03:27.783000064\n\
track,personal,69,2017-09-19 18:03:37.692999936\n\
personal,bugreport,69,2017-09-19 18:04:01.128999936\n\
bugreport,track,69,2017-09-19 18:04:03.553999872\n\
track,coach,69,2017-09-19 18:04:12.504000000\n\
coach,competition,69,2017-09-19 18:16:25.808999936\n\
competition,coach,69,2017-09-19 18:16:35.487000064\n\
coach,track,69,2017-09-19 18:16:42.932000000\n\
track,personal,69,2017-09-19 18:16:49.844000000\n\
coach,competition,70,2017-09-20 08:28:34.163000064\n\
competition,coach,70,2017-09-20 08:28:54.803000064\n\
coach,personal,70,2017-09-20 08:29:05.496000000\n\
coach,team,71,2017-09-20 13:43:30.407000064\n\
team,competition,71,2017-09-20 13:43:46.727000064\n\
competition,coach,71,2017-09-20 13:44:03.480000000\n\
coach,track,71,2017-09-20 13:44:18.043000064\n\
track,coach,71,2017-09-20 13:44:46.464000000\n\
coach,track,71,2017-09-20 17:55:27.220000000\n\
track,route,71,2017-09-20 17:55:49.430000128\n\
route,coach,71,2017-09-20 17:55:58.352999936\n\
coach,team,71,2017-09-20 17:56:19.400000000\n\
team,competition,71,2017-09-20 17:56:28.276000000\n\
coach,competition,72,2017-09-20 18:50:26.968000000\n\
competition,badges,72,2017-09-20 18:54:25.625999872\n\
badges,competition,72,2017-09-20 18:54:35.342000128\n\
competition,team,72,2017-09-20 18:55:08.176000000\n\
team,personal,72,2017-09-20 18:55:55.108000000\n\
coach,team,73,2017-09-21 11:10:14.735000064\n\
team,competition,73,2017-09-21 11:10:33.745999872\n\
competition,team,73,2017-09-21 11:11:14.311000064\n\
team,competition,73,2017-09-21 11:11:56.187000064\n\
competition,badges,73,2017-09-21 11:12:26.793999872\n\
badges,coach,73,2017-09-21 11:12:50.448999936\n\
coach,competition,73,2017-09-21 11:13:33.252000000\n\
competition,personal,73,2017-09-21 11:13:39.817999872\n\
coach,track,74,2017-09-21 11:42:30.537999872\n\
track,route,74,2017-09-21 11:42:36.615000064\n\
route,track,74,2017-09-21 11:53:46.142000128\n\
track,team,74,2017-09-21 11:53:59.297999872\n\
team,personal,74,2017-09-21 11:54:03.360000000\n\
coach,track,75,2017-09-22 02:38:11.697999872\n\
track,route,75,2017-09-22 02:38:19.689999872\n\
route,coach,75,2017-09-22 03:12:14.448999936\n\
coach,competition,75,2017-09-22 03:12:24.558000128\n\
competition,personal,75,2017-09-22 03:12:34.729999872\n\
coach,team,76,2017-09-22 04:01:53.460999936\n\
team,competition,76,2017-09-22 04:02:15.280000000\n\
competition,personal,76,2017-09-22 04:03:50.100999936\n\
coach,track,77,2017-09-22 10:25:14.468000000\n\
track,route,77,2017-09-22 10:25:19.376999936\n\
route,coach,77,2017-09-22 10:35:42.135000064\n\
coach,competition,77,2017-09-22 10:35:56.924000000\n\
competition,coach,77,2017-09-22 10:36:24.659000064\n\
coach,competition,77,2017-09-22 10:36:35.315000064\n\
competition,track,77,2017-09-22 10:37:16.980000000\n\
track,route,77,2017-09-22 10:37:24.606000128\n\
route,track,77,2017-09-22 10:59:54.028999936\n\
track,personal,77,2017-09-22 11:00:04.060000000\n\
personal,coach,77,2017-09-22 11:00:20.142000128\n\
coach,track,77,2017-09-22 11:01:02.096999936\n\
track,coach,77,2017-09-22 11:01:14.088000000\n\
coach,route,77,2017-09-22 11:56:01.267000064\n\
route,track,77,2017-09-22 15:11:11.244000000\n\
track,team,77,2017-09-22 15:21:46.984000000\n\
team,competition,77,2017-09-22 15:21:49.513999872\n\
competition,personal,77,2017-09-22 15:22:38.243000064\n\
coach,team,78,2017-09-22 20:57:24.120000000\n\
team,competition,78,2017-09-22 20:57:34.137999872\n\
coach,team,79,2017-09-22 21:52:49.521999872\n\
team,competition,79,2017-09-22 21:53:04.875000064\n\
competition,personal,79,2017-09-22 21:54:33.355000064\n\
coach,team,80,2017-09-23 05:48:15.846000128\n\
team,personal,80,2017-09-23 05:48:43.692000000\n\
coach,track,81,2017-09-23 07:17:24.393999872\n\
track,coach,81,2017-09-23 07:17:36.079000064\n\
coach,track,81,2017-09-23 08:12:06.196999936\n\
track,route,81,2017-09-23 11:37:42.735000064\n\
route,coach,81,2017-09-23 11:37:53.131000064\n\
coach,team,81,2017-09-23 11:38:14.451000064\n\
team,competition,81,2017-09-23 11:38:27.163000064\n\
competition,personal,81,2017-09-23 11:39:44.583000064\n\
coach,competition,82,2017-09-23 14:19:47.382000128\n\
competition,coach,82,2017-09-23 14:21:05.169999872\n\
coach,competition,82,2017-09-23 14:21:27.052999936\n\
competition,coach,82,2017-09-23 14:21:52.216000000\n\
coach,team,82,2017-09-23 14:22:00.808000000\n\
team,competition,82,2017-09-23 14:22:04.512999936\n\
competition,badges,82,2017-09-23 14:25:03.996000000\n\
badges,routes,82,2017-09-23 14:25:31.900999936\n\
routes,route,82,2017-09-23 14:26:16.659000064\n\
route,routes,82,2017-09-23 14:26:29.396000000\n\
routes,coach,82,2017-09-23 14:27:16.216999936\n\
coach,competition,82,2017-09-23 14:27:19.532000000\n\
competition,personal,82,2017-09-23 14:27:23.620000000\n\
coach,team,83,2017-09-23 18:51:45.056000000\n\
team,competition,83,2017-09-23 18:52:00.342000128\n\
competition,team,83,2017-09-23 18:52:38.736999936\n\
team,competition,83,2017-09-23 18:53:28.694000128\n\
coach,team,84,2017-09-23 20:40:22.804000000\n\
team,competition,84,2017-09-23 20:40:32.144000000\n\
competition,personal,84,2017-09-23 20:41:03.292999936\n\
coach,track,85,2017-09-24 07:04:09.019000064\n\
track,coach,85,2017-09-24 07:04:24.223000064\n\
coach,track,85,2017-09-24 11:50:44.980000000\n\
track,route,85,2017-09-24 11:51:03.059000064\n\
route,coach,85,2017-09-24 11:51:12.311000064\n\
coach,competition,85,2017-09-24 11:51:33.887000064\n\
competition,team,85,2017-09-24 11:51:38.342000128\n\
coach,team,86,2017-09-24 12:45:45.129999872\n\
team,competition,86,2017-09-24 16:24:25.508999936\n\
competition,competition,86,2017-09-24 16:26:46.100000000\n\
competition,team,86,2017-09-24 17:45:28.715000064\n\
team,competition,86,2017-09-24 17:45:38.195000064\n\
competition,badges,86,2017-09-24 17:46:01.472999936\n\
badges,personal,86,2017-09-24 18:05:18.440999936\n\
coach,track,87,2017-09-02 14:17:51.779000064\n\
track,coach,87,2017-09-02 14:19:29.635000064\n\
coach,team,87,2017-09-02 14:19:43.276999936\n\
team,competition,87,2017-09-02 14:20:41.232999936\n\
competition,routes,87,2017-09-02 14:20:57.803000064\n\
routes,badges,87,2017-09-02 14:21:03.611000064\n\
badges,coach,87,2017-09-02 14:21:12.296000000\n\
coach,coach,87,2017-09-02 14:21:17.236999936\n\
coach,routes,87,2017-09-02 14:32:32.265999872\n\
routes,competition,87,2017-09-02 14:32:39.491000064\n\
coach,competition,88,2017-09-03 05:08:38.532000000\n\
competition,track,88,2017-09-03 06:06:01.830000128\n\
track,route,88,2017-09-03 06:06:07.020999936\n\
route,coach,88,2017-09-03 10:55:46.201999872\n\
coach,routes,88,2017-09-03 10:56:10.155000064\n\
routes,team,88,2017-09-03 10:56:15.303000064\n\
coach,badges,89,2017-09-03 12:43:21.502000128\n\
badges,personal,89,2017-09-03 12:44:49.644999936\n\
coach,team,90,2017-09-08 12:26:14.884999936\n\
team,track,90,2017-09-08 12:26:25.223000064\n\
track,team,90,2017-09-08 12:26:51.652000000\n\
team,competition,90,2017-09-08 12:26:55.679000064\n\
competition,routes,90,2017-09-08 12:26:57.595000064\n\
routes,badges,90,2017-09-08 12:27:02.715000064\n\
badges,team,90,2017-09-08 12:27:10.254000128\n\
team,routes,90,2017-09-08 12:27:24.628000000\n\
routes,route,90,2017-09-08 12:27:34.128000000\n\
coach,personal,91,2017-09-12 16:29:50.006000128\n\
personal,coach,91,2017-09-12 16:31:35.451000064\n\
coach,team,92,2017-09-12 20:00:37.702000128\n\
team,competition,92,2017-09-12 20:00:53.473999872\n\
coach,,93,2017-09-18 11:44:23.212999936\n\
coach,coach,94,2017-09-19 14:49:58.847000064\n\
coach,personal,94,2017-09-19 14:49:59.017999872\n\
personal,track,94,2017-09-19 14:50:05.889999872\n\
track,personal,94,2017-09-19 14:50:09.999000064\n\
personal,bugreport,94,2017-09-19 16:01:29.425999872\n\
bugreport,team,94,2017-09-19 16:01:30.604999936\n\
team,track,94,2017-09-19 16:02:29.007000064\n\
track,coach,94,2017-09-19 16:02:52.822000128\n\
coach,personal,94,2017-09-20 14:40:48.537999872\n\
personal,coach,94,2017-09-20 14:40:55.660999936\n\
coach,track,94,2017-09-20 14:41:09.054000128\n\
track,route,94,2017-09-20 14:41:14.958000128\n\
route,track,94,2017-09-20 14:41:23.435000064\n\
track,route,94,2017-09-20 14:50:22.206000128\n\
route,coach,94,2017-09-20 16:23:53.544999936\n\
coach,competition,95,2017-09-20 17:22:55.524000000\n\
competition,coach,95,2017-09-20 17:23:28.507000064\n\
coach,team,95,2017-09-20 17:23:44.864000000\n\
coach,track,96,2017-09-22 10:39:33.486000128\n\
track,coach,96,2017-09-22 10:39:43.265999872\n\
coach,track,97,2017-09-22 13:21:35.052000000\n\
track,route,97,2017-09-22 13:21:43.390000128\n\
route,coach,97,2017-09-22 13:21:50.159000064\n\
coach,competition,97,2017-09-22 13:22:05.063000064\n\
coach,personal,98,2017-09-01 15:33:13.824999936\n\
personal,coach,98,2017-09-01 15:34:32.431000064\n\
coach,team,98,2017-09-01 15:35:12.622000128\n\
team,competition,98,2017-09-01 15:35:17.691000064\n\
competition,coach,98,2017-09-01 15:35:30.924000000\n\
coach,coach,98,2017-09-01 15:35:38.641999872\n\
coach,personal,98,2017-09-01 15:48:05.494000128\n\
personal,coach,98,2017-09-01 15:48:32.662000128\n\
coach,competition,98,2017-09-01 15:48:39.521999872\n\
competition,team,98,2017-09-01 15:48:48.633999872\n\
team,routes,98,2017-09-01 15:48:57.456000000\n\
coach,team,99,2017-09-01 19:38:16.943000064\n\
team,competition,99,2017-09-01 19:39:06.777999872\n\
competition,badges,99,2017-09-01 19:39:25.759000064\n\
badges,coach,99,2017-09-01 19:39:33.544000000\n\
coach,team,100,2017-09-02 10:02:19.961999872\n\
team,competition,100,2017-09-02 10:02:29.811000064\n\
competition,routes,100,2017-09-02 10:02:49.235000064\n\
routes,personal,100,2017-09-02 10:03:16.199000064\n\
personal,routes,100,2017-09-02 10:03:21.027000064\n\
routes,badges,100,2017-09-02 10:03:23.888999936\n\
coach,team,101,2017-09-02 16:25:09.827000064\n\
team,competition,101,2017-09-02 16:26:41.886000128\n\
competition,team,101,2017-09-02 16:26:53.944000000\n\
team,track,101,2017-09-02 16:27:05.601999872\n\
track,coach,101,2017-09-02 16:27:14.324000000\n\
coach,track,102,2017-09-03 06:29:32.592000000\n\
track,coach,102,2017-09-03 06:29:37.667000064\n\
coach,track,102,2017-09-03 07:24:31.958000128\n\
track,track,102,2017-09-03 08:02:25.091000064\n\
track,team,102,2017-09-03 09:04:48.168999936\n\
team,track,102,2017-09-03 09:05:04.865999872\n\
track,coach,102,2017-09-03 09:05:26.383000064\n\
coach,track,102,2017-09-03 09:24:33.939000064\n\
track,route,102,2017-09-03 09:25:45.847000064\n\
route,track,102,2017-09-03 09:25:48.843000064\n\
track,coach,102,2017-09-03 09:26:04.276999936\n\
coach,competition,102,2017-09-03 09:26:05.784000000\n\
competition,team,102,2017-09-03 09:26:14.455000064\n\
team,competition,102,2017-09-03 09:26:24.568999936\n\
coach,competition,103,2017-09-03 10:51:53.064000000\n\
competition,coach,103,2017-09-03 10:52:01.617999872\n\
coach,team,103,2017-09-03 10:52:07.064000000\n\
coach,competition,104,2017-09-03 14:54:58.041999872\n\
competition,coach,104,2017-09-03 15:00:22.291000064\n\
coach,competition,104,2017-09-03 15:00:31.715000064\n\
competition,coach,104,2017-09-03 15:00:33.904999936\n\
coach,team,104,2017-09-03 15:00:37.620999936\n\
team,competition,104,2017-09-03 15:00:42.055000064\n\
competition,badges,104,2017-09-03 15:01:00.312999936\n\
badges,routes,104,2017-09-03 15:01:08.475000064\n\
routes,route,104,2017-09-03 15:01:37.880999936\n\
route,personal,104,2017-09-03 15:01:40.015000064\n\
personal,routes,104,2017-09-03 15:01:57.751000064\n\
routes,route,104,2017-09-03 15:02:02.864999936\n\
coach,team,105,2017-09-03 18:34:50.392000000\n\
team,competition,105,2017-09-03 18:34:59.360999936\n\
competition,badges,105,2017-09-03 18:35:09.551000064\n\
coach,track,106,2017-09-04 02:22:12.808999936\n\
track,route,106,2017-09-04 02:22:17.024000000\n\
route,track,106,2017-09-04 03:07:02.899000064\n\
track,routes,106,2017-09-04 03:07:09.208999936\n\
routes,coach,106,2017-09-04 03:07:14.361999872\n\
coach,team,106,2017-09-04 03:17:11.224000000\n\
team,competition,106,2017-09-04 03:34:12.180999936\n\
competition,routes,106,2017-09-04 03:34:24.892999936\n\
routes,route,106,2017-09-04 03:34:32.289999872\n\
route,competition,106,2017-09-04 03:34:36.793999872\n\
competition,route,106,2017-09-04 04:50:30.992000000\n\
route,routes,106,2017-09-04 05:10:12.840000000\n\
coach,track,107,2017-09-04 15:07:29.035000064\n\
track,route,107,2017-09-04 15:07:33.912999936\n\
route,track,107,2017-09-04 15:48:07.601999872\n\
track,competition,107,2017-09-04 15:48:15.128999936\n\
competition,team,107,2017-09-04 15:48:30.131000064\n\
team,competition,107,2017-09-04 15:48:34.296000000\n\
competition,competition,107,2017-09-04 15:48:43.416999936\n\
competition,track,107,2017-09-04 16:23:50.537999872\n\
track,coach,107,2017-09-04 16:24:01.140000000\n\
coach,track,107,2017-09-05 02:14:26.132999936\n\
track,route,107,2017-09-05 02:14:32.404000000\n\
route,track,107,2017-09-05 02:52:36.452999936\n\
track,competition,107,2017-09-05 02:52:40.073999872\n\
competition,track,107,2017-09-05 03:29:35.852000000\n\
track,team,107,2017-09-05 03:29:40.540999936\n\
coach,,108,2017-09-05 04:14:26.636999936\n\
coach,competition,109,2017-09-05 05:42:41.585999872\n\
competition,coach,109,2017-09-05 05:42:51.977999872\n\
coach,competition,109,2017-09-05 05:42:57.360000000\n\
competition,coach,109,2017-09-05 05:43:10.227000064\n\
coach,team,109,2017-09-05 05:43:12.216999936\n\
team,competition,109,2017-09-05 05:43:15.793999872\n\
competition,personal,109,2017-09-05 05:43:41.638000128\n\
personal,competition,109,2017-09-05 05:43:48.697999872\n\
competition,routes,109,2017-09-05 05:44:13.412999936\n\
routes,route,109,2017-09-05 05:44:30.268999936\n\
route,routes,109,2017-09-05 05:44:34.718000128\n\
routes,route,109,2017-09-05 05:45:23.880999936\n\
route,routes,109,2017-09-05 05:45:27.345999872\n\
routes,route,109,2017-09-05 05:46:15.116000000\n\
route,routes,109,2017-09-05 05:46:18.169999872\n\
routes,route,109,2017-09-05 05:46:25.008000000\n\
route,routes,109,2017-09-05 05:46:28.172999936\n\
routes,route,109,2017-09-05 05:46:43.700000000\n\
route,routes,109,2017-09-05 05:46:47.436000000\n\
routes,coach,109,2017-09-05 05:46:57.892000000\n\
coach,team,110,2017-09-06 09:19:12.750000128\n\
team,personal,110,2017-09-06 09:19:20.640999936\n\
personal,team,110,2017-09-06 09:19:54.983000064\n\
coach,track,111,2017-09-06 15:38:41.620999936\n\
track,route,111,2017-09-06 15:38:45.534000128\n\
route,coach,111,2017-09-06 15:59:30.771000064\n\
coach,competition,111,2017-09-06 15:59:42.244999936\n\
competition,team,111,2017-09-06 15:59:45.107000064\n\
team,routes,111,2017-09-06 15:59:51.049999872\n\
routes,route,111,2017-09-06 16:00:03.006000128\n\
route,routes,111,2017-09-06 16:00:04.875000064\n\
routes,route,111,2017-09-06 16:02:15.727000064\n\
coach,,112,2017-09-06 16:40:17.164999936\n\
coach,track,113,2017-09-07 02:14:20.632000000\n\
track,route,113,2017-09-07 02:14:24.979000064\n\
route,competition,113,2017-09-07 02:54:26.288000000\n\
competition,route,113,2017-09-07 04:37:38.043000064\n\
route,track,113,2017-09-07 04:37:43.336999936\n\
track,team,113,2017-09-07 04:37:47.531000064\n\
team,competition,113,2017-09-07 04:37:50.396000000\n\
competition,badges,113,2017-09-07 04:38:08.782000128\n\
coach,track,114,2017-09-07 14:48:57.961999872\n\
track,coach,114,2017-09-07 14:49:03.111000064\n\
coach,competition,114,2017-09-07 15:46:23.088999936\n\
competition,track,114,2017-09-07 15:58:13.257999872\n\
track,route,114,2017-09-07 15:58:18.243000064\n\
route,track,114,2017-09-07 15:58:24.519000064\n\
track,routes,114,2017-09-07 15:58:30.908999936\n\
routes,route,114,2017-09-07 15:58:36.331000064\n\
route,routes,114,2017-09-07 15:58:41.168999936\n\
coach,team,115,2017-09-07 19:16:03.540000000\n\
team,competition,115,2017-09-07 19:16:16.640000000\n\
competition,badges,115,2017-09-07 19:16:44.120000000\n\
badges,routes,115,2017-09-07 19:16:49.632000000\n\
routes,route,115,2017-09-07 19:19:40.311000064\n\
coach,team,116,2017-09-09 11:28:12.215000064\n\
team,competition,116,2017-09-09 11:28:21.654000128\n\
coach,team,117,2017-09-09 18:16:40.624000000\n\
coach,track,118,2017-09-10 06:01:07.270000128\n\
track,track,118,2017-09-10 06:01:13.760000000\n\
track,competition,118,2017-09-10 09:03:18.409999872\n\
competition,team,118,2017-09-10 09:03:22.139000064\n\
team,track,118,2017-09-10 09:03:32.718000128\n\
track,route,118,2017-09-10 09:54:33.720999936\n\
route,track,118,2017-09-10 09:54:37.705999872\n\
track,coach,118,2017-09-10 09:54:50.315000064\n\
coach,team,118,2017-09-10 09:54:52.614000128\n\
team,coach,118,2017-09-10 09:54:55.073999872\n\
coach,competition,118,2017-09-10 10:08:00.448999936\n\
competition,coach,118,2017-09-10 10:08:16.383000064\n\
coach,badges,118,2017-09-10 10:08:27.488999936\n\
coach,team,119,2017-09-11 03:06:15.132000000\n\
team,competition,119,2017-09-11 03:06:23.444000000\n\
coach,team,120,2017-09-11 16:50:52.572000000\n\
coach,competition,121,2017-09-11 18:26:38.808000000\n\
coach,track,122,2017-09-12 15:09:43.331000064\n\
track,route,122,2017-09-12 15:09:46.225999872\n\
route,coach,122,2017-09-12 15:56:21.080999936\n\
coach,competition,122,2017-09-12 15:56:23.983000064\n\
competition,team,122,2017-09-12 16:04:14.876999936\n\
coach,track,123,2017-09-13 02:15:08.804999936\n\
track,route,123,2017-09-13 02:15:28.708000000\n\
route,track,123,2017-09-13 02:15:53.091000064\n\
track,coach,123,2017-09-13 02:18:26.740000000\n\
coach,track,123,2017-09-13 03:00:06.324999936\n\
track,route,123,2017-09-13 03:00:15.104000000\n\
route,competition,123,2017-09-13 03:00:17.779000064\n\
competition,route,123,2017-09-13 03:18:16.604000000\n\
route,track,123,2017-09-13 03:18:23.736000000\n\
track,routes,123,2017-09-13 03:18:29.028000000\n\
routes,route,123,2017-09-13 03:18:32.744000000\n\
route,routes,123,2017-09-13 03:18:36.545999872\n\
routes,route,123,2017-09-13 03:18:39.952999936\n\
route,routes,123,2017-09-13 03:18:41.545999872\n\
routes,route,123,2017-09-13 03:18:47.587000064\n\
route,routes,123,2017-09-13 03:18:49.168000000\n\
coach,,124,2017-09-13 04:18:07.360999936\n\
coach,team,125,2017-09-13 10:30:21.171000064\n\
team,competition,125,2017-09-13 10:30:24.739000064\n\
coach,team,126,2017-09-15 19:19:01.792999936\n\
team,competition,126,2017-09-15 19:19:05.792000000\n\
competition,team,126,2017-09-15 19:19:17.948999936\n\
team,badges,126,2017-09-15 19:19:25.548999936\n\
coach,team,127,2017-09-16 15:07:05.311000064\n\
team,competition,127,2017-09-16 15:07:25.616000000\n\
coach,track,128,2017-09-17 06:10:31.456999936\n\
track,coach,128,2017-09-17 06:10:37.355000064\n\
coach,track,128,2017-09-17 10:51:48.572999936\n\
track,route,128,2017-09-17 10:51:54.379000064\n\
route,track,128,2017-09-17 10:52:02.567000064\n\
track,coach,128,2017-09-17 10:52:17.553999872\n\
coach,team,128,2017-09-17 10:52:20.497999872\n\
team,competition,128,2017-09-17 10:52:21.575000064\n\
competition,team,128,2017-09-17 10:52:38.584000000\n\
team,competition,128,2017-09-17 11:00:21.923000064\n\
coach,competition,129,2017-09-17 12:18:40.367000064\n\
competition,coach,129,2017-09-17 12:18:49.710000128\n\
coach,competition,130,2017-09-18 05:41:59.780000000\n\
competition,team,130,2017-09-18 05:42:05.820999936\n\
coach,competition,131,2017-09-20 02:46:08.508999936\n\
coach,track,132,2017-09-20 14:59:50.603000064\n\
track,route,132,2017-09-20 14:59:59.425999872\n\
coach,competition,133,2017-09-20 16:14:25.017999872\n\
competition,team,133,2017-09-20 16:14:33.934000128\n\
team,routes,133,2017-09-20 16:14:43.468999936\n\
routes,route,133,2017-09-20 16:15:09.020000000\n\
route,routes,133,2017-09-20 16:15:11.214000128\n\
coach,competition,134,2017-09-20 19:55:07.372999936\n\
competition,coach,134,2017-09-20 19:55:21.972000000\n\
coach,team,134,2017-09-20 19:55:31.356999936\n\
team,routes,134,2017-09-20 19:55:37.539000064\n\
routes,route,134,2017-09-20 19:56:04.899000064\n\
coach,track,135,2017-09-21 02:14:54.600000000\n\
track,route,135,2017-09-21 02:15:09.839000064\n\
route,track,135,2017-09-21 02:51:28.555000064\n\
track,routes,135,2017-09-21 03:05:12.326000128\n\
routes,team,135,2017-09-21 03:05:16.983000064\n\
team,competition,135,2017-09-21 03:05:22.060999936\n\
coach,track,136,2017-09-21 15:18:27.332999936\n\
track,route,136,2017-09-21 15:18:31.622000128\n\
route,coach,136,2017-09-21 15:56:04.307000064\n\
coach,team,136,2017-09-21 16:01:36.097999872\n\
team,competition,136,2017-09-21 16:01:59.718000128\n\
competition,routes,136,2017-09-21 16:02:12.775000064\n\
routes,route,136,2017-09-21 16:02:27.340999936\n\
route,routes,136,2017-09-21 16:02:29.244999936\n\
routes,route,136,2017-09-21 16:02:31.044999936\n\
coach,track,137,2017-09-22 02:13:56.334000128\n\
track,route,137,2017-09-22 02:14:04.745999872\n\
route,track,137,2017-09-22 02:53:40.358000128\n\
track,coach,137,2017-09-22 02:53:45.120000000\n\
coach,competition,137,2017-09-22 03:10:32.678000128\n\
competition,track,137,2017-09-22 03:10:42.692000000\n\
track,routes,137,2017-09-22 03:10:47.496999936\n\
routes,route,137,2017-09-22 03:10:50.625999872\n\
route,routes,137,2017-09-22 03:10:52.252000000\n\
routes,route,137,2017-09-22 03:11:04.494000128\n\
route,routes,137,2017-09-22 03:11:06.385999872\n\
routes,route,137,2017-09-22 03:11:21.284999936\n\
route,routes,137,2017-09-22 03:11:23.699000064\n\
coach,personal,138,2017-09-22 07:21:14.342000128\n\
personal,coach,138,2017-09-22 07:21:16.857999872\n\
coach,competition,139,2017-09-22 11:13:17.844999936\n\
coach,competition,140,2017-09-23 12:47:38.854000128\n\
competition,team,140,2017-09-23 12:47:42.492999936\n\
coach,competition,141,2017-09-24 18:48:28.576000000\n\
coach,personal,142,2017-09-01 15:38:57.070000128\n\
personal,team,142,2017-09-01 15:40:46.156999936\n\
team,coach,142,2017-09-01 15:41:23.550000128\n\
coach,routes,142,2017-09-01 15:41:33.820000000\n\
routes,coach,142,2017-09-01 15:41:39.012999936\n\
coach,track,142,2017-09-01 15:41:47.014000128\n\
track,personal,142,2017-09-01 15:41:53.968000000\n\
personal,bugreport,142,2017-09-01 15:42:07.308999936\n\
bugreport,competition,142,2017-09-01 15:42:11.792000000\n\
competition,badges,142,2017-09-01 15:42:23.116000000\n\
badges,coach,142,2017-09-01 15:42:34.062000128\n\
coach,personal,143,2017-09-01 18:12:09.276999936\n\
personal,coach,143,2017-09-01 18:12:32.584000000\n\
coach,team,143,2017-09-01 18:12:50.296000000\n\
team,competition,143,2017-09-01 18:12:54.883000064\n\
competition,coach,143,2017-09-01 18:13:19.056999936\n\
coach,routes,143,2017-09-01 18:13:34.126000128\n\
routes,personal,143,2017-09-01 18:14:09.513999872\n\
personal,routes,143,2017-09-01 18:14:14.468000000\n\
routes,personal,143,2017-09-01 18:14:16.694000128\n\
personal,routes,143,2017-09-01 18:14:18.039000064\n\
coach,track,144,2017-09-02 07:22:04.063000064\n\
track,route,144,2017-09-02 07:22:12.427000064\n\
route,track,144,2017-09-02 08:47:16.132000000\n\
track,route,144,2017-09-02 08:47:20.551000064\n\
route,track,144,2017-09-02 08:47:25.068000000\n\
track,routes,144,2017-09-02 08:47:27.935000064\n\
routes,route,144,2017-09-02 08:47:32.792000000\n\
route,routes,144,2017-09-02 08:47:35.702000128\n\
routes,coach,144,2017-09-02 08:47:39.955000064\n\
coach,coach,144,2017-09-02 08:47:42.963000064\n\
coach,competition,144,2017-09-02 08:54:14.680000000\n\
competition,personal,144,2017-09-02 08:54:23.644000000\n\
personal,coach,144,2017-09-02 08:54:37.457999872\n\
coach,coach,144,2017-09-02 08:54:43.559000064\n\
coach,team,144,2017-09-02 09:01:35.372000000\n\
team,competition,144,2017-09-02 09:01:56.232999936\n\
competition,routes,144,2017-09-02 09:02:16.636000000\n\
routes,route,144,2017-09-02 09:02:21.096000000\n\
route,personal,144,2017-09-02 09:02:25.171000064\n\
personal,routes,144,2017-09-02 09:02:39.880000000\n\
routes,route,144,2017-09-02 09:02:43.742000128\n\
route,routes,144,2017-09-02 09:02:46.668000000\n\
routes,route,144,2017-09-02 09:02:51.347000064\n\
route,routes,144,2017-09-02 09:02:56.020000000\n\
routes,route,144,2017-09-02 09:02:58.526000128\n\
route,personal,144,2017-09-02 09:03:04.620000000\n\
personal,routes,144,2017-09-02 09:03:09.175000064\n\
routes,badges,144,2017-09-02 09:03:13.848999936\n\
badges,coach,144,2017-09-02 09:03:22.382000128\n\
coach,competition,144,2017-09-02 09:03:50.591000064\n\
competition,coach,144,2017-09-02 09:04:20.267000064\n\
coach,personal,144,2017-09-02 09:04:24.304000000\n\
personal,coach,144,2017-09-02 09:04:37.068000000\n\
coach,personal,144,2017-09-02 09:04:41.715000064\n\
personal,coach,144,2017-09-02 09:04:45.470000128\n\
coach,routes,144,2017-09-02 09:04:47.521999872\n\
routes,route,144,2017-09-02 09:04:51.652000000\n\
route,personal,144,2017-09-02 09:04:56.611000064\n\
personal,routes,144,2017-09-02 09:05:05.352000000\n\
routes,route,144,2017-09-02 09:05:07.452999936\n\
route,routes,144,2017-09-02 09:05:15.216000000\n\
routes,route,144,2017-09-02 09:05:47.046000128\n\
coach,team,145,2017-09-02 17:19:19.296000000\n\
team,routes,145,2017-09-02 17:19:31.747000064\n\
routes,route,145,2017-09-02 17:20:09.367000064\n\
route,personal,145,2017-09-02 17:20:11.844000000\n\
personal,routes,145,2017-09-02 17:20:23.359000064\n\
routes,route,145,2017-09-02 17:20:27.259000064\n\
route,routes,145,2017-09-02 17:20:29.035000064\n\
routes,competition,145,2017-09-02 17:20:40.584999936\n\
coach,competition,146,2017-09-03 18:29:35.657999872\n\
competition,coach,146,2017-09-03 18:29:41.376999936\n\
coach,team,146,2017-09-03 18:29:55.840000000\n\
team,competition,146,2017-09-03 18:30:03.873999872\n\
competition,routes,146,2017-09-03 18:30:46.268000000\n\
coach,competition,147,2017-09-05 04:55:56.575000064\n\
competition,coach,147,2017-09-05 04:56:06.836000000\n\
coach,team,147,2017-09-05 04:56:21.256000000\n\
coach,team,148,2017-09-07 15:42:09.006000128\n\
team,competition,148,2017-09-07 15:42:22.112999936\n\
competition,track,148,2017-09-07 15:42:47.006000128\n\
track,coach,148,2017-09-07 15:43:03.075000064\n\
coach,track,148,2017-09-09 07:06:28.216999936\n\
track,team,148,2017-09-09 07:06:33.676000000\n\
team,competition,148,2017-09-09 07:06:41.067000064\n\
competition,team,148,2017-09-09 07:07:03.166000128\n\
team,personal,148,2017-09-09 07:09:40.971000064\n\
personal,team,148,2017-09-09 07:10:11.366000128\n\
team,badges,148,2017-09-09 07:10:16.686000128\n\
coach,competition,149,2017-09-11 04:58:53.782000128\n\
competition,coach,149,2017-09-11 04:59:09.451000064\n\
coach,routes,150,2017-09-11 05:26:43.224999936\n\
routes,track,150,2017-09-11 05:31:34.297999872\n\
track,route,150,2017-09-11 05:31:40.641999872\n\
route,track,150,2017-09-11 05:52:38.224000000\n\
track,coach,150,2017-09-11 05:52:45.062000128\n\
coach,track,150,2017-09-11 15:01:47.616000000\n\
track,route,150,2017-09-11 15:02:07.160000000\n\
route,coach,150,2017-09-11 15:17:33.689999872\n\
coach,badges,150,2017-09-11 15:22:24.647000064\n\
badges,team,150,2017-09-11 15:22:51.273999872\n\
team,competition,150,2017-09-11 15:23:13.695000064\n\
competition,routes,150,2017-09-11 15:23:35.940999936\n\
routes,coach,150,2017-09-11 15:23:46.182000128\n\
coach,,151,2017-09-11 17:26:06.347000064\n\
coach,personal,152,2017-09-13 04:54:55.417999872\n\
personal,coach,152,2017-09-13 04:55:07.638000128\n\
coach,team,152,2017-09-13 04:55:11.265999872\n\
team,competition,152,2017-09-13 04:55:20.019000064\n\
competition,routes,152,2017-09-13 04:55:53.051000064\n\
routes,route,152,2017-09-13 04:56:03.400999936\n\
route,routes,152,2017-09-13 04:56:05.800999936\n\
coach,track,153,2017-09-13 05:32:30.332999936\n\
track,coach,153,2017-09-13 05:32:35.177999872\n\
coach,track,153,2017-09-13 05:49:54.692999936\n\
track,route,153,2017-09-13 05:52:30.948999936\n\
route,track,153,2017-09-13 05:52:33.900999936\n\
track,routes,153,2017-09-13 05:52:44.679000064\n\
routes,route,153,2017-09-13 05:52:49.604999936\n\
coach,track,154,2017-09-13 14:53:29.560000000\n\
track,route,154,2017-09-13 14:53:54.897999872\n\
route,track,154,2017-09-13 15:08:23.360999936\n\
track,routes,154,2017-09-13 15:08:35.275000064\n\
routes,coach,154,2017-09-13 15:08:39.374000128\n\
coach,badges,154,2017-09-13 15:08:43.342000128\n\
badges,team,154,2017-09-13 15:11:44.412999936\n\
coach,coach,155,2017-09-13 19:33:45.745999872\n\
coach,track,156,2017-09-14 05:30:38.110000128\n\
track,route,156,2017-09-14 05:30:44.548000000\n\
route,track,156,2017-09-14 05:49:18.948999936\n\
track,team,156,2017-09-14 05:49:39.376999936\n\
coach,track,157,2017-09-14 14:50:53.280999936\n\
track,route,157,2017-09-14 14:50:58.260999936\n\
route,coach,157,2017-09-14 15:07:04.423000064\n\
coach,competition,157,2017-09-14 15:14:13.993999872\n\
competition,coach,157,2017-09-14 15:14:26.398000128\n\
coach,coach,157,2017-09-14 15:14:38.945999872\n\
coach,team,157,2017-09-14 15:31:42.139000064\n\
team,routes,157,2017-09-14 15:32:06.566000128\n\
routes,badges,157,2017-09-14 15:32:29.862000128\n\
coach,team,158,2017-09-15 11:34:42.456999936\n\
team,competition,158,2017-09-15 11:35:07.368000000\n\
competition,coach,158,2017-09-15 11:35:07.943000064\n\
coach,route,159,2017-09-15 13:28:51.502000128\n\
route,track,159,2017-09-15 13:28:55.598000128\n\
track,routes,159,2017-09-15 13:29:02.676999936\n\
routes,route,159,2017-09-15 13:29:08.764999936\n\
route,routes,159,2017-09-15 13:29:12.492000000\n\
routes,badges,159,2017-09-15 13:29:19.944999936\n\
badges,team,159,2017-09-15 13:29:29.076000000\n\
team,competition,159,2017-09-15 13:29:44.620000000\n\
coach,competition,160,2017-09-15 21:50:29.995000064\n\
competition,team,160,2017-09-15 21:51:01.056999936\n\
team,routes,160,2017-09-15 21:51:08.574000128\n\
routes,route,160,2017-09-15 21:51:39.334000128\n\
route,routes,160,2017-09-15 21:51:42.407000064\n\
routes,route,160,2017-09-15 21:51:49.195000064\n\
route,routes,160,2017-09-15 21:51:51.516999936\n\
routes,route,160,2017-09-15 21:51:57.260999936\n\
route,routes,160,2017-09-15 21:51:59.214000128\n\
routes,coach,160,2017-09-15 21:52:36.199000064\n\
coach,badges,161,2017-09-16 07:22:49.816999936\n\
coach,competition,162,2017-09-16 11:35:13.041999872\n\
competition,coach,162,2017-09-16 11:36:15.784999936\n\
coach,personal,162,2017-09-16 11:36:28.068000000\n\
personal,coach,162,2017-09-16 11:36:41.704999936\n\
coach,routes,162,2017-09-16 11:36:50.467000064\n\
routes,route,162,2017-09-16 11:36:56.003000064\n\
coach,competition,163,2017-09-17 11:15:56.823000064\n\
competition,team,163,2017-09-17 11:16:17.724000000\n\
team,coach,163,2017-09-17 11:16:39.448999936\n\
coach,track,164,2017-09-18 05:30:01.247000064\n\
track,route,164,2017-09-18 05:30:19.977999872\n\
route,track,164,2017-09-18 05:48:06.176999936\n\
track,coach,164,2017-09-18 05:48:11.111000064\n\
coach,track,164,2017-09-18 15:05:44.136999936\n\
track,route,164,2017-09-18 15:05:48.063000064\n\
route,track,164,2017-09-18 15:23:00.048999936\n\
track,team,164,2017-09-18 15:23:08.184999936\n\
team,badges,164,2017-09-18 15:23:10.396000000\n\
coach,personal,165,2017-09-18 17:13:40.144999936\n\
personal,coach,165,2017-09-18 17:14:48.579000064\n\
coach,personal,165,2017-09-18 17:14:52.196000000\n\
coach,team,166,2017-09-20 15:32:29.411000064\n\
team,competition,166,2017-09-20 15:33:33.694000128\n\
coach,team,167,2017-09-23 10:54:41.303000064\n\
team,competition,167,2017-09-23 10:55:11.303000064\n\
competition,coach,167,2017-09-23 10:55:23.880999936\n\
coach,track,167,2017-09-23 11:11:34.513999872\n\
track,route,167,2017-09-23 11:11:40.488000000\n\
route,coach,167,2017-09-23 12:45:04.919000064\n\
coach,competition,167,2017-09-23 12:52:40.320999936\n\
competition,routes,167,2017-09-23 12:53:05.604000000\n\
routes,route,167,2017-09-23 12:53:12.412000000\n\
route,routes,167,2017-09-23 12:53:15.596999936\n\
routes,badges,167,2017-09-23 12:53:43.126000128\n\
badges,team,167,2017-09-23 12:53:47.092000000\n\
coach,badges,168,2017-09-24 07:37:34.166000128\n\
badges,coach,168,2017-09-24 07:37:49.059000064\n\
coach,team,168,2017-09-24 07:39:50.608000000\n\
team,competition,168,2017-09-24 07:41:01.343000064\n\
coach,track,169,2017-09-05 15:27:11.643000064\n\
track,route,169,2017-09-05 15:32:11.044000000\n\
route,track,169,2017-09-05 15:33:48.396999936\n\
track,coach,169,2017-09-05 15:33:54.320000000\n\
coach,coach,169,2017-09-05 15:34:13.060999936\n\
coach,track,169,2017-09-05 15:40:10.288999936\n\
track,coach,169,2017-09-05 15:40:29.038000128\n\
coach,personal,169,2017-09-05 15:40:50.980999936\n\
personal,coach,169,2017-09-05 15:41:36.278000128\n\
coach,track,170,2017-09-10 12:42:21.192999936\n\
track,coach,170,2017-09-10 12:42:46.560999936\n\
coach,team,170,2017-09-11 09:32:41.457999872\n\
team,competition,170,2017-09-11 09:32:47.903000064\n\
competition,routes,170,2017-09-11 09:33:20.963000064\n\
routes,coach,170,2017-09-11 09:33:27.124999936\n\
coach,track,170,2017-09-11 09:33:32.907000064\n\
track,team,170,2017-09-11 09:33:38.222000128\n\
coach,,171,2017-09-11 10:13:05.455000064\n\
coach,team,172,2017-09-11 17:23:23.776000000\n\
team,competition,172,2017-09-11 17:23:49.168999936\n\
coach,track,173,2017-09-12 11:07:23.468000000\n\
track,coach,173,2017-09-12 11:07:33.591000064\n\
coach,personal,173,2017-09-12 18:44:51.659000064\n\
personal,coach,173,2017-09-12 18:45:21.113999872\n\
coach,team,173,2017-09-12 18:46:01.300999936\n\
team,routes,173,2017-09-12 18:46:20.208000000\n\
routes,route,173,2017-09-12 18:46:49.256999936\n\
route,routes,173,2017-09-12 18:46:57.656000000\n\
routes,route,173,2017-09-12 18:47:41.720000000\n\
route,routes,173,2017-09-12 18:47:46.580999936\n\
routes,track,173,2017-09-12 18:48:36.191000064\n\
track,team,173,2017-09-12 18:48:44.705999872\n\
team,competition,173,2017-09-12 18:48:54.331000064\n\
competition,team,173,2017-09-12 18:49:38.441999872\n\
team,competition,173,2017-09-12 18:49:49.699000064\n\
competition,routes,173,2017-09-12 18:50:06.211000064\n\
routes,route,173,2017-09-12 18:50:37.068000000\n\
route,routes,173,2017-09-12 18:50:44.185999872\n\
coach,team,174,2017-09-13 05:14:25.760999936\n\
team,routes,174,2017-09-13 05:14:51.087000064\n\
routes,route,174,2017-09-13 05:15:23.539000064\n\
route,routes,174,2017-09-13 05:15:32.700999936\n\
routes,coach,174,2017-09-13 05:16:29.009999872\n\
coach,team,175,2017-09-13 14:33:00.832999936\n\
team,routes,175,2017-09-13 14:33:28.899000064\n\
routes,route,175,2017-09-13 14:33:40.430000128\n\
route,routes,175,2017-09-13 14:33:48.102000128\n\
routes,route,175,2017-09-13 14:33:57.660000000\n\
route,routes,175,2017-09-13 14:34:01.707000064\n\
routes,personal,175,2017-09-13 14:34:02.820000000\n\
personal,bugreport,175,2017-09-13 14:34:06.500000000\n\
bugreport,personal,175,2017-09-13 14:34:13.940999936\n\
personal,coach,175,2017-09-13 14:34:45.230000128\n\
coach,team,176,2017-09-14 14:44:56.079000064\n\
team,competition,176,2017-09-14 14:48:05.515000064\n\
competition,team,176,2017-09-14 14:48:30.188000000\n\
team,competition,176,2017-09-14 14:48:47.040999936\n\
coach,track,177,2017-09-15 10:59:08.096000000\n\
track,coach,177,2017-09-15 11:09:39.942000128\n\
coach,competition,178,2017-09-15 15:33:28.198000128\n\
competition,coach,178,2017-09-15 15:33:43.891000064\n\
coach,competition,178,2017-09-15 15:33:55.708999936\n\
competition,coach,178,2017-09-15 15:33:57.654000128\n\
coach,team,178,2017-09-15 15:34:14.656000000\n\
team,routes,178,2017-09-15 15:34:29.184999936\n\
routes,route,178,2017-09-15 15:35:05.076000000\n\
route,routes,178,2017-09-15 15:35:08.500000000\n\
routes,route,178,2017-09-15 15:35:33.724000000\n\
route,routes,178,2017-09-15 15:35:35.947000064\n\
routes,route,178,2017-09-15 15:35:43.879000064\n\
route,routes,178,2017-09-15 15:35:49.198000128\n\
coach,competition,179,2017-09-15 18:38:55.272999936\n\
competition,coach,179,2017-09-15 18:39:03.644000000\n\
coach,competition,179,2017-09-15 18:39:19.260000000\n\
competition,coach,179,2017-09-15 18:40:30.849999872\n\
coach,competition,179,2017-09-15 18:40:38.755000064\n\
competition,coach,179,2017-09-15 18:40:47.414000128\n\
coach,competition,179,2017-09-15 18:40:52.399000064\n\
competition,coach,179,2017-09-15 18:40:58.640000000\n\
coach,routes,179,2017-09-15 18:41:01.315000064\n\
routes,route,179,2017-09-15 18:41:06.143000064\n\
route,personal,179,2017-09-15 18:41:09.286000128\n\
personal,routes,179,2017-09-15 18:41:44.142000128\n\
routes,route,179,2017-09-15 18:41:51.611000064\n\
route,routes,179,2017-09-15 18:42:00.851000064\n\
routes,route,179,2017-09-15 18:42:36.744000000\n\
route,routes,179,2017-09-15 18:42:38.784999936\n\
routes,team,179,2017-09-15 18:42:48.547000064\n\
team,competition,179,2017-09-15 18:42:52.308000000\n\
competition,badges,179,2017-09-15 18:43:24.244000000\n\
coach,competition,180,2017-09-16 11:36:07.334000128\n\
competition,coach,180,2017-09-16 11:38:50.792000000\n\
coach,routes,180,2017-09-16 11:39:12.207000064\n\
routes,route,180,2017-09-16 11:39:15.684999936\n\
route,routes,180,2017-09-16 11:39:17.670000128\n\
routes,route,180,2017-09-16 11:39:27.800000000\n\
route,routes,180,2017-09-16 11:39:29.508000000\n\
routes,route,180,2017-09-16 11:39:53.980000000\n\
route,routes,180,2017-09-16 11:39:57.616999936\n\
routes,coach,180,2017-09-16 11:40:01.462000128\n\
coach,badges,180,2017-09-16 11:40:07.094000128\n\
badges,competition,180,2017-09-16 11:40:13.103000064\n\
competition,team,180,2017-09-16 11:40:20.532999936\n\
coach,team,181,2017-09-16 15:16:51.086000128\n\
team,competition,181,2017-09-16 15:17:46.332999936\n\
competition,team,181,2017-09-16 15:18:16.560000000\n\
team,personal,181,2017-09-16 15:18:46.161999872\n\
coach,team,182,2017-09-17 12:51:02.769999872\n\
team,competition,182,2017-09-17 12:52:33.688999936\n\
competition,coach,182,2017-09-17 12:52:56.172999936\n\
coach,competition,182,2017-09-17 12:53:47.988000000\n\
competition,coach,182,2017-09-17 12:54:01.308999936\n\
coach,,183,2017-09-17 14:00:25.487000064\n\
coach,team,184,2017-09-17 14:50:59.011000064\n\
team,routes,184,2017-09-17 14:51:11.227000064\n\
routes,route,184,2017-09-17 14:51:47.766000128\n\
route,routes,184,2017-09-17 14:51:52.702000128\n\
routes,route,184,2017-09-17 14:52:13.372000000\n\
route,routes,184,2017-09-17 14:52:16.139000064\n\
routes,track,184,2017-09-17 14:54:03.264999936\n\
track,coach,184,2017-09-17 14:54:10.148000000\n\
coach,personal,184,2017-09-17 17:32:33.422000128\n\
personal,coach,184,2017-09-17 17:36:29.019000064\n\
coach,,185,2017-09-18 09:13:41.190000128\n\
coach,,186,2017-09-18 13:10:31.799000064\n\
coach,,187,2017-09-19 21:09:47.566000128\n\
coach,track,188,2017-09-20 11:29:09.744999936\n\
track,route,188,2017-09-20 11:29:19.803000064\n\
route,coach,188,2017-09-20 11:29:47.950000128\n\
coach,track,188,2017-09-20 11:30:04.353999872\n\
track,coach,188,2017-09-20 11:30:08.500000000\n\
coach,competition,188,2017-09-20 15:01:08.535000064\n\
competition,coach,188,2017-09-20 15:01:16.552999936\n\
coach,competition,188,2017-09-20 15:01:37.899000064\n\
competition,coach,188,2017-09-20 15:01:58.127000064\n\
coach,competition,188,2017-09-20 15:02:01.854000128\n\
competition,coach,188,2017-09-20 15:02:15.956999936\n\
coach,competition,188,2017-09-20 15:02:20.272999936\n\
competition,routes,188,2017-09-20 15:02:24.759000064\n\
routes,route,188,2017-09-20 15:02:27.391000064\n\
route,routes,188,2017-09-20 15:02:29.468999936\n\
routes,route,188,2017-09-20 15:03:19.060000000\n\
route,routes,188,2017-09-20 15:03:23.947000064\n\
routes,route,188,2017-09-20 15:03:31.691000064\n\
route,routes,188,2017-09-20 15:03:33.352000000\n\
routes,route,188,2017-09-20 15:03:43.814000128\n\
coach,competition,189,2017-09-20 19:16:03.371000064\n\
competition,coach,189,2017-09-20 19:16:16.735000064\n\
coach,competition,189,2017-09-20 19:16:32.332000000\n\
competition,personal,189,2017-09-20 19:16:36.214000128\n\
personal,competition,189,2017-09-20 19:16:46.574000128\n\
competition,coach,189,2017-09-20 19:17:03.368999936\n\
coach,routes,189,2017-09-20 19:17:09.439000064\n\
routes,route,189,2017-09-20 19:19:14.159000064\n\
coach,competition,190,2017-09-21 17:48:15.262000128\n\
competition,coach,190,2017-09-21 17:48:48.427000064\n\
coach,,191,2017-09-22 10:17:56.992999936\n\
coach,track,192,2017-09-10 09:45:40.479000064\n\
track,competition,192,2017-09-10 09:47:05.505999872\n\
competition,team,192,2017-09-10 09:47:57.161999872\n\
team,routes,192,2017-09-10 09:48:10.892000000\n\
routes,coach,192,2017-09-10 09:48:34.632999936\n\
coach,track,192,2017-09-10 09:48:48.632000000\n\
track,route,192,2017-09-10 09:49:43.049999872\n\
route,personal,192,2017-09-10 09:49:45.680999936\n\
personal,track,192,2017-09-10 09:49:48.486000128\n\
track,coach,192,2017-09-10 09:49:52.344000000\n\
coach,team,192,2017-09-10 09:49:56.600000000\n\
team,coach,192,2017-09-10 09:49:57.472999936\n\
coach,track,192,2017-09-10 09:50:25.672000000\n\
track,route,192,2017-09-10 09:52:15.135000064\n\
route,track,192,2017-09-10 09:52:48.647000064\n\
track,routes,192,2017-09-10 09:52:58.067000064\n\
routes,route,192,2017-09-10 09:53:10.740999936\n\
route,routes,192,2017-09-10 09:53:16.108000000\n\
routes,route,192,2017-09-10 09:53:23.932999936\n\
route,routes,192,2017-09-10 09:53:28.703000064\n\
coach,,193,2017-09-10 10:45:42.072000000\n\
coach,coach,194,2017-09-11 11:07:07.455000064\n\
coach,coach,194,2017-09-11 11:09:20.684000000\n\
coach,track,194,2017-09-11 11:14:23.735000064\n\
track,team,194,2017-09-11 11:16:44.086000128\n\
team,routes,194,2017-09-11 11:17:21.799000064\n\
routes,personal,194,2017-09-11 11:18:28.126000128\n\
personal,coach,194,2017-09-11 11:19:13.579000064\n\
coach,personal,194,2017-09-11 11:23:46.025999872\n\
coach,track,195,2017-09-11 12:22:17.769999872\n\
track,team,195,2017-09-11 12:22:26.420999936\n\
team,track,195,2017-09-11 16:00:05.934000128\n\
track,personal,195,2017-09-11 16:00:41.774000128\n\
personal,track,195,2017-09-11 16:00:58.188000000\n\
track,routes,195,2017-09-11 16:01:17.651000064\n\
routes,track,195,2017-09-11 16:01:24.471000064\n\
track,team,195,2017-09-11 16:01:36.580000000\n\
team,competition,195,2017-09-11 16:01:48.440000000\n\
competition,personal,195,2017-09-11 16:02:18.671000064\n\
personal,coach,195,2017-09-11 16:03:04.953999872\n\
coach,personal,195,2017-09-11 16:07:49.025999872\n\
coach,track,196,2017-09-12 08:06:39.396999936\n\
track,competition,196,2017-09-12 08:06:47.503000064\n\
competition,track,196,2017-09-12 12:31:45.374000128\n\
track,routes,196,2017-09-12 12:32:08.264999936\n\
routes,team,196,2017-09-12 12:32:21.588000000\n\
team,personal,196,2017-09-12 12:32:38.404000000\n\
personal,team,196,2017-09-12 12:33:09.772000000\n\
team,personal,196,2017-09-12 12:34:53.391000064\n\
coach,team,197,2017-09-12 15:10:51.313999872\n\
team,competition,197,2017-09-12 15:11:02.983000064\n\
competition,badges,197,2017-09-12 15:11:43.587000064\n\
badges,coach,197,2017-09-12 15:12:08.908000000\n\
coach,personal,197,2017-09-12 15:12:24.880999936\n\
personal,coach,197,2017-09-12 15:13:20.000999936\n\
coach,routes,197,2017-09-12 15:13:27.611000064\n\
routes,route,197,2017-09-12 15:13:36.927000064\n\
route,routes,197,2017-09-12 15:13:45.422000128\n\
routes,route,197,2017-09-12 15:14:01.492000000\n\
route,routes,197,2017-09-12 15:14:18.600000000\n\
routes,coach,197,2017-09-12 15:14:22.536000000\n\
coach,personal,197,2017-09-12 15:14:27.740999936\n\
coach,team,198,2017-09-13 08:06:11.495000064\n\
team,competition,198,2017-09-13 08:06:21.473999872\n\
competition,track,198,2017-09-13 08:06:38.691000064\n\
track,track,198,2017-09-13 08:06:53.953999872\n\
track,team,198,2017-09-13 12:46:24.129999872\n\
team,competition,198,2017-09-13 12:46:27.132000000\n\
competition,track,198,2017-09-13 12:47:03.558000128\n\
track,personal,198,2017-09-13 12:47:17.577999872\n\
coach,team,199,2017-09-13 16:19:11.156999936\n\
team,competition,199,2017-09-13 16:20:02.401999872\n\
competition,personal,199,2017-09-13 16:20:24.512000000\n\
coach,competition,200,2017-09-14 07:44:29.672000000\n\
competition,team,200,2017-09-14 07:44:41.438000128\n\
team,track,200,2017-09-14 07:44:49.059000064\n\
track,team,200,2017-09-14 07:45:01.907000064\n\
team,track,200,2017-09-14 11:08:06.692999936\n\
track,personal,200,2017-09-14 11:08:07.207000064\n\
personal,coach,200,2017-09-14 11:08:13.800999936\n\
coach,track,200,2017-09-14 11:13:31.279000064\n\
track,route,200,2017-09-14 11:14:05.319000064\n\
route,track,200,2017-09-14 11:14:26.692000000\n\
track,coach,200,2017-09-14 11:14:34.519000064\n\
coach,personal,200,2017-09-14 11:14:37.608999936\n\
personal,bugreport,200,2017-09-14 11:15:15.340999936\n\
bugreport,personal,200,2017-09-14 11:15:17.460000000\n\
personal,bugreport,200,2017-09-14 11:16:03.044000000\n\
bugreport,personal,200,2017-09-14 11:16:09.272999936\n\
personal,bugreport,200,2017-09-14 11:16:42.716999936\n\
bugreport,team,200,2017-09-14 11:16:47.092999936\n\
team,personal,200,2017-09-14 11:16:50.636000000\n\
coach,competition,201,2017-09-14 13:17:47.151000064\n\
competition,coach,201,2017-09-14 13:18:04.478000128\n\
coach,team,201,2017-09-14 13:18:11.087000064\n\
team,routes,201,2017-09-14 13:19:42.332999936\n\
routes,personal,201,2017-09-14 13:19:57.148999936\n\
personal,bugreport,201,2017-09-14 13:20:10.001999872\n\
bugreport,personal,201,2017-09-14 13:20:12.873999872\n\
personal,bugreport,201,2017-09-14 13:21:02.936000000\n\
bugreport,track,201,2017-09-14 13:21:08.071000064\n\
track,coach,201,2017-09-14 13:21:12.392999936\n\
coach,personal,201,2017-09-14 13:21:28.784999936\n\
coach,team,202,2017-09-15 11:33:23.016999936\n\
team,track,202,2017-09-15 11:33:49.047000064\n\
track,route,202,2017-09-15 11:33:58.920000000\n\
route,competition,202,2017-09-15 11:34:11.296999936\n\
competition,route,202,2017-09-15 13:49:24.647000064\n\
route,track,202,2017-09-15 13:49:42.868000000\n\
track,team,202,2017-09-15 13:50:13.791000064\n\
team,personal,202,2017-09-15 13:50:19.484999936\n\
coach,team,203,2017-09-15 14:21:48.988999936\n\
team,competition,203,2017-09-15 14:22:04.526000128\n\
competition,routes,203,2017-09-15 14:22:57.624999936\n\
routes,route,203,2017-09-15 14:23:14.592000000\n\
route,routes,203,2017-09-15 14:23:22.268999936\n\
routes,route,203,2017-09-15 14:23:35.356000000\n\
route,routes,203,2017-09-15 14:23:37.104999936\n\
routes,coach,203,2017-09-15 14:24:10.791000064\n\
coach,personal,203,2017-09-15 14:24:16.991000064\n\
personal,bugreport,203,2017-09-15 14:24:24.012000000\n\
bugreport,personal,203,2017-09-15 14:24:27.409999872\n\
coach,team,204,2017-09-15 19:54:40.936999936\n\
team,competition,204,2017-09-15 19:54:49.936000000\n\
competition,personal,204,2017-09-15 19:55:28.598000128\n\
coach,team,205,2017-09-16 20:23:10.492999936\n\
team,routes,205,2017-09-16 20:23:27.320000000\n\
routes,route,205,2017-09-16 20:24:02.753999872\n\
route,routes,205,2017-09-16 20:24:05.310000128\n\
routes,team,205,2017-09-16 20:24:25.120000000\n\
team,competition,205,2017-09-16 20:24:30.683000064\n\
competition,personal,205,2017-09-16 20:24:52.388000000\n\
coach,track,206,2017-09-17 06:20:20.278000128\n\
track,route,206,2017-09-17 06:23:39.236000000\n\
route,track,206,2017-09-17 06:24:28.660000000\n\
track,route,206,2017-09-17 06:24:35.606000128\n\
coach,routes,207,2017-09-17 10:35:07.552999936\n\
routes,route,207,2017-09-17 10:36:03.903000064\n\
route,routes,207,2017-09-17 10:36:10.432000000\n\
routes,route,207,2017-09-17 10:36:21.388999936\n\
route,personal,207,2017-09-17 10:36:22.796000000\n\
coach,team,208,2017-09-17 12:39:18.640000000\n\
team,competition,208,2017-09-17 12:39:32.852999936\n\
competition,track,208,2017-09-17 12:39:59.048000000\n\
track,routes,208,2017-09-17 12:40:18.374000128\n\
routes,route,208,2017-09-17 12:41:22.740000000\n\
route,routes,208,2017-09-17 12:41:26.212000000\n\
routes,route,208,2017-09-17 12:41:43.569999872\n\
route,personal,208,2017-09-17 12:41:45.566000128\n\
personal,bugreport,208,2017-09-17 12:41:48.905999872\n\
bugreport,track,208,2017-09-17 12:41:50.720000000\n\
track,route,208,2017-09-17 12:42:26.851000064\n\
route,track,208,2017-09-17 12:42:30.014000128\n\
track,team,208,2017-09-17 12:42:44.711000064\n\
team,coach,208,2017-09-17 12:42:59.064000000\n\
coach,badges,208,2017-09-17 12:44:09.134000128\n\
badges,track,208,2017-09-17 12:44:20.326000128\n\
track,personal,208,2017-09-17 12:45:47.160000000\n\
personal,coach,208,2017-09-17 12:45:57.252999936\n\
coach,track,208,2017-09-17 12:48:24.960000000\n\
track,routes,208,2017-09-17 12:49:26.281999872\n\
routes,route,208,2017-09-17 12:50:10.304999936\n\
route,routes,208,2017-09-17 12:50:12.760999936\n\
routes,route,208,2017-09-17 14:58:13.532000000\n\
route,routes,208,2017-09-17 14:58:17.487000064\n\
routes,team,208,2017-09-17 14:58:41.296000000\n\
team,competition,208,2017-09-17 14:58:44.659000064\n\
competition,coach,208,2017-09-17 14:59:18.072999936\n\
coach,track,208,2017-09-17 14:59:35.895000064\n\
track,route,208,2017-09-17 15:00:25.176999936\n\
route,track,208,2017-09-17 15:00:36.576000000\n\
track,coach,208,2017-09-17 15:00:58.268000000\n\
coach,personal,208,2017-09-17 15:01:29.499000064\n\
coach,team,209,2017-09-17 17:39:02.304999936\n\
team,competition,209,2017-09-17 17:39:02.305999872\n\
competition,personal,209,2017-09-17 17:39:40.516000000\n\
coach,team,210,2017-09-18 10:07:28.480999936\n\
team,competition,210,2017-09-18 10:07:34.716999936\n\
coach,track,211,2017-09-18 12:36:39.332000000\n\
track,route,211,2017-09-18 12:36:46.993999872\n\
route,track,211,2017-09-18 12:37:38.734000128\n\
track,routes,211,2017-09-18 15:01:06.504000000\n\
routes,route,211,2017-09-18 15:01:09.947000064\n\
route,routes,211,2017-09-18 15:01:16.760000000\n\
routes,route,211,2017-09-18 15:01:47.427000064\n\
route,routes,211,2017-09-18 15:01:51.499000064\n\
routes,route,211,2017-09-18 15:01:56.216999936\n\
route,routes,211,2017-09-18 15:01:57.849999872\n\
routes,route,211,2017-09-18 15:02:13.504999936\n\
route,routes,211,2017-09-18 15:02:15.560000000\n\
routes,route,211,2017-09-18 15:02:26.169999872\n\
route,routes,211,2017-09-18 15:02:33.568999936\n\
routes,team,211,2017-09-18 15:02:35.636999936\n\
team,competition,211,2017-09-18 15:02:46.476999936\n\
coach,competition,212,2017-09-19 15:17:07.158000128\n\
competition,coach,212,2017-09-19 15:18:04.280999936\n\
coach,team,212,2017-09-19 15:18:12.132000000\n\
team,competition,212,2017-09-19 15:18:15.456000000\n\
competition,routes,212,2017-09-19 15:18:45.803000064\n\
routes,route,212,2017-09-19 15:18:50.320000000\n\
route,routes,212,2017-09-19 15:19:00.559000064\n\
routes,route,212,2017-09-19 15:19:29.134000128\n\
route,coach,212,2017-09-19 15:19:32.323000064\n\
coach,routes,212,2017-09-19 15:20:02.604999936\n\
routes,coach,212,2017-09-19 15:20:08.934000128\n\
coach,personal,212,2017-09-19 15:20:15.435000064\n\
personal,bugreport,212,2017-09-19 15:21:27.894000128\n\
bugreport,track,212,2017-09-19 15:21:30.764999936\n\
track,personal,212,2017-09-19 15:22:15.684999936\n\
personal,track,212,2017-09-19 15:22:18.435000064\n\
track,team,212,2017-09-19 15:22:20.702000128\n\
coach,personal,213,2017-09-19 17:12:04.852999936\n\
personal,bugreport,213,2017-09-19 17:12:31.540000000\n\
bugreport,personal,213,2017-09-19 17:12:33.936000000\n\
personal,bugreport,213,2017-09-19 17:12:41.657999872\n\
bugreport,coach,213,2017-09-19 17:12:46.124000000\n\
coach,competition,213,2017-09-19 17:12:51.076000000\n\
competition,badges,213,2017-09-19 17:13:12.377999872\n\
badges,track,213,2017-09-19 17:13:17.280999936\n\
track,coach,213,2017-09-19 17:13:23.524000000\n\
coach,personal,213,2017-09-19 17:13:33.508999936\n\
personal,bugreport,213,2017-09-19 17:14:17.065999872\n\
bugreport,personal,213,2017-09-19 17:14:18.758000128\n\
personal,bugreport,213,2017-09-19 17:14:45.119000064\n\
coach,team,214,2017-09-20 07:21:14.220000000\n\
team,competition,214,2017-09-20 07:21:30.353999872\n\
coach,team,215,2017-09-20 16:54:41.896999936\n\
team,competition,215,2017-09-20 16:54:57.440000000\n\
coach,team,216,2017-09-21 20:41:57.828999936\n\
team,competition,216,2017-09-21 20:42:30.768999936\n\
coach,track,217,2017-09-22 06:55:04.702000128\n\
track,route,217,2017-09-22 07:02:44.515000064\n\
route,coach,217,2017-09-22 07:04:30.440000000\n\
coach,routes,217,2017-09-22 07:04:49.284000000\n\
routes,route,217,2017-09-22 08:32:55.782000128\n\
route,routes,217,2017-09-22 08:32:59.848000000\n\
routes,team,217,2017-09-22 08:33:27.692999936\n\
coach,personal,218,2017-09-23 09:20:27.556000000\n\
personal,bugreport,218,2017-09-23 09:21:52.228000000\n\
bugreport,team,218,2017-09-23 09:21:53.782000128\n\
team,competition,218,2017-09-23 09:22:15.087000064\n\
coach,track,219,2017-09-02 19:43:08.479000064\n\
track,personal,219,2017-09-02 19:43:49.688000000\n\
personal,track,219,2017-09-02 19:47:07.740999936\n\
track,team,219,2017-09-02 19:47:13.467000064\n\
team,routes,219,2017-09-02 19:47:17.400999936\n\
routes,coach,219,2017-09-02 19:47:38.166000128\n\
coach,badges,219,2017-09-02 19:47:43.488999936\n\
coach,track,220,2017-09-03 11:46:05.404000000\n\
track,track,220,2017-09-03 11:46:08.646000128\n\
track,personal,220,2017-09-03 14:45:03.814000128\n\
personal,bugreport,220,2017-09-03 14:45:11.668999936\n\
bugreport,personal,220,2017-09-03 14:45:13.451000064\n\
personal,bugreport,220,2017-09-03 15:21:58.536000000\n\
bugreport,track,220,2017-09-03 15:22:17.280000000\n\
track,routes,220,2017-09-03 15:22:27.744000000\n\
routes,team,220,2017-09-03 15:22:36.393999872\n\
coach,,221,2017-09-11 17:23:11.537999872\n\
coach,,222,2017-09-18 11:21:15.523000064\n\
coach,,223,2017-09-21 06:53:16.524999936\n\
coach,personal,224,2017-09-02 14:28:32.060999936\n\
personal,team,224,2017-09-02 14:29:02.801999872\n\
team,coach,224,2017-09-02 14:29:44.316999936\n\
coach,personal,224,2017-09-02 14:30:20.607000064\n\
personal,coach,224,2017-09-02 14:30:20.608000000\n\
coach,team,224,2017-09-02 14:30:21.252999936\n\
coach,team,225,2017-09-02 16:53:49.736000000\n\
team,personal,225,2017-09-02 17:28:40.471000064\n\
personal,team,225,2017-09-02 17:28:50.912000000\n\
coach,personal,226,2017-09-12 15:44:23.848000000\n\
coach,,227,2017-09-13 13:19:19.552000000\n\
coach,track,228,2017-09-20 05:29:55.652000000\n\
track,route,228,2017-09-20 05:30:02.302000128\n\
route,track,228,2017-09-20 05:33:33.950000128\n\
track,route,228,2017-09-20 05:33:59.982000128\n\
coach,coach,229,2017-09-20 14:13:29.887000064\n\
coach,track,229,2017-09-20 14:13:29.913999872\n\
track,coach,229,2017-09-20 14:13:29.916000000\n\
coach,track,229,2017-09-20 14:13:29.924000000\n\
track,coach,229,2017-09-20 14:13:37.516999936\n\
coach,track,229,2017-09-20 14:53:42.918000128\n\
track,coach,229,2017-09-20 14:53:49.908000000\n\
coach,track,229,2017-09-20 15:42:55.756000000\n\
track,team,229,2017-09-20 15:43:03.656999936\n\
coach,track,230,2017-09-21 05:38:31.200999936\n\
track,route,230,2017-09-21 05:38:41.001999872\n\
route,team,230,2017-09-21 06:26:23.076999936\n\
team,coach,230,2017-09-21 06:28:36.696999936\n\
coach,track,231,2017-09-21 14:23:32.208999936\n\
track,coach,231,2017-09-21 14:23:35.892000000\n\
coach,competition,231,2017-09-21 14:44:28.388000000\n\
coach,track,232,2017-09-22 13:10:28.801999872\n\
track,route,232,2017-09-22 13:10:50.604999936\n\
route,coach,232,2017-09-22 13:11:02.427000064\n\
coach,track,232,2017-09-22 13:19:52.716999936\n\
track,coach,232,2017-09-22 13:19:58.539000064\n\
coach,team,232,2017-09-22 15:05:51.547000064\n\
coach,track,233,2017-09-23 07:18:44.083000064\n\
track,route,233,2017-09-23 07:24:14.729999872\n\
route,track,233,2017-09-23 07:24:21.483000064\n\
track,coach,233,2017-09-23 07:24:29.580999936\n\
coach,track,233,2017-09-23 07:24:35.071000064\n\
track,route,233,2017-09-23 07:24:37.439000064\n\
route,track,233,2017-09-23 07:24:41.928000000\n\
track,coach,233,2017-09-23 07:24:50.876000000\n\
coach,track,233,2017-09-23 07:24:52.385999872\n\
track,coach,233,2017-09-23 07:24:54.639000064\n\
coach,competition,233,2017-09-23 09:52:30.712999936\n\
competition,personal,233,2017-09-23 09:52:49.271000064\n\
personal,coach,233,2017-09-23 09:53:41.036999936\n\
coach,track,233,2017-09-23 09:53:54.672000000\n\
track,route,233,2017-09-23 09:54:02.998000128\n\
route,track,233,2017-09-23 09:54:06.904999936\n\
track,coach,233,2017-09-23 09:54:18.068999936\n\
coach,competition,233,2017-09-23 09:54:19.216000000\n\
competition,personal,233,2017-09-23 10:07:44.843000064\n\
personal,coach,233,2017-09-23 10:07:54.745999872\n\
coach,competition,233,2017-09-23 10:08:00.929999872\n\
coach,competition,234,2017-09-23 11:35:07.247000064\n\
competition,coach,234,2017-09-23 11:35:24.808000000\n\
coach,track,235,2017-09-23 20:40:03.164000000\n\
track,personal,235,2017-09-23 20:40:45.865999872\n\
personal,track,235,2017-09-23 20:40:53.257999872\n\
track,team,235,2017-09-23 20:41:15.948000000\n\
team,personal,235,2017-09-23 20:41:18.784000000\n\
personal,team,235,2017-09-23 20:41:36.513999872\n\
team,personal,235,2017-09-23 20:41:44.609999872\n\
personal,team,235,2017-09-23 20:41:48.369999872\n\
team,competition,235,2017-09-23 20:41:52.712000000\n\
competition,routes,235,2017-09-23 20:44:54.207000064\n\
routes,badges,235,2017-09-23 20:45:06.355000064\n\
badges,coach,235,2017-09-23 20:45:11.071000064\n\
coach,track,235,2017-09-23 20:45:14.788999936\n\
track,route,235,2017-09-23 20:45:47.310000128\n\
route,track,235,2017-09-23 20:46:15.355000064\n\
track,coach,235,2017-09-23 20:46:20.248999936\n\
coach,track,235,2017-09-24 05:58:16.920000000\n\
track,coach,235,2017-09-24 05:58:37.115000064\n\
coach,personal,236,2017-09-01 21:14:02.680000000\n\
personal,team,236,2017-09-01 21:16:31.289999872\n\
team,competition,236,2017-09-01 21:17:14.692999936\n\
competition,routes,236,2017-09-01 21:17:31.860000000\n\
routes,badges,236,2017-09-01 21:17:42.803000064\n\
badges,coach,236,2017-09-01 21:18:48.968000000\n\
coach,personal,236,2017-09-01 21:19:03.815000064\n\
personal,coach,236,2017-09-01 21:19:30.324999936\n\
coach,team,237,2017-09-02 07:17:17.108999936\n\
coach,track,238,2017-09-03 05:46:31.710000128\n\
track,route,238,2017-09-03 05:51:19.964999936\n\
route,coach,238,2017-09-03 06:42:48.033999872\n\
coach,team,238,2017-09-03 06:43:01.953999872\n\
team,track,238,2017-09-03 06:49:21.905999872\n\
track,coach,238,2017-09-03 06:50:03.478000128\n\
coach,track,238,2017-09-03 07:38:22.988999936\n\
track,route,238,2017-09-03 11:48:57.464000000\n\
route,coach,238,2017-09-03 11:48:59.636000000\n\
coach,competition,239,2017-09-03 13:13:53.696000000\n\
competition,coach,239,2017-09-03 13:15:07.896999936\n\
coach,team,239,2017-09-03 13:15:32.624000000\n\
team,badges,239,2017-09-03 13:15:36.150000128\n\
badges,routes,239,2017-09-03 13:15:54.179000064\n\
routes,route,239,2017-09-03 13:16:19.062000128\n\
coach,team,240,2017-09-03 21:23:50.044000000\n\
team,competition,240,2017-09-03 21:24:01.313999872\n\
coach,,241,2017-09-04 17:55:24.899000064\n\
coach,team,242,2017-09-11 12:30:22.223000064\n\
coach,,243,2017-09-14 18:43:47.143000064\n\
coach,personal,244,2017-09-14 22:38:14.215000064\n\
personal,coach,244,2017-09-14 22:38:19.078000128\n\
coach,team,244,2017-09-14 22:38:21.662000128\n\
team,competition,244,2017-09-14 22:39:59.600999936\n\
competition,team,244,2017-09-14 22:40:26.583000064\n\
team,routes,244,2017-09-14 22:40:37.675000064\n\
routes,badges,244,2017-09-14 22:40:50.968000000\n\
badges,coach,244,2017-09-14 22:41:01.383000064\n\
coach,,245,2017-09-15 14:34:35.251000064\n\
coach,,246,2017-09-18 22:29:30.592000000\n\
coach,track,247,2017-09-20 13:39:57.264000000\n\
track,route,247,2017-09-20 13:40:49.080000000\n\
coach,team,248,2017-09-07 17:55:48.699000064\n\
team,routes,248,2017-09-07 18:03:28.339000064\n\
routes,coach,248,2017-09-07 18:04:18.875000064\n\
coach,track,248,2017-09-07 18:04:34.382000128\n\
track,badges,248,2017-09-07 18:05:08.996999936\n\
badges,personal,248,2017-09-07 18:05:23.105999872\n\
personal,coach,248,2017-09-07 18:05:43.004999936\n\
coach,personal,248,2017-09-07 18:07:34.824999936\n\
personal,coach,248,2017-09-07 18:07:53.744000000\n\
coach,personal,248,2017-09-07 18:08:33.761999872\n\
personal,coach,248,2017-09-07 18:09:11.185999872\n\
coach,personal,248,2017-09-07 18:09:18.356999936\n\
personal,coach,248,2017-09-07 18:10:39.920000000\n\
coach,personal,248,2017-09-07 18:10:53.188000000\n\
personal,coach,248,2017-09-07 18:11:00.496000000\n\
coach,personal,248,2017-09-07 18:11:47.532999936\n\
personal,bugreport,248,2017-09-07 18:11:52.511000064\n\
bugreport,coach,248,2017-09-07 18:11:54.281999872\n\
coach,track,249,2017-09-10 07:07:18.283000064\n\
track,coach,249,2017-09-10 07:07:23.838000128\n\
coach,team,249,2017-09-10 14:43:13.752000000\n\
team,competition,249,2017-09-10 14:43:57.142000128\n\
competition,routes,249,2017-09-10 14:44:54.668999936\n\
routes,route,249,2017-09-10 14:45:16.787000064\n\
route,routes,249,2017-09-10 14:45:20.097999872\n\
coach,team,250,2017-09-11 08:53:52.694000128\n\
team,personal,250,2017-09-11 08:53:57.307000064\n\
personal,team,250,2017-09-11 08:54:24.963000064\n\
team,competition,250,2017-09-11 08:54:56.598000128\n\
coach,,251,2017-09-11 10:23:50.828999936\n\
coach,track,252,2017-09-12 07:02:21.572000000\n\
track,coach,252,2017-09-12 07:02:25.281999872\n\
coach,team,253,2017-09-12 09:53:13.051000064\n\
coach,team,254,2017-09-12 18:24:27.287000064\n\
team,competition,254,2017-09-12 18:24:37.456999936\n\
competition,team,254,2017-09-12 18:25:04.207000064\n\
team,coach,254,2017-09-12 18:25:21.252999936\n\
coach,personal,254,2017-09-12 18:25:39.003000064\n\
personal,bugreport,254,2017-09-12 18:25:49.203000064\n\
bugreport,personal,254,2017-09-12 18:25:51.686000128\n\
personal,bugreport,254,2017-09-12 18:25:55.233999872\n\
bugreport,competition,254,2017-09-12 18:26:00.860999936\n\
competition,team,254,2017-09-12 18:27:01.288999936\n\
team,track,254,2017-09-12 18:27:04.436000000\n\
track,competition,254,2017-09-12 18:27:08.212000000\n\
competition,badges,254,2017-09-12 18:28:25.494000128\n\
badges,track,254,2017-09-12 18:28:31.756000000\n\
track,personal,254,2017-09-12 18:28:43.640000000\n\
personal,track,254,2017-09-12 18:30:20.355000064\n\
track,coach,254,2017-09-12 18:30:56.104999936\n\
coach,track,255,2017-09-14 11:23:49.951000064\n\
track,route,255,2017-09-14 11:24:05.972000000\n\
route,coach,255,2017-09-14 11:25:30.760999936\n\
coach,personal,255,2017-09-14 11:25:42.532999936\n\
personal,coach,255,2017-09-14 11:32:00.672000000\n\
coach,track,255,2017-09-14 11:32:18.120999936\n\
track,route,255,2017-09-14 11:33:31.456999936\n\
route,track,255,2017-09-14 11:33:49.819000064\n\
track,route,255,2017-09-14 11:34:38.988000000\n\
route,coach,255,2017-09-14 11:35:49.012999936\n\
coach,track,255,2017-09-14 11:36:14.654000128\n\
track,route,255,2017-09-14 11:37:17.968000000\n\
route,track,255,2017-09-14 11:37:28.348000000\n\
track,route,255,2017-09-14 11:37:48.012000000\n\
route,track,255,2017-09-14 11:38:16.944999936\n\
track,personal,255,2017-09-14 11:38:45.769999872\n\
personal,coach,255,2017-09-14 11:40:36.782000128\n\
coach,team,255,2017-09-14 11:41:12.137999872\n\
team,personal,255,2017-09-14 15:06:17.851000064\n\
personal,team,255,2017-09-14 15:06:43.208999936\n\
team,personal,255,2017-09-14 15:07:22.095000064\n\
personal,bugreport,255,2017-09-14 15:07:30.604999936\n\
bugreport,personal,255,2017-09-14 15:07:34.028000000\n\
personal,bugreport,255,2017-09-14 15:07:40.956000000\n\
bugreport,coach,255,2017-09-14 15:07:55.376999936\n\
coach,competition,256,2017-09-14 17:48:36.921999872\n\
competition,personal,256,2017-09-14 17:49:01.731000064\n\
coach,team,257,2017-09-14 18:35:27.038000128\n\
team,track,257,2017-09-14 18:45:16.392000000\n\
track,route,257,2017-09-14 18:45:50.372000000\n\
route,coach,257,2017-09-14 18:46:13.283000064\n\
coach,team,257,2017-09-14 18:46:35.128999936\n\
team,personal,257,2017-09-14 18:46:44.664000000\n\
personal,team,257,2017-09-14 18:47:12.743000064\n\
team,coach,257,2017-09-14 18:48:00.408999936\n\
coach,team,257,2017-09-14 18:48:07.246000128\n\
team,competition,257,2017-09-14 18:48:46.120000000\n\
competition,personal,257,2017-09-14 18:49:14.011000064\n\
personal,competition,257,2017-09-14 18:49:34.212999936\n\
competition,team,257,2017-09-14 18:49:36.793999872\n\
team,track,257,2017-09-14 18:49:49.512000000\n\
track,route,257,2017-09-14 18:50:06.728000000\n\
route,track,257,2017-09-14 18:50:18.334000128\n\
track,coach,257,2017-09-14 18:50:27.000999936\n\
coach,competition,257,2017-09-14 20:26:51.414000128\n\
competition,coach,257,2017-09-14 20:26:59.457999872\n\
coach,team,257,2017-09-14 20:27:23.400000000\n\
team,personal,257,2017-09-14 20:27:26.687000064\n\
coach,competition,258,2017-09-15 06:03:31.231000064\n\
competition,coach,258,2017-09-15 06:03:40.108999936\n\
coach,team,258,2017-09-15 06:03:48.886000128\n\
team,personal,258,2017-09-15 06:03:54.918000128\n\
personal,team,258,2017-09-15 06:04:37.337999872\n\
team,competition,258,2017-09-15 06:04:50.375000064\n\
competition,badges,258,2017-09-15 06:04:58.252000000\n\
coach,track,259,2017-09-15 12:13:05.167000064\n\
track,coach,259,2017-09-15 12:13:10.478000128\n\
coach,team,259,2017-09-15 16:46:43.792000000\n\
coach,team,260,2017-09-15 17:50:05.111000064\n\
team,track,260,2017-09-15 17:50:14.351000064\n\
track,route,260,2017-09-15 17:52:15.968999936\n\
route,track,260,2017-09-15 17:52:21.390000128\n\
track,route,260,2017-09-15 17:52:28.363000064\n\
route,track,260,2017-09-15 17:52:34.076999936\n\
track,personal,260,2017-09-15 17:52:41.755000064\n\
coach,track,261,2017-09-16 07:47:58.995000064\n\
track,route,261,2017-09-16 07:48:25.273999872\n\
route,track,261,2017-09-16 07:48:38.696000000\n\
track,team,261,2017-09-16 07:48:40.219000064\n\
team,badges,261,2017-09-16 07:48:45.548000000\n\
badges,coach,261,2017-09-16 07:49:07.180000000\n\
coach,personal,261,2017-09-16 07:49:15.028000000\n\
coach,track,262,2017-09-16 11:22:45.686000128\n\
track,coach,262,2017-09-16 11:22:51.030000128\n\
coach,track,262,2017-09-17 06:17:47.488999936\n\
track,route,262,2017-09-17 06:17:55.131000064\n\
route,track,262,2017-09-17 06:18:13.156999936\n\
track,coach,262,2017-09-17 06:18:21.873999872\n\
coach,team,262,2017-09-17 15:43:19.416000000\n\
coach,track,263,2017-09-19 06:25:29.600000000\n\
track,route,263,2017-09-19 06:25:34.272000000\n\
route,track,263,2017-09-19 06:25:52.480999936\n\
track,coach,263,2017-09-19 06:26:01.574000128\n\
coach,track,263,2017-09-19 06:26:04.071000064\n\
track,coach,263,2017-09-19 06:26:06.900999936\n\
coach,team,263,2017-09-23 06:17:47.564999936\n\
team,track,263,2017-09-23 06:17:58.471000064\n\
track,route,263,2017-09-23 06:18:06.287000064\n\
route,coach,263,2017-09-23 07:55:49.702000128\n\
coach,team,263,2017-09-23 07:56:11.108000000\n\
coach,track,264,2017-09-01 16:48:11.743000064\n\
track,team,264,2017-09-01 16:49:19.001999872\n\
team,personal,264,2017-09-01 16:49:31.255000064\n\
personal,team,264,2017-09-01 16:49:42.067000064\n\
team,coach,264,2017-09-01 16:50:00.776999936\n\
coach,team,264,2017-09-01 16:50:08.260000000\n\
team,competition,264,2017-09-01 16:50:12.168000000\n\
competition,routes,264,2017-09-01 16:50:14.112999936\n\
coach,team,265,2017-09-03 16:20:15.632999936\n\
coach,track,266,2017-09-05 15:45:55.752000000\n\
track,route,266,2017-09-05 15:46:00.272000000\n\
route,team,266,2017-09-05 18:41:51.675000064\n\
team,coach,266,2017-09-05 18:41:56.251000064\n\
coach,competition,266,2017-09-05 18:42:30.788000000\n\
competition,coach,266,2017-09-05 18:42:37.732000000\n\
coach,competition,266,2017-09-05 18:42:45.366000128\n\
competition,coach,266,2017-09-05 18:42:49.688000000\n\
coach,team,266,2017-09-05 18:42:52.136000000\n\
coach,competition,267,2017-09-06 08:18:28.822000128\n\
competition,personal,267,2017-09-06 08:18:33.763000064\n\
personal,coach,267,2017-09-06 08:18:38.212999936\n\
coach,team,267,2017-09-06 08:18:49.963000064\n\
team,personal,267,2017-09-06 08:19:25.755000064\n\
personal,bugreport,267,2017-09-06 08:19:40.724999936\n\
bugreport,personal,267,2017-09-06 08:19:41.926000128\n\
personal,bugreport,267,2017-09-06 08:19:56.364999936\n\
bugreport,coach,267,2017-09-06 08:19:59.048999936\n\
coach,competition,267,2017-09-06 08:20:02.316000000\n\
competition,coach,267,2017-09-06 08:20:49.335000064\n\
coach,team,267,2017-09-06 08:20:55.604000000\n\
team,competition,267,2017-09-06 08:20:57.592999936\n\
competition,team,267,2017-09-06 08:21:19.336000000\n\
coach,competition,268,2017-09-08 09:55:42.513999872\n\
competition,coach,268,2017-09-08 09:56:02.136999936\n\
coach,team,268,2017-09-08 09:56:09.201999872\n\
team,competition,268,2017-09-08 09:56:11.459000064\n\
competition,personal,268,2017-09-08 09:56:26.864999936\n\
coach,track,269,2017-09-12 15:47:12.374000128\n\
track,coach,269,2017-09-12 15:47:28.644000000\n\
coach,track,269,2017-09-12 16:30:03.416000000\n\
track,coach,269,2017-09-12 16:30:12.913999872\n\
coach,team,270,2017-09-15 13:29:14.264000000\n\
team,competition,270,2017-09-15 13:29:23.352000000\n\
competition,coach,270,2017-09-15 13:29:42.518000128\n\
coach,personal,270,2017-09-15 13:30:03.936000000\n\
personal,bugreport,270,2017-09-15 13:30:09.649999872\n\
bugreport,coach,270,2017-09-15 13:30:11.046000128\n\
coach,,271,2017-09-15 15:28:58.534000128\n\
coach,track,272,2017-09-17 05:51:28.748999936\n\
track,coach,272,2017-09-17 05:51:45.480000000\n\
coach,team,272,2017-09-19 09:22:12.872000000\n\
coach,,273,2017-09-19 12:12:59.004000000\n\
coach,personal,274,2017-09-19 20:35:21.987000064\n\
personal,coach,274,2017-09-19 20:36:01.524999936\n\
coach,competition,274,2017-09-19 20:36:04.656999936\n\
coach,,275,2017-09-20 07:01:25.007000064\n\
coach,coach,276,2017-09-19 15:55:10.475000064\n\
coach,track,276,2017-09-19 15:56:10.188999936\n\
track,coach,276,2017-09-19 15:58:01.539000064\n\
coach,personal,276,2017-09-19 23:42:18.201999872\n\
personal,bugreport,276,2017-09-19 23:44:12.252000000\n\
bugreport,personal,276,2017-09-19 23:44:31.104000000\n\
personal,bugreport,276,2017-09-19 23:44:53.524000000\n\
bugreport,personal,276,2017-09-19 23:45:41.406000128\n\
personal,bugreport,276,2017-09-19 23:45:45.420999936\n\
bugreport,track,276,2017-09-19 23:45:49.249999872\n\
track,team,276,2017-09-19 23:45:55.609999872\n\
team,competition,276,2017-09-19 23:46:04.168999936\n\
competition,routes,276,2017-09-19 23:46:40.732999936\n\
routes,badges,276,2017-09-19 23:46:56.436000000\n\
badges,coach,276,2017-09-19 23:47:04.283000064\n\
coach,track,276,2017-09-19 23:47:14.084000000\n\
track,coach,276,2017-09-19 23:47:24.406000128\n\
coach,personal,276,2017-09-20 07:48:33.374000128\n\
personal,coach,276,2017-09-20 07:48:48.172999936\n\
coach,team,276,2017-09-20 07:49:01.108000000\n\
team,routes,276,2017-09-20 07:49:13.982000128\n\
routes,route,276,2017-09-20 07:49:34.464000000\n\
route,routes,276,2017-09-20 07:49:40.576000000\n\
routes,track,276,2017-09-20 07:49:55.636999936\n\
track,coach,276,2017-09-20 07:50:06.094000128\n\
coach,track,276,2017-09-21 07:29:18.535000064\n\
track,route,276,2017-09-21 07:31:16.180000000\n\
route,track,276,2017-09-21 07:34:55.745999872\n\
track,coach,276,2017-09-21 07:35:01.025999872\n\
coach,coach,276,2017-09-21 11:19:21.900000000\n\
coach,coach,276,2017-09-21 11:20:32.179000064\n\
coach,coach,276,2017-09-21 11:22:58.870000128\n\
coach,competition,276,2017-09-21 11:23:53.721999872\n\
competition,coach,276,2017-09-21 11:25:11.473999872\n\
coach,team,276,2017-09-21 11:25:31.771000064\n\
coach,,277,2017-09-22 05:46:40.654000128\n\
coach,,278,2017-09-22 07:16:08.435000064\n\
coach,,279,2017-09-22 10:50:30.382000128\n\
coach,personal,280,2017-09-25 07:28:26.008000000\n\
coach,personal,281,2017-09-11 15:06:37.804999936\n\
personal,track,281,2017-09-11 15:08:47.246000128\n\
track,team,281,2017-09-11 15:09:39.124999936\n\
team,coach,281,2017-09-11 15:09:42.648000000\n\
coach,competition,281,2017-09-11 15:09:57.905999872\n\
competition,team,281,2017-09-11 15:10:08.643000064\n\
team,personal,281,2017-09-11 15:10:28.772000000\n\
personal,team,281,2017-09-11 15:10:47.788000000\n\
team,competition,281,2017-09-11 15:10:49.305999872\n\
competition,routes,281,2017-09-11 15:10:52.707000064\n\
routes,badges,281,2017-09-11 15:10:54.988999936\n\
badges,coach,281,2017-09-11 15:10:57.948999936\n\
coach,personal,281,2017-09-11 15:11:01.307000064\n\
coach,team,282,2017-09-12 07:02:58.048999936\n\
team,competition,282,2017-09-12 07:03:41.764000000\n\
competition,routes,282,2017-09-12 07:03:58.542000128\n\
routes,coach,282,2017-09-12 07:04:08.839000064\n\
coach,coach,282,2017-09-12 07:04:12.694000128\n\
coach,personal,282,2017-09-12 07:22:16.855000064\n\
coach,track,283,2017-09-13 16:59:41.967000064\n\
track,route,283,2017-09-13 16:59:49.287000064\n\
route,track,283,2017-09-13 17:04:49.376999936\n\
track,coach,283,2017-09-13 17:04:55.382000128\n\
coach,competition,283,2017-09-13 17:05:02.519000064\n\
competition,team,283,2017-09-13 17:06:07.905999872\n\
team,routes,283,2017-09-13 17:06:19.412999936\n\
routes,route,283,2017-09-13 17:06:37.761999872\n\
route,routes,283,2017-09-13 17:06:41.601999872\n\
routes,coach,283,2017-09-13 17:06:46.030000128\n\
coach,,284,2017-09-13 18:00:32.212000000\n\
coach,track,285,2017-09-14 06:59:22.747000064\n\
track,route,285,2017-09-14 07:01:56.360000000\n\
route,track,285,2017-09-14 07:02:02.784000000\n\
track,coach,285,2017-09-14 07:02:12.899000064\n\
coach,track,285,2017-09-14 07:02:16.595000064\n\
track,route,285,2017-09-14 07:02:23.764999936\n\
route,track,285,2017-09-14 07:02:30.825999872\n\
track,route,285,2017-09-14 07:02:34.247000064\n\
route,track,285,2017-09-14 07:09:08.320000000\n\
track,coach,285,2017-09-14 07:09:16.817999872\n\
coach,coach,285,2017-09-14 07:09:37.609999872\n\
coach,competition,285,2017-09-14 07:27:20.660000000\n\
competition,coach,285,2017-09-14 07:27:31.416000000\n\
coach,competition,285,2017-09-14 07:27:49.764000000\n\
competition,coach,285,2017-09-14 07:27:51.764000000\n\
coach,team,285,2017-09-14 07:28:04.340999936\n\
team,competition,285,2017-09-14 07:28:06.713999872\n\
competition,coach,285,2017-09-14 07:29:23.240999936\n\
coach,competition,285,2017-09-14 07:29:38.008000000\n\
competition,coach,285,2017-09-14 07:31:05.380000000\n\
coach,competition,286,2017-09-14 13:43:16.921999872\n\
competition,routes,286,2017-09-14 14:14:56.220999936\n\
routes,badges,286,2017-09-14 14:15:09.784999936\n\
badges,competition,286,2017-09-14 14:15:16.140000000\n\
competition,team,286,2017-09-14 14:15:39.432000000\n\
team,track,286,2017-09-14 14:15:42.404999936\n\
track,coach,286,2017-09-14 14:15:48.183000064\n\
coach,competition,286,2017-09-14 14:15:54.932000000\n\
competition,coach,286,2017-09-14 14:29:47.212000000\n\
coach,competition,286,2017-09-14 14:29:48.923000064\n\
competition,coach,286,2017-09-14 14:29:50.276999936\n\
coach,competition,286,2017-09-14 14:29:52.980000000\n\
competition,coach,286,2017-09-14 14:29:58.326000128\n\
coach,competition,286,2017-09-14 14:29:59.568000000\n\
competition,coach,286,2017-09-14 14:30:22.892000000\n\
coach,personal,286,2017-09-14 14:30:26.251000064\n\
personal,coach,286,2017-09-14 14:30:30.526000128\n\
coach,competition,286,2017-09-14 14:30:59.720999936\n\
competition,coach,286,2017-09-14 14:31:14.272000000\n\
coach,team,286,2017-09-14 14:31:21.167000064\n\
team,competition,286,2017-09-14 14:31:25.224999936\n\
competition,track,286,2017-09-14 14:31:31.001999872\n\
track,team,286,2017-09-14 14:31:44.596000000\n\
team,personal,286,2017-09-14 14:31:59.395000064\n\
personal,team,286,2017-09-14 14:32:08.633999872\n\
team,track,286,2017-09-14 14:32:13.715000064\n\
track,routes,286,2017-09-14 14:32:17.880000000\n\
routes,coach,286,2017-09-14 14:32:25.435000064\n\
coach,competition,286,2017-09-14 14:32:28.575000064\n\
competition,coach,286,2017-09-14 14:32:35.752999936\n\
coach,competition,286,2017-09-14 14:32:37.811000064\n\
competition,coach,286,2017-09-14 14:37:48.063000064\n\
coach,competition,286,2017-09-14 14:37:50.633999872\n\
competition,coach,286,2017-09-14 14:37:54.311000064\n\
coach,track,287,2017-09-14 16:45:05.750000128\n\
track,route,287,2017-09-14 16:45:09.244000000\n\
route,track,287,2017-09-14 16:50:36.635000064\n\
track,coach,287,2017-09-14 16:50:39.644999936\n\
coach,coach,287,2017-09-14 16:51:13.224999936\n\
coach,competition,287,2017-09-14 16:53:15.883000064\n\
competition,coach,287,2017-09-14 19:38:23.108000000\n\
coach,team,287,2017-09-14 19:38:29.908000000\n\
team,competition,287,2017-09-14 19:38:36.600999936\n\
competition,track,287,2017-09-14 19:38:52.792000000\n\
track,competition,287,2017-09-14 19:39:23.209999872\n\
competition,routes,287,2017-09-14 19:39:25.983000064\n\
routes,route,287,2017-09-14 19:39:29.169999872\n\
route,routes,287,2017-09-14 19:39:33.998000128\n\
routes,route,287,2017-09-14 19:39:36.481999872\n\
route,routes,287,2017-09-14 19:39:37.329999872\n\
routes,route,287,2017-09-14 19:39:39.505999872\n\
route,routes,287,2017-09-14 19:39:40.584999936\n\
routes,route,287,2017-09-14 19:39:46.816000000\n\
route,routes,287,2017-09-14 19:39:48.232999936\n\
routes,route,287,2017-09-14 19:39:51.220999936\n\
route,routes,287,2017-09-14 19:39:52.251000064\n\
routes,route,287,2017-09-14 19:39:55.328000000\n\
route,routes,287,2017-09-14 19:39:56.412000000\n\
routes,route,287,2017-09-14 19:39:58.427000064\n\
route,routes,287,2017-09-14 19:39:59.868999936\n\
routes,route,287,2017-09-14 19:40:04.497999872\n\
route,routes,287,2017-09-14 19:40:05.729999872\n\
routes,route,287,2017-09-14 19:40:07.248999936\n\
route,routes,287,2017-09-14 19:40:09.264999936\n\
routes,route,287,2017-09-14 19:40:10.817999872\n\
route,routes,287,2017-09-14 19:40:12.020000000\n\
coach,track,288,2017-09-15 07:08:10.228000000\n\
track,route,288,2017-09-15 07:08:13.900000000\n\
route,track,288,2017-09-15 07:12:54.343000064\n\
track,team,288,2017-09-15 07:13:02.644000000\n\
team,competition,288,2017-09-15 07:15:37.065999872\n\
competition,routes,288,2017-09-15 07:15:44.368999936\n\
routes,route,288,2017-09-15 07:15:52.225999872\n\
route,routes,288,2017-09-15 07:15:58.648000000\n\
coach,competition,289,2017-09-15 10:37:57.264000000\n\
competition,coach,289,2017-09-15 10:38:00.961999872\n\
coach,team,289,2017-09-15 10:38:11.404000000\n\
team,competition,289,2017-09-15 10:38:15.344999936\n\
competition,team,289,2017-09-15 10:38:45.807000064\n\
team,routes,289,2017-09-15 10:39:05.988999936\n\
routes,coach,289,2017-09-15 10:39:25.723000064\n\
coach,competition,289,2017-09-15 10:39:29.572000000\n\
competition,coach,289,2017-09-15 10:39:36.319000064\n\
coach,team,290,2017-09-15 11:20:03.431000064\n\
coach,competition,291,2017-09-15 13:30:47.025999872\n\
competition,coach,291,2017-09-15 13:31:01.468999936\n\
coach,track,291,2017-09-15 13:31:12.740999936\n\
track,route,291,2017-09-15 13:31:14.766000128\n\
route,track,291,2017-09-15 14:00:24.808000000\n\
track,coach,291,2017-09-15 14:00:32.011000064\n\
coach,competition,291,2017-09-15 14:00:37.208000000\n\
competition,coach,291,2017-09-15 14:00:46.256000000\n\
coach,competition,291,2017-09-15 14:01:28.227000064\n\
competition,coach,291,2017-09-15 14:01:29.769999872\n\
coach,routes,291,2017-09-15 14:01:34.428999936\n\
routes,route,291,2017-09-15 14:01:42.878000128\n\
route,routes,291,2017-09-15 14:01:45.502000128\n\
routes,route,291,2017-09-15 14:01:50.403000064\n\
route,routes,291,2017-09-15 14:01:52.596999936\n\
routes,route,291,2017-09-15 14:02:00.252999936\n\
route,routes,291,2017-09-15 14:02:01.856000000\n\
routes,route,291,2017-09-15 14:02:04.244999936\n\
route,routes,291,2017-09-15 14:02:06.526000128\n\
routes,route,291,2017-09-15 14:02:08.848999936\n\
route,routes,291,2017-09-15 14:02:10.707000064\n\
routes,route,291,2017-09-15 14:02:12.884999936\n\
route,routes,291,2017-09-15 14:02:14.655000064\n\
routes,track,291,2017-09-15 14:02:16.579000064\n\
track,route,291,2017-09-15 14:02:19.700999936\n\
route,track,291,2017-09-15 14:19:41.891000064\n\
track,coach,291,2017-09-15 14:21:53.252000000\n\
coach,coach,291,2017-09-15 14:27:22.468999936\n\
coach,competition,291,2017-09-15 14:28:48.249999872\n\
competition,coach,291,2017-09-15 14:28:53.867000064\n\
coach,track,291,2017-09-15 14:28:56.060999936\n\
track,route,291,2017-09-15 14:29:02.743000064\n\
route,track,291,2017-09-15 14:29:08.169999872\n\
track,route,291,2017-09-15 14:29:25.676000000\n\
coach,competition,292,2017-09-15 15:34:23.540999936\n\
competition,coach,292,2017-09-15 15:36:39.601999872\n\
coach,competition,292,2017-09-15 15:36:43.312999936\n\
competition,coach,292,2017-09-15 15:36:56.264999936\n\
coach,competition,292,2017-09-15 15:37:04.032000000\n\
competition,coach,292,2017-09-15 15:37:38.532999936\n\
coach,competition,292,2017-09-15 15:37:41.363000064\n\
competition,coach,292,2017-09-15 15:40:37.611000064\n\
coach,team,292,2017-09-15 15:40:50.934000128\n\
team,competition,292,2017-09-15 15:40:54.345999872\n\
competition,team,292,2017-09-15 15:41:54.417999872\n\
team,badges,292,2017-09-15 15:42:03.560999936\n\
badges,track,292,2017-09-15 15:42:11.590000128\n\
track,competition,292,2017-09-15 15:42:34.483000064\n\
competition,team,292,2017-09-15 15:42:37.932999936\n\
team,competition,292,2017-09-15 15:42:42.404999936\n\
competition,coach,292,2017-09-15 15:43:20.727000064\n\
coach,routes,292,2017-09-15 15:43:34.382000128\n\
routes,route,292,2017-09-15 15:43:40.871000064\n\
route,routes,292,2017-09-15 15:43:44.831000064\n\
routes,route,292,2017-09-15 15:43:49.572999936\n\
route,routes,292,2017-09-15 15:43:51.372999936\n\
routes,route,292,2017-09-15 15:44:07.096999936\n\
route,routes,292,2017-09-15 15:44:08.921999872\n\
routes,route,292,2017-09-15 15:44:13.385999872\n\
route,routes,292,2017-09-15 15:44:15.424999936\n\
routes,route,292,2017-09-15 15:44:30.080000000\n\
route,routes,292,2017-09-15 15:44:33.075000064\n\
routes,route,292,2017-09-15 15:44:34.849999872\n\
route,routes,292,2017-09-15 15:44:36.291000064\n\
routes,route,292,2017-09-15 15:44:44.940999936\n\
route,routes,292,2017-09-15 15:44:46.492000000\n\
routes,route,292,2017-09-15 15:44:54.044000000\n\
route,routes,292,2017-09-15 15:44:56.855000064\n\
routes,route,292,2017-09-15 15:45:01.921999872\n\
route,routes,292,2017-09-15 15:45:05.512999936\n\
routes,route,292,2017-09-15 15:45:12.236000000\n\
route,routes,292,2017-09-15 15:45:16.196999936\n\
routes,route,292,2017-09-15 15:45:20.108999936\n\
route,routes,292,2017-09-15 15:45:23.735000064\n\
routes,route,292,2017-09-15 15:45:26.883000064\n\
route,routes,292,2017-09-15 15:45:27.784000000\n\
routes,route,292,2017-09-15 15:45:33.342000128\n\
route,routes,292,2017-09-15 15:45:36.352999936\n\
routes,route,292,2017-09-15 15:45:38.326000128\n\
route,routes,292,2017-09-15 15:45:40.928999936\n\
routes,route,292,2017-09-15 15:46:03.798000128\n\
route,routes,292,2017-09-15 15:46:05.715000064\n\
routes,route,292,2017-09-15 15:46:07.008999936\n\
coach,,293,2017-09-15 20:33:40.641999872\n\
coach,,294,2017-09-15 23:56:00.828000000\n\
coach,,295,2017-09-16 10:39:57.320999936\n\
coach,track,296,2017-09-16 11:51:17.080000000\n\
track,route,296,2017-09-16 11:51:31.040999936\n\
route,track,296,2017-09-16 12:23:13.159000064\n\
track,coach,296,2017-09-16 12:23:19.982000128\n\
coach,track,297,2017-09-16 15:46:58.840000000\n\
track,route,297,2017-09-16 15:47:04.936000000\n\
coach,competition,298,2017-09-16 18:49:11.664999936\n\
competition,coach,298,2017-09-16 18:49:14.747000064\n\
coach,competition,298,2017-09-16 18:49:17.144000000\n\
competition,coach,298,2017-09-16 18:49:18.415000064\n\
coach,routes,298,2017-09-16 18:49:19.764999936\n\
routes,coach,298,2017-09-16 18:49:26.511000064\n\
coach,competition,298,2017-09-16 18:49:40.892000000\n\
competition,coach,298,2017-09-16 18:49:43.464000000\n\
coach,competition,299,2017-09-16 22:34:20.281999872\n\
competition,coach,299,2017-09-16 22:34:23.227000064\n\
coach,competition,299,2017-09-16 22:34:25.347000064\n\
competition,coach,299,2017-09-16 23:16:59.779000064\n\
coach,routes,299,2017-09-16 23:17:25.486000128\n\
routes,route,299,2017-09-16 23:17:31.735000064\n\
route,routes,299,2017-09-16 23:17:34.897999872\n\
routes,route,299,2017-09-16 23:17:59.910000128\n\
route,routes,299,2017-09-16 23:18:02.412000000\n\
routes,route,299,2017-09-16 23:18:18.012000000\n\
route,routes,299,2017-09-16 23:18:22.481999872\n\
routes,route,299,2017-09-16 23:18:36.396999936\n\
route,routes,299,2017-09-16 23:18:39.772000000\n\
routes,route,299,2017-09-16 23:18:54.600999936\n\
route,routes,299,2017-09-16 23:18:58.255000064\n\
routes,route,299,2017-09-16 23:19:01.988000000\n\
route,routes,299,2017-09-16 23:19:04.878000128\n\
routes,team,299,2017-09-16 23:19:20.156000000\n\
team,competition,299,2017-09-16 23:19:23.371000064\n\
competition,badges,299,2017-09-16 23:20:41.263000064\n\
badges,team,299,2017-09-16 23:20:48.384000000\n\
team,competition,299,2017-09-16 23:21:07.879000064\n\
competition,routes,299,2017-09-16 23:21:50.164000000\n\
coach,competition,300,2017-09-17 16:05:37.147000064\n\
competition,team,300,2017-09-17 16:05:45.128000000\n\
team,coach,300,2017-09-17 16:06:08.164999936\n\
coach,badges,300,2017-09-17 16:06:49.199000064\n\
coach,competition,301,2017-09-18 11:30:38.983000064\n\
competition,team,301,2017-09-18 11:30:50.404000000\n\
team,track,301,2017-09-18 11:31:20.144000000\n\
track,routes,301,2017-09-18 11:32:02.576999936\n\
routes,route,301,2017-09-18 11:32:18.703000064\n\
route,routes,301,2017-09-18 11:32:22.425999872\n\
routes,route,301,2017-09-18 11:32:24.334000128\n\
route,coach,301,2017-09-18 11:32:25.595000064\n\
coach,badges,301,2017-09-18 11:34:07.408000000\n\
coach,,302,2017-09-18 15:31:15.584000000\n\
coach,,303,2017-09-18 18:14:20.452000000\n\
coach,,304,2017-09-18 22:28:42.552999936\n\
coach,,305,2017-09-19 10:08:05.471000064\n\
coach,,306,2017-09-19 10:28:34.504000000\n\
coach,,307,2017-09-19 11:00:22.641999872\n\
coach,,308,2017-09-19 11:31:10.344000000\n\
coach,,309,2017-09-19 11:53:58.166000128\n\
coach,,310,2017-09-19 13:45:12.655000064\n\
coach,,311,2017-09-19 14:22:31.668000000\n\
coach,coach,312,2017-09-19 15:27:23.348999936\n\
coach,coach,312,2017-09-19 15:32:25.172999936\n\
coach,,313,2017-09-19 16:54:31.164999936\n\
coach,,314,2017-09-19 17:47:37.401999872\n\
coach,,315,2017-09-19 19:53:18.264999936\n\
coach,,316,2017-09-19 21:56:51.927000064\n\
coach,track,317,2017-09-20 06:06:34.872000000\n\
track,route,317,2017-09-20 06:06:40.561999872\n\
route,track,317,2017-09-20 06:06:41.887000064\n\
track,route,317,2017-09-20 06:06:44.804999936\n\
route,track,317,2017-09-20 06:06:50.199000064\n\
track,coach,317,2017-09-20 06:06:53.396999936\n\
coach,track,317,2017-09-20 06:06:55.352999936\n\
track,coach,317,2017-09-20 06:06:58.160999936\n\
coach,track,317,2017-09-20 07:02:46.929999872\n\
track,route,317,2017-09-20 07:25:36.982000128\n\
route,coach,317,2017-09-20 07:25:40.380000000\n\
coach,competition,317,2017-09-20 07:25:57.000000000\n\
competition,coach,317,2017-09-20 07:27:19.556000000\n\
coach,competition,317,2017-09-20 07:27:34.659000064\n\
competition,coach,317,2017-09-20 07:27:36.436000000\n\
coach,track,317,2017-09-20 07:27:41.020000000\n\
track,team,317,2017-09-20 07:28:05.809999872\n\
coach,badges,318,2017-09-20 14:22:53.816999936\n\
badges,competition,318,2017-09-20 14:23:18.447000064\n\
competition,track,318,2017-09-20 14:23:41.593999872\n\
track,routes,318,2017-09-20 14:24:24.388999936\n\
routes,badges,318,2017-09-20 14:24:28.616999936\n\
badges,coach,318,2017-09-20 14:24:32.931000064\n\
coach,coach,319,2017-09-20 16:17:37.155000064\n\
coach,track,319,2017-09-20 16:17:37.272999936\n\
track,coach,319,2017-09-20 16:17:41.024000000\n\
coach,competition,319,2017-09-20 16:19:01.619000064\n\
competition,coach,319,2017-09-20 16:19:07.132000000\n\
coach,track,319,2017-09-20 16:19:09.392999936\n\
track,route,319,2017-09-20 16:19:11.320999936\n\
route,track,319,2017-09-20 16:40:48.518000128\n\
track,coach,319,2017-09-20 16:41:03.003000064\n\
coach,track,319,2017-09-20 16:41:14.095000064\n\
track,coach,319,2017-09-20 16:42:09.334000128\n\
coach,track,319,2017-09-20 17:04:01.673999872\n\
track,coach,319,2017-09-20 17:05:23.016999936\n\
coach,track,319,2017-09-20 17:05:36.519000064\n\
track,route,319,2017-09-20 17:05:41.948999936\n\
route,track,319,2017-09-20 17:05:48.630000128\n\
track,coach,319,2017-09-20 17:41:21.792999936\n\
coach,competition,319,2017-09-20 22:10:30.831000064\n\
competition,coach,319,2017-09-20 22:10:41.492999936\n\
coach,competition,319,2017-09-20 22:10:49.628000000\n\
competition,coach,319,2017-09-20 22:11:07.984999936\n\
coach,routes,319,2017-09-20 22:11:10.527000064\n\
routes,route,319,2017-09-20 22:11:13.023000064\n\
route,routes,319,2017-09-20 22:11:17.673999872\n\
routes,route,319,2017-09-20 22:11:26.260000000\n\
route,routes,319,2017-09-20 22:11:28.528000000\n\
routes,route,319,2017-09-20 22:11:48.932000000\n\
route,routes,319,2017-09-20 22:11:51.464999936\n\
routes,route,319,2017-09-20 22:11:55.004999936\n\
route,routes,319,2017-09-20 22:11:56.492999936\n\
routes,route,319,2017-09-20 22:12:02.780999936\n\
route,routes,319,2017-09-20 22:12:05.288999936\n\
routes,route,319,2017-09-20 22:12:16.100000000\n\
route,routes,319,2017-09-20 22:12:19.185999872\n\
routes,route,319,2017-09-20 22:12:27.420999936\n\
route,routes,319,2017-09-20 22:12:30.252999936\n\
routes,route,319,2017-09-20 22:12:36.329999872\n\
route,routes,319,2017-09-20 22:12:38.016000000\n\
routes,route,319,2017-09-20 22:12:52.728999936\n\
route,routes,319,2017-09-20 22:12:54.284000000\n\
routes,badges,319,2017-09-20 22:13:00.400999936\n\
badges,team,319,2017-09-20 22:13:03.723000064\n\
team,competition,319,2017-09-20 22:13:35.979000064\n\
coach,track,320,2017-09-21 07:12:46.084999936\n\
track,route,320,2017-09-21 07:12:49.228999936\n\
route,track,320,2017-09-21 07:18:48.192999936\n\
track,competition,320,2017-09-21 08:02:47.528999936\n\
coach,track,321,2017-09-21 13:52:05.040000000\n\
track,route,321,2017-09-21 13:52:19.582000128\n\
route,coach,321,2017-09-21 14:04:28.747000064\n\
coach,competition,321,2017-09-21 14:04:41.054000128\n\
competition,team,321,2017-09-21 15:56:50.195000064\n\
team,track,321,2017-09-21 15:56:57.156999936\n\
track,badges,321,2017-09-21 15:58:26.271000064\n\
coach,competition,322,2017-09-21 21:40:04.080999936\n\
competition,coach,322,2017-09-21 21:40:11.489999872\n\
coach,track,322,2017-09-21 21:40:38.918000128\n\
track,routes,322,2017-09-21 21:40:41.780999936\n\
routes,route,322,2017-09-21 21:40:53.470000128\n\
route,routes,322,2017-09-21 21:40:57.216000000\n\
routes,route,322,2017-09-21 21:41:16.804999936\n\
route,routes,322,2017-09-21 21:41:18.720000000\n\
routes,route,322,2017-09-21 21:41:23.585999872\n\
route,routes,322,2017-09-21 21:41:25.195000064\n\
routes,route,322,2017-09-21 21:41:30.951000064\n\
route,routes,322,2017-09-21 21:41:32.271000064\n\
routes,route,322,2017-09-21 21:41:35.974000128\n\
route,routes,322,2017-09-21 21:41:37.784999936\n\
routes,route,322,2017-09-21 21:41:41.795000064\n\
route,routes,322,2017-09-21 21:41:43.630000128\n\
coach,competition,323,2017-09-21 22:37:42.767000064\n\
competition,badges,323,2017-09-21 22:37:54.583000064\n\
badges,coach,323,2017-09-21 22:38:05.296000000\n\
coach,competition,324,2017-09-22 13:31:29.456000000\n\
competition,team,324,2017-09-22 13:32:58.535000064\n\
team,track,324,2017-09-22 13:33:12.771000064\n\
track,coach,324,2017-09-22 13:33:27.623000064\n\
coach,competition,325,2017-09-24 08:24:54.897999872\n\
competition,routes,325,2017-09-24 08:25:03.656999936\n\
routes,team,325,2017-09-24 08:25:34.444999936\n\
team,coach,325,2017-09-24 08:25:37.987000064\n\
coach,competition,325,2017-09-24 08:41:04.643000064\n\
competition,team,325,2017-09-24 08:41:09.625999872\n\
team,badges,325,2017-09-24 08:41:23.720000000\n\
badges,track,325,2017-09-24 08:41:28.006000128\n\
track,coach,325,2017-09-24 08:55:18.272000000\n\
coach,track,325,2017-09-24 09:24:39.367000064\n\
track,coach,325,2017-09-24 09:28:25.295000064\n\
coach,track,325,2017-09-24 09:58:13.899000064\n\
track,route,325,2017-09-24 09:59:30.624999936\n\
route,coach,325,2017-09-24 09:59:34.648999936\n\
coach,track,325,2017-09-24 09:59:51.812999936\n\
track,route,325,2017-09-24 09:59:56.004000000\n\
route,coach,325,2017-09-24 10:00:05.404999936\n\
coach,track,325,2017-09-24 10:00:17.241999872\n\
track,route,325,2017-09-24 10:00:19.881999872\n\
route,coach,325,2017-09-24 10:00:58.188000000\n\
coach,track,325,2017-09-24 10:01:12.862000128\n\
track,coach,325,2017-09-24 10:03:34.374000128\n\
coach,competition,325,2017-09-24 10:03:45.420999936\n\
competition,coach,325,2017-09-24 10:03:50.183000064\n\
coach,competition,325,2017-09-24 10:03:52.504000000\n\
competition,coach,325,2017-09-24 10:03:54.486000128\n\
coach,routes,325,2017-09-24 10:03:55.886000128\n\
routes,route,325,2017-09-24 10:03:59.488000000\n\
route,routes,325,2017-09-24 10:04:05.985999872\n\
routes,route,325,2017-09-24 10:04:09.123000064\n\
route,routes,325,2017-09-24 10:04:10.128999936\n\
routes,route,325,2017-09-24 10:04:11.920000000\n\
route,routes,325,2017-09-24 10:04:12.824999936\n\
routes,route,325,2017-09-24 10:04:16.840999936\n\
route,routes,325,2017-09-24 10:04:19.374000128\n\
routes,route,325,2017-09-24 10:04:23.318000128\n\
route,routes,325,2017-09-24 10:04:28.646000128\n\
routes,route,325,2017-09-24 10:04:36.164999936\n\
route,routes,325,2017-09-24 10:04:38.819000064\n\
routes,route,325,2017-09-24 10:04:40.543000064\n\
route,routes,325,2017-09-24 10:04:43.192000000\n\
routes,route,325,2017-09-24 10:04:44.768999936\n\
route,routes,325,2017-09-24 10:04:46.715000064\n\
routes,track,325,2017-09-24 10:05:07.126000128\n\
track,route,325,2017-09-24 10:05:09.804000000\n\
route,track,325,2017-09-24 10:05:12.863000064\n\
track,route,325,2017-09-24 11:09:08.296000000\n\
route,track,325,2017-09-24 11:11:32.427000064\n\
track,coach,325,2017-09-24 11:11:35.112000000\n\
coach,competition,325,2017-09-24 11:11:37.591000064\n\
competition,routes,325,2017-09-24 12:21:44.785999872\n\
routes,route,325,2017-09-24 12:21:55.315000064\n\
route,routes,325,2017-09-24 12:22:01.408999936\n\
routes,route,325,2017-09-24 12:22:10.696000000\n\
route,routes,325,2017-09-24 12:22:26.036000000\n\
routes,route,325,2017-09-24 12:22:30.064000000\n\
route,routes,325,2017-09-24 12:22:32.377999872\n\
routes,route,325,2017-09-24 12:22:34.268000000\n\
route,routes,325,2017-09-24 12:22:37.057999872\n\
routes,coach,325,2017-09-24 12:22:49.454000128\n\
coach,competition,325,2017-09-24 12:22:53.684000000\n\
competition,coach,325,2017-09-24 12:23:43.427000064\n\
coach,badges,325,2017-09-24 12:23:48.363000064\n\
badges,routes,325,2017-09-24 12:24:00.392000000\n\
routes,route,325,2017-09-24 12:24:11.828000000\n\
route,coach,325,2017-09-24 12:24:17.184000000\n\
coach,routes,325,2017-09-24 12:24:27.327000064\n\
coach,competition,326,2017-09-24 18:52:04.108000000\n\
competition,team,326,2017-09-24 18:52:15.470000128\n\
team,coach,326,2017-09-24 18:52:40.529999872\n\
coach,routes,326,2017-09-24 18:53:08.667000064\n\
routes,route,326,2017-09-24 18:53:19.888000000\n\
route,routes,326,2017-09-24 18:53:25.087000064\n\
routes,route,326,2017-09-24 18:53:41.304000000\n\
route,routes,326,2017-09-24 18:53:43.440000000\n\
routes,route,326,2017-09-24 18:53:50.808000000\n\
route,routes,326,2017-09-24 18:53:52.200000000\n\
routes,route,326,2017-09-24 18:53:57.660000000\n\
route,routes,326,2017-09-24 18:53:58.649999872\n\
routes,badges,326,2017-09-24 18:54:02.561999872\n\
coach,personal,327,2017-09-07 18:57:41.193999872\n\
personal,coach,327,2017-09-07 18:58:42.292000000\n\
coach,team,327,2017-09-07 18:59:07.606000128\n\
team,competition,327,2017-09-07 18:59:10.391000064\n\
competition,routes,327,2017-09-07 18:59:30.726000128\n\
routes,coach,327,2017-09-07 18:59:40.878000128\n\
coach,track,327,2017-09-07 18:59:47.799000064\n\
track,route,327,2017-09-07 18:59:51.785999872\n\
route,track,327,2017-09-07 19:00:02.414000128\n\
track,badges,327,2017-09-07 19:00:05.735000064\n\
badges,personal,327,2017-09-07 19:00:09.768999936\n\
coach,track,328,2017-09-08 10:16:31.865999872\n\
track,route,328,2017-09-08 10:16:36.571000064\n\
route,track,328,2017-09-08 10:16:49.951000064\n\
track,team,328,2017-09-08 10:16:58.943000064\n\
team,personal,328,2017-09-08 10:17:03.179000064\n\
personal,team,328,2017-09-08 10:17:18.752000000\n\
coach,team,329,2017-09-09 18:15:12.470000128\n\
team,competition,329,2017-09-09 18:15:23.116000000\n\
competition,routes,329,2017-09-09 18:16:01.204999936\n\
routes,personal,329,2017-09-09 18:16:11.636999936\n\
personal,route,329,2017-09-09 18:16:22.523000064\n\
route,routes,329,2017-09-09 18:16:25.862000128\n\
routes,track,329,2017-09-09 18:16:34.303000064\n\
track,personal,329,2017-09-09 18:16:48.011000064\n\
personal,track,329,2017-09-09 18:18:26.334000128\n\
track,personal,329,2017-09-09 18:18:28.046000128\n\
personal,bugreport,329,2017-09-09 18:18:30.100999936\n\
bugreport,track,329,2017-09-09 18:18:30.927000064\n\
track,team,329,2017-09-09 18:18:37.979000064\n\
team,routes,329,2017-09-09 18:18:49.663000064\n\
routes,badges,329,2017-09-09 18:18:59.599000064\n\
badges,coach,329,2017-09-09 18:19:02.070000128\n\
coach,track,329,2017-09-09 18:19:06.936999936\n\
track,coach,329,2017-09-09 18:19:34.743000064\n\
coach,track,329,2017-09-09 18:19:54.647000064\n\
track,route,329,2017-09-09 18:19:59.288000000\n\
route,track,329,2017-09-09 18:20:23.612000000\n\
track,coach,329,2017-09-09 18:20:27.087000064\n\
coach,track,330,2017-09-10 06:19:32.967000064\n\
track,coach,330,2017-09-10 06:19:37.003000064\n\
coach,competition,330,2017-09-10 09:22:26.470000128\n\
competition,coach,330,2017-09-10 09:22:36.417999872\n\
coach,team,330,2017-09-10 09:22:40.403000064\n\
coach,track,331,2017-09-15 04:58:50.864999936\n\
track,route,331,2017-09-15 04:59:50.735000064\n\
coach,team,332,2017-09-17 17:43:35.271000064\n\
team,competition,332,2017-09-17 17:43:40.760999936\n\
competition,team,332,2017-09-17 17:44:05.895000064\n\
team,personal,332,2017-09-17 17:44:16.441999872\n\
personal,team,332,2017-09-17 17:44:21.961999872\n\
coach,track,333,2017-09-21 05:01:46.456999936\n\
track,route,333,2017-09-21 05:01:55.408999936\n\
route,coach,333,2017-09-21 05:27:22.676000000\n\
coach,competition,333,2017-09-21 05:27:39.545999872\n\
coach,competition,334,2017-09-21 16:50:33.064999936\n\
competition,coach,334,2017-09-21 16:50:41.300999936\n\
coach,team,334,2017-09-21 16:50:48.668000000\n\
team,competition,334,2017-09-21 16:50:53.292999936\n\
competition,personal,334,2017-09-21 16:51:18.699000064\n\
personal,competition,334,2017-09-21 16:51:22.219000064\n\
competition,routes,334,2017-09-21 16:51:26.185999872\n\
routes,route,334,2017-09-21 16:51:29.016999936\n\
route,routes,334,2017-09-21 16:51:32.459000064\n\
routes,route,334,2017-09-21 16:51:38.625999872\n\
route,routes,334,2017-09-21 16:51:41.800999936\n\
routes,coach,334,2017-09-21 16:51:54.144000000\n\
coach,personal,335,2017-09-01 14:21:52.321999872\n\
personal,coach,335,2017-09-01 14:23:02.675000064\n\
coach,personal,335,2017-09-01 14:24:15.769999872\n\
personal,team,335,2017-09-01 14:24:35.319000064\n\
team,routes,335,2017-09-01 14:24:42.220000000\n\
routes,badges,335,2017-09-01 14:24:52.488999936\n\
badges,coach,335,2017-09-01 14:24:58.276999936\n\
coach,track,335,2017-09-01 14:25:09.035000064\n\
track,competition,335,2017-09-01 14:25:17.020000000\n\
competition,team,335,2017-09-01 14:25:22.272999936\n\
team,coach,335,2017-09-01 14:25:50.998000128\n\
coach,personal,335,2017-09-01 14:26:22.411000064\n\
personal,coach,335,2017-09-01 14:26:50.927000064\n\
coach,routes,335,2017-09-01 14:26:56.228000000\n\
routes,coach,335,2017-09-01 14:27:04.032000000\n\
coach,competition,335,2017-09-01 14:27:15.521999872\n\
competition,team,335,2017-09-01 14:27:49.608000000\n\
team,track,335,2017-09-01 14:27:58.847000064\n\
track,coach,335,2017-09-01 14:28:04.112999936\n\
coach,team,335,2017-09-01 14:43:50.804000000\n\
coach,team,336,2017-09-01 15:18:47.577999872\n\
coach,team,337,2017-09-01 16:41:22.104999936\n\
team,competition,337,2017-09-01 16:41:26.703000064\n\
coach,team,338,2017-09-01 17:20:16.647000064\n\
coach,team,339,2017-09-01 17:44:26.148000000\n\
coach,team,340,2017-09-02 06:46:09.295000064\n\
coach,team,341,2017-09-02 13:04:52.809999872\n\
team,competition,341,2017-09-02 13:04:57.808000000\n\
competition,routes,341,2017-09-02 13:05:15.688999936\n\
routes,badges,341,2017-09-02 13:05:24.580999936\n\
coach,track,342,2017-09-02 13:49:05.944000000\n\
track,team,342,2017-09-02 13:49:12.215000064\n\
team,competition,342,2017-09-02 13:49:15.896000000\n\
coach,team,343,2017-09-02 20:02:15.921999872\n\
team,competition,343,2017-09-02 20:02:22.318000128\n\
competition,routes,343,2017-09-02 20:02:45.351000064\n\
routes,personal,343,2017-09-02 20:02:53.336999936\n\
personal,routes,343,2017-09-02 20:02:56.952999936\n\
routes,badges,343,2017-09-02 20:03:03.280000000\n\
badges,coach,343,2017-09-02 20:03:08.288999936\n\
coach,team,343,2017-09-02 20:03:19.520000000\n\
coach,track,344,2017-09-03 06:23:01.827000064\n\
track,track,344,2017-09-03 06:23:05.892000000\n\
track,route,344,2017-09-03 09:21:31.767000064\n\
route,track,344,2017-09-03 09:21:35.504999936\n\
track,route,344,2017-09-03 09:21:44.039000064\n\
route,track,344,2017-09-03 09:21:52.470000128\n\
track,routes,344,2017-09-03 09:21:55.755000064\n\
routes,route,344,2017-09-03 09:21:58.272000000\n\
route,routes,344,2017-09-03 09:22:04.027000064\n\
routes,route,344,2017-09-03 09:22:07.891000064\n\
route,routes,344,2017-09-03 09:22:09.030000128\n\
routes,badges,344,2017-09-03 09:22:10.776999936\n\
badges,team,344,2017-09-03 09:22:14.232000000\n\
team,track,344,2017-09-03 09:22:19.400000000\n\
track,route,344,2017-09-03 09:22:32.831000064\n\
route,coach,344,2017-09-03 09:22:48.246000128\n\
coach,team,344,2017-09-03 09:23:05.848000000\n\
coach,team,345,2017-09-03 10:24:23.537999872\n\
team,routes,345,2017-09-03 10:24:29.140000000\n\
routes,route,345,2017-09-03 10:24:45.168000000\n\
route,routes,345,2017-09-03 10:24:48.808999936\n\
routes,route,345,2017-09-03 10:24:59.547000064\n\
route,routes,345,2017-09-03 10:25:01.393999872\n\
routes,route,345,2017-09-03 10:25:07.145999872\n\
route,routes,345,2017-09-03 10:25:08.724999936\n\
routes,personal,345,2017-09-03 10:25:10.875000064\n\
personal,bugreport,345,2017-09-03 10:25:12.176999936\n\
bugreport,competition,345,2017-09-03 10:25:15.654000128\n\
competition,routes,345,2017-09-03 10:25:28.329999872\n\
routes,route,345,2017-09-03 10:25:38.547000064\n\
route,routes,345,2017-09-03 10:25:41.377999872\n\
routes,route,345,2017-09-03 10:25:44.156999936\n\
route,routes,345,2017-09-03 10:25:45.321999872\n\
routes,track,345,2017-09-03 10:25:55.753999872\n\
track,route,345,2017-09-03 10:25:58.260999936\n\
route,track,345,2017-09-03 10:26:15.276000000\n\
track,routes,345,2017-09-03 10:26:17.353999872\n\
routes,route,345,2017-09-03 10:26:21.369999872\n\
route,coach,345,2017-09-03 10:26:32.073999872\n\
coach,badges,345,2017-09-03 10:26:48.200999936\n\
badges,competition,345,2017-09-03 10:27:04.291000064\n\
competition,team,345,2017-09-03 10:27:11.663000064\n\
team,coach,345,2017-09-03 10:27:17.280000000\n\
coach,track,345,2017-09-03 10:30:23.576999936\n\
track,competition,345,2017-09-03 10:31:49.259000064\n\
competition,routes,345,2017-09-03 10:31:54.377999872\n\
routes,team,345,2017-09-03 10:32:02.607000064\n\
team,routes,345,2017-09-03 10:32:06.079000064\n\
routes,route,345,2017-09-03 10:32:22.755000064\n\
route,personal,345,2017-09-03 10:32:25.708999936\n\
personal,routes,345,2017-09-03 10:32:30.816999936\n\
routes,route,345,2017-09-03 10:32:38.790000128\n\
route,coach,345,2017-09-03 10:32:41.107000064\n\
coach,team,345,2017-09-03 10:37:15.688999936\n\
coach,team,346,2017-09-03 11:19:16.320000000\n\
team,competition,346,2017-09-03 11:19:24.216999936\n\
competition,team,346,2017-09-03 11:19:39.692000000\n\
team,routes,346,2017-09-03 11:19:49.283000064\n\
routes,route,346,2017-09-03 11:20:08.679000064\n\
route,routes,346,2017-09-03 11:20:11.180000000\n\
routes,route,346,2017-09-03 11:20:16.185999872\n\
route,routes,346,2017-09-03 11:20:17.576000000\n\
routes,route,346,2017-09-03 11:20:21.227000064\n\
route,routes,346,2017-09-03 11:20:22.696999936\n\
routes,competition,346,2017-09-03 11:20:26.836999936\n\
competition,team,346,2017-09-03 11:20:31.416000000\n\
team,competition,346,2017-09-03 11:20:41.702000128\n\
competition,team,346,2017-09-03 11:21:15.169999872\n\
coach,competition,347,2017-09-03 12:16:06.571000064\n\
competition,team,347,2017-09-03 12:16:32.904000000\n\
team,competition,347,2017-09-03 12:16:39.576000000\n\
competition,routes,347,2017-09-03 12:16:47.904999936\n\
coach,team,348,2017-09-03 12:54:55.403000064\n\
team,competition,348,2017-09-03 12:55:06.148000000\n\
competition,track,348,2017-09-03 12:55:18.260000000\n\
track,routes,348,2017-09-03 12:55:25.032999936\n\
routes,route,348,2017-09-03 12:55:43.127000064\n\
route,routes,348,2017-09-03 12:55:48.007000064\n\
coach,routes,349,2017-09-03 14:29:04.920000000\n\
routes,route,349,2017-09-03 14:29:11.112000000\n\
route,routes,349,2017-09-03 14:29:14.544999936\n\
routes,route,349,2017-09-03 14:29:18.748000000\n\
route,routes,349,2017-09-03 14:29:20.247000064\n\
routes,route,349,2017-09-03 14:29:40.288999936\n\
route,routes,349,2017-09-03 14:29:42.481999872\n\
routes,competition,349,2017-09-03 14:29:45.679000064\n\
competition,team,349,2017-09-03 14:29:48.620000000\n\
coach,competition,350,2017-09-03 15:27:02.336000000\n\
competition,team,350,2017-09-03 15:27:06.662000128\n\
coach,team,351,2017-09-03 17:22:08.099000064\n\
team,competition,351,2017-09-03 17:22:13.019000064\n\
competition,badges,351,2017-09-03 17:22:26.396000000\n\
coach,team,352,2017-09-04 06:44:49.081999872\n\
team,competition,352,2017-09-04 06:44:58.632000000\n\
competition,routes,352,2017-09-04 06:45:14.088000000\n\
routes,route,352,2017-09-04 06:45:18.836000000\n\
coach,routes,353,2017-09-04 16:02:20.777999872\n\
routes,route,353,2017-09-04 16:02:27.972000000\n\
route,personal,353,2017-09-04 16:02:30.180999936\n\
personal,coach,353,2017-09-04 16:02:33.633999872\n\
coach,personal,353,2017-09-04 16:10:03.100999936\n\
personal,bugreport,353,2017-09-04 16:10:05.160000000\n\
bugreport,coach,353,2017-09-04 16:10:06.604000000\n\
coach,team,353,2017-09-04 16:13:34.316999936\n\
team,routes,353,2017-09-04 16:13:40.903000064\n\
routes,route,353,2017-09-04 16:13:51.102000128\n\
route,routes,353,2017-09-04 16:13:53.655000064\n\
routes,track,353,2017-09-04 16:13:56.766000128\n\
track,coach,353,2017-09-04 16:14:05.839000064\n\
coach,track,353,2017-09-04 16:15:09.471000064\n\
track,team,353,2017-09-04 16:15:13.767000064\n\
team,routes,353,2017-09-04 16:15:17.000999936\n\
routes,competition,353,2017-09-04 16:15:23.887000064\n\
coach,competition,354,2017-09-05 05:36:56.824000000\n\
competition,track,354,2017-09-05 05:36:58.886000128\n\
track,team,354,2017-09-05 05:37:04.934000128\n\
coach,track,355,2017-09-05 16:21:16.060999936\n\
track,route,355,2017-09-05 16:21:19.368000000\n\
route,coach,355,2017-09-05 16:24:54.547000064\n\
coach,team,355,2017-09-05 16:28:26.934000128\n\
coach,competition,356,2017-09-05 18:10:37.812000000\n\
competition,coach,356,2017-09-05 18:10:46.486000128\n\
coach,track,356,2017-09-05 18:10:51.249999872\n\
track,routes,356,2017-09-05 18:10:56.614000128\n\
routes,route,356,2017-09-05 18:11:01.134000128\n\
route,routes,356,2017-09-05 18:11:04.036000000\n\
routes,team,356,2017-09-05 18:11:16.153999872\n\
coach,competition,357,2017-09-06 09:32:59.511000064\n\
competition,coach,357,2017-09-06 09:33:48.908999936\n\
coach,team,357,2017-09-06 09:33:56.009999872\n\
team,coach,357,2017-09-06 09:33:58.791000064\n\
coach,badges,357,2017-09-06 09:41:17.985999872\n\
badges,routes,357,2017-09-06 09:41:27.756000000\n\
routes,route,357,2017-09-06 09:41:41.436000000\n\
route,routes,357,2017-09-06 09:41:44.455000064\n\
routes,route,357,2017-09-06 09:41:52.846000128\n\
route,routes,357,2017-09-06 09:41:54.412999936\n\
routes,route,357,2017-09-06 09:41:56.588000000\n\
route,routes,357,2017-09-06 09:41:57.744999936\n\
routes,team,357,2017-09-06 09:42:02.395000064\n\
team,personal,357,2017-09-06 09:42:07.296000000\n\
coach,track,358,2017-09-06 16:17:06.760999936\n\
track,coach,358,2017-09-06 16:17:10.385999872\n\
coach,track,358,2017-09-06 16:22:37.988000000\n\
track,route,358,2017-09-06 16:22:42.179000064\n\
coach,competition,359,2017-09-06 19:19:51.276000000\n\
competition,team,359,2017-09-06 19:20:02.817999872\n\
team,routes,359,2017-09-06 19:20:11.884999936\n\
routes,route,359,2017-09-06 19:20:35.494000128\n\
coach,competition,360,2017-09-06 20:33:54.840999936\n\
coach,track,361,2017-09-07 05:30:16.064000000\n\
track,coach,361,2017-09-07 05:30:19.359000064\n\
coach,competition,362,2017-09-07 06:55:14.281999872\n\
competition,coach,362,2017-09-07 06:55:20.726000128\n\
coach,track,362,2017-09-07 06:55:24.756999936\n\
track,route,362,2017-09-07 06:55:28.824999936\n\
route,coach,362,2017-09-07 06:55:31.828000000\n\
coach,competition,362,2017-09-07 06:55:50.854000128\n\
competition,coach,362,2017-09-07 06:55:58.088999936\n\
coach,routes,362,2017-09-07 06:56:48.684000000\n\
routes,route,362,2017-09-07 06:56:51.311000064\n\
route,coach,362,2017-09-07 06:56:53.084999936\n\
coach,team,362,2017-09-07 06:57:22.663000064\n\
team,competition,362,2017-09-07 06:57:35.623000064\n\
coach,badges,363,2017-09-07 09:48:34.064000000\n\
badges,routes,363,2017-09-07 09:48:43.507000064\n\
routes,route,363,2017-09-07 09:49:02.272000000\n\
coach,routes,364,2017-09-07 13:08:10.681999872\n\
routes,route,364,2017-09-07 13:08:15.139000064\n\
route,routes,364,2017-09-07 13:08:17.424999936\n\
routes,route,364,2017-09-07 13:09:18.614000128\n\
coach,competition,365,2017-09-07 13:49:51.551000064\n\
competition,coach,365,2017-09-07 13:50:06.511000064\n\
coach,routes,365,2017-09-07 13:50:12.116000000\n\
routes,route,365,2017-09-07 13:50:27.364999936\n\
route,personal,365,2017-09-07 13:50:29.800999936\n\
personal,bugreport,365,2017-09-07 13:50:36.244999936\n\
bugreport,personal,365,2017-09-07 13:50:37.616999936\n\
personal,bugreport,365,2017-09-07 13:51:10.156000000\n\
coach,competition,366,2017-09-08 08:36:15.609999872\n\
competition,team,366,2017-09-08 08:36:23.248999936\n\
coach,competition,367,2017-09-09 09:50:07.351000064\n\
competition,team,367,2017-09-09 09:50:10.263000064\n\
team,coach,367,2017-09-09 09:50:15.113999872\n\
coach,personal,367,2017-09-09 09:50:34.312000000\n\
personal,bugreport,367,2017-09-09 09:50:36.099000064\n\
coach,competition,368,2017-09-10 06:15:18.828000000\n\
coach,coach,369,2017-09-11 10:05:36.089999872\n\
coach,competition,369,2017-09-11 10:06:42.604999936\n\
competition,team,369,2017-09-11 10:06:45.888999936\n\
team,routes,369,2017-09-11 10:06:53.382000128\n\
routes,badges,369,2017-09-11 10:07:11.708000000\n\
badges,team,369,2017-09-11 10:07:16.679000064\n\
team,coach,369,2017-09-11 10:07:21.556000000\n\
coach,competition,370,2017-09-11 17:39:34.609999872\n\
competition,team,370,2017-09-11 17:40:03.668999936\n\
coach,competition,371,2017-09-11 18:39:58.835000064\n\
competition,team,371,2017-09-11 18:40:56.888999936\n\
coach,competition,372,2017-09-12 14:48:33.963000064\n\
competition,team,372,2017-09-12 14:50:43.316000000\n\
team,coach,372,2017-09-12 14:50:49.724999936\n\
coach,,373,2017-09-12 15:50:10.403000064\n\
coach,team,374,2017-09-13 12:56:48.059000064\n\
team,competition,374,2017-09-13 12:57:02.668999936\n\
competition,coach,374,2017-09-13 12:57:26.532999936\n\
coach,coach,375,2017-09-13 14:30:43.676999936\n\
coach,track,376,2017-09-13 16:18:58.529999872\n\
track,route,376,2017-09-13 16:18:58.809999872\n\
coach,coach,377,2017-09-13 18:36:22.071000064\n\
coach,competition,377,2017-09-13 18:37:27.868000000\n\
coach,competition,378,2017-09-14 06:49:00.884999936\n\
competition,coach,378,2017-09-14 06:49:06.009999872\n\
coach,routes,378,2017-09-14 06:49:10.700000000\n\
routes,route,378,2017-09-14 06:49:13.820000000\n\
coach,competition,379,2017-09-14 09:24:55.404999936\n\
competition,team,379,2017-09-14 09:25:02.012000000\n\
coach,team,380,2017-09-14 13:44:08.888999936\n\
team,competition,380,2017-09-14 13:44:18.784999936\n\
coach,,381,2017-09-14 14:12:11.225999872\n\
coach,competition,382,2017-09-14 21:14:00.433999872\n\
competition,team,382,2017-09-14 21:14:06.144999936\n\
coach,competition,383,2017-09-15 05:50:10.723000064\n\
competition,team,383,2017-09-15 05:50:19.924999936\n\
coach,competition,384,2017-09-15 07:41:45.947000064\n\
coach,,385,2017-09-15 14:02:30.736000000\n\
coach,track,386,2017-09-15 15:12:56.500999936\n\
track,coach,386,2017-09-15 15:13:01.352999936\n\
coach,competition,386,2017-09-15 16:01:45.681999872\n\
competition,team,386,2017-09-15 16:01:59.393999872\n\
team,coach,386,2017-09-15 16:02:05.524999936\n\
coach,routes,386,2017-09-15 16:02:26.035000064\n\
routes,route,386,2017-09-15 16:02:29.876999936\n\
route,routes,386,2017-09-15 16:02:35.412000000\n\
routes,competition,386,2017-09-15 16:03:17.056000000\n\
competition,coach,386,2017-09-15 16:03:22.665999872\n\
coach,competition,386,2017-09-15 16:12:00.081999872\n\
competition,coach,386,2017-09-15 16:12:05.982000128\n\
coach,routes,386,2017-09-15 16:12:10.441999872\n\
routes,route,386,2017-09-15 16:12:16.216999936\n\
coach,personal,387,2017-09-15 16:50:37.388000000\n\
personal,coach,387,2017-09-15 16:51:11.126000128\n\
coach,team,387,2017-09-15 16:51:13.753999872\n\
team,coach,387,2017-09-15 16:51:18.588999936\n\
coach,coach,387,2017-09-15 16:51:44.492000000\n\
coach,personal,387,2017-09-15 16:52:39.545999872\n\
personal,bugreport,387,2017-09-15 16:52:41.614000128\n\
coach,,388,2017-09-15 17:50:35.156000000\n\
coach,,389,2017-09-16 06:38:36.569999872\n\
coach,track,390,2017-09-17 06:24:02.284000000\n\
track,coach,390,2017-09-17 06:24:06.299000064\n\
coach,routes,390,2017-09-17 09:53:47.576000000\n\
routes,route,390,2017-09-17 09:53:54.088000000\n\
coach,competition,391,2017-09-17 12:32:23.148000000\n\
competition,team,391,2017-09-17 12:32:41.908999936\n\
team,routes,391,2017-09-17 12:32:53.076999936\n\
routes,route,391,2017-09-17 12:33:13.409999872\n\
route,routes,391,2017-09-17 12:33:16.619000064\n\
routes,badges,391,2017-09-17 12:33:34.939000064\n\
coach,routes,392,2017-09-17 14:48:49.404999936\n\
routes,route,392,2017-09-17 14:48:58.409999872\n\
route,personal,392,2017-09-17 14:49:00.067000064\n\
personal,bugreport,392,2017-09-17 14:49:12.524999936\n\
bugreport,routes,392,2017-09-17 14:49:14.088999936\n\
routes,route,392,2017-09-17 14:49:26.671000064\n\
route,routes,392,2017-09-17 14:49:29.867000064\n\
routes,team,392,2017-09-17 14:50:02.996000000\n\
team,coach,392,2017-09-17 14:50:07.550000128\n\
coach,competition,392,2017-09-17 14:50:50.784999936\n\
coach,competition,393,2017-09-17 17:45:50.406000128\n\
competition,coach,393,2017-09-17 17:45:57.255000064\n\
coach,team,393,2017-09-17 17:46:02.283000064\n\
team,routes,393,2017-09-17 17:46:06.636999936\n\
routes,route,393,2017-09-17 17:46:17.448999936\n\
route,personal,393,2017-09-17 17:46:20.065999872\n\
coach,competition,394,2017-09-18 05:41:15.510000128\n\
competition,team,394,2017-09-18 05:41:21.784000000\n\
team,routes,394,2017-09-18 05:41:27.548000000\n\
routes,route,394,2017-09-18 05:41:37.516000000\n\
coach,routes,395,2017-09-18 11:21:37.660000000\n\
routes,route,395,2017-09-18 11:22:26.185999872\n\
route,routes,395,2017-09-18 11:22:27.895000064\n\
routes,route,395,2017-09-18 11:22:53.870000128\n\
coach,team,396,2017-09-18 12:25:23.364000000\n\
team,competition,396,2017-09-18 12:25:45.124999936\n\
coach,competition,397,2017-09-19 09:48:57.823000064\n\
coach,coach,398,2017-09-19 11:31:32.468999936\n\
coach,,399,2017-09-19 13:39:10.188999936\n\
coach,,400,2017-09-19 14:05:15.652999936\n\
coach,competition,401,2017-09-20 05:45:18.024999936\n\
coach,,402,2017-09-20 17:20:29.377999872\n\
coach,competition,403,2017-09-20 19:38:17.433999872\n\
competition,team,403,2017-09-20 19:38:23.409999872\n\
coach,track,404,2017-09-21 16:16:19.960999936\n\
track,coach,404,2017-09-21 16:16:22.764000000\n\
coach,track,404,2017-09-21 17:39:27.435000064\n\
track,route,404,2017-09-21 17:46:49.212999936\n\
route,track,404,2017-09-21 17:46:53.628999936\n\
track,personal,404,2017-09-21 17:47:00.767000064\n\
personal,track,404,2017-09-21 17:47:03.303000064\n\
track,routes,404,2017-09-21 17:47:05.068000000\n\
routes,coach,404,2017-09-21 17:47:07.412000000\n\
coach,competition,404,2017-09-21 17:47:09.183000064\n\
competition,coach,404,2017-09-21 17:47:12.820999936\n\
coach,routes,404,2017-09-21 17:47:16.395000064\n\
routes,team,404,2017-09-21 17:47:20.200000000\n\
coach,competition,405,2017-09-21 20:23:24.319000064\n\
competition,coach,405,2017-09-21 20:23:28.670000128\n\
coach,competition,405,2017-09-21 20:23:33.140000000\n\
competition,team,405,2017-09-21 20:23:37.230000128\n\
coach,competition,406,2017-09-22 08:38:30.244000000\n\
competition,routes,406,2017-09-22 08:39:00.139000064\n\
routes,route,406,2017-09-22 08:39:05.499000064\n\
route,routes,406,2017-09-22 08:39:07.323000064\n\
routes,coach,406,2017-09-22 08:39:52.940000000\n\
coach,team,406,2017-09-22 08:41:38.772000000\n\
coach,track,407,2017-09-24 06:21:50.792000000\n\
track,coach,407,2017-09-24 06:21:54.902000128\n\
coach,routes,407,2017-09-24 10:10:17.840000000\n\
routes,route,407,2017-09-24 10:10:39.496999936\n\
route,coach,407,2017-09-24 10:10:42.151000064\n\
coach,competition,407,2017-09-24 10:11:04.491000064\n\
competition,team,407,2017-09-24 10:11:08.510000128\n\
coach,competition,408,2017-09-24 15:45:30.799000064\n\
competition,coach,408,2017-09-24 15:45:45.283000064\n\
coach,routes,408,2017-09-24 15:45:59.416999936\n\
routes,route,408,2017-09-24 15:46:09.262000128\n\
coach,team,409,2017-09-24 16:59:50.551000064\n\
team,competition,409,2017-09-24 16:59:55.459000064\n\
coach,competition,410,2017-09-25 06:08:31.967000064\n\
coach,coach,411,2017-09-10 12:25:29.672999936\n\
coach,coach,411,2017-09-10 12:26:37.028000000\n\
coach,personal,411,2017-09-10 12:29:07.816000000\n\
personal,coach,411,2017-09-10 12:30:21.718000128\n\
coach,track,411,2017-09-10 12:31:46.447000064\n\
track,route,411,2017-09-10 12:32:32.976999936\n\
route,track,411,2017-09-10 12:32:53.951000064\n\
track,route,411,2017-09-10 12:32:58.256999936\n\
route,track,411,2017-09-10 12:33:07.430000128\n\
track,team,411,2017-09-10 12:33:15.040000000\n\
team,personal,411,2017-09-10 12:33:19.958000128\n\
personal,team,411,2017-09-10 12:33:35.169999872\n\
team,personal,411,2017-09-10 12:33:56.256000000\n\
personal,team,411,2017-09-10 12:34:06.748999936\n\
team,competition,411,2017-09-10 12:34:16.103000064\n\
competition,routes,411,2017-09-10 12:34:53.427000064\n\
routes,route,411,2017-09-10 12:35:03.003000064\n\
route,routes,411,2017-09-10 12:35:05.880999936\n\
routes,route,411,2017-09-10 12:35:11.756999936\n\
route,routes,411,2017-09-10 12:35:13.161999872\n\
routes,route,411,2017-09-10 12:35:16.006000128\n\
route,routes,411,2017-09-10 12:35:18.820999936\n\
routes,badges,411,2017-09-10 12:35:23.392000000\n\
badges,coach,411,2017-09-10 12:35:27.320000000\n\
coach,track,411,2017-09-10 12:35:47.374000128\n\
track,personal,411,2017-09-10 12:36:59.782000128\n\
personal,track,411,2017-09-10 12:37:05.796000000\n\
track,personal,411,2017-09-10 12:37:13.840000000\n\
personal,track,411,2017-09-10 12:48:21.305999872\n\
track,team,411,2017-09-10 12:48:27.312000000\n\
team,track,411,2017-09-10 12:48:34.275000064\n\
track,personal,411,2017-09-10 12:58:54.121999872\n\
personal,bugreport,411,2017-09-10 12:59:04.767000064\n\
bugreport,team,411,2017-09-10 12:59:22.798000128\n\
team,personal,411,2017-09-10 12:59:30.940999936\n\
personal,team,411,2017-09-10 12:59:33.923000064\n\
team,coach,411,2017-09-10 12:59:38.046000128\n\
coach,competition,411,2017-09-10 13:09:05.016999936\n\
competition,routes,411,2017-09-10 13:09:50.532000000\n\
routes,badges,411,2017-09-10 13:10:02.241999872\n\
badges,coach,411,2017-09-10 13:10:07.153999872\n\
coach,track,411,2017-09-10 13:10:17.724000000\n\
track,personal,411,2017-09-10 13:10:21.406000128\n\
personal,track,411,2017-09-10 13:10:26.772000000\n\
track,personal,411,2017-09-10 13:10:52.772000000\n\
personal,track,411,2017-09-10 16:57:10.678000128\n\
track,team,411,2017-09-10 16:57:16.361999872\n\
team,track,411,2017-09-10 16:57:20.692000000\n\
track,track,411,2017-09-10 17:18:07.444000000\n\
track,coach,411,2017-09-11 08:32:17.416000000\n\
coach,track,411,2017-09-11 09:27:15.620999936\n\
track,route,411,2017-09-11 10:34:35.961999872\n\
route,coach,411,2017-09-11 10:34:40.039000064\n\
coach,competition,411,2017-09-11 10:35:38.007000064\n\
competition,team,411,2017-09-11 10:41:17.204999936\n\
team,personal,411,2017-09-11 10:41:28.761999872\n\
personal,bugreport,411,2017-09-11 10:41:56.752999936\n\
bugreport,personal,411,2017-09-11 10:42:04.527000064\n\
personal,bugreport,411,2017-09-11 10:43:26.359000064\n\
bugreport,track,411,2017-09-11 10:43:30.108999936\n\
track,routes,411,2017-09-11 10:43:32.856000000\n\
routes,route,411,2017-09-11 10:43:43.038000128\n\
route,routes,411,2017-09-11 10:43:48.729999872\n\
routes,track,411,2017-09-11 12:43:06.331000064\n\
track,route,411,2017-09-11 12:43:09.343000064\n\
route,coach,411,2017-09-11 13:12:43.616000000\n\
coach,competition,411,2017-09-11 13:12:56.916999936\n\
competition,coach,411,2017-09-11 13:13:10.795000064\n\
coach,team,411,2017-09-11 13:13:30.809999872\n\
team,routes,411,2017-09-11 13:13:34.329999872\n\
routes,route,411,2017-09-11 13:14:08.320999936\n\
route,routes,411,2017-09-11 13:14:11.008000000\n\
routes,route,411,2017-09-11 13:14:24.729999872\n\
route,personal,411,2017-09-11 13:14:28.896999936\n\
personal,routes,411,2017-09-11 13:16:44.128999936\n\
routes,route,411,2017-09-11 13:16:48.239000064\n\
route,routes,411,2017-09-11 13:16:49.910000128\n\
routes,route,411,2017-09-11 13:16:52.908000000\n\
route,routes,411,2017-09-11 13:16:55.609999872\n\
routes,route,411,2017-09-11 13:17:17.222000128\n\
route,routes,411,2017-09-11 13:17:21.510000128\n\
routes,route,411,2017-09-11 13:17:27.440000000\n\
route,routes,411,2017-09-11 13:17:32.488000000\n\
routes,track,411,2017-09-11 16:34:24.028000000\n\
track,coach,411,2017-09-11 16:34:26.063000064\n\
coach,route,411,2017-09-11 17:34:18.668999936\n\
route,track,411,2017-09-11 18:14:42.238000128\n\
track,coach,411,2017-09-11 18:14:57.990000128\n\
coach,competition,411,2017-09-11 18:14:59.132000000\n\
competition,coach,411,2017-09-11 18:15:56.398000128\n\
coach,coach,411,2017-09-11 18:16:08.436999936\n\
coach,competition,411,2017-09-11 18:19:10.647000064\n\
competition,coach,411,2017-09-11 18:19:16.143000064\n\
coach,team,411,2017-09-11 18:19:20.614000128\n\
team,routes,411,2017-09-11 18:20:09.252000000\n\
routes,route,411,2017-09-11 18:21:42.948999936\n\
route,routes,411,2017-09-11 18:21:47.372000000\n\
routes,route,411,2017-09-11 18:21:55.035000064\n\
route,personal,411,2017-09-11 18:21:56.711000064\n\
personal,routes,411,2017-09-11 18:22:52.424000000\n\
routes,route,411,2017-09-11 18:23:06.432999936\n\
route,routes,411,2017-09-11 18:23:08.705999872\n\
routes,route,411,2017-09-11 18:23:11.190000128\n\
route,routes,411,2017-09-11 18:23:14.169999872\n\
routes,route,411,2017-09-11 18:23:19.776999936\n\
route,routes,411,2017-09-11 18:23:26.715000064\n\
routes,team,411,2017-09-11 18:23:36.204999936\n\
coach,team,412,2017-09-12 07:41:57.646000128\n\
team,badges,412,2017-09-12 07:42:10.297999872\n\
badges,competition,412,2017-09-12 07:42:33.656000000\n\
competition,track,412,2017-09-12 07:42:48.896000000\n\
track,coach,412,2017-09-12 08:31:26.499000064\n\
coach,track,412,2017-09-12 08:41:55.571000064\n\
track,route,412,2017-09-12 11:10:44.926000128\n\
route,coach,412,2017-09-12 11:10:46.905999872\n\
coach,routes,412,2017-09-12 11:11:07.643000064\n\
routes,route,412,2017-09-12 11:11:37.792999936\n\
route,routes,412,2017-09-12 11:11:43.281999872\n\
routes,route,412,2017-09-12 12:26:10.272000000\n\
route,coach,412,2017-09-12 12:26:19.977999872\n\
coach,routes,412,2017-09-12 12:26:28.904000000\n\
routes,route,412,2017-09-12 12:26:33.943000064\n\
route,routes,412,2017-09-12 12:26:35.707000064\n\
routes,team,412,2017-09-12 13:12:06.257999872\n\
team,badges,412,2017-09-12 13:12:09.712000000\n\
coach,competition,413,2017-09-13 06:08:36.011000064\n\
competition,coach,413,2017-09-13 06:08:50.771000064\n\
coach,team,413,2017-09-13 06:08:57.652999936\n\
team,competition,413,2017-09-13 06:09:00.812999936\n\
competition,competition,413,2017-09-13 06:14:56.412999936\n\
competition,team,413,2017-09-13 11:32:06.200999936\n\
team,competition,413,2017-09-13 11:32:20.240999936\n\
competition,track,413,2017-09-13 11:32:39.289999872\n\
track,coach,413,2017-09-13 11:32:45.531000064\n\
coach,track,413,2017-09-13 12:26:58.272000000\n\
track,route,413,2017-09-13 13:21:57.623000064\n\
route,coach,413,2017-09-13 13:21:58.631000064\n\
coach,track,413,2017-09-13 13:22:03.860000000\n\
track,routes,413,2017-09-13 13:22:36.939000064\n\
routes,route,413,2017-09-13 13:22:44.439000064\n\
route,routes,413,2017-09-13 13:22:50.318000128\n\
routes,team,413,2017-09-13 13:23:01.193999872\n\
team,routes,413,2017-09-13 13:23:08.495000064\n\
routes,route,413,2017-09-13 13:23:28.736000000\n\
route,coach,413,2017-09-13 13:23:33.664999936\n\
coach,competition,413,2017-09-13 13:23:40.535000064\n\
competition,coach,413,2017-09-13 13:28:56.724000000\n\
coach,team,413,2017-09-13 13:29:08.264999936\n\
team,competition,413,2017-09-13 13:29:32.251000064\n\
coach,competition,414,2017-09-13 14:22:01.372999936\n\
competition,team,414,2017-09-13 14:53:56.920000000\n\
team,competition,414,2017-09-13 14:54:05.004000000\n\
competition,team,414,2017-09-13 14:56:00.078000128\n\
team,routes,414,2017-09-13 14:56:39.964999936\n\
routes,route,414,2017-09-13 14:57:03.374000128\n\
route,routes,414,2017-09-13 14:57:07.854000128\n\
routes,team,414,2017-09-13 14:57:22.092000000\n\
team,competition,414,2017-09-13 14:57:26.147000064\n\
competition,routes,414,2017-09-13 14:59:54.451000064\n\
routes,route,414,2017-09-13 15:00:02.726000128\n\
route,personal,414,2017-09-13 15:00:07.627000064\n\
personal,routes,414,2017-09-13 15:02:54.671000064\n\
routes,route,414,2017-09-13 15:03:03.515000064\n\
route,routes,414,2017-09-13 15:03:21.424999936\n\
routes,route,414,2017-09-13 15:03:39.476999936\n\
route,routes,414,2017-09-13 15:03:41.520999936\n\
routes,route,414,2017-09-13 15:04:44.921999872\n\
route,routes,414,2017-09-13 15:04:55.912000000\n\
routes,route,414,2017-09-13 15:05:21.145999872\n\
coach,track,415,2017-09-14 12:01:28.436000000\n\
track,team,415,2017-09-14 12:03:26.564999936\n\
team,competition,415,2017-09-14 12:03:29.430000128\n\
competition,routes,415,2017-09-14 12:03:52.910000128\n\
routes,route,415,2017-09-14 12:04:00.913999872\n\
route,routes,415,2017-09-14 12:04:05.868999936\n\
routes,route,415,2017-09-14 12:04:12.852000000\n\
route,routes,415,2017-09-14 12:04:14.212000000\n\
routes,route,415,2017-09-14 12:04:21.657999872\n\
route,routes,415,2017-09-14 12:04:25.364000000\n\
routes,route,415,2017-09-14 12:04:31.436000000\n\
route,routes,415,2017-09-14 12:04:37.523000064\n\
routes,route,415,2017-09-14 12:04:41.985999872\n\
route,personal,415,2017-09-14 12:04:44.052999936\n\
personal,routes,415,2017-09-14 12:05:04.161999872\n\
routes,badges,415,2017-09-14 12:05:09.760999936\n\
coach,badges,416,2017-09-14 12:58:56.743000064\n\
badges,track,416,2017-09-14 12:58:56.747000064\n\
track,coach,416,2017-09-14 12:58:59.408999936\n\
coach,track,416,2017-09-14 13:53:48.118000128\n\
track,route,416,2017-09-14 15:02:34.052000000\n\
route,track,416,2017-09-14 15:02:36.217999872\n\
track,team,416,2017-09-14 15:26:01.950000128\n\
team,competition,416,2017-09-14 15:26:04.777999872\n\
competition,team,416,2017-09-14 15:26:16.062000128\n\
team,routes,416,2017-09-14 15:26:28.902000128\n\
routes,route,416,2017-09-14 15:26:44.124999936\n\
route,coach,416,2017-09-14 15:26:50.711000064\n\
coach,routes,416,2017-09-14 15:27:20.155000064\n\
routes,route,416,2017-09-14 15:27:38.016999936\n\
route,routes,416,2017-09-14 15:27:40.121999872\n\
routes,route,416,2017-09-14 15:28:03.377999872\n\
route,routes,416,2017-09-14 15:28:13.592999936\n\
routes,route,416,2017-09-14 15:28:19.276000000\n\
route,routes,416,2017-09-14 15:28:22.872000000\n\
routes,route,416,2017-09-14 15:28:38.500000000\n\
route,routes,416,2017-09-14 15:28:42.174000128\n\
routes,route,416,2017-09-14 15:28:56.502000128\n\
route,routes,416,2017-09-14 15:29:01.448999936\n\
routes,route,416,2017-09-14 15:29:27.683000064\n\
route,routes,416,2017-09-14 15:29:34.468999936\n\
routes,route,416,2017-09-14 15:29:39.820999936\n\
coach,team,417,2017-09-14 16:25:28.772000000\n\
team,routes,417,2017-09-14 16:25:35.635000064\n\
routes,route,417,2017-09-14 16:26:07.804000000\n\
route,routes,417,2017-09-14 16:26:10.841999872\n\
routes,route,417,2017-09-14 18:21:06.569999872\n\
route,routes,417,2017-09-14 18:21:11.969999872\n\
routes,route,417,2017-09-14 18:22:36.465999872\n\
route,routes,417,2017-09-14 18:22:39.728999936\n\
routes,route,417,2017-09-14 18:22:47.472000000\n\
route,routes,417,2017-09-14 18:22:49.326000128\n\
routes,route,417,2017-09-14 18:23:46.046000128\n\
route,routes,417,2017-09-14 18:24:07.070000128\n\
routes,route,417,2017-09-14 18:24:17.464000000\n\
route,routes,417,2017-09-14 18:24:23.668999936\n\
routes,route,417,2017-09-14 18:24:27.145999872\n\
route,routes,417,2017-09-14 18:24:28.742000128\n\
routes,route,417,2017-09-14 18:24:35.948999936\n\
route,routes,417,2017-09-14 18:24:43.352999936\n\
routes,route,417,2017-09-14 18:24:50.830000128\n\
route,routes,417,2017-09-14 18:24:55.324999936\n\
routes,route,417,2017-09-14 18:25:08.971000064\n\
route,routes,417,2017-09-14 18:25:14.375000064\n\
routes,competition,417,2017-09-14 18:25:26.904999936\n\
competition,team,417,2017-09-14 18:25:32.336999936\n\
team,competition,417,2017-09-14 18:25:48.112999936\n\
competition,team,417,2017-09-14 18:29:13.025999872\n\
team,routes,417,2017-09-14 18:29:54.913999872\n\
routes,route,417,2017-09-14 18:32:02.060000000\n\
route,routes,417,2017-09-14 18:32:08.740999936\n\
routes,route,417,2017-09-14 18:32:29.924999936\n\
route,routes,417,2017-09-14 18:32:33.500999936\n\
routes,route,417,2017-09-14 18:32:35.961999872\n\
route,routes,417,2017-09-14 18:32:38.931000064\n\
routes,badges,417,2017-09-14 18:33:02.296000000\n\
badges,competition,417,2017-09-14 18:33:15.524000000\n\
competition,routes,417,2017-09-14 18:34:02.608999936\n\
routes,route,417,2017-09-14 18:34:38.494000128\n\
route,routes,417,2017-09-14 18:34:50.656000000\n\
routes,personal,417,2017-09-14 18:35:46.020999936\n\
personal,routes,417,2017-09-14 18:35:50.376999936\n\
routes,coach,417,2017-09-14 18:36:12.128999936\n\
coach,team,417,2017-09-14 18:36:20.503000064\n\
team,competition,417,2017-09-14 18:36:32.798000128\n\
competition,coach,417,2017-09-14 18:37:13.611000064\n\
coach,competition,417,2017-09-14 18:37:21.216999936\n\
competition,coach,417,2017-09-14 18:37:48.273999872\n\
coach,badges,417,2017-09-14 18:38:09.888999936\n\
badges,team,417,2017-09-14 18:38:52.433999872\n\
team,competition,417,2017-09-14 18:39:34.200000000\n\
competition,team,417,2017-09-15 05:40:14.737999872\n\
team,coach,417,2017-09-15 05:40:24.153999872\n\
coach,competition,417,2017-09-15 05:40:49.606000128\n\
competition,coach,417,2017-09-15 05:40:53.508999936\n\
coach,team,417,2017-09-15 05:41:08.216000000\n\
team,competition,417,2017-09-15 05:41:16.247000064\n\
competition,routes,417,2017-09-15 05:42:04.547000064\n\
routes,route,417,2017-09-15 05:43:30.350000128\n\
route,routes,417,2017-09-15 05:43:34.604000000\n\
routes,route,417,2017-09-15 05:43:54.438000128\n\
route,routes,417,2017-09-15 05:43:56.982000128\n\
routes,route,417,2017-09-15 05:44:00.076000000\n\
route,routes,417,2017-09-15 05:44:03.316000000\n\
routes,route,417,2017-09-15 05:44:08.577999872\n\
route,routes,417,2017-09-15 05:44:12.988000000\n\
routes,route,417,2017-09-15 05:44:15.868000000\n\
route,routes,417,2017-09-15 05:44:33.198000128\n\
routes,route,417,2017-09-15 05:44:45.972000000\n\
route,routes,417,2017-09-15 05:44:51.128000000\n\
routes,routes,417,2017-09-15 05:45:03.017999872\n\
routes,team,417,2017-09-15 08:27:23.427000064\n\
team,competition,417,2017-09-15 08:27:29.286000128\n\
competition,competition,417,2017-09-15 08:27:45.955000064\n\
competition,track,417,2017-09-15 09:39:34.952000000\n\
track,coach,417,2017-09-15 09:39:36.868000000\n\
coach,track,417,2017-09-15 10:34:46.928999936\n\
track,coach,417,2017-09-15 10:53:07.585999872\n\
coach,track,417,2017-09-15 11:29:46.595000064\n\
track,route,417,2017-09-15 12:09:36.270000128\n\
route,track,417,2017-09-15 12:09:39.636999936\n\
track,routes,417,2017-09-15 12:09:54.979000064\n\
routes,route,417,2017-09-15 12:09:59.979000064\n\
route,coach,417,2017-09-15 12:10:09.361999872\n\
coach,team,417,2017-09-15 12:10:15.748999936\n\
team,routes,417,2017-09-15 12:34:22.851000064\n\
routes,route,417,2017-09-15 12:35:53.588000000\n\
route,routes,417,2017-09-15 12:35:58.028000000\n\
routes,competition,417,2017-09-15 12:36:09.190000128\n\
competition,team,417,2017-09-15 13:41:05.252000000\n\
team,coach,417,2017-09-15 13:41:22.139000064\n\
coach,competition,417,2017-09-15 13:43:11.216000000\n\
competition,coach,417,2017-09-15 13:46:17.455000064\n\
coach,team,417,2017-09-15 13:46:27.952000000\n\
team,competition,417,2017-09-15 13:46:30.830000128\n\
competition,coach,417,2017-09-15 14:13:15.932000000\n\
coach,routes,417,2017-09-15 14:13:52.328999936\n\
routes,route,417,2017-09-15 14:22:46.913999872\n\
route,routes,417,2017-09-15 14:22:53.710000128\n\
routes,team,417,2017-09-16 08:08:37.323000064\n\
team,team,417,2017-09-16 08:08:41.097999872\n\
team,team,417,2017-09-16 14:26:37.326000128\n\
team,competition,417,2017-09-17 06:32:22.028999936\n\
competition,competition,417,2017-09-17 06:32:47.884000000\n\
competition,team,417,2017-09-17 15:42:25.768999936\n\
team,team,417,2017-09-17 15:42:34.780999936\n\
team,competition,417,2017-09-18 08:19:15.487000064\n\
competition,team,417,2017-09-18 08:19:30.787000064\n\
coach,track,418,2017-09-18 08:52:28.548999936\n\
track,coach,418,2017-09-18 08:52:31.656000000\n\
coach,track,419,2017-09-18 10:53:38.496000000\n\
track,route,419,2017-09-18 10:53:45.456000000\n\
coach,,420,2017-09-18 11:53:07.379000064\n\
coach,coach,421,2017-09-19 07:25:10.814000128\n\
coach,coach,421,2017-09-19 07:39:10.232000000\n\
coach,,422,2017-09-19 08:09:56.139000064\n\
coach,,423,2017-09-19 09:16:17.436999936\n\
coach,,424,2017-09-19 10:47:51.780999936\n\
coach,,425,2017-09-19 11:37:25.700999936\n\
coach,,426,2017-09-19 12:23:51.087000064\n\
coach,,427,2017-09-19 13:53:48.760999936\n\
coach,,428,2017-09-19 15:28:36.796999936\n\
coach,team,429,2017-09-20 09:03:11.432000000\n\
team,competition,429,2017-09-20 09:03:18.660000000\n\
competition,track,429,2017-09-20 09:03:48.020000000\n\
track,coach,429,2017-09-20 09:03:55.208000000\n\
coach,track,429,2017-09-20 09:58:10.451000064\n\
track,coach,429,2017-09-20 10:17:55.468999936\n\
coach,track,429,2017-09-20 10:53:12.215000064\n\
track,route,429,2017-09-20 11:17:05.582000128\n\
coach,track,430,2017-09-20 11:48:12.552000000\n\
track,competition,430,2017-09-20 11:57:25.464999936\n\
competition,team,430,2017-09-20 11:57:30.439000064\n\
team,track,430,2017-09-20 11:57:35.548999936\n\
track,route,430,2017-09-20 11:57:53.936000000\n\
coach,,431,2017-09-20 12:43:13.849999872\n\
coach,competition,432,2017-09-21 05:38:59.000000000\n\
competition,coach,432,2017-09-21 05:39:49.105999872\n\
coach,team,432,2017-09-21 05:40:00.790000128\n\
team,competition,432,2017-09-21 05:40:05.792000000\n\
competition,badges,432,2017-09-21 05:41:12.828000000\n\
badges,routes,432,2017-09-21 05:41:17.576000000\n\
routes,route,432,2017-09-21 05:41:54.156000000\n\
route,routes,432,2017-09-21 05:41:59.936000000\n\
routes,route,432,2017-09-21 05:42:14.131000064\n\
route,routes,432,2017-09-21 05:42:15.604999936\n\
routes,coach,432,2017-09-21 05:42:30.400000000\n\
coach,routes,432,2017-09-21 05:42:59.312000000\n\
routes,route,432,2017-09-21 05:50:04.198000128\n\
route,routes,432,2017-09-21 05:50:11.663000064\n\
routes,track,432,2017-09-21 05:50:16.838000128\n\
track,track,432,2017-09-21 05:50:34.232999936\n\
track,coach,432,2017-09-21 10:35:28.836999936\n\
coach,track,432,2017-09-21 11:30:26.246000128\n\
track,coach,432,2017-09-21 11:48:25.328999936\n\
coach,track,432,2017-09-21 11:48:36.817999872\n\
track,coach,432,2017-09-21 11:49:34.760000000\n\
coach,track,432,2017-09-21 12:25:26.159000064\n\
track,route,432,2017-09-21 12:55:14.428000000\n\
route,track,432,2017-09-21 12:55:16.740999936\n\
track,team,432,2017-09-21 12:56:04.064000000\n\
coach,,433,2017-09-21 13:22:02.363000064\n\
coach,team,434,2017-09-21 15:57:01.508999936\n\
team,team,434,2017-09-21 15:57:45.871000064\n\
team,competition,434,2017-09-22 08:43:14.635000064\n\
coach,track,435,2017-09-22 09:09:41.145999872\n\
track,coach,435,2017-09-22 09:09:48.371000064\n\
coach,track,435,2017-09-22 09:37:54.759000064\n\
track,route,435,2017-09-22 11:08:26.785999872\n\
route,track,435,2017-09-22 11:08:29.067000064\n\
track,team,435,2017-09-22 11:08:38.124999936\n\
coach,team,436,2017-09-22 16:27:08.191000064\n\
team,competition,436,2017-09-22 16:27:16.558000128\n\
competition,team,436,2017-09-22 16:27:50.604000000\n\
coach,competition,437,2017-09-23 10:57:41.895000064\n\
competition,coach,437,2017-09-23 17:32:01.920000000\n\
coach,team,437,2017-09-23 17:32:11.022000128\n\
coach,team,438,2017-09-24 06:59:27.224000000\n\
team,track,438,2017-09-24 06:59:37.184999936\n\
track,route,438,2017-09-24 06:59:56.320999936\n\
coach,track,439,2017-09-24 08:33:09.504999936\n\
track,routes,439,2017-09-24 08:33:14.815000064\n\
routes,route,439,2017-09-24 08:54:39.049999872\n\
route,routes,439,2017-09-24 08:55:03.726000128\n\
routes,route,439,2017-09-24 08:55:03.727000064\n\
route,routes,439,2017-09-24 08:55:03.752999936\n\
routes,track,439,2017-09-24 08:55:07.544999936\n\
track,coach,439,2017-09-24 08:55:11.264999936\n\
coach,track,439,2017-09-24 09:27:29.424999936\n\
track,route,439,2017-09-24 09:43:17.723000064\n\
route,track,439,2017-09-24 09:43:21.040999936\n\
track,coach,439,2017-09-24 09:43:33.820999936\n\
coach,team,439,2017-09-24 09:43:36.030000128\n\
coach,team,440,2017-09-24 10:22:29.966000128\n\
team,competition,440,2017-09-24 10:27:36.974000128\n\
competition,personal,440,2017-09-24 10:28:40.139000064\n\
personal,competition,440,2017-09-24 10:28:57.579000064\n\
competition,routes,440,2017-09-24 10:29:04.849999872\n\
routes,route,440,2017-09-24 10:29:09.486000128\n\
route,routes,440,2017-09-24 10:29:15.244000000\n\
routes,route,440,2017-09-24 10:29:19.108000000\n\
route,routes,440,2017-09-24 10:29:21.206000128\n\
routes,route,440,2017-09-24 10:29:35.929999872\n\
route,routes,440,2017-09-24 10:29:40.585999872\n\
routes,track,440,2017-09-24 11:12:40.488999936\n\
track,coach,440,2017-09-24 11:12:42.769999872\n\
coach,track,440,2017-09-24 11:17:35.536999936\n\
track,coach,440,2017-09-24 11:25:35.963000064\n\
coach,track,440,2017-09-24 12:12:32.600999936\n\
track,team,440,2017-09-24 13:02:33.316000000\n\
team,coach,440,2017-09-24 13:04:08.075000064\n\
coach,team,440,2017-09-24 13:07:35.382000128\n\
team,competition,440,2017-09-24 13:08:14.403000064\n\
competition,track,440,2017-09-24 13:10:10.567000064\n\
track,route,440,2017-09-24 13:10:34.824000000\n\
route,track,440,2017-09-24 13:10:46.307000064\n\
track,team,440,2017-09-24 13:11:00.147000064\n\
team,coach,440,2017-09-24 13:11:07.728000000\n\
coach,competition,440,2017-09-24 13:13:18.004000000\n\
coach,track,441,2017-09-24 13:58:26.628999936\n\
track,coach,441,2017-09-24 13:58:28.779000064\n\
coach,track,441,2017-09-24 14:02:33.507000064\n\
track,route,441,2017-09-24 14:16:46.091000064\n\
route,track,441,2017-09-24 14:16:50.572999936\n\
track,team,441,2017-09-24 14:16:55.092999936\n\
team,coach,441,2017-09-24 14:16:59.788000000\n\
coach,team,441,2017-09-24 14:17:28.694000128\n\
team,competition,441,2017-09-24 17:05:29.659000064\n\
competition,team,441,2017-09-24 17:05:59.942000128\n\
team,competition,441,2017-09-24 17:06:28.894000128\n\
competition,routes,441,2017-09-24 17:08:20.872999936\n\
routes,route,441,2017-09-24 17:08:41.065999872\n\
route,routes,441,2017-09-24 17:08:46.590000128\n\
routes,route,441,2017-09-24 17:08:50.849999872\n\
route,routes,441,2017-09-24 17:08:56.372000000\n\
routes,route,441,2017-09-24 17:09:09.849999872\n\
route,routes,441,2017-09-24 17:09:14.068000000\n\
routes,route,441,2017-09-24 17:09:27.488000000\n\
route,routes,441,2017-09-24 17:09:37.959000064\n\
coach,team,442,2017-09-24 17:42:36.336999936\n\
coach,,443,2017-09-24 18:37:36.361999872\n\
coach,team,444,2017-09-25 03:50:47.363000064\n\
team,competition,444,2017-09-25 03:50:52.791000064\n\
coach,team,445,2017-09-11 13:20:00.718000128\n\
team,personal,445,2017-09-11 13:21:46.512000000\n\
personal,team,445,2017-09-11 13:22:03.662000128\n\
team,competition,445,2017-09-11 13:22:34.214000128\n\
competition,badges,445,2017-09-11 13:22:51.880000000\n\
badges,coach,445,2017-09-11 13:23:14.062000128\n\
coach,personal,445,2017-09-11 13:23:31.865999872\n\
personal,bugreport,445,2017-09-11 13:23:39.528999936\n\
bugreport,track,445,2017-09-11 13:24:02.176000000\n\
track,route,445,2017-09-11 13:24:12.491000064\n\
route,track,445,2017-09-11 13:24:24.956999936\n\
track,team,445,2017-09-11 13:24:33.248000000\n\
team,competition,445,2017-09-11 13:24:38.086000128\n\
competition,routes,445,2017-09-11 13:24:52.576999936\n\
routes,route,445,2017-09-11 13:25:04.948000000\n\
route,routes,445,2017-09-11 13:25:09.380000000\n\
coach,team,446,2017-09-11 21:32:19.398000128\n\
team,routes,446,2017-09-11 21:34:09.297999872\n\
routes,route,446,2017-09-11 21:34:42.336999936\n\
route,routes,446,2017-09-11 21:34:54.569999872\n\
routes,route,446,2017-09-11 21:35:17.675000064\n\
route,routes,446,2017-09-11 21:35:23.463000064\n\
routes,badges,446,2017-09-11 21:35:28.695000064\n\
badges,track,446,2017-09-11 21:35:34.479000064\n\
track,coach,446,2017-09-11 21:35:41.972999936\n\
coach,team,446,2017-09-12 11:46:12.791000064\n\
team,competition,446,2017-09-12 11:46:23.073999872\n\
coach,track,447,2017-09-12 16:34:05.588999936\n\
track,coach,447,2017-09-12 16:34:14.692999936\n\
coach,track,447,2017-09-12 17:29:04.222000128\n\
track,route,447,2017-09-12 18:24:43.515000064\n\
route,coach,447,2017-09-12 18:24:48.609999872\n\
coach,personal,447,2017-09-12 18:25:04.232000000\n\
personal,team,447,2017-09-12 18:25:05.116000000\n\
team,competition,447,2017-09-12 18:25:15.236999936\n\
competition,team,447,2017-09-12 21:09:44.616000000\n\
team,routes,447,2017-09-12 21:09:56.780000000\n\
routes,route,447,2017-09-12 21:10:56.601999872\n\
route,routes,447,2017-09-12 21:11:02.366000128\n\
routes,route,447,2017-09-12 21:11:20.884999936\n\
route,routes,447,2017-09-12 21:11:23.680999936\n\
routes,route,447,2017-09-12 21:11:57.292000000\n\
route,personal,447,2017-09-12 21:12:00.703000064\n\
personal,routes,447,2017-09-12 21:12:41.529999872\n\
routes,coach,447,2017-09-12 21:12:46.680999936\n\
coach,personal,447,2017-09-12 21:12:52.088999936\n\
personal,coach,447,2017-09-12 21:13:40.532000000\n\
coach,badges,447,2017-09-12 21:14:36.100999936\n\
coach,competition,448,2017-09-13 09:31:32.272999936\n\
competition,coach,448,2017-09-13 09:31:48.328999936\n\
coach,team,448,2017-09-13 09:31:57.660999936\n\
coach,team,449,2017-09-14 09:26:54.726000128\n\
team,competition,449,2017-09-14 09:27:47.940000000\n\
coach,coach,450,2017-09-14 10:01:58.791000064\n\
coach,competition,451,2017-09-14 11:03:40.220999936\n\
coach,,452,2017-09-14 12:02:22.057999872\n\
coach,competition,453,2017-09-14 20:35:30.176000000\n\
competition,team,453,2017-09-14 20:36:58.609999872\n\
team,competition,453,2017-09-14 20:37:29.969999872\n\
competition,team,453,2017-09-14 20:38:06.545999872\n\
team,routes,453,2017-09-14 20:38:16.868999936\n\
routes,personal,453,2017-09-14 20:38:22.953999872\n\
personal,routes,453,2017-09-14 20:38:26.632999936\n\
routes,badges,453,2017-09-14 20:38:30.787000064\n\
badges,coach,453,2017-09-14 20:38:34.368000000\n\
coach,competition,454,2017-09-15 11:19:25.300999936\n\
coach,track,455,2017-09-15 17:33:58.219000064\n\
track,coach,455,2017-09-15 17:34:37.636000000\n\
coach,track,455,2017-09-15 18:30:01.808000000\n\
track,route,455,2017-09-15 21:06:31.940000000\n\
route,track,455,2017-09-15 21:06:39.974000128\n\
track,team,455,2017-09-15 21:07:38.584999936\n\
team,competition,455,2017-09-15 21:08:13.464000000\n\
competition,coach,455,2017-09-15 21:08:13.467000064\n\
coach,team,456,2017-09-16 17:23:27.854000128\n\
team,competition,456,2017-09-16 17:23:48.500999936\n\
coach,competition,457,2017-09-17 07:38:29.675000064\n\
competition,coach,457,2017-09-17 07:38:42.528000000\n\
coach,team,457,2017-09-17 07:39:00.678000128\n\
team,routes,457,2017-09-17 07:39:15.462000128\n\
routes,route,457,2017-09-17 07:40:02.985999872\n\
route,routes,457,2017-09-17 07:40:14.550000128\n\
routes,badges,457,2017-09-17 07:41:12.724999936\n\
coach,competition,458,2017-09-19 05:31:11.399000064\n\
competition,team,458,2017-09-19 05:31:33.727000064\n\
team,track,458,2017-09-19 05:31:39.571000064\n\
track,route,458,2017-09-19 05:31:54.739000064\n\
route,track,458,2017-09-19 05:47:46.579000064\n\
track,team,458,2017-09-19 05:48:14.627000064\n\
team,routes,458,2017-09-19 05:48:25.484999936\n\
routes,competition,458,2017-09-19 05:48:35.428999936\n\
coach,competition,459,2017-09-21 05:52:35.028000000\n\
coach,track,460,2017-09-24 13:44:27.603000064\n\
track,competition,460,2017-09-24 13:45:02.839000064\n\
competition,team,460,2017-09-24 13:45:12.769999872\n\
team,personal,460,2017-09-24 13:45:23.599000064\n\
personal,team,460,2017-09-24 13:45:55.571000064\n\
coach,team,461,2017-09-24 20:38:37.008000000\n\
team,personal,461,2017-09-24 20:39:00.257999872\n\
personal,team,461,2017-09-24 20:39:19.379000064\n\
team,competition,461,2017-09-24 20:39:24.740000000\n\
competition,coach,461,2017-09-24 20:39:29.476000000\n\
coach,badges,461,2017-09-24 20:39:43.772999936\n\
coach,coach,462,2017-09-08 21:04:01.225999872\n\
coach,personal,462,2017-09-08 21:05:28.497999872\n\
personal,track,462,2017-09-09 07:11:14.152999936\n\
track,team,462,2017-09-09 07:11:40.491000064\n\
team,routes,462,2017-09-09 07:11:47.500000000\n\
routes,badges,462,2017-09-09 07:12:33.627000064\n\
badges,coach,462,2017-09-09 07:12:43.519000064\n\
coach,personal,462,2017-09-09 07:13:08.263000064\n\
personal,coach,462,2017-09-09 07:13:56.520000000\n\
coach,competition,462,2017-09-09 07:13:59.479000064\n\
competition,team,462,2017-09-09 07:14:22.788999936\n\
team,badges,462,2017-09-09 07:14:57.961999872\n\
coach,track,463,2017-09-09 09:41:28.008000000\n\
track,route,463,2017-09-09 09:41:32.704000000\n\
route,coach,463,2017-09-09 09:54:43.204999936\n\
coach,track,463,2017-09-09 09:54:56.041999872\n\
track,team,463,2017-09-09 09:55:00.348000000\n\
team,competition,463,2017-09-09 09:55:03.352000000\n\
competition,track,463,2017-09-09 09:55:45.148999936\n\
track,track,463,2017-09-09 10:29:52.592000000\n\
track,route,463,2017-09-09 10:41:51.854000128\n\
route,personal,463,2017-09-09 10:41:53.532999936\n\
personal,track,463,2017-09-09 10:41:56.628999936\n\
track,team,463,2017-09-09 10:41:58.483000064\n\
team,coach,463,2017-09-09 10:42:03.990000128\n\
coach,competition,463,2017-09-09 10:42:11.934000128\n\
competition,coach,463,2017-09-09 10:42:20.752999936\n\
coach,routes,463,2017-09-09 10:42:22.615000064\n\
routes,competition,463,2017-09-09 10:42:26.310000128\n\
competition,team,463,2017-09-09 10:42:29.724000000\n\
team,badges,463,2017-09-09 10:42:32.464999936\n\
badges,badges,463,2017-09-09 10:42:44.703000064\n\
badges,badges,463,2017-09-09 12:53:01.040000000\n\
badges,team,463,2017-09-09 17:06:11.723000064\n\
coach,routes,464,2017-09-09 21:07:27.752999936\n\
routes,route,464,2017-09-09 21:07:34.463000064\n\
route,routes,464,2017-09-09 21:07:36.488000000\n\
routes,route,464,2017-09-09 21:07:56.620999936\n\
route,routes,464,2017-09-09 21:07:57.822000128\n\
routes,route,464,2017-09-09 21:08:06.951000064\n\
route,routes,464,2017-09-09 21:08:08.159000064\n\
routes,competition,464,2017-09-09 21:08:14.385999872\n\
competition,badges,464,2017-09-09 21:08:17.102000128\n\
badges,track,464,2017-09-09 21:08:22.588999936\n\
track,personal,464,2017-09-09 21:13:55.542000128\n\
personal,track,464,2017-09-09 21:13:59.499000064\n\
track,team,464,2017-09-09 21:14:03.784999936\n\
team,coach,464,2017-09-09 21:14:07.329999872\n\
coach,competition,464,2017-09-09 21:14:25.099000064\n\
competition,coach,464,2017-09-09 21:14:49.499000064\n\
coach,routes,464,2017-09-09 21:14:54.329999872\n\
routes,route,464,2017-09-09 21:14:58.569999872\n\
route,routes,464,2017-09-09 21:15:00.358000128\n\
routes,route,464,2017-09-09 21:16:14.430000128\n\
route,routes,464,2017-09-09 21:16:15.576999936\n\
coach,,465,2017-09-10 21:09:40.467000064\n\
coach,team,466,2017-09-11 10:05:34.400000000\n\
team,competition,466,2017-09-11 10:06:14.998000128\n\
competition,team,466,2017-09-11 10:06:59.991000064\n\
team,competition,466,2017-09-11 18:38:27.958000128\n\
competition,coach,466,2017-09-11 18:38:45.985999872\n\
coach,badges,466,2017-09-11 18:38:54.240999936\n\
coach,personal,467,2017-09-12 15:48:10.566000128\n\
personal,coach,467,2017-09-12 15:48:11.567000064\n\
coach,team,467,2017-09-12 15:48:13.201999872\n\
team,track,467,2017-09-12 15:48:15.604999936\n\
track,track,467,2017-09-12 16:29:13.918000128\n\
track,route,467,2017-09-12 17:19:33.347000064\n\
route,coach,467,2017-09-12 17:19:36.279000064\n\
coach,competition,467,2017-09-12 17:19:52.411000064\n\
competition,coach,467,2017-09-12 17:21:04.708999936\n\
coach,badges,467,2017-09-12 17:22:47.152999936\n\
coach,competition,468,2017-09-13 19:00:23.747000064\n\
competition,team,468,2017-09-13 19:00:35.115000064\n\
team,routes,468,2017-09-13 19:00:42.372000000\n\
routes,track,468,2017-09-13 19:00:56.368000000\n\
track,coach,468,2017-09-13 19:01:00.343000064\n\
coach,competition,468,2017-09-13 19:01:04.811000064\n\
competition,team,468,2017-09-13 19:43:13.288999936\n\
coach,competition,469,2017-09-14 22:18:57.337999872\n\
competition,team,469,2017-09-14 22:19:53.180000000\n\
team,routes,469,2017-09-14 22:20:02.659000064\n\
routes,track,469,2017-09-14 22:20:19.231000064\n\
track,coach,469,2017-09-14 22:20:22.286000128\n\
coach,competition,470,2017-09-15 10:59:18.732000000\n\
coach,competition,471,2017-09-16 12:01:27.692000000\n\
competition,team,471,2017-09-16 12:01:31.692000000\n\
team,badges,471,2017-09-16 12:01:40.529999872\n\
coach,track,472,2017-09-17 16:28:24.979000064\n\
track,coach,472,2017-09-17 16:28:27.779000064\n\
coach,track,472,2017-09-17 17:25:27.585999872\n\
track,route,472,2017-09-17 17:32:27.409999872\n\
route,coach,472,2017-09-17 17:32:28.774000128\n\
coach,competition,472,2017-09-17 17:32:48.315000064\n\
competition,team,472,2017-09-17 17:34:04.252000000\n\
team,routes,472,2017-09-17 17:34:18.111000064\n\
routes,route,472,2017-09-17 17:41:19.080000000\n\
route,routes,472,2017-09-17 17:41:21.324000000\n\
routes,routes,472,2017-09-17 17:41:24.423000064\n\
routes,competition,472,2017-09-17 21:07:05.936999936\n\
competition,competition,472,2017-09-17 21:07:08.849999872\n\
competition,track,472,2017-09-18 11:35:47.185999872\n\
track,coach,472,2017-09-18 11:35:53.303000064\n\
coach,track,473,2017-09-18 21:06:21.311000064\n\
track,route,473,2017-09-18 21:06:24.294000128\n\
route,track,473,2017-09-18 21:06:30.376999936\n\
track,routes,473,2017-09-18 21:06:31.985999872\n\
routes,route,473,2017-09-18 21:06:33.361999872\n\
route,routes,473,2017-09-18 21:06:35.444000000\n\
routes,team,473,2017-09-18 21:06:44.264000000\n\
team,badges,473,2017-09-18 21:06:48.926000128\n\
badges,competition,473,2017-09-18 21:07:04.780999936\n\
competition,routes,473,2017-09-18 21:07:12.411000064\n\
routes,route,473,2017-09-18 21:10:33.030000128\n\
route,routes,473,2017-09-18 21:10:35.225999872\n\
routes,route,473,2017-09-18 21:10:36.356999936\n\
route,routes,473,2017-09-18 21:10:39.104000000\n\
routes,route,473,2017-09-18 21:10:45.224000000\n\
route,routes,473,2017-09-18 21:10:47.235000064\n\
coach,track,474,2017-09-19 17:35:43.806000128\n\
track,competition,474,2017-09-19 17:35:52.192999936\n\
competition,routes,474,2017-09-19 17:35:54.684999936\n\
routes,route,474,2017-09-19 17:35:59.923000064\n\
route,routes,474,2017-09-19 17:36:01.550000128\n\
routes,routes,474,2017-09-19 17:36:04.105999872\n\
routes,competition,474,2017-09-20 12:59:00.320000000\n\
competition,team,474,2017-09-20 12:59:04.464000000\n\
team,coach,474,2017-09-20 12:59:12.497999872\n\
coach,track,474,2017-09-20 12:59:58.807000064\n\
track,competition,474,2017-09-20 13:00:59.180000000\n\
coach,team,475,2017-09-21 19:04:04.212999936\n\
team,competition,475,2017-09-22 13:31:45.216999936\n\
competition,competition,475,2017-09-22 13:31:57.425999872\n\
competition,team,475,2017-09-22 19:33:40.081999872\n\
team,badges,475,2017-09-22 19:33:50.472000000\n\
badges,personal,475,2017-09-22 19:34:10.100000000\n\
personal,bugreport,475,2017-09-22 19:34:16.000000000\n\
bugreport,personal,475,2017-09-22 19:34:18.908000000\n\
personal,bugreport,475,2017-09-22 19:34:28.337999872\n\
bugreport,routes,475,2017-09-22 19:34:31.048000000\n\
routes,route,475,2017-09-22 19:34:33.908000000\n\
route,routes,475,2017-09-22 19:34:36.353999872\n\
routes,route,475,2017-09-22 19:34:38.044000000\n\
route,routes,475,2017-09-22 19:34:39.056999936\n\
routes,route,475,2017-09-22 19:34:39.891000064\n\
route,routes,475,2017-09-22 19:34:40.928000000\n\
routes,route,475,2017-09-22 19:34:48.012999936\n\
route,routes,475,2017-09-22 19:34:49.395000064\n\
coach,track,476,2017-09-23 08:39:04.864999936\n\
track,coach,476,2017-09-23 08:39:07.430000128\n\
coach,track,476,2017-09-23 09:35:54.771000064\n\
track,route,476,2017-09-23 09:49:18.040999936\n\
route,track,476,2017-09-23 10:02:49.660000000\n\
track,routes,476,2017-09-23 10:03:00.753999872\n\
routes,route,476,2017-09-23 10:03:02.896000000\n\
route,coach,476,2017-09-23 10:03:05.776000000\n\
coach,competition,476,2017-09-23 10:03:07.016000000\n\
competition,team,476,2017-09-23 10:03:08.968000000\n\
team,badges,476,2017-09-23 10:03:15.873999872\n\
badges,competition,476,2017-09-23 10:03:41.496000000\n\
competition,team,476,2017-09-23 10:04:16.660999936\n\
team,badges,476,2017-09-23 10:04:19.111000064\n\
badges,coach,476,2017-09-23 10:04:21.311000064\n\
coach,track,476,2017-09-23 10:04:22.740999936\n\
track,route,476,2017-09-23 13:48:29.942000128\n\
route,track,476,2017-09-23 13:48:31.777999872\n\
track,team,476,2017-09-23 13:48:36.672999936\n\
team,coach,476,2017-09-23 13:48:41.731000064\n\
coach,team,476,2017-09-23 13:48:44.240000000\n\
team,coach,476,2017-09-23 13:48:46.665999872\n\
coach,team,476,2017-09-23 13:50:40.259000064\n\
team,track,476,2017-09-23 14:02:43.286000128\n\
track,route,476,2017-09-23 14:02:44.836999936\n\
coach,team,477,2017-09-24 13:15:04.791000064\n\
team,competition,477,2017-09-24 13:15:07.968999936\n\
coach,team,478,2017-09-08 09:20:00.300999936\n\
team,personal,478,2017-09-08 09:23:04.880000000\n\
personal,coach,478,2017-09-08 09:23:55.635000064\n\
coach,personal,478,2017-09-08 09:24:26.208999936\n\
personal,coach,478,2017-09-08 09:24:44.851000064\n\
coach,team,478,2017-09-08 09:25:20.132999936\n\
team,personal,478,2017-09-08 09:25:25.300000000\n\
personal,team,478,2017-09-08 09:25:41.139000064\n\
team,coach,478,2017-09-08 09:25:43.724999936\n\
coach,track,478,2017-09-08 09:25:45.492000000\n\
track,coach,478,2017-09-08 09:25:46.612000000\n\
coach,track,478,2017-09-08 09:25:47.262000128\n\
track,route,478,2017-09-08 09:26:21.540000000\n\
route,track,478,2017-09-08 09:26:49.632999936\n\
track,coach,478,2017-09-08 09:27:10.236000000\n\
coach,routes,478,2017-09-08 09:27:13.927000064\n\
routes,coach,478,2017-09-08 09:27:15.044000000\n\
coach,track,478,2017-09-08 09:27:28.164999936\n\
track,team,478,2017-09-08 09:27:33.115000064\n\
coach,coach,479,2017-09-10 14:48:11.145999872\n\
coach,track,479,2017-09-10 14:48:11.425999872\n\
track,coach,479,2017-09-10 14:48:11.427000064\n\
coach,personal,479,2017-09-10 16:34:43.761999872\n\
personal,bugreport,479,2017-09-10 16:37:03.070000128\n\
bugreport,routes,479,2017-09-10 16:37:06.440999936\n\
routes,route,479,2017-09-10 16:37:18.640999936\n\
route,personal,479,2017-09-10 16:37:23.993999872\n\
personal,routes,479,2017-09-10 16:37:38.619000064\n\
coach,competition,480,2017-09-11 12:16:25.814000128\n\
competition,team,480,2017-09-11 12:17:21.862000128\n\
coach,routes,481,2017-09-11 15:46:45.792000000\n\
routes,personal,481,2017-09-11 15:47:04.187000064\n\
personal,bugreport,481,2017-09-11 15:47:13.808000000\n\
bugreport,track,481,2017-09-11 15:47:19.407000064\n\
track,personal,481,2017-09-11 15:47:45.547000064\n\
personal,bugreport,481,2017-09-11 16:33:01.244000000\n\
bugreport,competition,481,2017-09-11 16:33:02.720999936\n\
competition,routes,481,2017-09-11 16:34:06.580999936\n\
coach,team,482,2017-09-12 05:52:19.334000128\n\
team,track,482,2017-09-12 05:53:21.171000064\n\
track,route,482,2017-09-12 05:54:14.481999872\n\
route,coach,482,2017-09-12 05:54:38.391000064\n\
coach,routes,482,2017-09-12 05:54:56.779000064\n\
routes,route,482,2017-09-12 05:57:45.979000064\n\
route,personal,482,2017-09-12 05:57:54.780999936\n\
personal,routes,482,2017-09-12 05:58:14.390000128\n\
routes,personal,482,2017-09-12 05:58:20.825999872\n\
personal,routes,482,2017-09-12 05:58:41.503000064\n\
routes,team,482,2017-09-12 05:58:43.572000000\n\
team,coach,482,2017-09-12 05:58:58.068999936\n\
coach,personal,483,2017-09-13 12:33:35.372000000\n\
personal,coach,483,2017-09-13 12:33:58.352999936\n\
coach,,484,2017-09-13 12:59:57.864000000\n\
coach,personal,485,2017-09-13 22:32:08.648000000\n\
personal,coach,485,2017-09-13 22:32:28.580999936\n\
coach,personal,486,2017-09-14 15:32:50.400000000\n\
personal,team,486,2017-09-14 15:38:49.791000064\n\
team,routes,486,2017-09-14 15:39:01.132999936\n\
routes,route,486,2017-09-14 15:39:40.889999872\n\
coach,,487,2017-09-14 20:09:08.150000128\n\
coach,,488,2017-09-14 22:22:50.831000064\n\
coach,routes,489,2017-09-15 05:11:32.328999936\n\
routes,personal,489,2017-09-15 05:11:59.991000064\n\
personal,routes,489,2017-09-15 05:12:14.960000000\n\
routes,team,489,2017-09-15 05:12:37.775000064\n\
team,track,489,2017-09-15 05:12:42.451000064\n\
track,route,489,2017-09-15 05:13:12.556999936\n\
coach,,490,2017-09-15 20:29:22.960000000\n\
coach,track,491,2017-09-16 15:41:10.643000064\n\
track,route,491,2017-09-16 15:41:47.471000064\n\
route,coach,491,2017-09-16 16:20:13.427000064\n\
coach,team,491,2017-09-16 16:20:26.472999936\n\
coach,competition,492,2017-09-16 18:05:28.828999936\n\
competition,coach,492,2017-09-16 18:05:48.750000128\n\
coach,track,492,2017-09-16 18:06:02.924000000\n\
track,route,492,2017-09-16 18:06:08.391000064\n\
route,coach,492,2017-09-16 18:45:41.636000000\n\
coach,competition,492,2017-09-16 18:45:53.639000064\n\
competition,coach,492,2017-09-16 18:46:16.056999936\n\
coach,badges,492,2017-09-16 18:46:33.264999936\n\
badges,competition,492,2017-09-16 18:46:46.435000064\n\
competition,routes,492,2017-09-16 18:49:32.166000128\n\
routes,route,492,2017-09-16 18:49:47.992999936\n\
route,routes,492,2017-09-16 18:49:53.833999872\n\
routes,route,492,2017-09-16 18:50:03.732000000\n\
route,routes,492,2017-09-16 18:50:08.371000064\n\
routes,route,492,2017-09-16 18:50:12.288000000\n\
route,routes,492,2017-09-16 18:50:15.027000064\n\
routes,route,492,2017-09-16 18:50:25.217999872\n\
route,routes,492,2017-09-16 18:50:28.049999872\n\
routes,route,492,2017-09-16 18:50:35.238000128\n\
route,routes,492,2017-09-16 18:50:38.343000064\n\
routes,route,492,2017-09-16 18:50:42.623000064\n\
route,routes,492,2017-09-16 18:50:46.377999872\n\
coach,competition,493,2017-09-16 22:09:57.155000064\n\
competition,coach,493,2017-09-16 22:10:20.633999872\n\
coach,competition,493,2017-09-16 22:10:45.943000064\n\
coach,competition,494,2017-09-17 10:27:58.815000064\n\
competition,coach,494,2017-09-17 10:28:18.887000064\n\
coach,track,494,2017-09-17 10:28:25.270000128\n\
track,coach,494,2017-09-17 10:28:32.044000000\n\
coach,track,494,2017-09-17 10:37:17.388000000\n\
track,coach,494,2017-09-17 10:37:22.612999936\n\
coach,competition,494,2017-09-17 11:51:52.446000128\n\
competition,track,494,2017-09-17 11:52:25.288000000\n\
track,coach,494,2017-09-17 11:52:34.878000128\n\
coach,competition,494,2017-09-17 12:49:14.105999872\n\
competition,coach,494,2017-09-17 12:49:26.364999936\n\
coach,personal,494,2017-09-17 12:49:37.736000000\n\
personal,bugreport,494,2017-09-17 12:49:39.931000064\n\
bugreport,personal,494,2017-09-17 12:49:41.489999872\n\
personal,bugreport,494,2017-09-17 12:49:59.220999936\n\
bugreport,team,494,2017-09-17 12:50:03.340000000\n\
team,coach,494,2017-09-17 12:50:07.096999936\n\
coach,team,494,2017-09-17 13:08:58.764000000\n\
team,track,494,2017-09-17 13:14:07.428000000\n\
track,route,494,2017-09-17 13:14:21.558000128\n\
route,coach,494,2017-09-17 13:14:29.596999936\n\
coach,routes,494,2017-09-17 13:14:42.835000064\n\
routes,route,494,2017-09-17 13:14:59.275000064\n\
route,routes,494,2017-09-17 13:15:04.185999872\n\
routes,coach,494,2017-09-17 13:15:16.400000000\n\
coach,track,494,2017-09-17 13:15:23.996000000\n\
track,coach,494,2017-09-17 13:32:32.801999872\n\
coach,team,494,2017-09-17 15:22:39.847000064\n\
team,personal,494,2017-09-17 15:23:17.191000064\n\
personal,team,494,2017-09-17 15:23:34.502000128\n\
coach,track,495,2017-09-17 15:50:49.268000000\n\
track,route,495,2017-09-17 15:50:52.691000064\n\
route,coach,495,2017-09-17 15:51:05.060999936\n\
coach,team,495,2017-09-17 15:51:16.368000000\n\
team,routes,495,2017-09-17 16:29:42.171000064\n\
routes,route,495,2017-09-17 16:29:50.076000000\n\
coach,competition,496,2017-09-17 20:52:44.990000128\n\
competition,coach,496,2017-09-17 20:53:46.916999936\n\
coach,competition,496,2017-09-17 20:54:18.967000064\n\
competition,coach,496,2017-09-17 20:54:22.224999936\n\
coach,competition,496,2017-09-17 20:54:26.399000064\n\
competition,team,496,2017-09-17 20:54:29.542000128\n\
team,coach,496,2017-09-17 20:54:35.464000000\n\
coach,,497,2017-09-17 21:28:07.174000128\n\
coach,competition,498,2017-09-18 11:26:01.449999872\n\
competition,team,498,2017-09-18 11:27:40.436000000\n\
team,coach,498,2017-09-18 11:27:58.992999936\n\
coach,track,498,2017-09-18 11:28:11.974000128\n\
track,route,498,2017-09-18 11:52:27.438000128\n\
route,team,498,2017-09-18 13:29:46.060999936\n\
team,badges,498,2017-09-18 13:35:23.561999872\n\
badges,team,498,2017-09-18 13:48:35.264999936\n\
team,coach,498,2017-09-18 13:48:44.832999936\n\
coach,competition,498,2017-09-18 13:48:48.588999936\n\
competition,coach,498,2017-09-18 13:49:07.008000000\n\
coach,competition,498,2017-09-18 13:49:15.532999936\n\
competition,coach,498,2017-09-18 13:51:13.750000128\n\
coach,routes,498,2017-09-18 13:51:22.768000000\n\
routes,route,498,2017-09-18 13:51:38.648000000\n\
route,routes,498,2017-09-18 13:51:42.912000000\n\
routes,route,498,2017-09-18 13:51:56.150000128\n\
route,routes,498,2017-09-18 13:51:58.632999936\n\
routes,route,498,2017-09-18 13:52:04.510000128\n\
route,routes,498,2017-09-18 13:52:07.696000000\n\
coach,coach,499,2017-09-18 14:30:49.643000064\n\
coach,track,499,2017-09-18 14:31:37.278000128\n\
track,route,499,2017-09-18 14:31:45.143000064\n\
route,coach,499,2017-09-18 17:16:07.049999872\n\
coach,team,499,2017-09-18 17:16:33.028000000\n\
coach,track,500,2017-09-19 09:11:24.694000128\n\
track,coach,500,2017-09-19 09:11:32.991000064\n\
coach,coach,500,2017-09-19 10:06:41.635000064\n\
coach,track,500,2017-09-19 10:10:58.640999936\n\
track,coach,500,2017-09-19 10:12:15.094000128\n\
coach,track,501,2017-09-19 12:13:34.115000064\n\
track,route,501,2017-09-19 12:15:00.425999872\n\
route,coach,501,2017-09-19 12:15:14.312000000\n\
coach,coach,501,2017-09-19 12:15:26.836999936\n\
coach,team,501,2017-09-19 12:29:38.988000000\n\
coach,coach,502,2017-09-19 12:56:21.396999936\n\
coach,competition,502,2017-09-19 13:13:36.287000064\n\
competition,coach,502,2017-09-19 13:14:18.184999936\n\
coach,track,502,2017-09-19 13:14:56.916000000\n\
track,coach,502,2017-09-19 13:15:03.913999872\n\
coach,team,503,2017-09-21 09:45:29.884999936\n\
team,badges,503,2017-09-21 09:45:43.044000000\n\
badges,coach,503,2017-09-21 09:45:54.327000064\n\
coach,track,504,2017-09-21 13:27:33.395000064\n\
track,coach,504,2017-09-21 13:27:40.152000000\n\
coach,track,504,2017-09-21 14:08:34.692000000\n\
track,track,504,2017-09-21 14:09:50.264000000\n\
track,route,504,2017-09-21 15:01:17.440000000\n\
route,track,504,2017-09-21 15:01:19.577999872\n\
track,team,504,2017-09-21 15:04:11.320000000\n\
team,coach,504,2017-09-21 15:04:34.260999936\n\
coach,competition,504,2017-09-21 15:05:12.454000128\n\
competition,coach,504,2017-09-21 15:05:35.536000000\n\
coach,route,504,2017-09-21 15:05:49.376999936\n\
route,track,504,2017-09-21 15:29:24.364000000\n\
track,route,504,2017-09-21 15:29:55.888000000\n\
route,track,504,2017-09-21 15:30:07.443000064\n\
track,coach,504,2017-09-21 15:30:11.958000128\n\
coach,competition,504,2017-09-21 15:30:20.804000000\n\
competition,coach,504,2017-09-21 15:30:29.470000128\n\
coach,track,504,2017-09-21 15:30:41.686000128\n\
track,route,504,2017-09-21 15:30:45.569999872\n\
route,coach,504,2017-09-21 15:48:12.572000000\n\
coach,competition,504,2017-09-21 15:48:25.423000064\n\
competition,coach,504,2017-09-21 15:49:28.727000064\n\
coach,team,504,2017-09-21 15:49:45.556000000\n\
team,badges,504,2017-09-21 15:49:50.950000128\n\
badges,routes,504,2017-09-21 15:51:51.198000128\n\
routes,route,504,2017-09-21 15:52:35.748000000\n\
route,routes,504,2017-09-21 15:52:41.075000064\n\
routes,route,504,2017-09-21 15:53:08.585999872\n\
route,routes,504,2017-09-21 15:53:12.376999936\n\
routes,route,504,2017-09-21 15:53:18.248000000\n\
route,routes,504,2017-09-21 15:53:32.737999872\n\
routes,route,504,2017-09-21 15:53:57.377999872\n\
route,routes,504,2017-09-21 15:54:00.140000000\n\
routes,route,504,2017-09-21 15:54:57.896999936\n\
route,routes,504,2017-09-21 15:55:01.844999936\n\
routes,route,504,2017-09-21 15:55:08.577999872\n\
route,routes,504,2017-09-21 15:55:10.310000128\n\
routes,route,504,2017-09-21 15:55:40.827000064\n\
route,routes,504,2017-09-21 15:55:43.380000000\n\
coach,personal,505,2017-09-21 20:48:52.692000000\n\
personal,coach,505,2017-09-21 20:49:11.991000064\n\
coach,competition,505,2017-09-21 20:50:35.047000064\n\
competition,coach,505,2017-09-21 20:50:47.059000064\n\
coach,team,505,2017-09-21 20:51:02.704000000\n\
coach,team,506,2017-09-22 10:28:55.587000064\n\
team,competition,506,2017-09-22 10:29:38.208000000\n\
competition,badges,506,2017-09-22 10:30:05.176000000\n\
coach,competition,507,2017-09-23 00:06:01.329999872\n\
competition,coach,507,2017-09-23 00:06:15.969999872\n\
coach,team,507,2017-09-23 00:06:32.761999872\n\
coach,team,508,2017-09-23 21:47:48.140000000\n\
team,routes,508,2017-09-23 21:48:04.260000000\n\
routes,route,508,2017-09-23 21:48:57.316999936\n\
route,routes,508,2017-09-23 21:49:17.289999872\n\
routes,route,508,2017-09-23 21:49:18.441999872\n\
route,routes,508,2017-09-23 21:49:20.032999936\n\
routes,route,508,2017-09-23 21:50:33.702000128\n\
route,routes,508,2017-09-23 21:50:37.102000128\n\
routes,route,508,2017-09-23 21:50:44.044000000\n\
route,routes,508,2017-09-23 21:50:57.416999936\n\
routes,route,508,2017-09-23 21:51:09.456000000\n\
coach,team,509,2017-09-24 07:51:55.249999872\n\
coach,track,510,2017-09-24 11:41:04.214000128\n\
track,route,510,2017-09-24 11:43:46.163000064\n\
route,coach,510,2017-09-24 13:02:03.457999872\n\
coach,route,510,2017-09-24 13:02:27.436000000\n\
route,routes,510,2017-09-24 14:25:52.087000064\n\
routes,route,510,2017-09-24 14:27:12.524999936\n\
route,routes,510,2017-09-24 14:27:22.360000000\n\
routes,route,510,2017-09-24 14:27:45.080999936\n\
route,routes,510,2017-09-24 14:27:47.995000064\n\
routes,route,510,2017-09-24 14:29:17.926000128\n\
route,routes,510,2017-09-24 14:29:20.995000064\n\
routes,competition,510,2017-09-24 14:29:38.915000064\n\
competition,team,510,2017-09-24 14:29:44.996999936\n\
coach,track,511,2017-09-24 14:53:01.456000000\n\
track,coach,511,2017-09-24 14:53:17.928999936\n\
coach,track,511,2017-09-24 16:53:09.323000064\n\
track,route,511,2017-09-24 16:53:15.344000000\n\
route,coach,511,2017-09-24 16:53:20.032999936\n\
coach,competition,511,2017-09-24 16:53:32.023000064\n\
competition,team,511,2017-09-24 17:13:01.464000000\n\
team,routes,511,2017-09-24 17:15:23.268999936\n\
routes,route,511,2017-09-24 17:15:58.985999872\n\
route,routes,511,2017-09-24 17:16:05.852000000\n\
routes,route,511,2017-09-24 18:26:18.926000128\n\
route,routes,511,2017-09-24 18:26:25.015000064\n\
routes,route,511,2017-09-24 18:26:37.464000000\n\
route,routes,511,2017-09-24 18:26:40.180999936\n\
routes,route,511,2017-09-24 18:26:49.852000000\n\
route,routes,511,2017-09-24 18:26:52.559000064\n\
routes,badges,511,2017-09-24 18:27:05.303000064\n\
"

var demo = function(){
	data = CSVToArray(test, ',');

	if(data[0].length != 2 && data[0].length != 4){
      alert('The uploaded file should contain either two or four columns!');
      return;
    }
    else if(data[0].length == 2){
      $('#clusteringTab').remove();
      if(!arraysEqual(data[0], ['from', 'to'])){
        alert('If you upload a file with two columns, these must be from & to!');
        return;
      }
    } else if(data[0].length == 4){
      if(!arraysEqual(data[0], ['from', 'to', 'session_id', 'timestamp'])){
        alert('If you upload a file with four columns, these must be from, to, session_id and timestamp!');
        return;
      }
    }

    $('#mainPanel').show();
    $('#uploadFilePanel').hide();

    states = getStates(data);
    var mc = new MarkovChain(states);
    sessions = createSessions(data);
    for(var j = 0; j < sessions.length; j++){
      mc.add_session(sessions[j]);
    }

    console.log(sessions);

    document.getElementById("nrClustersSlider").max = Math.min(10, sessions.length);

    cmap = createColorMap(mc);

    createMarkovChain(mc, cmap);

    var cluster1 = [];
    var cluster2 = [];
    for(var i = 0; i < sessions.length - 1; i++){
      cluster1.push(sessions[i])
    }
    for(var i = sessions.length - 1; i < sessions.length; i++){
      cluster2.push(sessions[i])
    }
    createSequenceMatrix(clusterSessions(sessions, states, 1), cmap, "#sequenceClusteringVisualization");

    var simulateThread = null;

    // Keep calling simulate with a new timeout variable
    var simulatedSession = []
    function simulate(){
        simulateThread = window.setTimeout(function(){
            simulatedSession.push(mc.state);
            $('#circle_' + mc.states[mc.state_to_id[mc.state]]).removeClass('current-node');
            var prevState = mc.state;
            mc.transition();
            $('#circle_' + mc.states[mc.state_to_id[mc.state]]).addClass('current-node');
            simulate();
            if(mc.state == "exit") {
              clearInterval(simulateThread);
              simulateThread = null;
              $('#circle_' + mc.states[mc.state_to_id[mc.state]]).removeClass('current-node');
              simulatedSession.push("exit");
              createSequenceMatrix([[simulatedSession]], cmap, "#simulatedSequence");
              simulatedSession = [];
            }
        }, 1000);
    }

    $('#btnStartSimulation').click(function () {
      if(simulateThread == null){
        mc.state = "start";
        $('#circle_' + mc.states[mc.state_to_id[mc.state]]).addClass('current-node');
        simulate();
      }
    });

    $('#btnPauseSimulation').click(function () {
      if(simulateThread != null) {
        clearInterval(simulateThread); 
        simulateThread = null;
      }
      $('#circle_' + mc.states[mc.state_to_id[mc.state]]).removeClass('current-node');
    });

    $('#btnCluster').click(function () {
      var nrClusters = $('#nrClustersSlider').val();
      d3.selectAll("#sequenceClusteringVisualization > *").remove();
      createSequenceMatrix(clusterSessions(sessions, states, nrClusters), cmap, "#sequenceClusteringVisualization");
    });

}

document.getElementById('files').addEventListener('change', handleFileSelect, false);
