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

function isInArray(value, array) {
  return array.indexOf(value) > -1;
}

function clusterSessions(sessions, states, nrClusters){

  Math.seedrandom('4');

  var sortedSessions  = sessions.sort(sortByLength),
      // Discard outliers in terms of session length
      minLength = 2,//sortedSessions[parseInt(0.1*sessions.length)].length,
      maxLength = 20;

  var filteredSessions = [];
  for(var i = 0; i < sessions.length; i++){
    var filteredSession = [];
    for(var a = 0; a < sessions[i].length; a++){
      if(true){//(!isInArray(sessions[i][a], ["badges", "bugreport", "personal"])){
        filteredSession.push(sessions[i][a]);
      }
    }
    if(filteredSession.length > 0){
      filteredSessions.push(filteredSession);
    }
  }
  sessions = filteredSessions;
  //sessions = sessions.filter(x => x.length >= minLength && x.length <= maxLength);

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
    /*
    if(isInArray("track", sessions[i])){
      markovChains[0].add_session(sessions[i]);
      assignment.push(0);
    } else {
      markovChains[1].add_session(sessions[i]);
      assignment.push(1);
    }
    */
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
    console.log(markovChains[c].state_to_id, markovChains[c].get_transition_matrix())
  }
  for(var i = 0; i < sessions.length; i++){
    if(sessions[i].length >= minLength && sessions[i].length <= maxLength) clusters[assignment[i]].push(sessions[i]);//.slice(0, sessions[i].length - 1));
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
  states = new Set([]);
  for(var i = 1; i < data.length; i++){
    if(data[i][0] != '') states.add(data[i][0]);
    if(data[i][1] != '') states.add(data[i][1]);
  }
  /*if(data[0].length > 2){
    states.add('exit');
  }*/
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
          actions_per_session[data[i][2]] = [data[i][0], data[i][1]];
          //actions_per_session[data[i][2]] = [data[i][1]];
        } else {
          actions_per_session[data[i][2]].push(data[i][1]);
        }
      }
    }

    for(var session_id in actions_per_session){
      sessions.push(actions_per_session[session_id]);
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
      var prob = this.initialProbs[this.state_to_id[session[0]]] / this.initialProbs.reduce((a, b) => a + b, 0);
      if(isNaN(prob)){
        return 0.0;
      }
      for(var i = 0; i < session.length - 1; i++){
        prob *= transitionMatrix[this.state_to_id[session[i]]][this.state_to_id[session[i + 1]]];
      }
      return prob;
    }
}

function createColorMap(markovChain){

  // TODO: Define your own mapping of colors so that clustering looks more pleasant!

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
coach,personal,0,2017-09-08 08:36:26.961999872\n\
personal,competition,0,2017-09-08 08:36:53.768999936\n\
competition,coach,0,2017-09-08 08:36:58.555000064\n\
coach,team,0,2017-09-08 08:37:07.880999936\n\
team,coach,0,2017-09-08 08:37:17.601999872\n\
coach,team,0,2017-09-08 08:37:23.156999936\n\
team,coach,0,2017-09-08 08:37:26.510000128\n\
coach,team,0,2017-09-08 08:37:30.551000064\n\
team,routes,0,2017-09-08 08:37:45.630000128\n\
routes,coach,0,2017-09-08 08:37:53.820999936\n\
coach,track,0,2017-09-08 08:37:57.496000000\n\
track,coach,0,2017-09-08 08:47:27.584000000\n\
coach,badges,0,2017-09-08 08:47:40.116999936\n\
badges,competition,0,2017-09-08 08:47:49.396000000\n\
competition,personal,0,2017-09-08 08:48:11.764000000\n\
personal,bugreport,0,2017-09-08 08:48:13.404000000\n\
bugreport,personal,0,2017-09-08 08:48:20.305999872\n\
personal,bugreport,0,2017-09-08 08:49:00.126000128\n\
bugreport,team,0,2017-09-08 08:49:04.552000000\n\
team,competition,0,2017-09-08 08:49:35.371000064\n\
competition,exit,0,2017-09-08 08:49:35.371000064\n\
coach,team,1,2017-09-08 12:53:34.704999936\n\
team,coach,1,2017-09-08 12:53:47.872999936\n\
coach,exit,1,2017-09-08 12:53:47.872999936\n\
team,personal,2,2017-09-08 15:51:14.863000064\n\
personal,team,2,2017-09-08 15:51:26.832000000\n\
team,exit,2,2017-09-08 15:51:26.832000000\n\
coach,personal,3,2017-09-09 08:53:10.392999936\n\
personal,coach,3,2017-09-09 08:53:26.536999936\n\
coach,team,3,2017-09-09 08:53:30.656999936\n\
team,exit,3,2017-09-09 08:53:30.656999936\n\
coach,personal,4,2017-09-09 15:16:40.060000000\n\
personal,coach,4,2017-09-09 15:16:50.392000000\n\
coach,team,4,2017-09-09 15:16:53.191000064\n\
team,exit,4,2017-09-09 15:16:53.191000064\n\
coach,personal,5,2017-09-10 09:38:44.600999936\n\
personal,coach,5,2017-09-10 09:38:58.708000000\n\
coach,team,5,2017-09-10 09:39:00.668000000\n\
team,competition,5,2017-09-10 09:39:16.948999936\n\
competition,exit,5,2017-09-10 09:39:16.948999936\n\
personal,competition,6,2017-09-10 11:41:02.734000128\n\
competition,track,6,2017-09-10 11:41:09.347000064\n\
track,exit,6,2017-09-10 11:41:09.347000064\n\
coach,exit,7,2017-09-10 12:35:44.313999872\n\
track,route,8,2017-09-10 15:28:22.464000000\n\
route,coach,8,2017-09-10 15:28:45.251000064\n\
coach,competition,8,2017-09-10 15:28:55.240999936\n\
competition,coach,8,2017-09-10 15:29:00.296999936\n\
coach,team,8,2017-09-10 15:29:03.273999872\n\
team,exit,8,2017-09-10 15:29:03.273999872\n\
competition,exit,9,2017-09-10 16:46:39.308000000\n\
coach,competition,10,2017-09-11 04:58:45.817999872\n\
competition,coach,10,2017-09-11 04:58:51.025999872\n\
coach,team,10,2017-09-11 04:58:52.657999872\n\
team,exit,10,2017-09-11 04:58:52.657999872\n\
coach,exit,11,2017-09-11 10:05:17.464000000\n\
coach,personal,12,2017-09-11 12:30:58.116000000\n\
personal,coach,12,2017-09-11 12:31:08.460999936\n\
coach,team,12,2017-09-11 12:31:10.808999936\n\
team,competition,12,2017-09-11 12:31:33.828000000\n\
competition,coach,12,2017-09-11 12:31:44.438000128\n\
coach,personal,12,2017-09-11 12:32:43.656000000\n\
personal,coach,12,2017-09-11 12:32:45.324999936\n\
coach,exit,12,2017-09-11 12:32:45.324999936\n\
coach,personal,13,2017-09-11 15:44:22.056999936\n\
personal,track,13,2017-09-11 15:44:35.227000064\n\
track,exit,13,2017-09-11 15:44:35.227000064\n\
coach,exit,14,2017-09-11 16:39:11.335000064\n\
track,route,15,2017-09-11 17:19:21.048999936\n\
route,track,15,2017-09-11 17:28:38.035000064\n\
track,coach,15,2017-09-11 17:28:41.160000000\n\
coach,competition,15,2017-09-11 17:29:50.233999872\n\
competition,coach,15,2017-09-11 17:30:03.248000000\n\
coach,competition,15,2017-09-11 17:30:11.072000000\n\
competition,team,15,2017-09-11 17:30:13.752000000\n\
team,coach,15,2017-09-11 17:38:49.889999872\n\
coach,competition,15,2017-09-11 18:02:07.500999936\n\
competition,team,15,2017-09-11 18:02:39.900999936\n\
team,routes,15,2017-09-11 18:03:13.272000000\n\
routes,route,15,2017-09-11 18:03:18.030000128\n\
route,routes,15,2017-09-11 18:03:23.087000064\n\
routes,badges,15,2017-09-11 18:03:29.241999872\n\
badges,coach,15,2017-09-11 18:16:27.190000128\n\
coach,personal,15,2017-09-11 18:17:38.812999936\n\
personal,coach,15,2017-09-11 18:17:43.824999936\n\
coach,badges,15,2017-09-11 18:17:49.712999936\n\
badges,team,15,2017-09-11 18:17:56.873999872\n\
team,exit,15,2017-09-11 18:17:56.873999872\n\
personal,team,16,2017-09-11 18:59:23.550000128\n\
team,competition,16,2017-09-11 18:59:33.112000000\n\
competition,team,16,2017-09-11 18:59:43.828999936\n\
team,exit,16,2017-09-11 18:59:43.828999936\n\
team,competition,17,2017-09-11 19:21:05.721999872\n\
competition,team,17,2017-09-11 19:21:20.191000064\n\
team,competition,17,2017-09-11 19:22:17.444000000\n\
competition,coach,17,2017-09-11 19:41:51.636000000\n\
coach,competition,17,2017-09-11 19:41:58.583000064\n\
competition,coach,17,2017-09-11 19:42:03.160000000\n\
coach,team,17,2017-09-11 19:42:09.252999936\n\
team,exit,17,2017-09-11 19:42:09.252999936\n\
coach,competition,18,2017-09-12 04:54:03.704000000\n\
competition,exit,18,2017-09-12 04:54:03.704000000\n\
coach,exit,19,2017-09-12 05:24:07.468000000\n\
coach,competition,20,2017-09-12 10:47:50.535000064\n\
competition,coach,20,2017-09-12 10:47:53.831000064\n\
coach,team,20,2017-09-12 10:47:55.580000000\n\
team,exit,20,2017-09-12 10:47:55.580000000\n\
coach,personal,21,2017-09-12 15:56:32.281999872\n\
personal,coach,21,2017-09-12 15:56:35.174000128\n\
coach,personal,21,2017-09-12 15:56:57.494000128\n\
personal,coach,21,2017-09-12 15:57:09.139000064\n\
coach,competition,21,2017-09-12 15:57:11.456999936\n\
competition,coach,21,2017-09-12 15:57:18.788999936\n\
coach,team,21,2017-09-12 15:57:22.564000000\n\
team,competition,21,2017-09-12 15:57:39.864999936\n\
competition,coach,21,2017-09-12 15:57:49.960000000\n\
coach,exit,21,2017-09-12 15:57:49.960000000\n\
coach,team,22,2017-09-12 20:46:59.176000000\n\
team,competition,22,2017-09-12 20:47:25.905999872\n\
competition,personal,22,2017-09-12 20:47:32.612000000\n\
personal,competition,22,2017-09-12 20:47:44.936000000\n\
competition,team,22,2017-09-12 20:47:47.073999872\n\
team,exit,22,2017-09-12 20:47:47.073999872\n\
personal,team,23,2017-09-13 05:21:22.088000000\n\
team,competition,23,2017-09-13 05:21:35.716000000\n\
competition,exit,23,2017-09-13 05:21:35.716000000\n\
coach,personal,24,2017-09-13 07:53:49.691000064\n\
personal,coach,24,2017-09-13 07:54:09.241999872\n\
coach,competition,24,2017-09-13 07:54:18.369999872\n\
competition,badges,24,2017-09-13 07:54:23.671000064\n\
badges,exit,24,2017-09-13 07:54:23.671000064\n\
coach,team,25,2017-09-13 12:37:37.443000064\n\
team,competition,25,2017-09-13 12:37:47.532999936\n\
competition,coach,25,2017-09-13 12:59:56.422000128\n\
coach,personal,25,2017-09-13 13:00:12.680000000\n\
personal,coach,25,2017-09-13 13:00:25.044000000\n\
coach,track,25,2017-09-13 13:00:25.980000000\n\
track,exit,25,2017-09-13 13:00:25.980000000\n\
track,route,26,2017-09-13 14:22:12.655000064\n\
route,track,26,2017-09-13 14:22:19.696999936\n\
track,team,26,2017-09-13 14:22:22.248999936\n\
team,competition,26,2017-09-13 14:22:32.276000000\n\
competition,exit,26,2017-09-13 14:22:32.276000000\n\
competition,coach,27,2017-09-13 19:19:18.412999936\n\
coach,exit,27,2017-09-13 19:19:18.412999936\n\
competition,team,28,2017-09-14 03:44:51.584999936\n\
team,exit,28,2017-09-14 03:44:51.584999936\n\
coach,personal,29,2017-09-14 06:31:32.856999936\n\
personal,coach,29,2017-09-14 06:31:44.057999872\n\
coach,competition,29,2017-09-14 06:31:46.152999936\n\
competition,exit,29,2017-09-14 06:31:46.152999936\n\
coach,competition,30,2017-09-14 10:14:38.590000128\n\
competition,team,30,2017-09-14 10:14:48.704000000\n\
team,exit,30,2017-09-14 10:14:48.704000000\n\
coach,exit,31,2017-09-14 14:21:28.364000000\n\
personal,coach,32,2017-09-14 16:22:10.411000064\n\
coach,track,32,2017-09-14 16:22:12.388999936\n\
track,exit,32,2017-09-14 16:22:12.388999936\n\
coach,exit,33,2017-09-14 17:17:01.240000000\n\
track,route,34,2017-09-14 17:51:05.560999936\n\
route,coach,34,2017-09-14 17:51:24.924000000\n\
coach,exit,34,2017-09-14 17:51:24.924000000\n\
competition,team,35,2017-09-14 19:20:39.086000128\n\
team,competition,35,2017-09-14 19:21:24.152000000\n\
competition,exit,35,2017-09-14 19:21:24.152000000\n\
competition,coach,36,2017-09-14 20:30:46.719000064\n\
coach,exit,36,2017-09-14 20:30:46.719000064\n\
coach,competition,37,2017-09-15 09:35:49.296000000\n\
competition,exit,37,2017-09-15 09:35:49.296000000\n\
personal,competition,38,2017-09-15 10:26:46.840000000\n\
competition,track,38,2017-09-15 10:26:48.700000000\n\
track,exit,38,2017-09-15 10:26:48.700000000\n\
track,route,39,2017-09-15 11:52:10.028000000\n\
route,coach,39,2017-09-15 11:52:28.295000064\n\
coach,competition,39,2017-09-15 12:00:08.259000064\n\
competition,team,39,2017-09-15 12:00:12.903000064\n\
team,badges,39,2017-09-15 12:00:27.465999872\n\
badges,exit,39,2017-09-15 12:00:27.465999872\n\
badges,competition,40,2017-09-15 13:08:00.449999872\n\
competition,exit,40,2017-09-15 13:08:00.449999872\n\
coach,personal,41,2017-09-15 13:54:31.886000128\n\
personal,coach,41,2017-09-15 13:54:41.588999936\n\
coach,team,41,2017-09-15 13:54:44.684000000\n\
team,competition,41,2017-09-15 13:55:07.344000000\n\
competition,exit,41,2017-09-15 13:55:07.344000000\n\
competition,team,42,2017-09-16 06:17:28.041999872\n\
team,exit,42,2017-09-16 06:17:28.041999872\n\
coach,competition,43,2017-09-16 08:41:11.372999936\n\
competition,personal,43,2017-09-16 08:41:20.127000064\n\
personal,competition,43,2017-09-16 08:41:31.107000064\n\
competition,exit,43,2017-09-16 08:41:31.107000064\n\
coach,competition,44,2017-09-16 12:00:21.062000128\n\
competition,coach,44,2017-09-16 12:02:29.780999936\n\
coach,exit,44,2017-09-16 12:02:29.780999936\n\
coach,competition,45,2017-09-16 15:12:56.827000064\n\
competition,exit,45,2017-09-16 15:12:56.827000064\n\
coach,competition,46,2017-09-16 20:18:55.704999936\n\
competition,exit,46,2017-09-16 20:18:55.704999936\n\
coach,competition,47,2017-09-17 10:05:00.099000064\n\
competition,coach,47,2017-09-17 10:05:15.464000000\n\
coach,team,47,2017-09-17 10:05:20.975000064\n\
team,exit,47,2017-09-17 10:05:20.975000064\n\
competition,exit,48,2017-09-17 10:50:51.519000064\n\
competition,exit,49,2017-09-17 11:20:50.936999936\n\
competition,team,50,2017-09-17 12:51:53.064999936\n\
team,exit,50,2017-09-17 12:51:53.064999936\n\
team,competition,51,2017-09-17 15:09:32.308000000\n\
competition,team,51,2017-09-17 15:09:41.072000000\n\
team,personal,51,2017-09-17 15:09:42.932999936\n\
personal,team,51,2017-09-17 15:09:51.644000000\n\
team,competition,51,2017-09-17 15:09:53.644999936\n\
competition,exit,51,2017-09-17 15:09:53.644999936\n\
coach,competition,52,2017-09-18 05:41:18.660999936\n\
competition,team,52,2017-09-18 05:41:27.007000064\n\
team,exit,52,2017-09-18 05:41:27.007000064\n\
coach,competition,53,2017-09-18 07:00:08.953999872\n\
competition,exit,53,2017-09-18 07:00:08.953999872\n\
coach,competition,54,2017-09-18 08:57:18.200000000\n\
competition,exit,54,2017-09-18 08:57:18.200000000\n\
coach,competition,55,2017-09-18 11:23:07.398000128\n\
competition,team,55,2017-09-18 11:23:12.591000064\n\
team,exit,55,2017-09-18 11:23:12.591000064\n\
coach,team,56,2017-09-19 03:45:33.175000064\n\
team,competition,56,2017-09-19 03:45:54.731000064\n\
competition,exit,56,2017-09-19 03:45:54.731000064\n\
coach,team,57,2017-09-19 08:39:02.971000064\n\
team,competition,57,2017-09-19 08:39:14.196000000\n\
competition,exit,57,2017-09-19 08:39:14.196000000\n\
coach,team,58,2017-09-19 09:26:06.827000064\n\
team,competition,58,2017-09-19 09:26:12.656000000\n\
competition,coach,58,2017-09-19 09:49:31.831000064\n\
coach,competition,58,2017-09-19 09:49:36.288999936\n\
competition,exit,58,2017-09-19 09:49:36.288999936\n\
competition,exit,59,2017-09-19 11:07:26.336000000\n\
competition,track,60,2017-09-19 13:37:28.488000000\n\
track,team,60,2017-09-19 13:37:31.060999936\n\
team,exit,60,2017-09-19 13:37:31.060999936\n\
personal,team,61,2017-09-19 15:24:03.544000000\n\
team,track,61,2017-09-19 15:24:07.062000128\n\
track,exit,61,2017-09-19 15:24:07.062000128\n\
route,track,62,2017-09-19 16:11:06.072999936\n\
track,team,62,2017-09-19 16:18:46.107000064\n\
team,competition,62,2017-09-19 16:18:52.780999936\n\
competition,exit,62,2017-09-19 16:18:52.780999936\n\
competition,exit,63,2017-09-19 16:58:29.328000000\n\
team,competition,64,2017-09-19 18:25:59.872000000\n\
competition,exit,64,2017-09-19 18:25:59.872000000\n\
competition,badges,65,2017-09-19 20:27:09.171000064\n\
badges,exit,65,2017-09-19 20:27:09.171000064\n\
badges,competition,66,2017-09-20 03:40:05.644000000\n\
competition,exit,66,2017-09-20 03:40:05.644000000\n\
coach,competition,67,2017-09-20 10:16:49.700000000\n\
competition,team,67,2017-09-20 10:16:58.859000064\n\
team,routes,67,2017-09-20 10:17:25.798000128\n\
routes,route,67,2017-09-20 10:17:32.055000064\n\
route,routes,67,2017-09-20 10:17:41.020999936\n\
routes,coach,67,2017-09-20 10:17:44.520999936\n\
coach,exit,67,2017-09-20 10:17:44.520999936\n\
coach,personal,68,2017-09-20 11:57:43.716999936\n\
personal,coach,68,2017-09-20 11:57:51.828000000\n\
coach,track,68,2017-09-20 11:57:53.855000064\n\
track,exit,68,2017-09-20 11:57:53.855000064\n\
coach,track,69,2017-09-20 12:53:22.600000000\n\
track,route,69,2017-09-20 12:53:24.128000000\n\
route,exit,69,2017-09-20 12:53:24.128000000\n\
route,exit,70,2017-09-20 13:39:33.072000000\n\
coach,team,71,2017-09-20 20:36:52.769999872\n\
team,competition,71,2017-09-20 20:37:20.264999936\n\
competition,exit,71,2017-09-20 20:37:20.264999936\n\
coach,personal,72,2017-09-21 10:13:58.600000000\n\
personal,coach,72,2017-09-21 10:14:08.799000064\n\
coach,track,72,2017-09-21 10:14:10.631000064\n\
track,route,72,2017-09-21 10:20:32.080999936\n\
route,track,72,2017-09-21 10:20:35.032999936\n\
track,exit,72,2017-09-21 10:20:35.032999936\n\
coach,competition,73,2017-09-21 12:40:19.929999872\n\
competition,coach,73,2017-09-21 12:40:24.220000000\n\
coach,team,73,2017-09-21 12:40:25.992000000\n\
team,exit,73,2017-09-21 12:40:25.992000000\n\
coach,competition,74,2017-09-21 16:04:33.420999936\n\
competition,track,74,2017-09-21 16:04:41.792999936\n\
track,exit,74,2017-09-21 16:04:41.792999936\n\
coach,track,75,2017-09-21 17:29:29.348999936\n\
track,route,75,2017-09-21 17:29:33.136999936\n\
route,coach,75,2017-09-21 17:29:49.811000064\n\
coach,competition,75,2017-09-21 17:30:01.380999936\n\
competition,exit,75,2017-09-21 17:30:01.380999936\n\
coach,competition,76,2017-09-21 18:56:21.496000000\n\
competition,exit,76,2017-09-21 18:56:21.496000000\n\
coach,team,77,2017-09-21 20:20:27.840000000\n\
team,competition,77,2017-09-21 20:21:17.760999936\n\
competition,exit,77,2017-09-21 20:21:17.760999936\n\
personal,coach,78,2017-09-22 08:20:26.219000064\n\
coach,competition,78,2017-09-22 08:20:27.400000000\n\
competition,track,78,2017-09-22 08:20:29.316000000\n\
track,exit,78,2017-09-22 08:20:29.316000000\n\
coach,track,79,2017-09-22 09:27:05.686000128\n\
track,route,79,2017-09-22 09:27:08.244999936\n\
route,exit,79,2017-09-22 09:27:08.244999936\n\
coach,track,80,2017-09-22 10:20:56.576000000\n\
track,route,80,2017-09-22 10:32:24.768999936\n\
route,track,80,2017-09-22 10:32:29.126000128\n\
track,competition,80,2017-09-22 10:32:31.339000064\n\
competition,coach,80,2017-09-22 10:32:37.588000000\n\
coach,exit,80,2017-09-22 10:32:37.588000000\n\
personal,coach,81,2017-09-22 13:23:19.076000000\n\
coach,track,81,2017-09-22 13:23:23.304999936\n\
track,route,81,2017-09-22 13:23:39.889999872\n\
route,track,81,2017-09-22 13:23:45.532999936\n\
track,route,81,2017-09-22 13:23:53.748000000\n\
route,track,81,2017-09-22 13:23:57.308999936\n\
track,team,81,2017-09-22 13:24:01.520000000\n\
team,track,81,2017-09-22 13:24:13.456999936\n\
track,route,81,2017-09-22 13:46:53.980000000\n\
route,coach,81,2017-09-22 13:47:08.320000000\n\
coach,team,81,2017-09-22 13:51:49.060000000\n\
team,exit,81,2017-09-22 13:51:49.060000000\n\
coach,team,82,2017-09-22 20:22:22.729999872\n\
team,competition,82,2017-09-22 20:22:43.512999936\n\
competition,exit,82,2017-09-22 20:22:43.512999936\n\
coach,competition,83,2017-09-23 07:55:26.228000000\n\
competition,team,83,2017-09-23 07:55:33.619000064\n\
team,exit,83,2017-09-23 07:55:33.619000064\n\
team,competition,84,2017-09-23 09:40:04.600000000\n\
competition,exit,84,2017-09-23 09:40:04.600000000\n\
team,exit,85,2017-09-23 10:17:45.056000000\n\
coach,personal,86,2017-09-23 15:18:11.047000064\n\
personal,coach,86,2017-09-23 15:18:23.208999936\n\
coach,track,86,2017-09-23 15:18:25.360999936\n\
track,exit,86,2017-09-23 15:18:25.360999936\n\
route,track,87,2017-09-23 15:53:08.657999872\n\
track,exit,87,2017-09-23 15:53:08.657999872\n\
track,team,88,2017-09-23 19:32:20.331000064\n\
team,competition,88,2017-09-23 19:32:41.825999872\n\
competition,exit,88,2017-09-23 19:32:41.825999872\n\
competition,team,89,2017-09-24 08:37:14.580000000\n\
team,competition,89,2017-09-24 08:37:18.152999936\n\
competition,exit,89,2017-09-24 08:37:18.152999936\n\
competition,exit,90,2017-09-24 10:22:36.667000064\n\
competition,track,91,2017-09-24 11:40:10.168000000\n\
track,route,91,2017-09-24 12:09:02.599000064\n\
route,track,91,2017-09-24 12:09:07.108999936\n\
track,team,91,2017-09-24 12:09:09.599000064\n\
team,coach,91,2017-09-24 12:09:14.844000000\n\
coach,team,91,2017-09-24 12:09:17.947000064\n\
team,competition,91,2017-09-24 12:09:31.492000000\n\
competition,exit,91,2017-09-24 12:09:31.492000000\n\
competition,team,92,2017-09-24 12:53:45.840999936\n\
team,competition,92,2017-09-24 12:53:51.151000064\n\
competition,badges,92,2017-09-24 12:53:54.737999872\n\
badges,exit,92,2017-09-24 12:53:54.737999872\n\
badges,track,93,2017-09-24 14:44:43.764000000\n\
track,exit,93,2017-09-24 14:44:43.764000000\n\
route,track,94,2017-09-24 15:32:37.380999936\n\
track,team,94,2017-09-24 15:32:39.307000064\n\
team,competition,94,2017-09-24 15:32:48.711000064\n\
competition,coach,94,2017-09-24 15:32:48.715000064\n\
coach,competition,94,2017-09-24 15:32:50.755000064\n\
competition,exit,94,2017-09-24 15:32:50.755000064\n\
competition,exit,95,2017-09-24 15:45:34.684000000\n\
competition,team,96,2017-09-24 17:43:58.603000064\n\
team,competition,96,2017-09-24 17:44:07.265999872\n\
competition,exit,96,2017-09-24 17:44:07.265999872\n\
coach,competition,97,2017-09-24 22:32:06.225999872\n\
competition,exit,97,2017-09-24 22:32:06.225999872\n\
coach,exit,98,2017-09-25 05:59:26.665999872\n\
coach,team,99,2017-09-25 10:06:57.496999936\n\
team,competition,99,2017-09-25 10:07:13.473999872\n\
competition,track,99,2017-09-25 10:31:22.404999936\n\
track,exit,99,2017-09-25 10:31:22.404999936\n\
coach,exit,100,2017-09-08 11:06:39.484000000\n\
coach,exit,101,2017-09-08 11:07:58.520999936\n\
track,route,102,2017-09-08 13:28:39.120000000\n\
route,track,102,2017-09-08 13:28:43.502000128\n\
track,personal,102,2017-09-08 13:29:30.496999936\n\
personal,track,102,2017-09-08 13:29:40.000999936\n\
track,team,102,2017-09-08 13:29:48.073999872\n\
team,coach,102,2017-09-08 13:30:19.460999936\n\
coach,personal,102,2017-09-08 13:31:25.160000000\n\
personal,coach,102,2017-09-08 13:32:15.764000000\n\
coach,exit,102,2017-09-08 13:32:15.764000000\n\
coach,track,103,2017-09-10 07:07:08.556999936\n\
track,coach,103,2017-09-10 07:26:52.414000128\n\
coach,exit,103,2017-09-10 07:26:52.414000128\n\
track,route,104,2017-09-10 11:00:14.135000064\n\
route,coach,104,2017-09-10 11:00:43.367000064\n\
coach,competition,104,2017-09-10 11:01:29.751000064\n\
competition,coach,104,2017-09-10 11:11:41.868000000\n\
coach,competition,104,2017-09-10 11:18:55.855000064\n\
competition,coach,104,2017-09-10 11:19:01.504999936\n\
coach,competition,104,2017-09-10 11:19:25.888000000\n\
competition,coach,104,2017-09-10 11:19:36.588000000\n\
coach,badges,104,2017-09-10 11:19:47.699000064\n\
badges,team,104,2017-09-10 11:20:59.689999872\n\
team,exit,104,2017-09-10 11:20:59.689999872\n\
coach,exit,105,2017-09-10 12:11:14.863000064\n\
coach,competition,106,2017-09-12 07:08:09.329999872\n\
competition,team,106,2017-09-12 07:08:44.260000000\n\
team,competition,106,2017-09-12 07:09:09.416999936\n\
competition,coach,106,2017-09-12 07:09:21.507000064\n\
coach,track,106,2017-09-12 07:09:59.532000000\n\
track,badges,106,2017-09-12 07:10:03.972000000\n\
badges,coach,106,2017-09-12 07:10:28.471000064\n\
coach,exit,106,2017-09-12 07:10:28.471000064\n\
coach,team,107,2017-09-12 09:27:35.384000000\n\
team,exit,107,2017-09-12 09:27:35.384000000\n\
track,coach,108,2017-09-12 10:27:19.566000128\n\
coach,track,108,2017-09-12 10:32:42.398000128\n\
track,route,108,2017-09-12 10:33:12.190000128\n\
route,track,108,2017-09-12 10:33:21.076999936\n\
track,coach,108,2017-09-12 10:33:39.788999936\n\
coach,competition,108,2017-09-12 10:33:41.607000064\n\
competition,coach,108,2017-09-12 10:33:52.267000064\n\
coach,competition,108,2017-09-12 10:34:00.815000064\n\
competition,team,108,2017-09-12 10:34:11.179000064\n\
team,exit,108,2017-09-12 10:34:11.179000064\n\
coach,exit,109,2017-09-12 11:22:20.190000128\n\
coach,personal,110,2017-09-12 16:09:33.972000000\n\
personal,exit,110,2017-09-12 16:09:33.972000000\n\
coach,competition,111,2017-09-13 02:44:02.209999872\n\
competition,coach,111,2017-09-13 02:44:21.516999936\n\
coach,competition,111,2017-09-13 02:44:30.903000064\n\
competition,coach,111,2017-09-13 02:44:37.004000000\n\
coach,routes,111,2017-09-13 02:44:47.652000000\n\
routes,route,111,2017-09-13 02:44:59.438000128\n\
route,routes,111,2017-09-13 02:45:27.364999936\n\
routes,track,111,2017-09-13 02:45:33.452999936\n\
track,competition,111,2017-09-13 02:45:42.984999936\n\
competition,team,111,2017-09-13 02:45:48.651000064\n\
team,personal,111,2017-09-13 02:46:28.172999936\n\
personal,team,111,2017-09-13 02:46:47.936999936\n\
team,exit,111,2017-09-13 02:46:47.936999936\n\
coach,exit,112,2017-09-13 03:27:14.099000064\n\
competition,team,113,2017-09-13 06:40:36.684000000\n\
team,coach,113,2017-09-13 06:41:14.243000064\n\
coach,badges,113,2017-09-13 06:41:39.784000000\n\
badges,routes,113,2017-09-13 06:42:33.816999936\n\
routes,exit,113,2017-09-13 06:42:33.816999936\n\
routes,competition,114,2017-09-13 07:48:08.172000000\n\
competition,team,114,2017-09-13 07:48:15.659000064\n\
team,competition,114,2017-09-13 07:48:36.299000064\n\
competition,team,114,2017-09-13 07:48:53.356000000\n\
team,exit,114,2017-09-13 07:48:53.356000000\n\
coach,exit,115,2017-09-13 10:32:56.480000000\n\
coach,exit,116,2017-09-13 11:39:14.396999936\n\
personal,track,117,2017-09-13 12:15:39.743000064\n\
track,personal,117,2017-09-13 12:15:59.108000000\n\
personal,track,117,2017-09-13 12:16:00.697999872\n\
track,exit,117,2017-09-13 12:16:00.697999872\n\
team,competition,118,2017-09-14 06:47:05.200999936\n\
competition,exit,118,2017-09-14 06:47:05.200999936\n\
competition,team,119,2017-09-14 14:50:00.352999936\n\
team,personal,119,2017-09-14 14:50:27.617999872\n\
personal,bugreport,119,2017-09-14 14:50:36.544000000\n\
bugreport,competition,119,2017-09-14 14:51:18.436000000\n\
competition,team,119,2017-09-14 14:51:25.724000000\n\
team,coach,119,2017-09-14 14:52:50.816999936\n\
coach,team,119,2017-09-14 14:53:15.270000128\n\
team,track,119,2017-09-14 14:53:30.448999936\n\
track,routes,119,2017-09-14 14:53:37.204000000\n\
routes,route,119,2017-09-14 14:53:50.163000064\n\
route,routes,119,2017-09-14 14:54:05.284999936\n\
routes,coach,119,2017-09-14 14:54:59.577999872\n\
coach,personal,119,2017-09-14 14:55:36.043000064\n\
personal,bugreport,119,2017-09-14 14:55:45.113999872\n\
bugreport,coach,119,2017-09-14 15:02:02.492000000\n\
coach,exit,119,2017-09-14 15:02:02.492000000\n\
bugreport,exit,120,2017-09-14 20:35:17.075000064\n\
coach,exit,121,2017-09-14 21:15:47.377999872\n\
bugreport,team,122,2017-09-15 07:10:42.448000000\n\
team,competition,122,2017-09-15 07:11:20.507000064\n\
competition,coach,122,2017-09-15 07:11:58.182000128\n\
coach,exit,122,2017-09-15 07:11:58.182000128\n\
team,competition,123,2017-09-15 17:34:31.433999872\n\
competition,badges,123,2017-09-15 17:35:01.243000064\n\
badges,exit,123,2017-09-15 17:35:01.243000064\n\
track,exit,124,2017-09-16 06:04:41.664999936\n\
coach,exit,125,2017-09-16 07:01:59.440999936\n\
track,route,126,2017-09-16 08:23:30.660999936\n\
route,track,126,2017-09-16 08:23:46.791000064\n\
track,team,126,2017-09-16 08:23:50.633999872\n\
team,exit,126,2017-09-16 08:23:50.633999872\n\
coach,exit,127,2017-09-16 09:01:55.758000128\n\
competition,exit,128,2017-09-16 10:08:38.360000000\n\
competition,coach,129,2017-09-16 11:59:35.272999936\n\
coach,competition,129,2017-09-16 12:00:11.566000128\n\
competition,coach,129,2017-09-16 12:00:20.606000128\n\
coach,team,129,2017-09-16 12:00:27.185999872\n\
team,competition,129,2017-09-16 12:02:16.108999936\n\
competition,routes,129,2017-09-16 12:02:19.648999936\n\
routes,route,129,2017-09-16 12:02:34.897999872\n\
route,routes,129,2017-09-16 12:02:56.113999872\n\
routes,route,129,2017-09-16 12:03:02.363000064\n\
route,routes,129,2017-09-16 12:03:17.436999936\n\
routes,badges,129,2017-09-16 12:03:23.363000064\n\
badges,exit,129,2017-09-16 12:03:23.363000064\n\
coach,competition,130,2017-09-17 06:13:41.328000000\n\
competition,coach,130,2017-09-17 06:14:15.932000000\n\
coach,track,130,2017-09-17 06:14:27.803000064\n\
track,exit,130,2017-09-17 06:14:27.803000064\n\
coach,exit,131,2017-09-17 07:08:31.161999872\n\
track,route,132,2017-09-17 08:22:25.239000064\n\
route,coach,132,2017-09-17 08:22:41.455000064\n\
coach,competition,132,2017-09-17 08:22:53.336000000\n\
competition,team,132,2017-09-17 08:23:13.511000064\n\
team,competition,132,2017-09-17 08:23:53.688000000\n\
competition,coach,132,2017-09-17 08:24:48.743000064\n\
coach,competition,132,2017-09-17 08:25:02.940999936\n\
competition,coach,132,2017-09-17 08:25:07.903000064\n\
coach,exit,132,2017-09-17 08:25:07.903000064\n\
coach,badges,133,2017-09-17 10:02:24.995000064\n\
badges,coach,133,2017-09-17 10:03:44.691000064\n\
coach,exit,133,2017-09-17 10:03:44.691000064\n\
team,coach,134,2017-09-17 11:01:52.167000064\n\
coach,exit,134,2017-09-17 11:01:52.167000064\n\
team,personal,135,2017-09-17 16:30:45.113999872\n\
personal,track,135,2017-09-17 16:31:08.988999936\n\
track,exit,135,2017-09-17 16:31:08.988999936\n\
coach,exit,136,2017-09-17 17:28:33.504999936\n\
competition,track,137,2017-09-18 07:40:18.633999872\n\
track,personal,137,2017-09-18 07:40:31.660000000\n\
personal,track,137,2017-09-18 07:40:41.335000064\n\
track,personal,137,2017-09-18 07:41:17.892000000\n\
personal,bugreport,137,2017-09-18 07:41:19.564999936\n\
bugreport,track,137,2017-09-18 07:41:36.472999936\n\
track,coach,137,2017-09-18 07:42:23.905999872\n\
coach,track,137,2017-09-18 07:42:33.817999872\n\
track,exit,137,2017-09-18 07:42:33.817999872\n\
team,route,138,2017-09-18 11:48:51.838000128\n\
route,routes,138,2017-09-18 11:49:01.968999936\n\
routes,route,138,2017-09-18 11:49:12.464999936\n\
route,routes,138,2017-09-18 11:49:31.452000000\n\
routes,track,138,2017-09-18 11:50:14.192000000\n\
track,route,138,2017-09-18 11:50:36.396999936\n\
route,track,138,2017-09-18 11:50:55.792000000\n\
track,route,138,2017-09-18 11:51:06.580999936\n\
route,personal,138,2017-09-18 11:51:13.057999872\n\
personal,bugreport,138,2017-09-18 11:51:14.179000064\n\
bugreport,track,138,2017-09-18 11:51:35.361999872\n\
track,route,138,2017-09-18 11:51:58.443000064\n\
route,coach,138,2017-09-18 11:52:41.273999872\n\
coach,team,138,2017-09-18 11:53:45.279000064\n\
team,competition,138,2017-09-18 11:54:14.614000128\n\
competition,coach,138,2017-09-18 11:54:26.758000128\n\
coach,exit,138,2017-09-18 11:54:26.758000128\n\
track,route,139,2017-09-18 12:45:22.009999872\n\
route,track,139,2017-09-18 12:45:26.334000128\n\
track,team,139,2017-09-18 12:45:32.455000064\n\
team,competition,139,2017-09-18 12:47:01.756999936\n\
competition,coach,139,2017-09-18 12:47:23.528999936\n\
coach,exit,139,2017-09-18 12:47:23.528999936\n\
coach,team,140,2017-09-18 17:22:46.440999936\n\
team,competition,140,2017-09-18 17:27:29.207000064\n\
competition,team,140,2017-09-18 17:28:18.303000064\n\
team,competition,140,2017-09-18 17:28:30.785999872\n\
competition,team,140,2017-09-18 17:28:34.127000064\n\
team,coach,140,2017-09-18 17:29:57.555000064\n\
coach,badges,140,2017-09-18 17:33:57.164999936\n\
badges,track,140,2017-09-18 17:35:04.628000000\n\
track,exit,140,2017-09-18 17:35:04.628000000\n\
track,routes,141,2017-09-19 07:47:54.299000064\n\
routes,route,141,2017-09-19 07:48:05.275000064\n\
route,routes,141,2017-09-19 07:48:11.155000064\n\
routes,route,141,2017-09-19 07:48:13.752999936\n\
route,routes,141,2017-09-19 07:48:17.796999936\n\
routes,route,141,2017-09-19 07:48:20.520000000\n\
route,routes,141,2017-09-19 07:48:23.902000128\n\
routes,route,141,2017-09-19 07:48:28.318000128\n\
route,routes,141,2017-09-19 07:48:34.427000064\n\
routes,route,141,2017-09-19 07:48:41.612000000\n\
route,routes,141,2017-09-19 07:48:44.496999936\n\
routes,personal,141,2017-09-19 07:48:48.912999936\n\
personal,coach,141,2017-09-19 07:49:26.174000128\n\
coach,team,141,2017-09-19 07:49:59.169999872\n\
team,coach,141,2017-09-19 07:50:15.515000064\n\
coach,personal,141,2017-09-19 07:50:25.028000000\n\
personal,exit,141,2017-09-19 07:50:25.028000000\n\
coach,team,142,2017-09-19 09:25:31.752999936\n\
team,competition,142,2017-09-19 09:25:50.496000000\n\
competition,coach,142,2017-09-19 09:26:22.777999872\n\
coach,personal,142,2017-09-19 09:27:45.478000128\n\
personal,exit,142,2017-09-19 09:27:45.478000128\n\
coach,team,143,2017-09-19 12:32:26.937999872\n\
team,competition,143,2017-09-19 12:33:26.191000064\n\
competition,team,143,2017-09-19 12:33:55.225999872\n\
team,coach,143,2017-09-19 12:34:23.724000000\n\
coach,exit,143,2017-09-19 12:34:23.724000000\n\
coach,competition,144,2017-09-19 13:26:15.983000064\n\
competition,exit,144,2017-09-19 13:26:15.983000064\n\
coach,exit,145,2017-09-19 14:46:16.088000000\n\
coach,track,146,2017-09-19 17:17:59.380999936\n\
track,route,146,2017-09-19 17:30:43.032000000\n\
route,track,146,2017-09-19 17:30:50.854000128\n\
track,coach,146,2017-09-19 17:30:56.092000000\n\
coach,personal,146,2017-09-19 17:31:08.635000064\n\
personal,coach,146,2017-09-19 17:46:10.465999872\n\
coach,competition,146,2017-09-19 17:46:25.606000128\n\
competition,coach,146,2017-09-19 17:46:53.344000000\n\
coach,team,146,2017-09-19 17:47:16.590000128\n\
team,badges,146,2017-09-19 17:47:52.969999872\n\
badges,coach,146,2017-09-19 17:48:40.619000064\n\
coach,exit,146,2017-09-19 17:48:40.619000064\n\
coach,personal,147,2017-09-19 18:03:25.553999872\n\
personal,bugreport,147,2017-09-19 18:03:27.783000064\n\
bugreport,track,147,2017-09-19 18:03:37.692999936\n\
track,personal,147,2017-09-19 18:04:01.128999936\n\
personal,bugreport,147,2017-09-19 18:04:03.553999872\n\
bugreport,track,147,2017-09-19 18:04:12.504000000\n\
track,coach,147,2017-09-19 18:16:25.808999936\n\
coach,competition,147,2017-09-19 18:16:35.487000064\n\
competition,coach,147,2017-09-19 18:16:42.932000000\n\
coach,track,147,2017-09-19 18:16:49.844000000\n\
track,personal,147,2017-09-19 18:16:59.577999872\n\
personal,exit,147,2017-09-19 18:16:59.577999872\n\
coach,competition,148,2017-09-20 08:28:54.803000064\n\
competition,coach,148,2017-09-20 08:29:05.496000000\n\
coach,personal,148,2017-09-20 08:30:57.591000064\n\
personal,exit,148,2017-09-20 08:30:57.591000064\n\
coach,team,149,2017-09-20 13:43:46.727000064\n\
team,competition,149,2017-09-20 13:44:03.480000000\n\
competition,coach,149,2017-09-20 13:44:18.043000064\n\
coach,track,149,2017-09-20 13:44:46.464000000\n\
track,exit,149,2017-09-20 13:44:46.464000000\n\
coach,track,150,2017-09-20 17:55:49.430000128\n\
track,route,150,2017-09-20 17:55:58.352999936\n\
route,coach,150,2017-09-20 17:56:19.400000000\n\
coach,team,150,2017-09-20 17:56:28.276000000\n\
team,competition,150,2017-09-20 17:57:09.102000128\n\
competition,exit,150,2017-09-20 17:57:09.102000128\n\
coach,competition,151,2017-09-20 18:54:25.625999872\n\
competition,badges,151,2017-09-20 18:54:35.342000128\n\
badges,competition,151,2017-09-20 18:55:08.176000000\n\
competition,team,151,2017-09-20 18:55:55.108000000\n\
team,personal,151,2017-09-20 18:56:37.222000128\n\
personal,exit,151,2017-09-20 18:56:37.222000128\n\
coach,team,152,2017-09-21 11:10:33.745999872\n\
team,competition,152,2017-09-21 11:11:14.311000064\n\
competition,team,152,2017-09-21 11:11:56.187000064\n\
team,competition,152,2017-09-21 11:12:26.793999872\n\
competition,badges,152,2017-09-21 11:12:50.448999936\n\
badges,coach,152,2017-09-21 11:13:33.252000000\n\
coach,competition,152,2017-09-21 11:13:39.817999872\n\
competition,personal,152,2017-09-21 11:13:57.680999936\n\
personal,coach,152,2017-09-21 11:42:30.537999872\n\
coach,track,152,2017-09-21 11:42:36.615000064\n\
track,route,152,2017-09-21 11:53:46.142000128\n\
route,track,152,2017-09-21 11:53:59.297999872\n\
track,team,152,2017-09-21 11:54:03.360000000\n\
team,personal,152,2017-09-21 11:54:28.812999936\n\
personal,exit,152,2017-09-21 11:54:28.812999936\n\
coach,track,153,2017-09-22 02:38:19.689999872\n\
track,exit,153,2017-09-22 02:38:19.689999872\n\
route,coach,154,2017-09-22 03:12:24.558000128\n\
coach,competition,154,2017-09-22 03:12:34.729999872\n\
competition,personal,154,2017-09-22 03:12:54.868000000\n\
personal,exit,154,2017-09-22 03:12:54.868000000\n\
coach,team,155,2017-09-22 04:02:15.280000000\n\
team,competition,155,2017-09-22 04:03:50.100999936\n\
competition,personal,155,2017-09-22 04:04:34.400999936\n\
personal,exit,155,2017-09-22 04:04:34.400999936\n\
coach,track,156,2017-09-22 10:25:19.376999936\n\
track,route,156,2017-09-22 10:35:42.135000064\n\
route,coach,156,2017-09-22 10:35:56.924000000\n\
coach,competition,156,2017-09-22 10:36:24.659000064\n\
competition,coach,156,2017-09-22 10:36:35.315000064\n\
coach,competition,156,2017-09-22 10:37:16.980000000\n\
competition,track,156,2017-09-22 10:37:24.606000128\n\
track,route,156,2017-09-22 10:59:54.028999936\n\
route,track,156,2017-09-22 11:00:04.060000000\n\
track,personal,156,2017-09-22 11:00:20.142000128\n\
personal,coach,156,2017-09-22 11:01:02.096999936\n\
coach,track,156,2017-09-22 11:01:14.088000000\n\
track,exit,156,2017-09-22 11:01:14.088000000\n\
coach,exit,157,2017-09-22 11:56:01.267000064\n\
route,track,158,2017-09-22 15:21:46.984000000\n\
track,team,158,2017-09-22 15:21:49.513999872\n\
team,competition,158,2017-09-22 15:22:38.243000064\n\
competition,personal,158,2017-09-22 15:32:01.764999936\n\
personal,exit,158,2017-09-22 15:32:01.764999936\n\
coach,team,159,2017-09-22 20:57:34.137999872\n\
team,competition,159,2017-09-22 20:58:21.616000000\n\
competition,exit,159,2017-09-22 20:58:21.616000000\n\
coach,team,160,2017-09-22 21:53:04.875000064\n\
team,competition,160,2017-09-22 21:54:33.355000064\n\
competition,personal,160,2017-09-22 21:55:03.678000128\n\
personal,exit,160,2017-09-22 21:55:03.678000128\n\
coach,team,161,2017-09-23 05:48:43.692000000\n\
team,personal,161,2017-09-23 05:50:07.465999872\n\
personal,exit,161,2017-09-23 05:50:07.465999872\n\
coach,track,162,2017-09-23 07:17:36.079000064\n\
track,exit,162,2017-09-23 07:17:36.079000064\n\
coach,exit,163,2017-09-23 08:12:06.196999936\n\
track,route,164,2017-09-23 11:37:53.131000064\n\
route,coach,164,2017-09-23 11:38:14.451000064\n\
coach,team,164,2017-09-23 11:38:27.163000064\n\
team,competition,164,2017-09-23 11:39:44.583000064\n\
competition,personal,164,2017-09-23 11:40:55.252000000\n\
personal,exit,164,2017-09-23 11:40:55.252000000\n\
coach,competition,165,2017-09-23 14:21:05.169999872\n\
competition,coach,165,2017-09-23 14:21:27.052999936\n\
coach,competition,165,2017-09-23 14:21:52.216000000\n\
competition,coach,165,2017-09-23 14:22:00.808000000\n\
coach,team,165,2017-09-23 14:22:04.512999936\n\
team,competition,165,2017-09-23 14:25:03.996000000\n\
competition,badges,165,2017-09-23 14:25:31.900999936\n\
badges,routes,165,2017-09-23 14:26:16.659000064\n\
routes,route,165,2017-09-23 14:26:29.396000000\n\
route,routes,165,2017-09-23 14:27:16.216999936\n\
routes,coach,165,2017-09-23 14:27:19.532000000\n\
coach,competition,165,2017-09-23 14:27:23.620000000\n\
competition,personal,165,2017-09-23 14:27:41.192999936\n\
personal,exit,165,2017-09-23 14:27:41.192999936\n\
coach,team,166,2017-09-23 18:52:00.342000128\n\
team,competition,166,2017-09-23 18:52:38.736999936\n\
competition,team,166,2017-09-23 18:53:28.694000128\n\
team,competition,166,2017-09-23 18:56:00.372000000\n\
competition,exit,166,2017-09-23 18:56:00.372000000\n\
coach,team,167,2017-09-23 20:40:32.144000000\n\
team,competition,167,2017-09-23 20:41:03.292999936\n\
competition,personal,167,2017-09-23 20:41:16.391000064\n\
personal,exit,167,2017-09-23 20:41:16.391000064\n\
coach,track,168,2017-09-24 07:04:24.223000064\n\
track,exit,168,2017-09-24 07:04:24.223000064\n\
coach,track,169,2017-09-24 11:51:03.059000064\n\
track,route,169,2017-09-24 11:51:12.311000064\n\
route,coach,169,2017-09-24 11:51:33.887000064\n\
coach,competition,169,2017-09-24 11:51:38.342000128\n\
competition,team,169,2017-09-24 11:52:24.791000064\n\
team,exit,169,2017-09-24 11:52:24.791000064\n\
coach,exit,170,2017-09-24 12:45:45.129999872\n\
team,competition,171,2017-09-24 16:26:46.100000000\n\
competition,exit,171,2017-09-24 16:26:46.100000000\n\
competition,team,172,2017-09-24 17:45:38.195000064\n\
team,competition,172,2017-09-24 17:46:01.472999936\n\
competition,badges,172,2017-09-24 18:05:18.440999936\n\
badges,personal,172,2017-09-24 18:23:51.995000064\n\
personal,exit,172,2017-09-24 18:23:51.995000064\n\
coach,track,173,2017-09-02 14:19:29.635000064\n\
track,coach,173,2017-09-02 14:19:43.276999936\n\
coach,team,173,2017-09-02 14:20:41.232999936\n\
team,competition,173,2017-09-02 14:20:57.803000064\n\
competition,routes,173,2017-09-02 14:21:03.611000064\n\
routes,badges,173,2017-09-02 14:21:12.296000000\n\
badges,coach,173,2017-09-02 14:21:17.236999936\n\
coach,exit,173,2017-09-02 14:21:17.236999936\n\
coach,routes,174,2017-09-02 14:32:39.491000064\n\
routes,competition,174,2017-09-02 14:32:41.928000000\n\
competition,exit,174,2017-09-02 14:32:41.928000000\n\
coach,exit,175,2017-09-03 05:08:38.532000000\n\
competition,track,176,2017-09-03 06:06:07.020999936\n\
track,exit,176,2017-09-03 06:06:07.020999936\n\
route,coach,177,2017-09-03 10:56:10.155000064\n\
coach,routes,177,2017-09-03 10:56:15.303000064\n\
routes,team,177,2017-09-03 10:56:18.403000064\n\
team,exit,177,2017-09-03 10:56:18.403000064\n\
coach,badges,178,2017-09-03 12:44:49.644999936\n\
badges,personal,178,2017-09-03 12:45:21.873999872\n\
personal,exit,178,2017-09-03 12:45:21.873999872\n\
coach,team,179,2017-09-08 12:26:25.223000064\n\
team,track,179,2017-09-08 12:26:51.652000000\n\
track,team,179,2017-09-08 12:26:55.679000064\n\
team,competition,179,2017-09-08 12:26:57.595000064\n\
competition,routes,179,2017-09-08 12:27:02.715000064\n\
routes,badges,179,2017-09-08 12:27:10.254000128\n\
badges,team,179,2017-09-08 12:27:24.628000000\n\
team,routes,179,2017-09-08 12:27:34.128000000\n\
routes,route,179,2017-09-08 12:27:36.657999872\n\
route,exit,179,2017-09-08 12:27:36.657999872\n\
coach,personal,180,2017-09-12 16:31:35.451000064\n\
personal,coach,180,2017-09-12 16:31:47.376999936\n\
coach,exit,180,2017-09-12 16:31:47.376999936\n\
coach,team,181,2017-09-12 20:00:53.473999872\n\
team,competition,181,2017-09-12 20:01:30.243000064\n\
competition,exit,181,2017-09-12 20:01:30.243000064\n\
coach,exit,182,2017-09-18 11:44:23.212999936\n\
coach,exit,183,2017-09-19 14:49:58.847000064\n\
coach,personal,184,2017-09-19 14:50:05.889999872\n\
personal,track,184,2017-09-19 14:50:09.999000064\n\
track,exit,184,2017-09-19 14:50:09.999000064\n\
personal,bugreport,185,2017-09-19 16:01:30.604999936\n\
bugreport,team,185,2017-09-19 16:02:29.007000064\n\
team,track,185,2017-09-19 16:02:52.822000128\n\
track,exit,185,2017-09-19 16:02:52.822000128\n\
coach,personal,186,2017-09-20 14:40:55.660999936\n\
personal,coach,186,2017-09-20 14:41:09.054000128\n\
coach,track,186,2017-09-20 14:41:14.958000128\n\
track,route,186,2017-09-20 14:41:23.435000064\n\
route,track,186,2017-09-20 14:50:22.206000128\n\
track,exit,186,2017-09-20 14:50:22.206000128\n\
route,coach,187,2017-09-20 16:24:53.256999936\n\
coach,exit,187,2017-09-20 16:24:53.256999936\n\
coach,competition,188,2017-09-20 17:23:28.507000064\n\
competition,coach,188,2017-09-20 17:23:44.864000000\n\
coach,team,188,2017-09-20 17:35:10.465999872\n\
team,exit,188,2017-09-20 17:35:10.465999872\n\
coach,track,189,2017-09-22 10:39:43.265999872\n\
track,exit,189,2017-09-22 10:39:43.265999872\n\
coach,exit,190,2017-09-22 11:34:33.064999936\n\
coach,track,191,2017-09-22 13:21:43.390000128\n\
track,route,191,2017-09-22 13:21:50.159000064\n\
route,coach,191,2017-09-22 13:22:05.063000064\n\
coach,competition,191,2017-09-22 13:22:22.160000000\n\
competition,exit,191,2017-09-22 13:22:22.160000000\n\
coach,track,192,2017-09-23 06:16:17.952999936\n\
track,exit,192,2017-09-23 06:16:17.952999936\n\
coach,competition,193,2017-09-23 11:47:26.644999936\n\
competition,coach,193,2017-09-23 11:47:34.432999936\n\
coach,track,193,2017-09-23 11:47:38.475000064\n\
track,competition,193,2017-09-23 11:47:51.248999936\n\
competition,team,193,2017-09-23 11:47:53.816999936\n\
team,coach,193,2017-09-23 11:48:15.212999936\n\
coach,personal,193,2017-09-23 11:49:46.084999936\n\
personal,coach,193,2017-09-23 11:49:47.390000128\n\
coach,track,193,2017-09-23 11:49:57.628000000\n\
track,exit,193,2017-09-23 11:49:57.628000000\n\
coach,personal,194,2017-09-01 15:34:32.431000064\n\
personal,coach,194,2017-09-01 15:35:12.622000128\n\
coach,team,194,2017-09-01 15:35:17.691000064\n\
team,competition,194,2017-09-01 15:35:30.924000000\n\
competition,coach,194,2017-09-01 15:35:38.641999872\n\
coach,exit,194,2017-09-01 15:35:38.641999872\n\
coach,personal,195,2017-09-01 15:48:32.662000128\n\
personal,coach,195,2017-09-01 15:48:39.521999872\n\
coach,competition,195,2017-09-01 15:48:48.633999872\n\
competition,team,195,2017-09-01 15:48:57.456000000\n\
team,routes,195,2017-09-01 15:49:08.832000000\n\
routes,exit,195,2017-09-01 15:49:08.832000000\n\
coach,team,196,2017-09-01 19:39:06.777999872\n\
team,competition,196,2017-09-01 19:39:25.759000064\n\
competition,badges,196,2017-09-01 19:39:33.544000000\n\
badges,coach,196,2017-09-01 19:39:43.996999936\n\
coach,exit,196,2017-09-01 19:39:43.996999936\n\
coach,team,197,2017-09-02 10:02:29.811000064\n\
team,competition,197,2017-09-02 10:02:49.235000064\n\
competition,routes,197,2017-09-02 10:03:16.199000064\n\
routes,personal,197,2017-09-02 10:03:21.027000064\n\
personal,routes,197,2017-09-02 10:03:23.888999936\n\
routes,badges,197,2017-09-02 10:03:34.504000000\n\
badges,exit,197,2017-09-02 10:03:34.504000000\n\
coach,team,198,2017-09-02 16:26:41.886000128\n\
team,competition,198,2017-09-02 16:26:53.944000000\n\
competition,team,198,2017-09-02 16:27:05.601999872\n\
team,track,198,2017-09-02 16:27:14.324000000\n\
track,coach,198,2017-09-02 16:27:22.744000000\n\
coach,exit,198,2017-09-02 16:27:22.744000000\n\
coach,track,199,2017-09-03 06:29:37.667000064\n\
track,exit,199,2017-09-03 06:29:37.667000064\n\
coach,exit,200,2017-09-03 07:24:31.958000128\n\
track,exit,201,2017-09-03 08:02:25.091000064\n\
track,team,202,2017-09-03 09:05:04.865999872\n\
team,track,202,2017-09-03 09:05:26.383000064\n\
track,coach,202,2017-09-03 09:24:33.939000064\n\
coach,track,202,2017-09-03 09:25:45.847000064\n\
track,route,202,2017-09-03 09:25:48.843000064\n\
route,track,202,2017-09-03 09:26:04.276999936\n\
track,coach,202,2017-09-03 09:26:05.784000000\n\
coach,competition,202,2017-09-03 09:26:14.455000064\n\
competition,team,202,2017-09-03 09:26:24.568999936\n\
team,competition,202,2017-09-03 09:26:38.244999936\n\
competition,exit,202,2017-09-03 09:26:38.244999936\n\
coach,competition,203,2017-09-03 10:52:01.617999872\n\
competition,coach,203,2017-09-03 10:52:07.064000000\n\
coach,team,203,2017-09-03 10:52:10.137999872\n\
team,exit,203,2017-09-03 10:52:10.137999872\n\
coach,competition,204,2017-09-03 15:00:22.291000064\n\
competition,coach,204,2017-09-03 15:00:31.715000064\n\
coach,competition,204,2017-09-03 15:00:33.904999936\n\
competition,coach,204,2017-09-03 15:00:37.620999936\n\
coach,team,204,2017-09-03 15:00:42.055000064\n\
team,competition,204,2017-09-03 15:01:00.312999936\n\
competition,badges,204,2017-09-03 15:01:08.475000064\n\
badges,routes,204,2017-09-03 15:01:37.880999936\n\
routes,route,204,2017-09-03 15:01:40.015000064\n\
route,personal,204,2017-09-03 15:01:57.751000064\n\
personal,routes,204,2017-09-03 15:02:02.864999936\n\
routes,route,204,2017-09-03 15:02:07.704999936\n\
route,exit,204,2017-09-03 15:02:07.704999936\n\
coach,team,205,2017-09-03 18:34:59.360999936\n\
team,competition,205,2017-09-03 18:35:09.551000064\n\
competition,badges,205,2017-09-03 18:35:13.788999936\n\
badges,exit,205,2017-09-03 18:35:13.788999936\n\
coach,track,206,2017-09-04 02:22:17.024000000\n\
track,exit,206,2017-09-04 02:22:17.024000000\n\
route,track,207,2017-09-04 03:07:09.208999936\n\
track,routes,207,2017-09-04 03:07:14.361999872\n\
routes,coach,207,2017-09-04 03:17:11.224000000\n\
coach,team,207,2017-09-04 03:34:12.180999936\n\
team,competition,207,2017-09-04 03:34:24.892999936\n\
competition,routes,207,2017-09-04 03:34:32.289999872\n\
routes,route,207,2017-09-04 03:34:36.793999872\n\
route,exit,207,2017-09-04 03:34:36.793999872\n\
competition,route,208,2017-09-04 05:10:12.840000000\n\
route,routes,208,2017-09-04 05:10:17.008999936\n\
routes,exit,208,2017-09-04 05:10:17.008999936\n\
coach,track,209,2017-09-04 15:07:33.912999936\n\
track,exit,209,2017-09-04 15:07:33.912999936\n\
route,track,210,2017-09-04 15:48:15.128999936\n\
track,competition,210,2017-09-04 15:48:30.131000064\n\
competition,team,210,2017-09-04 15:48:34.296000000\n\
team,competition,210,2017-09-04 15:48:43.416999936\n\
competition,exit,210,2017-09-04 15:48:43.416999936\n\
competition,track,211,2017-09-04 16:24:01.140000000\n\
track,exit,211,2017-09-04 16:24:01.140000000\n\
coach,track,212,2017-09-05 02:14:32.404000000\n\
track,exit,212,2017-09-05 02:14:32.404000000\n\
route,track,213,2017-09-05 02:52:40.073999872\n\
track,exit,213,2017-09-05 02:52:40.073999872\n\
competition,track,214,2017-09-05 03:29:40.540999936\n\
track,team,214,2017-09-05 03:29:50.759000064\n\
team,exit,214,2017-09-05 03:29:50.759000064\n\
coach,exit,215,2017-09-05 04:14:26.636999936\n\
coach,competition,216,2017-09-05 05:42:51.977999872\n\
competition,coach,216,2017-09-05 05:42:57.360000000\n\
coach,competition,216,2017-09-05 05:43:10.227000064\n\
competition,coach,216,2017-09-05 05:43:12.216999936\n\
coach,team,216,2017-09-05 05:43:15.793999872\n\
team,competition,216,2017-09-05 05:43:41.638000128\n\
competition,personal,216,2017-09-05 05:43:48.697999872\n\
personal,competition,216,2017-09-05 05:44:13.412999936\n\
competition,routes,216,2017-09-05 05:44:30.268999936\n\
routes,route,216,2017-09-05 05:44:34.718000128\n\
route,routes,216,2017-09-05 05:45:23.880999936\n\
routes,route,216,2017-09-05 05:45:27.345999872\n\
route,routes,216,2017-09-05 05:46:15.116000000\n\
routes,route,216,2017-09-05 05:46:18.169999872\n\
route,routes,216,2017-09-05 05:46:25.008000000\n\
routes,route,216,2017-09-05 05:46:28.172999936\n\
route,routes,216,2017-09-05 05:46:43.700000000\n\
routes,route,216,2017-09-05 05:46:47.436000000\n\
route,routes,216,2017-09-05 05:46:57.892000000\n\
routes,coach,216,2017-09-05 05:47:02.940000000\n\
coach,exit,216,2017-09-05 05:47:02.940000000\n\
coach,team,217,2017-09-06 09:19:20.640999936\n\
team,personal,217,2017-09-06 09:19:54.983000064\n\
personal,team,217,2017-09-06 09:20:09.131000064\n\
team,exit,217,2017-09-06 09:20:09.131000064\n\
coach,track,218,2017-09-06 15:38:45.534000128\n\
track,route,218,2017-09-06 15:59:30.771000064\n\
route,coach,218,2017-09-06 15:59:42.244999936\n\
coach,competition,218,2017-09-06 15:59:45.107000064\n\
competition,team,218,2017-09-06 15:59:51.049999872\n\
team,routes,218,2017-09-06 16:00:03.006000128\n\
routes,route,218,2017-09-06 16:00:04.875000064\n\
route,routes,218,2017-09-06 16:02:15.727000064\n\
routes,route,218,2017-09-06 16:02:18.950000128\n\
route,exit,218,2017-09-06 16:02:18.950000128\n\
coach,exit,219,2017-09-06 16:40:17.164999936\n\
coach,track,220,2017-09-07 02:14:24.979000064\n\
track,exit,220,2017-09-07 02:14:24.979000064\n\
route,exit,221,2017-09-07 02:54:26.288000000\n\
competition,route,222,2017-09-07 04:37:43.336999936\n\
route,track,222,2017-09-07 04:37:47.531000064\n\
track,team,222,2017-09-07 04:37:50.396000000\n\
team,competition,222,2017-09-07 04:38:08.782000128\n\
competition,badges,222,2017-09-07 04:38:14.342000128\n\
badges,exit,222,2017-09-07 04:38:14.342000128\n\
coach,track,223,2017-09-07 14:49:03.111000064\n\
track,exit,223,2017-09-07 14:49:03.111000064\n\
coach,competition,224,2017-09-07 15:58:13.257999872\n\
competition,track,224,2017-09-07 15:58:18.243000064\n\
track,route,224,2017-09-07 15:58:24.519000064\n\
route,track,224,2017-09-07 15:58:30.908999936\n\
track,routes,224,2017-09-07 15:58:36.331000064\n\
routes,route,224,2017-09-07 15:58:41.168999936\n\
route,routes,224,2017-09-07 15:58:56.054000128\n\
routes,exit,224,2017-09-07 15:58:56.054000128\n\
coach,team,225,2017-09-07 19:16:16.640000000\n\
team,competition,225,2017-09-07 19:16:44.120000000\n\
competition,badges,225,2017-09-07 19:16:49.632000000\n\
badges,routes,225,2017-09-07 19:19:40.311000064\n\
routes,route,225,2017-09-07 19:19:44.721999872\n\
route,exit,225,2017-09-07 19:19:44.721999872\n\
coach,team,226,2017-09-09 11:28:21.654000128\n\
team,competition,226,2017-09-09 11:28:38.055000064\n\
competition,exit,226,2017-09-09 11:28:38.055000064\n\
coach,team,227,2017-09-09 18:16:51.535000064\n\
team,exit,227,2017-09-09 18:16:51.535000064\n\
coach,track,228,2017-09-10 06:01:13.760000000\n\
track,exit,228,2017-09-10 06:01:13.760000000\n\
track,competition,229,2017-09-10 09:03:22.139000064\n\
competition,team,229,2017-09-10 09:03:32.718000128\n\
team,exit,229,2017-09-10 09:03:32.718000128\n\
track,route,230,2017-09-10 09:54:37.705999872\n\
route,track,230,2017-09-10 09:54:50.315000064\n\
track,coach,230,2017-09-10 09:54:52.614000128\n\
coach,team,230,2017-09-10 09:54:55.073999872\n\
team,coach,230,2017-09-10 10:08:00.448999936\n\
coach,competition,230,2017-09-10 10:08:16.383000064\n\
competition,coach,230,2017-09-10 10:08:27.488999936\n\
coach,badges,230,2017-09-10 10:08:31.608000000\n\
badges,exit,230,2017-09-10 10:08:31.608000000\n\
coach,team,231,2017-09-11 03:06:23.444000000\n\
team,competition,231,2017-09-11 03:06:35.823000064\n\
competition,exit,231,2017-09-11 03:06:35.823000064\n\
coach,team,232,2017-09-11 16:51:23.369999872\n\
team,exit,232,2017-09-11 16:51:23.369999872\n\
coach,competition,233,2017-09-11 18:27:14.940999936\n\
competition,exit,233,2017-09-11 18:27:14.940999936\n\
coach,track,234,2017-09-12 15:09:46.225999872\n\
track,exit,234,2017-09-12 15:09:46.225999872\n\
route,coach,235,2017-09-12 15:56:23.983000064\n\
coach,competition,235,2017-09-12 16:04:14.876999936\n\
competition,team,235,2017-09-12 16:04:22.771000064\n\
team,exit,235,2017-09-12 16:04:22.771000064\n\
coach,track,236,2017-09-13 02:15:28.708000000\n\
track,route,236,2017-09-13 02:15:53.091000064\n\
route,track,236,2017-09-13 02:18:26.740000000\n\
track,exit,236,2017-09-13 02:18:26.740000000\n\
coach,track,237,2017-09-13 03:00:15.104000000\n\
track,route,237,2017-09-13 03:00:17.779000064\n\
route,competition,237,2017-09-13 03:18:16.604000000\n\
competition,route,237,2017-09-13 03:18:23.736000000\n\
route,track,237,2017-09-13 03:18:29.028000000\n\
track,routes,237,2017-09-13 03:18:32.744000000\n\
routes,route,237,2017-09-13 03:18:36.545999872\n\
route,routes,237,2017-09-13 03:18:39.952999936\n\
routes,route,237,2017-09-13 03:18:41.545999872\n\
route,routes,237,2017-09-13 03:18:47.587000064\n\
routes,route,237,2017-09-13 03:18:49.168000000\n\
route,routes,237,2017-09-13 03:19:01.334000128\n\
routes,exit,237,2017-09-13 03:19:01.334000128\n\
coach,exit,238,2017-09-13 04:18:07.360999936\n\
coach,team,239,2017-09-13 10:30:24.739000064\n\
team,competition,239,2017-09-13 10:30:39.409999872\n\
competition,exit,239,2017-09-13 10:30:39.409999872\n\
coach,team,240,2017-09-15 19:19:05.792000000\n\
team,competition,240,2017-09-15 19:19:17.948999936\n\
competition,team,240,2017-09-15 19:19:25.548999936\n\
team,badges,240,2017-09-15 19:19:53.707000064\n\
badges,exit,240,2017-09-15 19:19:53.707000064\n\
coach,team,241,2017-09-16 15:07:25.616000000\n\
team,competition,241,2017-09-16 15:07:39.156000000\n\
competition,exit,241,2017-09-16 15:07:39.156000000\n\
coach,track,242,2017-09-17 06:10:37.355000064\n\
track,exit,242,2017-09-17 06:10:37.355000064\n\
coach,track,243,2017-09-17 10:51:54.379000064\n\
track,route,243,2017-09-17 10:52:02.567000064\n\
route,track,243,2017-09-17 10:52:17.553999872\n\
track,coach,243,2017-09-17 10:52:20.497999872\n\
coach,team,243,2017-09-17 10:52:21.575000064\n\
team,competition,243,2017-09-17 10:52:38.584000000\n\
competition,team,243,2017-09-17 11:00:21.923000064\n\
team,competition,243,2017-09-17 11:00:41.511000064\n\
competition,exit,243,2017-09-17 11:00:41.511000064\n\
coach,competition,244,2017-09-17 12:18:49.710000128\n\
competition,coach,244,2017-09-17 12:18:54.504000000\n\
coach,exit,244,2017-09-17 12:18:54.504000000\n\
coach,competition,245,2017-09-18 05:42:05.820999936\n\
competition,team,245,2017-09-18 05:42:11.425999872\n\
team,exit,245,2017-09-18 05:42:11.425999872\n\
coach,competition,246,2017-09-20 02:46:16.337999872\n\
competition,exit,246,2017-09-20 02:46:16.337999872\n\
coach,track,247,2017-09-20 14:59:59.425999872\n\
track,exit,247,2017-09-20 14:59:59.425999872\n\
route,coach,248,2017-09-20 16:14:25.017999872\n\
coach,competition,248,2017-09-20 16:14:33.934000128\n\
competition,team,248,2017-09-20 16:14:43.468999936\n\
team,routes,248,2017-09-20 16:15:09.020000000\n\
routes,route,248,2017-09-20 16:15:11.214000128\n\
route,routes,248,2017-09-20 16:15:19.092000000\n\
routes,exit,248,2017-09-20 16:15:19.092000000\n\
coach,competition,249,2017-09-20 19:55:21.972000000\n\
competition,coach,249,2017-09-20 19:55:31.356999936\n\
coach,team,249,2017-09-20 19:55:37.539000064\n\
team,routes,249,2017-09-20 19:56:04.899000064\n\
routes,route,249,2017-09-20 19:56:07.070000128\n\
route,exit,249,2017-09-20 19:56:07.070000128\n\
coach,track,250,2017-09-21 02:15:09.839000064\n\
track,exit,250,2017-09-21 02:15:09.839000064\n\
route,track,251,2017-09-21 03:05:12.326000128\n\
track,routes,251,2017-09-21 03:05:16.983000064\n\
routes,team,251,2017-09-21 03:05:22.060999936\n\
team,competition,251,2017-09-21 03:05:33.403000064\n\
competition,exit,251,2017-09-21 03:05:33.403000064\n\
coach,track,252,2017-09-21 15:18:31.622000128\n\
track,exit,252,2017-09-21 15:18:31.622000128\n\
route,coach,253,2017-09-21 16:01:36.097999872\n\
coach,team,253,2017-09-21 16:01:59.718000128\n\
team,competition,253,2017-09-21 16:02:12.775000064\n\
competition,routes,253,2017-09-21 16:02:27.340999936\n\
routes,route,253,2017-09-21 16:02:29.244999936\n\
route,routes,253,2017-09-21 16:02:31.044999936\n\
routes,route,253,2017-09-21 16:02:33.176999936\n\
route,exit,253,2017-09-21 16:02:33.176999936\n\
coach,track,254,2017-09-22 02:14:04.745999872\n\
track,exit,254,2017-09-22 02:14:04.745999872\n\
route,track,255,2017-09-22 02:53:45.120000000\n\
track,coach,255,2017-09-22 03:10:32.678000128\n\
coach,competition,255,2017-09-22 03:10:42.692000000\n\
competition,track,255,2017-09-22 03:10:47.496999936\n\
track,routes,255,2017-09-22 03:10:50.625999872\n\
routes,route,255,2017-09-22 03:10:52.252000000\n\
route,routes,255,2017-09-22 03:11:04.494000128\n\
routes,route,255,2017-09-22 03:11:06.385999872\n\
route,routes,255,2017-09-22 03:11:21.284999936\n\
routes,route,255,2017-09-22 03:11:23.699000064\n\
route,routes,255,2017-09-22 03:11:31.288000000\n\
routes,exit,255,2017-09-22 03:11:31.288000000\n\
coach,personal,256,2017-09-22 07:21:16.857999872\n\
personal,coach,256,2017-09-22 07:21:22.248000000\n\
coach,exit,256,2017-09-22 07:21:22.248000000\n\
coach,competition,257,2017-09-22 11:14:02.776000000\n\
competition,exit,257,2017-09-22 11:14:02.776000000\n\
coach,competition,258,2017-09-23 12:47:42.492999936\n\
competition,team,258,2017-09-23 12:47:48.776000000\n\
team,exit,258,2017-09-23 12:47:48.776000000\n\
coach,competition,259,2017-09-24 18:48:36.683000064\n\
competition,exit,259,2017-09-24 18:48:36.683000064\n\
coach,personal,260,2017-09-01 15:40:46.156999936\n\
personal,team,260,2017-09-01 15:41:23.550000128\n\
team,coach,260,2017-09-01 15:41:33.820000000\n\
coach,routes,260,2017-09-01 15:41:39.012999936\n\
routes,coach,260,2017-09-01 15:41:47.014000128\n\
coach,track,260,2017-09-01 15:41:53.968000000\n\
track,personal,260,2017-09-01 15:42:07.308999936\n\
personal,bugreport,260,2017-09-01 15:42:11.792000000\n\
bugreport,competition,260,2017-09-01 15:42:23.116000000\n\
competition,badges,260,2017-09-01 15:42:34.062000128\n\
badges,coach,260,2017-09-01 15:43:11.511000064\n\
coach,exit,260,2017-09-01 15:43:11.511000064\n\
coach,personal,261,2017-09-01 18:12:32.584000000\n\
personal,coach,261,2017-09-01 18:12:50.296000000\n\
coach,team,261,2017-09-01 18:12:54.883000064\n\
team,competition,261,2017-09-01 18:13:19.056999936\n\
competition,coach,261,2017-09-01 18:13:34.126000128\n\
coach,routes,261,2017-09-01 18:14:09.513999872\n\
routes,personal,261,2017-09-01 18:14:14.468000000\n\
personal,routes,261,2017-09-01 18:14:16.694000128\n\
routes,personal,261,2017-09-01 18:14:18.039000064\n\
personal,routes,261,2017-09-01 18:14:20.667000064\n\
routes,exit,261,2017-09-01 18:14:20.667000064\n\
coach,track,262,2017-09-02 07:22:12.427000064\n\
track,exit,262,2017-09-02 07:22:12.427000064\n\
route,track,263,2017-09-02 08:47:20.551000064\n\
track,route,263,2017-09-02 08:47:25.068000000\n\
route,track,263,2017-09-02 08:47:27.935000064\n\
track,routes,263,2017-09-02 08:47:32.792000000\n\
routes,route,263,2017-09-02 08:47:35.702000128\n\
route,routes,263,2017-09-02 08:47:39.955000064\n\
routes,coach,263,2017-09-02 08:47:42.963000064\n\
coach,exit,263,2017-09-02 08:47:42.963000064\n\
coach,competition,264,2017-09-02 08:54:23.644000000\n\
competition,personal,264,2017-09-02 08:54:37.457999872\n\
personal,coach,264,2017-09-02 08:54:43.559000064\n\
coach,exit,264,2017-09-02 08:54:43.559000064\n\
coach,team,265,2017-09-02 09:01:56.232999936\n\
team,competition,265,2017-09-02 09:02:16.636000000\n\
competition,routes,265,2017-09-02 09:02:21.096000000\n\
routes,route,265,2017-09-02 09:02:25.171000064\n\
route,personal,265,2017-09-02 09:02:39.880000000\n\
personal,routes,265,2017-09-02 09:02:43.742000128\n\
routes,route,265,2017-09-02 09:02:46.668000000\n\
route,routes,265,2017-09-02 09:02:51.347000064\n\
routes,route,265,2017-09-02 09:02:56.020000000\n\
route,routes,265,2017-09-02 09:02:58.526000128\n\
routes,route,265,2017-09-02 09:03:04.620000000\n\
route,personal,265,2017-09-02 09:03:09.175000064\n\
personal,routes,265,2017-09-02 09:03:13.848999936\n\
routes,badges,265,2017-09-02 09:03:22.382000128\n\
badges,coach,265,2017-09-02 09:03:50.591000064\n\
coach,competition,265,2017-09-02 09:04:20.267000064\n\
competition,coach,265,2017-09-02 09:04:24.304000000\n\
coach,personal,265,2017-09-02 09:04:37.068000000\n\
personal,coach,265,2017-09-02 09:04:41.715000064\n\
coach,personal,265,2017-09-02 09:04:45.470000128\n\
personal,coach,265,2017-09-02 09:04:47.521999872\n\
coach,routes,265,2017-09-02 09:04:51.652000000\n\
routes,route,265,2017-09-02 09:04:56.611000064\n\
route,personal,265,2017-09-02 09:05:05.352000000\n\
personal,routes,265,2017-09-02 09:05:07.452999936\n\
routes,route,265,2017-09-02 09:05:15.216000000\n\
route,routes,265,2017-09-02 09:05:47.046000128\n\
routes,route,265,2017-09-02 09:05:55.460000000\n\
route,exit,265,2017-09-02 09:05:55.460000000\n\
coach,team,266,2017-09-02 17:19:31.747000064\n\
team,routes,266,2017-09-02 17:20:09.367000064\n\
routes,route,266,2017-09-02 17:20:11.844000000\n\
route,personal,266,2017-09-02 17:20:23.359000064\n\
personal,routes,266,2017-09-02 17:20:27.259000064\n\
routes,route,266,2017-09-02 17:20:29.035000064\n\
route,routes,266,2017-09-02 17:20:40.584999936\n\
routes,competition,266,2017-09-02 17:20:59.329999872\n\
competition,exit,266,2017-09-02 17:20:59.329999872\n\
coach,competition,267,2017-09-03 18:29:41.376999936\n\
competition,coach,267,2017-09-03 18:29:55.840000000\n\
coach,team,267,2017-09-03 18:30:03.873999872\n\
team,competition,267,2017-09-03 18:30:46.268000000\n\
competition,routes,267,2017-09-03 18:31:07.584000000\n\
routes,exit,267,2017-09-03 18:31:07.584000000\n\
coach,competition,268,2017-09-05 04:56:06.836000000\n\
competition,coach,268,2017-09-05 04:56:21.256000000\n\
coach,team,268,2017-09-05 04:56:49.241999872\n\
team,exit,268,2017-09-05 04:56:49.241999872\n\
coach,team,269,2017-09-07 15:42:22.112999936\n\
team,competition,269,2017-09-07 15:42:47.006000128\n\
competition,track,269,2017-09-07 15:43:03.075000064\n\
track,exit,269,2017-09-07 15:43:03.075000064\n\
coach,track,270,2017-09-09 07:06:33.676000000\n\
track,team,270,2017-09-09 07:06:41.067000064\n\
team,competition,270,2017-09-09 07:07:03.166000128\n\
competition,team,270,2017-09-09 07:09:40.971000064\n\
team,personal,270,2017-09-09 07:10:11.366000128\n\
personal,team,270,2017-09-09 07:10:16.686000128\n\
team,badges,270,2017-09-09 07:10:21.668999936\n\
badges,exit,270,2017-09-09 07:10:21.668999936\n\
coach,competition,271,2017-09-11 04:59:09.451000064\n\
competition,coach,271,2017-09-11 04:59:31.880999936\n\
coach,exit,271,2017-09-11 04:59:31.880999936\n\
coach,routes,272,2017-09-11 05:31:34.297999872\n\
routes,track,272,2017-09-11 05:31:40.641999872\n\
track,route,272,2017-09-11 05:52:38.224000000\n\
route,track,272,2017-09-11 05:52:45.062000128\n\
track,exit,272,2017-09-11 05:52:45.062000128\n\
coach,track,273,2017-09-11 15:02:07.160000000\n\
track,route,273,2017-09-11 15:17:33.689999872\n\
route,coach,273,2017-09-11 15:22:24.647000064\n\
coach,badges,273,2017-09-11 15:22:51.273999872\n\
badges,team,273,2017-09-11 15:23:13.695000064\n\
team,competition,273,2017-09-11 15:23:35.940999936\n\
competition,routes,273,2017-09-11 15:23:46.182000128\n\
routes,coach,273,2017-09-11 15:23:54.811000064\n\
coach,exit,273,2017-09-11 15:23:54.811000064\n\
coach,exit,274,2017-09-11 17:26:06.347000064\n\
coach,personal,275,2017-09-13 04:55:07.638000128\n\
personal,coach,275,2017-09-13 04:55:11.265999872\n\
coach,team,275,2017-09-13 04:55:20.019000064\n\
team,competition,275,2017-09-13 04:55:53.051000064\n\
competition,routes,275,2017-09-13 04:56:03.400999936\n\
routes,route,275,2017-09-13 04:56:05.800999936\n\
route,routes,275,2017-09-13 04:56:36.820999936\n\
routes,exit,275,2017-09-13 04:56:36.820999936\n\
coach,track,276,2017-09-13 05:32:35.177999872\n\
track,coach,276,2017-09-13 05:49:54.692999936\n\
coach,track,276,2017-09-13 05:52:30.948999936\n\
track,route,276,2017-09-13 05:52:33.900999936\n\
route,track,276,2017-09-13 05:52:44.679000064\n\
track,routes,276,2017-09-13 05:52:49.604999936\n\
routes,route,276,2017-09-13 05:52:52.353999872\n\
route,exit,276,2017-09-13 05:52:52.353999872\n\
coach,track,277,2017-09-13 14:53:54.897999872\n\
track,route,277,2017-09-13 15:08:23.360999936\n\
route,track,277,2017-09-13 15:08:35.275000064\n\
track,routes,277,2017-09-13 15:08:39.374000128\n\
routes,coach,277,2017-09-13 15:08:43.342000128\n\
coach,badges,277,2017-09-13 15:11:44.412999936\n\
badges,team,277,2017-09-13 15:12:14.524999936\n\
team,exit,277,2017-09-13 15:12:14.524999936\n\
coach,exit,278,2017-09-13 19:33:45.745999872\n\
coach,exit,279,2017-09-13 19:39:19.169999872\n\
coach,track,280,2017-09-14 05:30:44.548000000\n\
track,route,280,2017-09-14 05:49:18.948999936\n\
route,track,280,2017-09-14 05:49:39.376999936\n\
track,team,280,2017-09-14 05:49:42.892000000\n\
team,exit,280,2017-09-14 05:49:42.892000000\n\
coach,track,281,2017-09-14 14:50:58.260999936\n\
track,route,281,2017-09-14 15:07:04.423000064\n\
route,coach,281,2017-09-14 15:14:13.993999872\n\
coach,competition,281,2017-09-14 15:14:26.398000128\n\
competition,coach,281,2017-09-14 15:14:38.945999872\n\
coach,exit,281,2017-09-14 15:14:38.945999872\n\
coach,team,282,2017-09-14 15:32:06.566000128\n\
team,routes,282,2017-09-14 15:32:29.862000128\n\
routes,badges,282,2017-09-14 15:32:34.527000064\n\
badges,exit,282,2017-09-14 15:32:34.527000064\n\
coach,team,283,2017-09-15 11:35:07.368000000\n\
team,competition,283,2017-09-15 11:35:07.943000064\n\
competition,coach,283,2017-09-15 11:41:09.937999872\n\
coach,exit,283,2017-09-15 11:41:09.937999872\n\
coach,route,284,2017-09-15 13:28:55.598000128\n\
route,track,284,2017-09-15 13:29:02.676999936\n\
track,routes,284,2017-09-15 13:29:08.764999936\n\
routes,route,284,2017-09-15 13:29:12.492000000\n\
route,routes,284,2017-09-15 13:29:19.944999936\n\
routes,badges,284,2017-09-15 13:29:29.076000000\n\
badges,team,284,2017-09-15 13:29:44.620000000\n\
team,competition,284,2017-09-15 13:30:26.080999936\n\
competition,exit,284,2017-09-15 13:30:26.080999936\n\
coach,competition,285,2017-09-15 21:51:01.056999936\n\
competition,team,285,2017-09-15 21:51:08.574000128\n\
team,routes,285,2017-09-15 21:51:39.334000128\n\
routes,route,285,2017-09-15 21:51:42.407000064\n\
route,routes,285,2017-09-15 21:51:49.195000064\n\
routes,route,285,2017-09-15 21:51:51.516999936\n\
route,routes,285,2017-09-15 21:51:57.260999936\n\
routes,route,285,2017-09-15 21:51:59.214000128\n\
route,routes,285,2017-09-15 21:52:36.199000064\n\
routes,coach,285,2017-09-15 21:52:43.432999936\n\
coach,exit,285,2017-09-15 21:52:43.432999936\n\
coach,badges,286,2017-09-16 07:24:02.231000064\n\
badges,exit,286,2017-09-16 07:24:02.231000064\n\
coach,competition,287,2017-09-16 11:36:15.784999936\n\
competition,coach,287,2017-09-16 11:36:28.068000000\n\
coach,personal,287,2017-09-16 11:36:41.704999936\n\
personal,coach,287,2017-09-16 11:36:50.467000064\n\
coach,routes,287,2017-09-16 11:36:56.003000064\n\
routes,route,287,2017-09-16 11:36:58.198000128\n\
route,exit,287,2017-09-16 11:36:58.198000128\n\
coach,competition,288,2017-09-17 11:16:17.724000000\n\
competition,team,288,2017-09-17 11:16:39.448999936\n\
team,coach,288,2017-09-17 11:17:59.264999936\n\
coach,exit,288,2017-09-17 11:17:59.264999936\n\
coach,track,289,2017-09-18 05:30:19.977999872\n\
track,route,289,2017-09-18 05:48:06.176999936\n\
route,track,289,2017-09-18 05:48:11.111000064\n\
track,exit,289,2017-09-18 05:48:11.111000064\n\
coach,track,290,2017-09-18 15:05:48.063000064\n\
track,route,290,2017-09-18 15:23:00.048999936\n\
route,track,290,2017-09-18 15:23:08.184999936\n\
track,team,290,2017-09-18 15:23:10.396000000\n\
team,badges,290,2017-09-18 15:24:04.510000128\n\
badges,exit,290,2017-09-18 15:24:04.510000128\n\
coach,personal,291,2017-09-18 17:14:48.579000064\n\
personal,coach,291,2017-09-18 17:14:52.196000000\n\
coach,personal,291,2017-09-18 17:15:18.689999872\n\
personal,exit,291,2017-09-18 17:15:18.689999872\n\
coach,team,292,2017-09-20 15:33:33.694000128\n\
team,competition,292,2017-09-20 15:33:53.369999872\n\
competition,exit,292,2017-09-20 15:33:53.369999872\n\
coach,team,293,2017-09-23 10:55:11.303000064\n\
team,competition,293,2017-09-23 10:55:23.880999936\n\
competition,coach,293,2017-09-23 11:11:34.513999872\n\
coach,track,293,2017-09-23 11:11:40.488000000\n\
track,exit,293,2017-09-23 11:11:40.488000000\n\
route,coach,294,2017-09-23 12:52:40.320999936\n\
coach,competition,294,2017-09-23 12:53:05.604000000\n\
competition,routes,294,2017-09-23 12:53:12.412000000\n\
routes,route,294,2017-09-23 12:53:15.596999936\n\
route,routes,294,2017-09-23 12:53:43.126000128\n\
routes,badges,294,2017-09-23 12:53:47.092000000\n\
badges,team,294,2017-09-23 12:54:14.257999872\n\
team,exit,294,2017-09-23 12:54:14.257999872\n\
coach,badges,295,2017-09-24 07:37:49.059000064\n\
badges,coach,295,2017-09-24 07:39:50.608000000\n\
coach,team,295,2017-09-24 07:41:01.343000064\n\
team,competition,295,2017-09-24 07:41:28.279000064\n\
competition,exit,295,2017-09-24 07:41:28.279000064\n\
coach,track,296,2017-09-05 15:32:11.044000000\n\
track,route,296,2017-09-05 15:33:48.396999936\n\
route,track,296,2017-09-05 15:33:54.320000000\n\
track,coach,296,2017-09-05 15:34:13.060999936\n\
coach,exit,296,2017-09-05 15:34:13.060999936\n\
coach,track,297,2017-09-05 15:40:29.038000128\n\
track,coach,297,2017-09-05 15:40:50.980999936\n\
coach,personal,297,2017-09-05 15:41:36.278000128\n\
personal,coach,297,2017-09-05 15:41:44.721999872\n\
coach,exit,297,2017-09-05 15:41:44.721999872\n\
coach,track,298,2017-09-10 12:42:46.560999936\n\
track,exit,298,2017-09-10 12:42:46.560999936\n\
coach,team,299,2017-09-11 09:32:47.903000064\n\
team,competition,299,2017-09-11 09:33:20.963000064\n\
competition,routes,299,2017-09-11 09:33:27.124999936\n\
routes,coach,299,2017-09-11 09:33:32.907000064\n\
coach,track,299,2017-09-11 09:33:38.222000128\n\
track,team,299,2017-09-11 09:33:41.772999936\n\
team,exit,299,2017-09-11 09:33:41.772999936\n\
coach,exit,300,2017-09-11 10:13:05.455000064\n\
coach,team,301,2017-09-11 17:23:49.168999936\n\
team,competition,301,2017-09-11 17:24:11.496999936\n\
competition,exit,301,2017-09-11 17:24:11.496999936\n\
coach,track,302,2017-09-12 11:07:33.591000064\n\
track,exit,302,2017-09-12 11:07:33.591000064\n\
coach,personal,303,2017-09-12 18:45:21.113999872\n\
personal,coach,303,2017-09-12 18:46:01.300999936\n\
coach,team,303,2017-09-12 18:46:20.208000000\n\
team,routes,303,2017-09-12 18:46:49.256999936\n\
routes,route,303,2017-09-12 18:46:57.656000000\n\
route,routes,303,2017-09-12 18:47:41.720000000\n\
routes,route,303,2017-09-12 18:47:46.580999936\n\
route,routes,303,2017-09-12 18:48:36.191000064\n\
routes,track,303,2017-09-12 18:48:44.705999872\n\
track,team,303,2017-09-12 18:48:54.331000064\n\
team,competition,303,2017-09-12 18:49:38.441999872\n\
competition,team,303,2017-09-12 18:49:49.699000064\n\
team,competition,303,2017-09-12 18:50:06.211000064\n\
competition,routes,303,2017-09-12 18:50:37.068000000\n\
routes,route,303,2017-09-12 18:50:44.185999872\n\
route,routes,303,2017-09-12 18:51:34.135000064\n\
routes,exit,303,2017-09-12 18:51:34.135000064\n\
coach,team,304,2017-09-13 05:14:51.087000064\n\
team,routes,304,2017-09-13 05:15:23.539000064\n\
routes,route,304,2017-09-13 05:15:32.700999936\n\
route,routes,304,2017-09-13 05:16:29.009999872\n\
routes,coach,304,2017-09-13 05:16:56.783000064\n\
coach,exit,304,2017-09-13 05:16:56.783000064\n\
coach,team,305,2017-09-13 14:33:28.899000064\n\
team,routes,305,2017-09-13 14:33:40.430000128\n\
routes,route,305,2017-09-13 14:33:48.102000128\n\
route,routes,305,2017-09-13 14:33:57.660000000\n\
routes,route,305,2017-09-13 14:34:01.707000064\n\
route,routes,305,2017-09-13 14:34:02.820000000\n\
routes,personal,305,2017-09-13 14:34:06.500000000\n\
personal,bugreport,305,2017-09-13 14:34:13.940999936\n\
bugreport,personal,305,2017-09-13 14:34:45.230000128\n\
personal,coach,305,2017-09-13 14:42:43.518000128\n\
coach,exit,305,2017-09-13 14:42:43.518000128\n\
coach,team,306,2017-09-14 14:48:05.515000064\n\
team,competition,306,2017-09-14 14:48:30.188000000\n\
competition,team,306,2017-09-14 14:48:47.040999936\n\
team,competition,306,2017-09-14 14:49:05.084000000\n\
competition,exit,306,2017-09-14 14:49:05.084000000\n\
coach,track,307,2017-09-15 11:09:39.942000128\n\
track,exit,307,2017-09-15 11:09:39.942000128\n\
coach,exit,308,2017-09-15 11:59:06.512999936\n\
coach,competition,309,2017-09-15 15:33:43.891000064\n\
competition,coach,309,2017-09-15 15:33:55.708999936\n\
coach,competition,309,2017-09-15 15:33:57.654000128\n\
competition,coach,309,2017-09-15 15:34:14.656000000\n\
coach,team,309,2017-09-15 15:34:29.184999936\n\
team,routes,309,2017-09-15 15:35:05.076000000\n\
routes,route,309,2017-09-15 15:35:08.500000000\n\
route,routes,309,2017-09-15 15:35:33.724000000\n\
routes,route,309,2017-09-15 15:35:35.947000064\n\
route,routes,309,2017-09-15 15:35:43.879000064\n\
routes,route,309,2017-09-15 15:35:49.198000128\n\
route,routes,309,2017-09-15 15:36:43.568000000\n\
routes,exit,309,2017-09-15 15:36:43.568000000\n\
coach,competition,310,2017-09-15 18:39:03.644000000\n\
competition,coach,310,2017-09-15 18:39:19.260000000\n\
coach,competition,310,2017-09-15 18:40:30.849999872\n\
competition,coach,310,2017-09-15 18:40:38.755000064\n\
coach,competition,310,2017-09-15 18:40:47.414000128\n\
competition,coach,310,2017-09-15 18:40:52.399000064\n\
coach,competition,310,2017-09-15 18:40:58.640000000\n\
competition,coach,310,2017-09-15 18:41:01.315000064\n\
coach,routes,310,2017-09-15 18:41:06.143000064\n\
routes,route,310,2017-09-15 18:41:09.286000128\n\
route,personal,310,2017-09-15 18:41:44.142000128\n\
personal,routes,310,2017-09-15 18:41:51.611000064\n\
routes,route,310,2017-09-15 18:42:00.851000064\n\
route,routes,310,2017-09-15 18:42:36.744000000\n\
routes,route,310,2017-09-15 18:42:38.784999936\n\
route,routes,310,2017-09-15 18:42:48.547000064\n\
routes,team,310,2017-09-15 18:42:52.308000000\n\
team,competition,310,2017-09-15 18:43:24.244000000\n\
competition,badges,310,2017-09-15 18:43:36.337999872\n\
badges,exit,310,2017-09-15 18:43:36.337999872\n\
coach,competition,311,2017-09-16 11:38:50.792000000\n\
competition,coach,311,2017-09-16 11:39:12.207000064\n\
coach,routes,311,2017-09-16 11:39:15.684999936\n\
routes,route,311,2017-09-16 11:39:17.670000128\n\
route,routes,311,2017-09-16 11:39:27.800000000\n\
routes,route,311,2017-09-16 11:39:29.508000000\n\
route,routes,311,2017-09-16 11:39:53.980000000\n\
routes,route,311,2017-09-16 11:39:57.616999936\n\
route,routes,311,2017-09-16 11:40:01.462000128\n\
routes,coach,311,2017-09-16 11:40:07.094000128\n\
coach,badges,311,2017-09-16 11:40:13.103000064\n\
badges,competition,311,2017-09-16 11:40:20.532999936\n\
competition,team,311,2017-09-16 11:40:25.148999936\n\
team,exit,311,2017-09-16 11:40:25.148999936\n\
coach,team,312,2017-09-16 15:17:46.332999936\n\
team,competition,312,2017-09-16 15:18:16.560000000\n\
competition,team,312,2017-09-16 15:18:46.161999872\n\
team,personal,312,2017-09-16 15:18:56.280999936\n\
personal,exit,312,2017-09-16 15:18:56.280999936\n\
coach,team,313,2017-09-17 12:52:33.688999936\n\
team,competition,313,2017-09-17 12:52:56.172999936\n\
competition,coach,313,2017-09-17 12:53:47.988000000\n\
coach,competition,313,2017-09-17 12:54:01.308999936\n\
competition,coach,313,2017-09-17 12:54:11.310000128\n\
coach,exit,313,2017-09-17 12:54:11.310000128\n\
coach,exit,314,2017-09-17 14:00:25.487000064\n\
coach,team,315,2017-09-17 14:51:11.227000064\n\
team,routes,315,2017-09-17 14:51:47.766000128\n\
routes,route,315,2017-09-17 14:51:52.702000128\n\
route,routes,315,2017-09-17 14:52:13.372000000\n\
routes,route,315,2017-09-17 14:52:16.139000064\n\
route,routes,315,2017-09-17 14:54:03.264999936\n\
routes,track,315,2017-09-17 14:54:10.148000000\n\
track,exit,315,2017-09-17 14:54:10.148000000\n\
coach,personal,316,2017-09-17 17:36:29.019000064\n\
personal,coach,316,2017-09-17 17:36:32.100000000\n\
coach,exit,316,2017-09-17 17:36:32.100000000\n\
coach,exit,317,2017-09-18 09:13:41.190000128\n\
coach,exit,318,2017-09-18 13:10:31.799000064\n\
coach,exit,319,2017-09-19 21:09:47.566000128\n\
coach,track,320,2017-09-20 11:29:19.803000064\n\
track,route,320,2017-09-20 11:29:47.950000128\n\
route,coach,320,2017-09-20 11:30:04.353999872\n\
coach,track,320,2017-09-20 11:30:08.500000000\n\
track,exit,320,2017-09-20 11:30:08.500000000\n\
coach,competition,321,2017-09-20 15:01:16.552999936\n\
competition,coach,321,2017-09-20 15:01:37.899000064\n\
coach,competition,321,2017-09-20 15:01:58.127000064\n\
competition,coach,321,2017-09-20 15:02:01.854000128\n\
coach,competition,321,2017-09-20 15:02:15.956999936\n\
competition,coach,321,2017-09-20 15:02:20.272999936\n\
coach,competition,321,2017-09-20 15:02:24.759000064\n\
competition,routes,321,2017-09-20 15:02:27.391000064\n\
routes,route,321,2017-09-20 15:02:29.468999936\n\
route,routes,321,2017-09-20 15:03:19.060000000\n\
routes,route,321,2017-09-20 15:03:23.947000064\n\
route,routes,321,2017-09-20 15:03:31.691000064\n\
routes,route,321,2017-09-20 15:03:33.352000000\n\
route,routes,321,2017-09-20 15:03:43.814000128\n\
routes,route,321,2017-09-20 15:03:48.044999936\n\
route,exit,321,2017-09-20 15:03:48.044999936\n\
coach,competition,322,2017-09-20 19:16:16.735000064\n\
competition,coach,322,2017-09-20 19:16:32.332000000\n\
coach,competition,322,2017-09-20 19:16:36.214000128\n\
competition,personal,322,2017-09-20 19:16:46.574000128\n\
personal,competition,322,2017-09-20 19:17:03.368999936\n\
competition,coach,322,2017-09-20 19:17:09.439000064\n\
coach,routes,322,2017-09-20 19:19:14.159000064\n\
routes,route,322,2017-09-20 19:19:17.393999872\n\
route,exit,322,2017-09-20 19:19:17.393999872\n\
coach,competition,323,2017-09-21 17:48:48.427000064\n\
competition,coach,323,2017-09-21 17:50:17.595000064\n\
coach,exit,323,2017-09-21 17:50:17.595000064\n\
coach,exit,324,2017-09-22 10:17:56.992999936\n\
coach,track,325,2017-09-10 09:47:05.505999872\n\
track,competition,325,2017-09-10 09:47:57.161999872\n\
competition,team,325,2017-09-10 09:48:10.892000000\n\
team,routes,325,2017-09-10 09:48:34.632999936\n\
routes,coach,325,2017-09-10 09:48:48.632000000\n\
coach,track,325,2017-09-10 09:49:43.049999872\n\
track,route,325,2017-09-10 09:49:45.680999936\n\
route,personal,325,2017-09-10 09:49:48.486000128\n\
personal,track,325,2017-09-10 09:49:52.344000000\n\
track,coach,325,2017-09-10 09:49:56.600000000\n\
coach,team,325,2017-09-10 09:49:57.472999936\n\
team,coach,325,2017-09-10 09:50:25.672000000\n\
coach,track,325,2017-09-10 09:52:15.135000064\n\
track,route,325,2017-09-10 09:52:48.647000064\n\
route,track,325,2017-09-10 09:52:58.067000064\n\
track,routes,325,2017-09-10 09:53:10.740999936\n\
routes,route,325,2017-09-10 09:53:16.108000000\n\
route,routes,325,2017-09-10 09:53:23.932999936\n\
routes,route,325,2017-09-10 09:53:28.703000064\n\
route,routes,325,2017-09-10 09:53:35.480000000\n\
routes,exit,325,2017-09-10 09:53:35.480000000\n\
coach,exit,326,2017-09-10 10:45:42.072000000\n\
coach,exit,327,2017-09-11 11:07:07.455000064\n\
coach,exit,328,2017-09-11 11:09:20.684000000\n\
coach,track,329,2017-09-11 11:16:44.086000128\n\
track,team,329,2017-09-11 11:17:21.799000064\n\
team,routes,329,2017-09-11 11:18:28.126000128\n\
routes,personal,329,2017-09-11 11:19:13.579000064\n\
personal,coach,329,2017-09-11 11:23:46.025999872\n\
coach,personal,329,2017-09-11 11:24:09.241999872\n\
personal,exit,329,2017-09-11 11:24:09.241999872\n\
coach,track,330,2017-09-11 12:22:26.420999936\n\
track,exit,330,2017-09-11 12:22:26.420999936\n\
team,track,331,2017-09-11 16:00:41.774000128\n\
track,personal,331,2017-09-11 16:00:58.188000000\n\
personal,track,331,2017-09-11 16:01:17.651000064\n\
track,routes,331,2017-09-11 16:01:24.471000064\n\
routes,track,331,2017-09-11 16:01:36.580000000\n\
track,team,331,2017-09-11 16:01:48.440000000\n\
team,competition,331,2017-09-11 16:02:18.671000064\n\
competition,personal,331,2017-09-11 16:03:04.953999872\n\
personal,coach,331,2017-09-11 16:07:49.025999872\n\
coach,personal,331,2017-09-11 16:08:44.908999936\n\
personal,exit,331,2017-09-11 16:08:44.908999936\n\
coach,track,332,2017-09-12 08:06:47.503000064\n\
track,exit,332,2017-09-12 08:06:47.503000064\n\
competition,track,333,2017-09-12 12:32:08.264999936\n\
track,routes,333,2017-09-12 12:32:21.588000000\n\
routes,team,333,2017-09-12 12:32:38.404000000\n\
team,personal,333,2017-09-12 12:33:09.772000000\n\
personal,team,333,2017-09-12 12:34:53.391000064\n\
team,personal,333,2017-09-12 12:35:19.062000128\n\
personal,exit,333,2017-09-12 12:35:19.062000128\n\
coach,team,334,2017-09-12 15:11:02.983000064\n\
team,competition,334,2017-09-12 15:11:43.587000064\n\
competition,badges,334,2017-09-12 15:12:08.908000000\n\
badges,coach,334,2017-09-12 15:12:24.880999936\n\
coach,personal,334,2017-09-12 15:13:20.000999936\n\
personal,coach,334,2017-09-12 15:13:27.611000064\n\
coach,routes,334,2017-09-12 15:13:36.927000064\n\
routes,route,334,2017-09-12 15:13:45.422000128\n\
route,routes,334,2017-09-12 15:14:01.492000000\n\
routes,route,334,2017-09-12 15:14:18.600000000\n\
route,routes,334,2017-09-12 15:14:22.536000000\n\
routes,coach,334,2017-09-12 15:14:27.740999936\n\
coach,personal,334,2017-09-12 15:14:29.995000064\n\
personal,exit,334,2017-09-12 15:14:29.995000064\n\
coach,team,335,2017-09-13 08:06:21.473999872\n\
team,competition,335,2017-09-13 08:06:38.691000064\n\
competition,track,335,2017-09-13 08:06:53.953999872\n\
track,exit,335,2017-09-13 08:06:53.953999872\n\
track,team,336,2017-09-13 12:46:27.132000000\n\
team,competition,336,2017-09-13 12:47:03.558000128\n\
competition,track,336,2017-09-13 12:47:17.577999872\n\
track,personal,336,2017-09-13 12:47:34.054000128\n\
personal,exit,336,2017-09-13 12:47:34.054000128\n\
coach,team,337,2017-09-13 16:20:02.401999872\n\
team,competition,337,2017-09-13 16:20:24.512000000\n\
competition,personal,337,2017-09-13 16:20:38.169999872\n\
personal,exit,337,2017-09-13 16:20:38.169999872\n\
coach,competition,338,2017-09-14 07:44:41.438000128\n\
competition,team,338,2017-09-14 07:44:49.059000064\n\
team,track,338,2017-09-14 07:45:01.907000064\n\
track,exit,338,2017-09-14 07:45:01.907000064\n\
team,track,339,2017-09-14 11:08:07.207000064\n\
track,personal,339,2017-09-14 11:08:13.800999936\n\
personal,coach,339,2017-09-14 11:13:31.279000064\n\
coach,track,339,2017-09-14 11:14:05.319000064\n\
track,route,339,2017-09-14 11:14:26.692000000\n\
route,track,339,2017-09-14 11:14:34.519000064\n\
track,coach,339,2017-09-14 11:14:37.608999936\n\
coach,personal,339,2017-09-14 11:15:15.340999936\n\
personal,bugreport,339,2017-09-14 11:15:17.460000000\n\
bugreport,personal,339,2017-09-14 11:16:03.044000000\n\
personal,bugreport,339,2017-09-14 11:16:09.272999936\n\
bugreport,personal,339,2017-09-14 11:16:42.716999936\n\
personal,bugreport,339,2017-09-14 11:16:47.092999936\n\
bugreport,team,339,2017-09-14 11:16:50.636000000\n\
team,personal,339,2017-09-14 11:17:24.475000064\n\
personal,exit,339,2017-09-14 11:17:24.475000064\n\
coach,competition,340,2017-09-14 13:18:04.478000128\n\
competition,coach,340,2017-09-14 13:18:11.087000064\n\
coach,team,340,2017-09-14 13:19:42.332999936\n\
team,routes,340,2017-09-14 13:19:57.148999936\n\
routes,personal,340,2017-09-14 13:20:10.001999872\n\
personal,bugreport,340,2017-09-14 13:20:12.873999872\n\
bugreport,personal,340,2017-09-14 13:21:02.936000000\n\
personal,bugreport,340,2017-09-14 13:21:08.071000064\n\
bugreport,track,340,2017-09-14 13:21:12.392999936\n\
track,coach,340,2017-09-14 13:21:28.784999936\n\
coach,personal,340,2017-09-14 13:22:36.216999936\n\
personal,exit,340,2017-09-14 13:22:36.216999936\n\
coach,team,341,2017-09-15 11:33:49.047000064\n\
team,track,341,2017-09-15 11:33:58.920000000\n\
track,route,341,2017-09-15 11:34:11.296999936\n\
route,exit,341,2017-09-15 11:34:11.296999936\n\
competition,route,342,2017-09-15 13:49:42.868000000\n\
route,track,342,2017-09-15 13:50:13.791000064\n\
track,team,342,2017-09-15 13:50:19.484999936\n\
team,personal,342,2017-09-15 13:50:36.152000000\n\
personal,exit,342,2017-09-15 13:50:36.152000000\n\
coach,team,343,2017-09-15 14:22:04.526000128\n\
team,competition,343,2017-09-15 14:22:57.624999936\n\
competition,routes,343,2017-09-15 14:23:14.592000000\n\
routes,route,343,2017-09-15 14:23:22.268999936\n\
route,routes,343,2017-09-15 14:23:35.356000000\n\
routes,route,343,2017-09-15 14:23:37.104999936\n\
route,routes,343,2017-09-15 14:24:10.791000064\n\
routes,coach,343,2017-09-15 14:24:16.991000064\n\
coach,personal,343,2017-09-15 14:24:24.012000000\n\
personal,bugreport,343,2017-09-15 14:24:27.409999872\n\
bugreport,personal,343,2017-09-15 14:24:36.948000000\n\
personal,exit,343,2017-09-15 14:24:36.948000000\n\
coach,team,344,2017-09-15 19:54:49.936000000\n\
team,competition,344,2017-09-15 19:55:28.598000128\n\
competition,personal,344,2017-09-15 19:55:48.758000128\n\
personal,exit,344,2017-09-15 19:55:48.758000128\n\
coach,team,345,2017-09-16 20:23:27.320000000\n\
team,routes,345,2017-09-16 20:24:02.753999872\n\
routes,route,345,2017-09-16 20:24:05.310000128\n\
route,routes,345,2017-09-16 20:24:25.120000000\n\
routes,team,345,2017-09-16 20:24:30.683000064\n\
team,competition,345,2017-09-16 20:24:52.388000000\n\
competition,personal,345,2017-09-16 20:25:05.972999936\n\
personal,exit,345,2017-09-16 20:25:05.972999936\n\
coach,track,346,2017-09-17 06:23:39.236000000\n\
track,route,346,2017-09-17 06:24:28.660000000\n\
route,track,346,2017-09-17 06:24:35.606000128\n\
track,route,346,2017-09-17 06:25:21.659000064\n\
route,exit,346,2017-09-17 06:25:21.659000064\n\
coach,routes,347,2017-09-17 10:36:03.903000064\n\
routes,route,347,2017-09-17 10:36:10.432000000\n\
route,routes,347,2017-09-17 10:36:21.388999936\n\
routes,route,347,2017-09-17 10:36:22.796000000\n\
route,personal,347,2017-09-17 10:36:42.280000000\n\
personal,exit,347,2017-09-17 10:36:42.280000000\n\
coach,team,348,2017-09-17 12:39:32.852999936\n\
team,competition,348,2017-09-17 12:39:59.048000000\n\
competition,track,348,2017-09-17 12:40:18.374000128\n\
track,routes,348,2017-09-17 12:41:22.740000000\n\
routes,route,348,2017-09-17 12:41:26.212000000\n\
route,routes,348,2017-09-17 12:41:43.569999872\n\
routes,route,348,2017-09-17 12:41:45.566000128\n\
route,personal,348,2017-09-17 12:41:48.905999872\n\
personal,bugreport,348,2017-09-17 12:41:50.720000000\n\
bugreport,track,348,2017-09-17 12:42:26.851000064\n\
track,route,348,2017-09-17 12:42:30.014000128\n\
route,track,348,2017-09-17 12:42:44.711000064\n\
track,team,348,2017-09-17 12:42:59.064000000\n\
team,coach,348,2017-09-17 12:44:09.134000128\n\
coach,badges,348,2017-09-17 12:44:20.326000128\n\
badges,track,348,2017-09-17 12:45:47.160000000\n\
track,personal,348,2017-09-17 12:45:57.252999936\n\
personal,coach,348,2017-09-17 12:48:24.960000000\n\
coach,track,348,2017-09-17 12:49:26.281999872\n\
track,routes,348,2017-09-17 12:50:10.304999936\n\
routes,route,348,2017-09-17 12:50:12.760999936\n\
route,exit,348,2017-09-17 12:50:12.760999936\n\
routes,route,349,2017-09-17 14:58:17.487000064\n\
route,routes,349,2017-09-17 14:58:41.296000000\n\
routes,team,349,2017-09-17 14:58:44.659000064\n\
team,competition,349,2017-09-17 14:59:18.072999936\n\
competition,coach,349,2017-09-17 14:59:35.895000064\n\
coach,track,349,2017-09-17 15:00:25.176999936\n\
track,route,349,2017-09-17 15:00:36.576000000\n\
route,track,349,2017-09-17 15:00:58.268000000\n\
track,coach,349,2017-09-17 15:01:29.499000064\n\
coach,personal,349,2017-09-17 15:01:34.075000064\n\
personal,exit,349,2017-09-17 15:01:34.075000064\n\
coach,team,350,2017-09-17 17:39:02.305999872\n\
team,competition,350,2017-09-17 17:39:40.516000000\n\
competition,personal,350,2017-09-17 17:40:17.384000000\n\
personal,exit,350,2017-09-17 17:40:17.384000000\n\
coach,team,351,2017-09-18 10:07:34.716999936\n\
team,competition,351,2017-09-18 10:08:07.187000064\n\
competition,exit,351,2017-09-18 10:08:07.187000064\n\
coach,track,352,2017-09-18 12:36:46.993999872\n\
track,route,352,2017-09-18 12:37:38.734000128\n\
route,exit,352,2017-09-18 12:37:38.734000128\n\
track,routes,353,2017-09-18 15:01:09.947000064\n\
routes,route,353,2017-09-18 15:01:16.760000000\n\
route,routes,353,2017-09-18 15:01:47.427000064\n\
routes,route,353,2017-09-18 15:01:51.499000064\n\
route,routes,353,2017-09-18 15:01:56.216999936\n\
routes,route,353,2017-09-18 15:01:57.849999872\n\
route,routes,353,2017-09-18 15:02:13.504999936\n\
routes,route,353,2017-09-18 15:02:15.560000000\n\
route,routes,353,2017-09-18 15:02:26.169999872\n\
routes,route,353,2017-09-18 15:02:33.568999936\n\
route,routes,353,2017-09-18 15:02:35.636999936\n\
routes,team,353,2017-09-18 15:02:46.476999936\n\
team,competition,353,2017-09-18 15:03:16.880000000\n\
competition,exit,353,2017-09-18 15:03:16.880000000\n\
coach,competition,354,2017-09-19 15:18:04.280999936\n\
competition,coach,354,2017-09-19 15:18:12.132000000\n\
coach,team,354,2017-09-19 15:18:15.456000000\n\
team,competition,354,2017-09-19 15:18:45.803000064\n\
competition,routes,354,2017-09-19 15:18:50.320000000\n\
routes,route,354,2017-09-19 15:19:00.559000064\n\
route,routes,354,2017-09-19 15:19:29.134000128\n\
routes,route,354,2017-09-19 15:19:32.323000064\n\
route,coach,354,2017-09-19 15:20:02.604999936\n\
coach,routes,354,2017-09-19 15:20:08.934000128\n\
routes,coach,354,2017-09-19 15:20:15.435000064\n\
coach,personal,354,2017-09-19 15:21:27.894000128\n\
personal,bugreport,354,2017-09-19 15:21:30.764999936\n\
bugreport,track,354,2017-09-19 15:22:15.684999936\n\
track,personal,354,2017-09-19 15:22:18.435000064\n\
personal,track,354,2017-09-19 15:22:20.702000128\n\
track,team,354,2017-09-19 15:22:29.091000064\n\
team,exit,354,2017-09-19 15:22:29.091000064\n\
coach,personal,355,2017-09-19 17:12:31.540000000\n\
personal,bugreport,355,2017-09-19 17:12:33.936000000\n\
bugreport,personal,355,2017-09-19 17:12:41.657999872\n\
personal,bugreport,355,2017-09-19 17:12:46.124000000\n\
bugreport,coach,355,2017-09-19 17:12:51.076000000\n\
coach,competition,355,2017-09-19 17:13:12.377999872\n\
competition,badges,355,2017-09-19 17:13:17.280999936\n\
badges,track,355,2017-09-19 17:13:23.524000000\n\
track,coach,355,2017-09-19 17:13:33.508999936\n\
coach,personal,355,2017-09-19 17:14:17.065999872\n\
personal,bugreport,355,2017-09-19 17:14:18.758000128\n\
bugreport,personal,355,2017-09-19 17:14:45.119000064\n\
personal,bugreport,355,2017-09-19 17:14:51.956000000\n\
bugreport,exit,355,2017-09-19 17:14:51.956000000\n\
coach,team,356,2017-09-20 07:21:30.353999872\n\
team,competition,356,2017-09-20 07:22:05.889999872\n\
competition,exit,356,2017-09-20 07:22:05.889999872\n\
coach,team,357,2017-09-20 16:54:57.440000000\n\
team,competition,357,2017-09-20 16:55:41.060999936\n\
competition,exit,357,2017-09-20 16:55:41.060999936\n\
coach,team,358,2017-09-21 20:42:30.768999936\n\
team,competition,358,2017-09-21 20:43:20.332999936\n\
competition,exit,358,2017-09-21 20:43:20.332999936\n\
coach,track,359,2017-09-22 07:02:44.515000064\n\
track,route,359,2017-09-22 07:04:30.440000000\n\
route,coach,359,2017-09-22 07:04:49.284000000\n\
coach,exit,359,2017-09-22 07:04:49.284000000\n\
routes,route,360,2017-09-22 08:32:59.848000000\n\
route,routes,360,2017-09-22 08:33:27.692999936\n\
routes,team,360,2017-09-22 08:33:32.950000128\n\
team,exit,360,2017-09-22 08:33:32.950000128\n\
coach,personal,361,2017-09-23 09:21:52.228000000\n\
personal,bugreport,361,2017-09-23 09:21:53.782000128\n\
bugreport,team,361,2017-09-23 09:22:15.087000064\n\
team,competition,361,2017-09-23 09:23:27.040000000\n\
competition,exit,361,2017-09-23 09:23:27.040000000\n\
coach,track,362,2017-09-02 19:43:49.688000000\n\
track,personal,362,2017-09-02 19:47:07.740999936\n\
personal,track,362,2017-09-02 19:47:13.467000064\n\
track,team,362,2017-09-02 19:47:17.400999936\n\
team,routes,362,2017-09-02 19:47:38.166000128\n\
routes,coach,362,2017-09-02 19:47:43.488999936\n\
coach,badges,362,2017-09-02 19:47:59.319000064\n\
badges,exit,362,2017-09-02 19:47:59.319000064\n\
coach,track,363,2017-09-03 11:46:08.646000128\n\
track,exit,363,2017-09-03 11:46:08.646000128\n\
track,personal,364,2017-09-03 14:45:11.668999936\n\
personal,bugreport,364,2017-09-03 14:45:13.451000064\n\
bugreport,exit,364,2017-09-03 14:45:13.451000064\n\
personal,bugreport,365,2017-09-03 15:22:17.280000000\n\
bugreport,track,365,2017-09-03 15:22:27.744000000\n\
track,routes,365,2017-09-03 15:22:36.393999872\n\
routes,team,365,2017-09-03 15:22:43.044000000\n\
team,exit,365,2017-09-03 15:22:43.044000000\n\
coach,exit,366,2017-09-11 17:23:11.537999872\n\
coach,exit,367,2017-09-18 11:21:15.523000064\n\
coach,exit,368,2017-09-21 06:53:16.524999936\n\
coach,personal,369,2017-09-02 14:29:02.801999872\n\
personal,team,369,2017-09-02 14:29:44.316999936\n\
team,coach,369,2017-09-02 14:30:20.607000064\n\
coach,personal,369,2017-09-02 14:30:20.608000000\n\
personal,coach,369,2017-09-02 14:30:21.252999936\n\
coach,exit,369,2017-09-02 14:30:21.252999936\n\
team,coach,370,2017-09-02 16:53:49.736000000\n\
coach,exit,370,2017-09-02 16:53:49.736000000\n\
team,personal,371,2017-09-02 17:28:50.912000000\n\
personal,team,371,2017-09-02 17:28:57.846000128\n\
team,exit,371,2017-09-02 17:28:57.846000128\n\
coach,personal,372,2017-09-12 15:44:33.015000064\n\
personal,exit,372,2017-09-12 15:44:33.015000064\n\
coach,exit,373,2017-09-13 13:19:19.552000000\n\
coach,track,374,2017-09-20 05:30:02.302000128\n\
track,route,374,2017-09-20 05:33:33.950000128\n\
route,track,374,2017-09-20 05:33:59.982000128\n\
track,exit,374,2017-09-20 05:33:59.982000128\n\
route,exit,375,2017-09-20 06:12:28.880000000\n\
coach,exit,376,2017-09-20 14:13:29.887000064\n\
coach,track,377,2017-09-20 14:13:29.916000000\n\
track,coach,377,2017-09-20 14:13:29.924000000\n\
coach,track,377,2017-09-20 14:13:37.516999936\n\
track,exit,377,2017-09-20 14:13:37.516999936\n\
coach,track,378,2017-09-20 14:53:49.908000000\n\
track,exit,378,2017-09-20 14:53:49.908000000\n\
coach,track,379,2017-09-20 15:43:03.656999936\n\
track,team,379,2017-09-20 15:43:10.699000064\n\
team,exit,379,2017-09-20 15:43:10.699000064\n\
coach,track,380,2017-09-21 05:38:41.001999872\n\
track,exit,380,2017-09-21 05:38:41.001999872\n\
route,team,381,2017-09-21 06:28:36.696999936\n\
team,coach,381,2017-09-21 06:28:55.527000064\n\
coach,exit,381,2017-09-21 06:28:55.527000064\n\
coach,track,382,2017-09-21 14:23:35.892000000\n\
track,coach,382,2017-09-21 14:44:28.388000000\n\
coach,competition,382,2017-09-21 14:44:40.630000128\n\
competition,exit,382,2017-09-21 14:44:40.630000128\n\
coach,track,383,2017-09-22 13:10:50.604999936\n\
track,route,383,2017-09-22 13:11:02.427000064\n\
route,coach,383,2017-09-22 13:19:52.716999936\n\
coach,track,383,2017-09-22 13:19:58.539000064\n\
track,exit,383,2017-09-22 13:19:58.539000064\n\
coach,team,384,2017-09-22 15:05:56.100999936\n\
team,exit,384,2017-09-22 15:05:56.100999936\n\
coach,track,385,2017-09-23 07:24:14.729999872\n\
track,route,385,2017-09-23 07:24:21.483000064\n\
route,track,385,2017-09-23 07:24:29.580999936\n\
track,coach,385,2017-09-23 07:24:35.071000064\n\
coach,track,385,2017-09-23 07:24:37.439000064\n\
track,route,385,2017-09-23 07:24:41.928000000\n\
route,track,385,2017-09-23 07:24:50.876000000\n\
track,coach,385,2017-09-23 07:24:52.385999872\n\
coach,track,385,2017-09-23 07:24:54.639000064\n\
track,exit,385,2017-09-23 07:24:54.639000064\n\
coach,competition,386,2017-09-23 09:52:49.271000064\n\
competition,personal,386,2017-09-23 09:53:41.036999936\n\
personal,coach,386,2017-09-23 09:53:54.672000000\n\
coach,track,386,2017-09-23 09:54:02.998000128\n\
track,route,386,2017-09-23 09:54:06.904999936\n\
route,track,386,2017-09-23 09:54:18.068999936\n\
track,coach,386,2017-09-23 09:54:19.216000000\n\
coach,competition,386,2017-09-23 10:07:44.843000064\n\
competition,personal,386,2017-09-23 10:07:54.745999872\n\
personal,coach,386,2017-09-23 10:08:00.929999872\n\
coach,competition,386,2017-09-23 10:08:28.392000000\n\
competition,exit,386,2017-09-23 10:08:28.392000000\n\
coach,competition,387,2017-09-23 11:35:24.808000000\n\
competition,coach,387,2017-09-23 11:35:36.982000128\n\
coach,exit,387,2017-09-23 11:35:36.982000128\n\
coach,track,388,2017-09-23 20:40:45.865999872\n\
track,personal,388,2017-09-23 20:40:53.257999872\n\
personal,track,388,2017-09-23 20:41:15.948000000\n\
track,team,388,2017-09-23 20:41:18.784000000\n\
team,personal,388,2017-09-23 20:41:36.513999872\n\
personal,team,388,2017-09-23 20:41:44.609999872\n\
team,personal,388,2017-09-23 20:41:48.369999872\n\
personal,team,388,2017-09-23 20:41:52.712000000\n\
team,competition,388,2017-09-23 20:44:54.207000064\n\
competition,routes,388,2017-09-23 20:45:06.355000064\n\
routes,badges,388,2017-09-23 20:45:11.071000064\n\
badges,coach,388,2017-09-23 20:45:14.788999936\n\
coach,track,388,2017-09-23 20:45:47.310000128\n\
track,route,388,2017-09-23 20:46:15.355000064\n\
route,track,388,2017-09-23 20:46:20.248999936\n\
track,exit,388,2017-09-23 20:46:20.248999936\n\
coach,track,389,2017-09-24 05:58:37.115000064\n\
track,exit,389,2017-09-24 05:58:37.115000064\n\
coach,exit,390,2017-09-24 06:53:16.712000000\n\
coach,personal,391,2017-09-01 21:16:31.289999872\n\
personal,team,391,2017-09-01 21:17:14.692999936\n\
team,competition,391,2017-09-01 21:17:31.860000000\n\
competition,routes,391,2017-09-01 21:17:42.803000064\n\
routes,badges,391,2017-09-01 21:18:48.968000000\n\
badges,coach,391,2017-09-01 21:19:03.815000064\n\
coach,personal,391,2017-09-01 21:19:30.324999936\n\
personal,coach,391,2017-09-01 21:19:36.004999936\n\
coach,exit,391,2017-09-01 21:19:36.004999936\n\
coach,team,392,2017-09-02 07:17:30.241999872\n\
team,exit,392,2017-09-02 07:17:30.241999872\n\
coach,track,393,2017-09-03 05:51:19.964999936\n\
track,exit,393,2017-09-03 05:51:19.964999936\n\
route,coach,394,2017-09-03 06:43:01.953999872\n\
coach,team,394,2017-09-03 06:49:21.905999872\n\
team,track,394,2017-09-03 06:50:03.478000128\n\
track,exit,394,2017-09-03 06:50:03.478000128\n\
coach,exit,395,2017-09-03 07:38:22.988999936\n\
track,route,396,2017-09-03 11:48:59.636000000\n\
route,coach,396,2017-09-03 11:49:19.344999936\n\
coach,exit,396,2017-09-03 11:49:19.344999936\n\
coach,competition,397,2017-09-03 13:15:07.896999936\n\
competition,coach,397,2017-09-03 13:15:32.624000000\n\
coach,team,397,2017-09-03 13:15:36.150000128\n\
team,badges,397,2017-09-03 13:15:54.179000064\n\
badges,routes,397,2017-09-03 13:16:19.062000128\n\
routes,route,397,2017-09-03 13:16:25.900000000\n\
route,exit,397,2017-09-03 13:16:25.900000000\n\
coach,team,398,2017-09-03 21:24:01.313999872\n\
team,competition,398,2017-09-03 21:24:15.536000000\n\
competition,exit,398,2017-09-03 21:24:15.536000000\n\
coach,exit,399,2017-09-04 17:55:24.899000064\n\
coach,team,400,2017-09-11 12:30:45.691000064\n\
team,exit,400,2017-09-11 12:30:45.691000064\n\
coach,exit,401,2017-09-14 18:43:47.143000064\n\
coach,personal,402,2017-09-14 22:38:19.078000128\n\
personal,coach,402,2017-09-14 22:38:21.662000128\n\
coach,team,402,2017-09-14 22:39:59.600999936\n\
team,competition,402,2017-09-14 22:40:26.583000064\n\
competition,team,402,2017-09-14 22:40:37.675000064\n\
team,routes,402,2017-09-14 22:40:50.968000000\n\
routes,badges,402,2017-09-14 22:41:01.383000064\n\
badges,coach,402,2017-09-14 22:41:07.107000064\n\
coach,exit,402,2017-09-14 22:41:07.107000064\n\
coach,exit,403,2017-09-15 14:34:35.251000064\n\
coach,exit,404,2017-09-18 22:29:30.592000000\n\
coach,track,405,2017-09-20 13:40:49.080000000\n\
track,exit,405,2017-09-20 13:40:49.080000000\n\
route,exit,406,2017-09-20 15:21:09.236999936\n\
coach,team,407,2017-09-07 18:03:28.339000064\n\
team,routes,407,2017-09-07 18:04:18.875000064\n\
routes,coach,407,2017-09-07 18:04:34.382000128\n\
coach,track,407,2017-09-07 18:05:08.996999936\n\
track,badges,407,2017-09-07 18:05:23.105999872\n\
badges,personal,407,2017-09-07 18:05:43.004999936\n\
personal,coach,407,2017-09-07 18:07:34.824999936\n\
coach,personal,407,2017-09-07 18:07:53.744000000\n\
personal,coach,407,2017-09-07 18:08:33.761999872\n\
coach,personal,407,2017-09-07 18:09:11.185999872\n\
personal,coach,407,2017-09-07 18:09:18.356999936\n\
coach,personal,407,2017-09-07 18:10:39.920000000\n\
personal,coach,407,2017-09-07 18:10:53.188000000\n\
coach,personal,407,2017-09-07 18:11:00.496000000\n\
personal,coach,407,2017-09-07 18:11:47.532999936\n\
coach,personal,407,2017-09-07 18:11:52.511000064\n\
personal,bugreport,407,2017-09-07 18:11:54.281999872\n\
bugreport,coach,407,2017-09-07 18:18:18.360000000\n\
coach,exit,407,2017-09-07 18:18:18.360000000\n\
coach,track,408,2017-09-10 07:07:23.838000128\n\
track,exit,408,2017-09-10 07:07:23.838000128\n\
coach,team,409,2017-09-10 14:43:57.142000128\n\
team,competition,409,2017-09-10 14:44:54.668999936\n\
competition,routes,409,2017-09-10 14:45:16.787000064\n\
routes,route,409,2017-09-10 14:45:20.097999872\n\
route,routes,409,2017-09-10 14:45:45.340000000\n\
routes,exit,409,2017-09-10 14:45:45.340000000\n\
coach,team,410,2017-09-11 08:53:57.307000064\n\
team,personal,410,2017-09-11 08:54:24.963000064\n\
personal,team,410,2017-09-11 08:54:56.598000128\n\
team,competition,410,2017-09-11 08:55:17.998000128\n\
competition,exit,410,2017-09-11 08:55:17.998000128\n\
coach,exit,411,2017-09-11 10:23:50.828999936\n\
coach,track,412,2017-09-12 07:02:25.281999872\n\
track,exit,412,2017-09-12 07:02:25.281999872\n\
coach,exit,413,2017-09-12 08:34:21.947000064\n\
coach,team,414,2017-09-12 09:53:37.556000000\n\
team,exit,414,2017-09-12 09:53:37.556000000\n\
coach,team,415,2017-09-12 18:24:37.456999936\n\
team,competition,415,2017-09-12 18:25:04.207000064\n\
competition,team,415,2017-09-12 18:25:21.252999936\n\
team,coach,415,2017-09-12 18:25:39.003000064\n\
coach,personal,415,2017-09-12 18:25:49.203000064\n\
personal,bugreport,415,2017-09-12 18:25:51.686000128\n\
bugreport,personal,415,2017-09-12 18:25:55.233999872\n\
personal,bugreport,415,2017-09-12 18:26:00.860999936\n\
bugreport,competition,415,2017-09-12 18:27:01.288999936\n\
competition,team,415,2017-09-12 18:27:04.436000000\n\
team,track,415,2017-09-12 18:27:08.212000000\n\
track,competition,415,2017-09-12 18:28:25.494000128\n\
competition,badges,415,2017-09-12 18:28:31.756000000\n\
badges,track,415,2017-09-12 18:28:43.640000000\n\
track,personal,415,2017-09-12 18:30:20.355000064\n\
personal,track,415,2017-09-12 18:30:56.104999936\n\
track,coach,415,2017-09-12 18:31:27.884999936\n\
coach,exit,415,2017-09-12 18:31:27.884999936\n\
coach,track,416,2017-09-14 11:24:05.972000000\n\
track,route,416,2017-09-14 11:25:30.760999936\n\
route,coach,416,2017-09-14 11:25:42.532999936\n\
coach,personal,416,2017-09-14 11:32:00.672000000\n\
personal,coach,416,2017-09-14 11:32:18.120999936\n\
coach,track,416,2017-09-14 11:33:31.456999936\n\
track,route,416,2017-09-14 11:33:49.819000064\n\
route,track,416,2017-09-14 11:34:38.988000000\n\
track,route,416,2017-09-14 11:35:49.012999936\n\
route,coach,416,2017-09-14 11:36:14.654000128\n\
coach,track,416,2017-09-14 11:37:17.968000000\n\
track,route,416,2017-09-14 11:37:28.348000000\n\
route,track,416,2017-09-14 11:37:48.012000000\n\
track,route,416,2017-09-14 11:38:16.944999936\n\
route,track,416,2017-09-14 11:38:45.769999872\n\
track,personal,416,2017-09-14 11:40:36.782000128\n\
personal,coach,416,2017-09-14 11:41:12.137999872\n\
coach,exit,416,2017-09-14 11:41:12.137999872\n\
team,personal,417,2017-09-14 15:06:43.208999936\n\
personal,team,417,2017-09-14 15:07:22.095000064\n\
team,personal,417,2017-09-14 15:07:30.604999936\n\
personal,bugreport,417,2017-09-14 15:07:34.028000000\n\
bugreport,personal,417,2017-09-14 15:07:40.956000000\n\
personal,bugreport,417,2017-09-14 15:07:55.376999936\n\
bugreport,coach,417,2017-09-14 15:08:00.566000128\n\
coach,exit,417,2017-09-14 15:08:00.566000128\n\
coach,competition,418,2017-09-14 17:49:01.731000064\n\
competition,personal,418,2017-09-14 17:49:22.852000000\n\
personal,exit,418,2017-09-14 17:49:22.852000000\n\
coach,team,419,2017-09-14 18:45:16.392000000\n\
team,track,419,2017-09-14 18:45:50.372000000\n\
track,route,419,2017-09-14 18:46:13.283000064\n\
route,coach,419,2017-09-14 18:46:35.128999936\n\
coach,team,419,2017-09-14 18:46:44.664000000\n\
team,personal,419,2017-09-14 18:47:12.743000064\n\
personal,team,419,2017-09-14 18:48:00.408999936\n\
team,coach,419,2017-09-14 18:48:07.246000128\n\
coach,team,419,2017-09-14 18:48:46.120000000\n\
team,competition,419,2017-09-14 18:49:14.011000064\n\
competition,personal,419,2017-09-14 18:49:34.212999936\n\
personal,competition,419,2017-09-14 18:49:36.793999872\n\
competition,team,419,2017-09-14 18:49:49.512000000\n\
team,track,419,2017-09-14 18:50:06.728000000\n\
track,route,419,2017-09-14 18:50:18.334000128\n\
route,track,419,2017-09-14 18:50:27.000999936\n\
track,exit,419,2017-09-14 18:50:27.000999936\n\
coach,competition,420,2017-09-14 20:26:59.457999872\n\
competition,coach,420,2017-09-14 20:27:23.400000000\n\
coach,team,420,2017-09-14 20:27:26.687000064\n\
team,personal,420,2017-09-14 20:27:58.908999936\n\
personal,exit,420,2017-09-14 20:27:58.908999936\n\
coach,competition,421,2017-09-15 06:03:40.108999936\n\
competition,coach,421,2017-09-15 06:03:48.886000128\n\
coach,team,421,2017-09-15 06:03:54.918000128\n\
team,personal,421,2017-09-15 06:04:37.337999872\n\
personal,team,421,2017-09-15 06:04:50.375000064\n\
team,competition,421,2017-09-15 06:04:58.252000000\n\
competition,badges,421,2017-09-15 06:05:04.987000064\n\
badges,exit,421,2017-09-15 06:05:04.987000064\n\
coach,track,422,2017-09-15 12:13:10.478000128\n\
track,exit,422,2017-09-15 12:13:10.478000128\n\
coach,team,423,2017-09-15 16:51:47.979000064\n\
team,exit,423,2017-09-15 16:51:47.979000064\n\
coach,team,424,2017-09-15 17:50:14.351000064\n\
team,track,424,2017-09-15 17:52:15.968999936\n\
track,route,424,2017-09-15 17:52:21.390000128\n\
route,track,424,2017-09-15 17:52:28.363000064\n\
track,route,424,2017-09-15 17:52:34.076999936\n\
route,track,424,2017-09-15 17:52:41.755000064\n\
track,personal,424,2017-09-15 17:52:48.172999936\n\
personal,exit,424,2017-09-15 17:52:48.172999936\n\
coach,track,425,2017-09-16 07:48:25.273999872\n\
track,route,425,2017-09-16 07:48:38.696000000\n\
route,track,425,2017-09-16 07:48:40.219000064\n\
track,team,425,2017-09-16 07:48:45.548000000\n\
team,badges,425,2017-09-16 07:49:07.180000000\n\
badges,coach,425,2017-09-16 07:49:15.028000000\n\
coach,personal,425,2017-09-16 07:49:29.494000128\n\
personal,exit,425,2017-09-16 07:49:29.494000128\n\
coach,track,426,2017-09-16 11:22:51.030000128\n\
track,exit,426,2017-09-16 11:22:51.030000128\n\
coach,track,427,2017-09-17 06:17:55.131000064\n\
track,route,427,2017-09-17 06:18:13.156999936\n\
route,track,427,2017-09-17 06:18:21.873999872\n\
track,exit,427,2017-09-17 06:18:21.873999872\n\
coach,team,428,2017-09-17 15:43:25.236999936\n\
team,exit,428,2017-09-17 15:43:25.236999936\n\
coach,track,429,2017-09-19 06:25:34.272000000\n\
track,route,429,2017-09-19 06:25:52.480999936\n\
route,track,429,2017-09-19 06:26:01.574000128\n\
track,coach,429,2017-09-19 06:26:04.071000064\n\
coach,track,429,2017-09-19 06:26:06.900999936\n\
track,exit,429,2017-09-19 06:26:06.900999936\n\
coach,team,430,2017-09-23 06:17:58.471000064\n\
team,track,430,2017-09-23 06:18:06.287000064\n\
track,exit,430,2017-09-23 06:18:06.287000064\n\
route,coach,431,2017-09-23 07:56:11.108000000\n\
coach,team,431,2017-09-23 07:57:50.392000000\n\
team,exit,431,2017-09-23 07:57:50.392000000\n\
coach,track,432,2017-09-01 16:49:19.001999872\n\
track,team,432,2017-09-01 16:49:31.255000064\n\
team,personal,432,2017-09-01 16:49:42.067000064\n\
personal,team,432,2017-09-01 16:50:00.776999936\n\
team,coach,432,2017-09-01 16:50:08.260000000\n\
coach,team,432,2017-09-01 16:50:12.168000000\n\
team,competition,432,2017-09-01 16:50:14.112999936\n\
competition,routes,432,2017-09-01 16:50:21.568999936\n\
routes,exit,432,2017-09-01 16:50:21.568999936\n\
coach,team,433,2017-09-03 16:20:23.468999936\n\
team,exit,433,2017-09-03 16:20:23.468999936\n\
coach,track,434,2017-09-05 15:46:00.272000000\n\
track,exit,434,2017-09-05 15:46:00.272000000\n\
route,team,435,2017-09-05 18:41:56.251000064\n\
team,coach,435,2017-09-05 18:42:30.788000000\n\
coach,competition,435,2017-09-05 18:42:37.732000000\n\
competition,coach,435,2017-09-05 18:42:45.366000128\n\
coach,competition,435,2017-09-05 18:42:49.688000000\n\
competition,coach,435,2017-09-05 18:42:52.136000000\n\
coach,team,435,2017-09-05 18:42:56.489999872\n\
team,exit,435,2017-09-05 18:42:56.489999872\n\
coach,competition,436,2017-09-06 08:18:33.763000064\n\
competition,personal,436,2017-09-06 08:18:38.212999936\n\
personal,coach,436,2017-09-06 08:18:49.963000064\n\
coach,team,436,2017-09-06 08:19:25.755000064\n\
team,personal,436,2017-09-06 08:19:40.724999936\n\
personal,bugreport,436,2017-09-06 08:19:41.926000128\n\
bugreport,personal,436,2017-09-06 08:19:56.364999936\n\
personal,bugreport,436,2017-09-06 08:19:59.048999936\n\
bugreport,coach,436,2017-09-06 08:20:02.316000000\n\
coach,competition,436,2017-09-06 08:20:49.335000064\n\
competition,coach,436,2017-09-06 08:20:55.604000000\n\
coach,team,436,2017-09-06 08:20:57.592999936\n\
team,competition,436,2017-09-06 08:21:19.336000000\n\
competition,team,436,2017-09-06 08:21:29.376999936\n\
team,exit,436,2017-09-06 08:21:29.376999936\n\
coach,competition,437,2017-09-08 09:56:02.136999936\n\
competition,coach,437,2017-09-08 09:56:09.201999872\n\
coach,team,437,2017-09-08 09:56:11.459000064\n\
team,competition,437,2017-09-08 09:56:26.864999936\n\
competition,personal,437,2017-09-08 09:56:30.876000000\n\
personal,exit,437,2017-09-08 09:56:30.876000000\n\
coach,track,438,2017-09-12 15:47:28.644000000\n\
track,exit,438,2017-09-12 15:47:28.644000000\n\
coach,track,439,2017-09-12 16:30:12.913999872\n\
track,exit,439,2017-09-12 16:30:12.913999872\n\
coach,exit,440,2017-09-13 12:58:13.412999936\n\
coach,team,441,2017-09-15 13:29:23.352000000\n\
team,competition,441,2017-09-15 13:29:42.518000128\n\
competition,coach,441,2017-09-15 13:30:03.936000000\n\
coach,personal,441,2017-09-15 13:30:09.649999872\n\
personal,bugreport,441,2017-09-15 13:30:11.046000128\n\
bugreport,coach,441,2017-09-15 13:44:32.241999872\n\
coach,exit,441,2017-09-15 13:44:32.241999872\n\
coach,exit,442,2017-09-15 15:28:58.534000128\n\
coach,track,443,2017-09-17 05:51:45.480000000\n\
track,exit,443,2017-09-17 05:51:45.480000000\n\
coach,team,444,2017-09-19 09:23:06.212999936\n\
team,exit,444,2017-09-19 09:23:06.212999936\n\
coach,exit,445,2017-09-19 12:12:59.004000000\n\
coach,personal,446,2017-09-19 20:36:01.524999936\n\
personal,coach,446,2017-09-19 20:36:04.656999936\n\
coach,competition,446,2017-09-19 20:36:10.224000000\n\
competition,exit,446,2017-09-19 20:36:10.224000000\n\
coach,exit,447,2017-09-20 07:01:25.007000064\n\
coach,exit,448,2017-09-19 15:55:10.475000064\n\
coach,track,449,2017-09-19 15:58:01.539000064\n\
track,exit,449,2017-09-19 15:58:01.539000064\n\
coach,personal,450,2017-09-19 23:44:12.252000000\n\
personal,bugreport,450,2017-09-19 23:44:31.104000000\n\
bugreport,personal,450,2017-09-19 23:44:53.524000000\n\
personal,bugreport,450,2017-09-19 23:45:41.406000128\n\
bugreport,personal,450,2017-09-19 23:45:45.420999936\n\
personal,bugreport,450,2017-09-19 23:45:49.249999872\n\
bugreport,track,450,2017-09-19 23:45:55.609999872\n\
track,team,450,2017-09-19 23:46:04.168999936\n\
team,competition,450,2017-09-19 23:46:40.732999936\n\
competition,routes,450,2017-09-19 23:46:56.436000000\n\
routes,badges,450,2017-09-19 23:47:04.283000064\n\
badges,coach,450,2017-09-19 23:47:14.084000000\n\
coach,track,450,2017-09-19 23:47:24.406000128\n\
track,exit,450,2017-09-19 23:47:24.406000128\n\
coach,personal,451,2017-09-20 07:48:48.172999936\n\
personal,coach,451,2017-09-20 07:49:01.108000000\n\
coach,team,451,2017-09-20 07:49:13.982000128\n\
team,routes,451,2017-09-20 07:49:34.464000000\n\
routes,route,451,2017-09-20 07:49:40.576000000\n\
route,routes,451,2017-09-20 07:49:55.636999936\n\
routes,track,451,2017-09-20 07:50:06.094000128\n\
track,exit,451,2017-09-20 07:50:06.094000128\n\
coach,track,452,2017-09-21 07:31:16.180000000\n\
track,route,452,2017-09-21 07:34:55.745999872\n\
route,track,452,2017-09-21 07:35:01.025999872\n\
track,exit,452,2017-09-21 07:35:01.025999872\n\
coach,exit,453,2017-09-21 11:19:21.900000000\n\
coach,exit,454,2017-09-21 11:20:32.179000064\n\
coach,exit,455,2017-09-21 11:22:58.870000128\n\
coach,competition,456,2017-09-21 11:25:11.473999872\n\
competition,coach,456,2017-09-21 11:25:31.771000064\n\
coach,team,456,2017-09-21 11:25:36.891000064\n\
team,exit,456,2017-09-21 11:25:36.891000064\n\
coach,exit,457,2017-09-22 05:46:40.654000128\n\
coach,exit,458,2017-09-22 07:16:08.435000064\n\
coach,exit,459,2017-09-22 10:50:30.382000128\n\
coach,personal,460,2017-09-25 07:29:51.104999936\n\
personal,exit,460,2017-09-25 07:29:51.104999936\n\
coach,personal,461,2017-09-11 15:08:47.246000128\n\
personal,track,461,2017-09-11 15:09:39.124999936\n\
track,team,461,2017-09-11 15:09:42.648000000\n\
team,coach,461,2017-09-11 15:09:57.905999872\n\
coach,competition,461,2017-09-11 15:10:08.643000064\n\
competition,team,461,2017-09-11 15:10:28.772000000\n\
team,personal,461,2017-09-11 15:10:47.788000000\n\
personal,team,461,2017-09-11 15:10:49.305999872\n\
team,competition,461,2017-09-11 15:10:52.707000064\n\
competition,routes,461,2017-09-11 15:10:54.988999936\n\
routes,badges,461,2017-09-11 15:10:57.948999936\n\
badges,coach,461,2017-09-11 15:11:01.307000064\n\
coach,personal,461,2017-09-11 15:11:35.104000000\n\
personal,exit,461,2017-09-11 15:11:35.104000000\n\
coach,team,462,2017-09-12 07:03:41.764000000\n\
team,competition,462,2017-09-12 07:03:58.542000128\n\
competition,routes,462,2017-09-12 07:04:08.839000064\n\
routes,coach,462,2017-09-12 07:04:12.694000128\n\
coach,exit,462,2017-09-12 07:04:12.694000128\n\
coach,personal,463,2017-09-12 07:22:27.176000000\n\
personal,exit,463,2017-09-12 07:22:27.176000000\n\
coach,track,464,2017-09-13 16:59:49.287000064\n\
track,route,464,2017-09-13 17:04:49.376999936\n\
route,track,464,2017-09-13 17:04:55.382000128\n\
track,coach,464,2017-09-13 17:05:02.519000064\n\
coach,competition,464,2017-09-13 17:06:07.905999872\n\
competition,team,464,2017-09-13 17:06:19.412999936\n\
team,routes,464,2017-09-13 17:06:37.761999872\n\
routes,route,464,2017-09-13 17:06:41.601999872\n\
route,routes,464,2017-09-13 17:06:46.030000128\n\
routes,coach,464,2017-09-13 17:06:49.822000128\n\
coach,exit,464,2017-09-13 17:06:49.822000128\n\
coach,exit,465,2017-09-13 18:00:32.212000000\n\
coach,track,466,2017-09-14 07:01:56.360000000\n\
track,route,466,2017-09-14 07:02:02.784000000\n\
route,track,466,2017-09-14 07:02:12.899000064\n\
track,coach,466,2017-09-14 07:02:16.595000064\n\
coach,track,466,2017-09-14 07:02:23.764999936\n\
track,route,466,2017-09-14 07:02:30.825999872\n\
route,track,466,2017-09-14 07:02:34.247000064\n\
track,route,466,2017-09-14 07:09:08.320000000\n\
route,track,466,2017-09-14 07:09:16.817999872\n\
track,coach,466,2017-09-14 07:09:37.609999872\n\
coach,exit,466,2017-09-14 07:09:37.609999872\n\
coach,competition,467,2017-09-14 07:27:31.416000000\n\
competition,coach,467,2017-09-14 07:27:49.764000000\n\
coach,competition,467,2017-09-14 07:27:51.764000000\n\
competition,coach,467,2017-09-14 07:28:04.340999936\n\
coach,team,467,2017-09-14 07:28:06.713999872\n\
team,competition,467,2017-09-14 07:29:23.240999936\n\
competition,coach,467,2017-09-14 07:29:38.008000000\n\
coach,competition,467,2017-09-14 07:31:05.380000000\n\
competition,coach,467,2017-09-14 07:31:09.096999936\n\
coach,exit,467,2017-09-14 07:31:09.096999936\n\
coach,exit,468,2017-09-14 13:43:16.921999872\n\
competition,routes,469,2017-09-14 14:15:09.784999936\n\
routes,badges,469,2017-09-14 14:15:16.140000000\n\
badges,competition,469,2017-09-14 14:15:39.432000000\n\
competition,team,469,2017-09-14 14:15:42.404999936\n\
team,track,469,2017-09-14 14:15:48.183000064\n\
track,coach,469,2017-09-14 14:15:54.932000000\n\
coach,competition,469,2017-09-14 14:29:47.212000000\n\
competition,coach,469,2017-09-14 14:29:48.923000064\n\
coach,competition,469,2017-09-14 14:29:50.276999936\n\
competition,coach,469,2017-09-14 14:29:52.980000000\n\
coach,competition,469,2017-09-14 14:29:58.326000128\n\
competition,coach,469,2017-09-14 14:29:59.568000000\n\
coach,competition,469,2017-09-14 14:30:22.892000000\n\
competition,coach,469,2017-09-14 14:30:26.251000064\n\
coach,personal,469,2017-09-14 14:30:30.526000128\n\
personal,coach,469,2017-09-14 14:30:59.720999936\n\
coach,competition,469,2017-09-14 14:31:14.272000000\n\
competition,coach,469,2017-09-14 14:31:21.167000064\n\
coach,team,469,2017-09-14 14:31:25.224999936\n\
team,competition,469,2017-09-14 14:31:31.001999872\n\
competition,track,469,2017-09-14 14:31:44.596000000\n\
track,team,469,2017-09-14 14:31:59.395000064\n\
team,personal,469,2017-09-14 14:32:08.633999872\n\
personal,team,469,2017-09-14 14:32:13.715000064\n\
team,track,469,2017-09-14 14:32:17.880000000\n\
track,routes,469,2017-09-14 14:32:25.435000064\n\
routes,coach,469,2017-09-14 14:32:28.575000064\n\
coach,competition,469,2017-09-14 14:32:35.752999936\n\
competition,coach,469,2017-09-14 14:32:37.811000064\n\
coach,competition,469,2017-09-14 14:37:48.063000064\n\
competition,coach,469,2017-09-14 14:37:50.633999872\n\
coach,competition,469,2017-09-14 14:37:54.311000064\n\
competition,coach,469,2017-09-14 14:37:56.281999872\n\
coach,exit,469,2017-09-14 14:37:56.281999872\n\
coach,track,470,2017-09-14 16:45:09.244000000\n\
track,route,470,2017-09-14 16:50:36.635000064\n\
route,track,470,2017-09-14 16:50:39.644999936\n\
track,coach,470,2017-09-14 16:51:13.224999936\n\
coach,exit,470,2017-09-14 16:51:13.224999936\n\
coach,exit,471,2017-09-14 16:53:15.883000064\n\
competition,coach,472,2017-09-14 19:38:29.908000000\n\
coach,team,472,2017-09-14 19:38:36.600999936\n\
team,competition,472,2017-09-14 19:38:52.792000000\n\
competition,track,472,2017-09-14 19:39:23.209999872\n\
track,competition,472,2017-09-14 19:39:25.983000064\n\
competition,routes,472,2017-09-14 19:39:29.169999872\n\
routes,route,472,2017-09-14 19:39:33.998000128\n\
route,routes,472,2017-09-14 19:39:36.481999872\n\
routes,route,472,2017-09-14 19:39:37.329999872\n\
route,routes,472,2017-09-14 19:39:39.505999872\n\
routes,route,472,2017-09-14 19:39:40.584999936\n\
route,routes,472,2017-09-14 19:39:46.816000000\n\
routes,route,472,2017-09-14 19:39:48.232999936\n\
route,routes,472,2017-09-14 19:39:51.220999936\n\
routes,route,472,2017-09-14 19:39:52.251000064\n\
route,routes,472,2017-09-14 19:39:55.328000000\n\
routes,route,472,2017-09-14 19:39:56.412000000\n\
route,routes,472,2017-09-14 19:39:58.427000064\n\
routes,route,472,2017-09-14 19:39:59.868999936\n\
route,routes,472,2017-09-14 19:40:04.497999872\n\
routes,route,472,2017-09-14 19:40:05.729999872\n\
route,routes,472,2017-09-14 19:40:07.248999936\n\
routes,route,472,2017-09-14 19:40:09.264999936\n\
route,routes,472,2017-09-14 19:40:10.817999872\n\
routes,route,472,2017-09-14 19:40:12.020000000\n\
route,routes,472,2017-09-14 19:40:13.712999936\n\
routes,exit,472,2017-09-14 19:40:13.712999936\n\
coach,track,473,2017-09-15 07:08:13.900000000\n\
track,route,473,2017-09-15 07:12:54.343000064\n\
route,track,473,2017-09-15 07:13:02.644000000\n\
track,team,473,2017-09-15 07:15:37.065999872\n\
team,competition,473,2017-09-15 07:15:44.368999936\n\
competition,routes,473,2017-09-15 07:15:52.225999872\n\
routes,route,473,2017-09-15 07:15:58.648000000\n\
route,routes,473,2017-09-15 07:16:49.228000000\n\
routes,exit,473,2017-09-15 07:16:49.228000000\n\
coach,competition,474,2017-09-15 10:38:00.961999872\n\
competition,coach,474,2017-09-15 10:38:11.404000000\n\
coach,team,474,2017-09-15 10:38:15.344999936\n\
team,competition,474,2017-09-15 10:38:45.807000064\n\
competition,team,474,2017-09-15 10:39:05.988999936\n\
team,routes,474,2017-09-15 10:39:25.723000064\n\
routes,coach,474,2017-09-15 10:39:29.572000000\n\
coach,competition,474,2017-09-15 10:39:36.319000064\n\
competition,coach,474,2017-09-15 10:39:40.497999872\n\
coach,exit,474,2017-09-15 10:39:40.497999872\n\
coach,team,475,2017-09-15 11:20:07.328999936\n\
team,exit,475,2017-09-15 11:20:07.328999936\n\
coach,competition,476,2017-09-15 13:31:01.468999936\n\
competition,coach,476,2017-09-15 13:31:12.740999936\n\
coach,track,476,2017-09-15 13:31:14.766000128\n\
track,route,476,2017-09-15 14:00:24.808000000\n\
route,track,476,2017-09-15 14:00:32.011000064\n\
track,coach,476,2017-09-15 14:00:37.208000000\n\
coach,competition,476,2017-09-15 14:00:46.256000000\n\
competition,coach,476,2017-09-15 14:01:28.227000064\n\
coach,competition,476,2017-09-15 14:01:29.769999872\n\
competition,coach,476,2017-09-15 14:01:34.428999936\n\
coach,routes,476,2017-09-15 14:01:42.878000128\n\
routes,route,476,2017-09-15 14:01:45.502000128\n\
route,routes,476,2017-09-15 14:01:50.403000064\n\
routes,route,476,2017-09-15 14:01:52.596999936\n\
route,routes,476,2017-09-15 14:02:00.252999936\n\
routes,route,476,2017-09-15 14:02:01.856000000\n\
route,routes,476,2017-09-15 14:02:04.244999936\n\
routes,route,476,2017-09-15 14:02:06.526000128\n\
route,routes,476,2017-09-15 14:02:08.848999936\n\
routes,route,476,2017-09-15 14:02:10.707000064\n\
route,routes,476,2017-09-15 14:02:12.884999936\n\
routes,route,476,2017-09-15 14:02:14.655000064\n\
route,routes,476,2017-09-15 14:02:16.579000064\n\
routes,track,476,2017-09-15 14:02:19.700999936\n\
track,route,476,2017-09-15 14:19:41.891000064\n\
route,track,476,2017-09-15 14:21:53.252000000\n\
track,coach,476,2017-09-15 14:27:22.468999936\n\
coach,exit,476,2017-09-15 14:27:22.468999936\n\
coach,competition,477,2017-09-15 14:28:53.867000064\n\
competition,coach,477,2017-09-15 14:28:56.060999936\n\
coach,track,477,2017-09-15 14:29:02.743000064\n\
track,route,477,2017-09-15 14:29:08.169999872\n\
route,track,477,2017-09-15 14:29:25.676000000\n\
track,exit,477,2017-09-15 14:29:25.676000000\n\
route,exit,478,2017-09-15 15:03:58.567000064\n\
coach,competition,479,2017-09-15 15:36:39.601999872\n\
competition,coach,479,2017-09-15 15:36:43.312999936\n\
coach,competition,479,2017-09-15 15:36:56.264999936\n\
competition,coach,479,2017-09-15 15:37:04.032000000\n\
coach,competition,479,2017-09-15 15:37:38.532999936\n\
competition,coach,479,2017-09-15 15:37:41.363000064\n\
coach,competition,479,2017-09-15 15:40:37.611000064\n\
competition,coach,479,2017-09-15 15:40:50.934000128\n\
coach,team,479,2017-09-15 15:40:54.345999872\n\
team,competition,479,2017-09-15 15:41:54.417999872\n\
competition,team,479,2017-09-15 15:42:03.560999936\n\
team,badges,479,2017-09-15 15:42:11.590000128\n\
badges,track,479,2017-09-15 15:42:34.483000064\n\
track,competition,479,2017-09-15 15:42:37.932999936\n\
competition,team,479,2017-09-15 15:42:42.404999936\n\
team,competition,479,2017-09-15 15:43:20.727000064\n\
competition,coach,479,2017-09-15 15:43:34.382000128\n\
coach,routes,479,2017-09-15 15:43:40.871000064\n\
routes,route,479,2017-09-15 15:43:44.831000064\n\
route,routes,479,2017-09-15 15:43:49.572999936\n\
routes,route,479,2017-09-15 15:43:51.372999936\n\
route,routes,479,2017-09-15 15:44:07.096999936\n\
routes,route,479,2017-09-15 15:44:08.921999872\n\
route,routes,479,2017-09-15 15:44:13.385999872\n\
routes,route,479,2017-09-15 15:44:15.424999936\n\
route,routes,479,2017-09-15 15:44:30.080000000\n\
routes,route,479,2017-09-15 15:44:33.075000064\n\
route,routes,479,2017-09-15 15:44:34.849999872\n\
routes,route,479,2017-09-15 15:44:36.291000064\n\
route,routes,479,2017-09-15 15:44:44.940999936\n\
routes,route,479,2017-09-15 15:44:46.492000000\n\
route,routes,479,2017-09-15 15:44:54.044000000\n\
routes,route,479,2017-09-15 15:44:56.855000064\n\
route,routes,479,2017-09-15 15:45:01.921999872\n\
routes,route,479,2017-09-15 15:45:05.512999936\n\
route,routes,479,2017-09-15 15:45:12.236000000\n\
routes,route,479,2017-09-15 15:45:16.196999936\n\
route,routes,479,2017-09-15 15:45:20.108999936\n\
routes,route,479,2017-09-15 15:45:23.735000064\n\
route,routes,479,2017-09-15 15:45:26.883000064\n\
routes,route,479,2017-09-15 15:45:27.784000000\n\
route,routes,479,2017-09-15 15:45:33.342000128\n\
routes,route,479,2017-09-15 15:45:36.352999936\n\
route,routes,479,2017-09-15 15:45:38.326000128\n\
routes,route,479,2017-09-15 15:45:40.928999936\n\
route,routes,479,2017-09-15 15:46:03.798000128\n\
routes,route,479,2017-09-15 15:46:05.715000064\n\
route,routes,479,2017-09-15 15:46:07.008999936\n\
routes,route,479,2017-09-15 15:46:09.584000000\n\
route,exit,479,2017-09-15 15:46:09.584000000\n\
coach,exit,480,2017-09-15 20:33:40.641999872\n\
coach,exit,481,2017-09-15 23:56:00.828000000\n\
coach,exit,482,2017-09-16 10:39:57.320999936\n\
coach,track,483,2017-09-16 11:51:31.040999936\n\
track,exit,483,2017-09-16 11:51:31.040999936\n\
route,track,484,2017-09-16 12:23:19.982000128\n\
track,coach,484,2017-09-16 12:30:13.108000000\n\
coach,exit,484,2017-09-16 12:30:13.108000000\n\
coach,track,485,2017-09-16 15:47:04.936000000\n\
track,exit,485,2017-09-16 15:47:04.936000000\n\
route,exit,486,2017-09-16 16:25:19.977999872\n\
coach,competition,487,2017-09-16 18:49:14.747000064\n\
competition,coach,487,2017-09-16 18:49:17.144000000\n\
coach,competition,487,2017-09-16 18:49:18.415000064\n\
competition,coach,487,2017-09-16 18:49:19.764999936\n\
coach,routes,487,2017-09-16 18:49:26.511000064\n\
routes,coach,487,2017-09-16 18:49:40.892000000\n\
coach,competition,487,2017-09-16 18:49:43.464000000\n\
competition,coach,487,2017-09-16 18:49:49.142000128\n\
coach,exit,487,2017-09-16 18:49:49.142000128\n\
coach,competition,488,2017-09-16 22:34:23.227000064\n\
competition,coach,488,2017-09-16 22:34:25.347000064\n\
coach,exit,488,2017-09-16 22:34:25.347000064\n\
competition,coach,489,2017-09-16 23:17:25.486000128\n\
coach,routes,489,2017-09-16 23:17:31.735000064\n\
routes,route,489,2017-09-16 23:17:34.897999872\n\
route,routes,489,2017-09-16 23:17:59.910000128\n\
routes,route,489,2017-09-16 23:18:02.412000000\n\
route,routes,489,2017-09-16 23:18:18.012000000\n\
routes,route,489,2017-09-16 23:18:22.481999872\n\
route,routes,489,2017-09-16 23:18:36.396999936\n\
routes,route,489,2017-09-16 23:18:39.772000000\n\
route,routes,489,2017-09-16 23:18:54.600999936\n\
routes,route,489,2017-09-16 23:18:58.255000064\n\
route,routes,489,2017-09-16 23:19:01.988000000\n\
routes,route,489,2017-09-16 23:19:04.878000128\n\
route,routes,489,2017-09-16 23:19:20.156000000\n\
routes,team,489,2017-09-16 23:19:23.371000064\n\
team,competition,489,2017-09-16 23:20:41.263000064\n\
competition,badges,489,2017-09-16 23:20:48.384000000\n\
badges,team,489,2017-09-16 23:21:07.879000064\n\
team,competition,489,2017-09-16 23:21:50.164000000\n\
competition,routes,489,2017-09-16 23:21:58.272000000\n\
routes,exit,489,2017-09-16 23:21:58.272000000\n\
coach,competition,490,2017-09-17 16:05:45.128000000\n\
competition,team,490,2017-09-17 16:06:08.164999936\n\
team,coach,490,2017-09-17 16:06:49.199000064\n\
coach,badges,490,2017-09-17 16:06:57.404999936\n\
badges,exit,490,2017-09-17 16:06:57.404999936\n\
coach,competition,491,2017-09-18 11:30:50.404000000\n\
competition,team,491,2017-09-18 11:31:20.144000000\n\
team,track,491,2017-09-18 11:32:02.576999936\n\
track,routes,491,2017-09-18 11:32:18.703000064\n\
routes,route,491,2017-09-18 11:32:22.425999872\n\
route,routes,491,2017-09-18 11:32:24.334000128\n\
routes,route,491,2017-09-18 11:32:25.595000064\n\
route,coach,491,2017-09-18 11:34:07.408000000\n\
coach,badges,491,2017-09-18 11:34:16.779000064\n\
badges,exit,491,2017-09-18 11:34:16.779000064\n\
coach,exit,492,2017-09-18 15:31:15.584000000\n\
coach,exit,493,2017-09-18 18:14:20.452000000\n\
coach,exit,494,2017-09-18 22:28:42.552999936\n\
coach,exit,495,2017-09-19 10:08:05.471000064\n\
coach,exit,496,2017-09-19 10:28:34.504000000\n\
coach,exit,497,2017-09-19 11:00:22.641999872\n\
coach,exit,498,2017-09-19 11:31:10.344000000\n\
coach,exit,499,2017-09-19 11:53:58.166000128\n\
coach,exit,500,2017-09-19 13:45:12.655000064\n\
coach,exit,501,2017-09-19 14:22:31.668000000\n\
coach,exit,502,2017-09-19 15:27:23.348999936\n\
coach,exit,503,2017-09-19 15:32:25.172999936\n\
coach,exit,504,2017-09-19 15:40:21.083000064\n\
coach,exit,505,2017-09-19 16:54:31.164999936\n\
coach,exit,506,2017-09-19 17:47:37.401999872\n\
coach,exit,507,2017-09-19 19:53:18.264999936\n\
coach,exit,508,2017-09-19 21:56:51.927000064\n\
coach,track,509,2017-09-20 06:06:40.561999872\n\
track,route,509,2017-09-20 06:06:41.887000064\n\
route,track,509,2017-09-20 06:06:44.804999936\n\
track,route,509,2017-09-20 06:06:50.199000064\n\
route,track,509,2017-09-20 06:06:53.396999936\n\
track,coach,509,2017-09-20 06:06:55.352999936\n\
coach,track,509,2017-09-20 06:06:58.160999936\n\
track,exit,509,2017-09-20 06:06:58.160999936\n\
coach,track,510,2017-09-20 07:25:36.982000128\n\
track,route,510,2017-09-20 07:25:40.380000000\n\
route,coach,510,2017-09-20 07:25:57.000000000\n\
coach,competition,510,2017-09-20 07:27:19.556000000\n\
competition,coach,510,2017-09-20 07:27:34.659000064\n\
coach,competition,510,2017-09-20 07:27:36.436000000\n\
competition,coach,510,2017-09-20 07:27:41.020000000\n\
coach,track,510,2017-09-20 07:28:05.809999872\n\
track,team,510,2017-09-20 07:28:06.140000000\n\
team,exit,510,2017-09-20 07:28:06.140000000\n\
coach,badges,511,2017-09-20 14:23:18.447000064\n\
badges,competition,511,2017-09-20 14:23:41.593999872\n\
competition,track,511,2017-09-20 14:24:24.388999936\n\
track,routes,511,2017-09-20 14:24:28.616999936\n\
routes,badges,511,2017-09-20 14:24:32.931000064\n\
badges,coach,511,2017-09-20 14:24:53.324999936\n\
coach,exit,511,2017-09-20 14:24:53.324999936\n\
coach,exit,512,2017-09-20 16:17:37.155000064\n\
coach,track,513,2017-09-20 16:17:41.024000000\n\
track,coach,513,2017-09-20 16:19:01.619000064\n\
coach,competition,513,2017-09-20 16:19:07.132000000\n\
competition,coach,513,2017-09-20 16:19:09.392999936\n\
coach,track,513,2017-09-20 16:19:11.320999936\n\
track,route,513,2017-09-20 16:40:48.518000128\n\
route,track,513,2017-09-20 16:41:03.003000064\n\
track,coach,513,2017-09-20 16:41:14.095000064\n\
coach,track,513,2017-09-20 16:42:09.334000128\n\
track,coach,513,2017-09-20 17:04:01.673999872\n\
coach,track,513,2017-09-20 17:05:23.016999936\n\
track,coach,513,2017-09-20 17:05:36.519000064\n\
coach,track,513,2017-09-20 17:05:41.948999936\n\
track,route,513,2017-09-20 17:05:48.630000128\n\
route,exit,513,2017-09-20 17:05:48.630000128\n\
track,exit,514,2017-09-20 17:41:21.792999936\n\
coach,competition,515,2017-09-20 22:10:41.492999936\n\
competition,coach,515,2017-09-20 22:10:49.628000000\n\
coach,competition,515,2017-09-20 22:11:07.984999936\n\
competition,coach,515,2017-09-20 22:11:10.527000064\n\
coach,routes,515,2017-09-20 22:11:13.023000064\n\
routes,route,515,2017-09-20 22:11:17.673999872\n\
route,routes,515,2017-09-20 22:11:26.260000000\n\
routes,route,515,2017-09-20 22:11:28.528000000\n\
route,routes,515,2017-09-20 22:11:48.932000000\n\
routes,route,515,2017-09-20 22:11:51.464999936\n\
route,routes,515,2017-09-20 22:11:55.004999936\n\
routes,route,515,2017-09-20 22:11:56.492999936\n\
route,routes,515,2017-09-20 22:12:02.780999936\n\
routes,route,515,2017-09-20 22:12:05.288999936\n\
route,routes,515,2017-09-20 22:12:16.100000000\n\
routes,route,515,2017-09-20 22:12:19.185999872\n\
route,routes,515,2017-09-20 22:12:27.420999936\n\
routes,route,515,2017-09-20 22:12:30.252999936\n\
route,routes,515,2017-09-20 22:12:36.329999872\n\
routes,route,515,2017-09-20 22:12:38.016000000\n\
route,routes,515,2017-09-20 22:12:52.728999936\n\
routes,route,515,2017-09-20 22:12:54.284000000\n\
route,routes,515,2017-09-20 22:13:00.400999936\n\
routes,badges,515,2017-09-20 22:13:03.723000064\n\
badges,team,515,2017-09-20 22:13:35.979000064\n\
team,competition,515,2017-09-20 22:15:35.476999936\n\
competition,exit,515,2017-09-20 22:15:35.476999936\n\
coach,track,516,2017-09-21 07:12:49.228999936\n\
track,route,516,2017-09-21 07:18:48.192999936\n\
route,exit,516,2017-09-21 07:18:48.192999936\n\
track,competition,517,2017-09-21 08:02:49.936000000\n\
competition,exit,517,2017-09-21 08:02:49.936000000\n\
coach,track,518,2017-09-21 13:52:19.582000128\n\
track,route,518,2017-09-21 14:04:28.747000064\n\
route,coach,518,2017-09-21 14:04:41.054000128\n\
coach,exit,518,2017-09-21 14:04:41.054000128\n\
competition,team,519,2017-09-21 15:56:57.156999936\n\
team,track,519,2017-09-21 15:58:26.271000064\n\
track,badges,519,2017-09-21 15:58:29.460999936\n\
badges,exit,519,2017-09-21 15:58:29.460999936\n\
coach,competition,520,2017-09-21 21:40:11.489999872\n\
competition,coach,520,2017-09-21 21:40:38.918000128\n\
coach,track,520,2017-09-21 21:40:41.780999936\n\
track,routes,520,2017-09-21 21:40:53.470000128\n\
routes,route,520,2017-09-21 21:40:57.216000000\n\
route,routes,520,2017-09-21 21:41:16.804999936\n\
routes,route,520,2017-09-21 21:41:18.720000000\n\
route,routes,520,2017-09-21 21:41:23.585999872\n\
routes,route,520,2017-09-21 21:41:25.195000064\n\
route,routes,520,2017-09-21 21:41:30.951000064\n\
routes,route,520,2017-09-21 21:41:32.271000064\n\
route,routes,520,2017-09-21 21:41:35.974000128\n\
routes,route,520,2017-09-21 21:41:37.784999936\n\
route,routes,520,2017-09-21 21:41:41.795000064\n\
routes,route,520,2017-09-21 21:41:43.630000128\n\
route,routes,520,2017-09-21 21:41:56.820000000\n\
routes,exit,520,2017-09-21 21:41:56.820000000\n\
coach,competition,521,2017-09-21 22:37:54.583000064\n\
competition,badges,521,2017-09-21 22:38:05.296000000\n\
badges,coach,521,2017-09-21 22:38:16.840000000\n\
coach,exit,521,2017-09-21 22:38:16.840000000\n\
coach,competition,522,2017-09-22 13:32:58.535000064\n\
competition,team,522,2017-09-22 13:33:12.771000064\n\
team,track,522,2017-09-22 13:33:27.623000064\n\
track,exit,522,2017-09-22 13:33:27.623000064\n\
coach,exit,523,2017-09-22 16:34:55.622000128\n\
coach,competition,524,2017-09-24 08:25:03.656999936\n\
competition,routes,524,2017-09-24 08:25:34.444999936\n\
routes,team,524,2017-09-24 08:25:37.987000064\n\
team,coach,524,2017-09-24 08:41:04.643000064\n\
coach,competition,524,2017-09-24 08:41:09.625999872\n\
competition,team,524,2017-09-24 08:41:23.720000000\n\
team,badges,524,2017-09-24 08:41:28.006000128\n\
badges,track,524,2017-09-24 08:55:18.272000000\n\
track,coach,524,2017-09-24 09:24:39.367000064\n\
coach,track,524,2017-09-24 09:28:25.295000064\n\
track,coach,524,2017-09-24 09:58:13.899000064\n\
coach,track,524,2017-09-24 09:59:30.624999936\n\
track,route,524,2017-09-24 09:59:34.648999936\n\
route,coach,524,2017-09-24 09:59:51.812999936\n\
coach,track,524,2017-09-24 09:59:56.004000000\n\
track,route,524,2017-09-24 10:00:05.404999936\n\
route,coach,524,2017-09-24 10:00:17.241999872\n\
coach,track,524,2017-09-24 10:00:19.881999872\n\
track,route,524,2017-09-24 10:00:58.188000000\n\
route,coach,524,2017-09-24 10:01:12.862000128\n\
coach,track,524,2017-09-24 10:03:34.374000128\n\
track,coach,524,2017-09-24 10:03:45.420999936\n\
coach,competition,524,2017-09-24 10:03:50.183000064\n\
competition,coach,524,2017-09-24 10:03:52.504000000\n\
coach,competition,524,2017-09-24 10:03:54.486000128\n\
competition,coach,524,2017-09-24 10:03:55.886000128\n\
coach,routes,524,2017-09-24 10:03:59.488000000\n\
routes,route,524,2017-09-24 10:04:05.985999872\n\
route,routes,524,2017-09-24 10:04:09.123000064\n\
routes,route,524,2017-09-24 10:04:10.128999936\n\
route,routes,524,2017-09-24 10:04:11.920000000\n\
routes,route,524,2017-09-24 10:04:12.824999936\n\
route,routes,524,2017-09-24 10:04:16.840999936\n\
routes,route,524,2017-09-24 10:04:19.374000128\n\
route,routes,524,2017-09-24 10:04:23.318000128\n\
routes,route,524,2017-09-24 10:04:28.646000128\n\
route,routes,524,2017-09-24 10:04:36.164999936\n\
routes,route,524,2017-09-24 10:04:38.819000064\n\
route,routes,524,2017-09-24 10:04:40.543000064\n\
routes,route,524,2017-09-24 10:04:43.192000000\n\
route,routes,524,2017-09-24 10:04:44.768999936\n\
routes,route,524,2017-09-24 10:04:46.715000064\n\
route,routes,524,2017-09-24 10:05:07.126000128\n\
routes,track,524,2017-09-24 10:05:09.804000000\n\
track,route,524,2017-09-24 10:05:12.863000064\n\
route,exit,524,2017-09-24 10:05:12.863000064\n\
track,route,525,2017-09-24 11:11:32.427000064\n\
route,track,525,2017-09-24 11:11:35.112000000\n\
track,coach,525,2017-09-24 11:11:37.591000064\n\
coach,exit,525,2017-09-24 11:11:37.591000064\n\
competition,routes,526,2017-09-24 12:21:55.315000064\n\
routes,route,526,2017-09-24 12:22:01.408999936\n\
route,routes,526,2017-09-24 12:22:10.696000000\n\
routes,route,526,2017-09-24 12:22:26.036000000\n\
route,routes,526,2017-09-24 12:22:30.064000000\n\
routes,route,526,2017-09-24 12:22:32.377999872\n\
route,routes,526,2017-09-24 12:22:34.268000000\n\
routes,route,526,2017-09-24 12:22:37.057999872\n\
route,routes,526,2017-09-24 12:22:49.454000128\n\
routes,coach,526,2017-09-24 12:22:53.684000000\n\
coach,competition,526,2017-09-24 12:23:43.427000064\n\
competition,coach,526,2017-09-24 12:23:48.363000064\n\
coach,badges,526,2017-09-24 12:24:00.392000000\n\
badges,routes,526,2017-09-24 12:24:11.828000000\n\
routes,route,526,2017-09-24 12:24:17.184000000\n\
route,coach,526,2017-09-24 12:24:27.327000064\n\
coach,routes,526,2017-09-24 12:24:29.887000064\n\
routes,exit,526,2017-09-24 12:24:29.887000064\n\
coach,competition,527,2017-09-24 18:52:15.470000128\n\
competition,team,527,2017-09-24 18:52:40.529999872\n\
team,coach,527,2017-09-24 18:53:08.667000064\n\
coach,routes,527,2017-09-24 18:53:19.888000000\n\
routes,route,527,2017-09-24 18:53:25.087000064\n\
route,routes,527,2017-09-24 18:53:41.304000000\n\
routes,route,527,2017-09-24 18:53:43.440000000\n\
route,routes,527,2017-09-24 18:53:50.808000000\n\
routes,route,527,2017-09-24 18:53:52.200000000\n\
route,routes,527,2017-09-24 18:53:57.660000000\n\
routes,route,527,2017-09-24 18:53:58.649999872\n\
route,routes,527,2017-09-24 18:54:02.561999872\n\
routes,badges,527,2017-09-24 18:54:09.991000064\n\
badges,exit,527,2017-09-24 18:54:09.991000064\n\
coach,personal,528,2017-09-07 18:58:42.292000000\n\
personal,coach,528,2017-09-07 18:59:07.606000128\n\
coach,team,528,2017-09-07 18:59:10.391000064\n\
team,competition,528,2017-09-07 18:59:30.726000128\n\
competition,routes,528,2017-09-07 18:59:40.878000128\n\
routes,coach,528,2017-09-07 18:59:47.799000064\n\
coach,track,528,2017-09-07 18:59:51.785999872\n\
track,route,528,2017-09-07 19:00:02.414000128\n\
route,track,528,2017-09-07 19:00:05.735000064\n\
track,badges,528,2017-09-07 19:00:09.768999936\n\
badges,personal,528,2017-09-07 19:00:25.745999872\n\
personal,exit,528,2017-09-07 19:00:25.745999872\n\
coach,track,529,2017-09-08 10:16:36.571000064\n\
track,route,529,2017-09-08 10:16:49.951000064\n\
route,track,529,2017-09-08 10:16:58.943000064\n\
track,team,529,2017-09-08 10:17:03.179000064\n\
team,personal,529,2017-09-08 10:17:18.752000000\n\
personal,team,529,2017-09-08 10:17:21.585999872\n\
team,exit,529,2017-09-08 10:17:21.585999872\n\
coach,team,530,2017-09-09 18:15:23.116000000\n\
team,competition,530,2017-09-09 18:16:01.204999936\n\
competition,routes,530,2017-09-09 18:16:11.636999936\n\
routes,personal,530,2017-09-09 18:16:22.523000064\n\
personal,route,530,2017-09-09 18:16:25.862000128\n\
route,routes,530,2017-09-09 18:16:34.303000064\n\
routes,track,530,2017-09-09 18:16:48.011000064\n\
track,personal,530,2017-09-09 18:18:26.334000128\n\
personal,track,530,2017-09-09 18:18:28.046000128\n\
track,personal,530,2017-09-09 18:18:30.100999936\n\
personal,bugreport,530,2017-09-09 18:18:30.927000064\n\
bugreport,track,530,2017-09-09 18:18:37.979000064\n\
track,team,530,2017-09-09 18:18:49.663000064\n\
team,routes,530,2017-09-09 18:18:59.599000064\n\
routes,badges,530,2017-09-09 18:19:02.070000128\n\
badges,coach,530,2017-09-09 18:19:06.936999936\n\
coach,track,530,2017-09-09 18:19:34.743000064\n\
track,coach,530,2017-09-09 18:19:54.647000064\n\
coach,track,530,2017-09-09 18:19:59.288000000\n\
track,route,530,2017-09-09 18:20:23.612000000\n\
route,track,530,2017-09-09 18:20:27.087000064\n\
track,coach,530,2017-09-09 18:20:34.351000064\n\
coach,exit,530,2017-09-09 18:20:34.351000064\n\
coach,track,531,2017-09-10 06:19:37.003000064\n\
track,exit,531,2017-09-10 06:19:37.003000064\n\
coach,competition,532,2017-09-10 09:22:36.417999872\n\
competition,coach,532,2017-09-10 09:22:40.403000064\n\
coach,team,532,2017-09-10 09:22:56.916000000\n\
team,exit,532,2017-09-10 09:22:56.916000000\n\
coach,track,533,2017-09-15 04:59:50.735000064\n\
track,route,533,2017-09-15 05:21:56.616999936\n\
route,exit,533,2017-09-15 05:21:56.616999936\n\
coach,team,534,2017-09-17 17:43:40.760999936\n\
team,competition,534,2017-09-17 17:44:05.895000064\n\
competition,team,534,2017-09-17 17:44:16.441999872\n\
team,personal,534,2017-09-17 17:44:21.961999872\n\
personal,team,534,2017-09-17 17:44:25.968999936\n\
team,exit,534,2017-09-17 17:44:25.968999936\n\
coach,track,535,2017-09-21 05:01:55.408999936\n\
track,route,535,2017-09-21 05:27:22.676000000\n\
route,coach,535,2017-09-21 05:27:39.545999872\n\
coach,competition,535,2017-09-21 05:27:53.256999936\n\
competition,exit,535,2017-09-21 05:27:53.256999936\n\
coach,competition,536,2017-09-21 16:50:41.300999936\n\
competition,coach,536,2017-09-21 16:50:48.668000000\n\
coach,team,536,2017-09-21 16:50:53.292999936\n\
team,competition,536,2017-09-21 16:51:18.699000064\n\
competition,personal,536,2017-09-21 16:51:22.219000064\n\
personal,competition,536,2017-09-21 16:51:26.185999872\n\
competition,routes,536,2017-09-21 16:51:29.016999936\n\
routes,route,536,2017-09-21 16:51:32.459000064\n\
route,routes,536,2017-09-21 16:51:38.625999872\n\
routes,route,536,2017-09-21 16:51:41.800999936\n\
route,routes,536,2017-09-21 16:51:54.144000000\n\
routes,coach,536,2017-09-21 16:51:58.294000128\n\
coach,exit,536,2017-09-21 16:51:58.294000128\n\
coach,track,537,2017-09-22 05:06:57.512999936\n\
track,exit,537,2017-09-22 05:06:57.512999936\n\
coach,personal,538,2017-09-01 14:23:02.675000064\n\
personal,coach,538,2017-09-01 14:24:15.769999872\n\
coach,personal,538,2017-09-01 14:24:35.319000064\n\
personal,team,538,2017-09-01 14:24:42.220000000\n\
team,routes,538,2017-09-01 14:24:52.488999936\n\
routes,badges,538,2017-09-01 14:24:58.276999936\n\
badges,coach,538,2017-09-01 14:25:09.035000064\n\
coach,track,538,2017-09-01 14:25:17.020000000\n\
track,competition,538,2017-09-01 14:25:22.272999936\n\
competition,team,538,2017-09-01 14:25:50.998000128\n\
team,coach,538,2017-09-01 14:26:22.411000064\n\
coach,personal,538,2017-09-01 14:26:50.927000064\n\
personal,coach,538,2017-09-01 14:26:56.228000000\n\
coach,routes,538,2017-09-01 14:27:04.032000000\n\
routes,coach,538,2017-09-01 14:27:15.521999872\n\
coach,competition,538,2017-09-01 14:27:49.608000000\n\
competition,team,538,2017-09-01 14:27:58.847000064\n\
team,track,538,2017-09-01 14:28:04.112999936\n\
track,coach,538,2017-09-01 14:43:50.804000000\n\
coach,team,538,2017-09-01 14:43:56.721999872\n\
team,exit,538,2017-09-01 14:43:56.721999872\n\
coach,team,539,2017-09-01 15:18:52.614000128\n\
team,exit,539,2017-09-01 15:18:52.614000128\n\
coach,team,540,2017-09-01 16:41:26.703000064\n\
team,competition,540,2017-09-01 16:41:46.150000128\n\
competition,exit,540,2017-09-01 16:41:46.150000128\n\
coach,team,541,2017-09-01 17:20:22.908999936\n\
team,coach,541,2017-09-01 17:44:26.148000000\n\
coach,team,541,2017-09-01 17:44:30.774000128\n\
team,exit,541,2017-09-01 17:44:30.774000128\n\
coach,team,542,2017-09-02 06:46:13.567000064\n\
team,exit,542,2017-09-02 06:46:13.567000064\n\
coach,team,543,2017-09-02 13:04:57.808000000\n\
team,competition,543,2017-09-02 13:05:15.688999936\n\
competition,routes,543,2017-09-02 13:05:24.580999936\n\
routes,badges,543,2017-09-02 13:05:32.209999872\n\
badges,exit,543,2017-09-02 13:05:32.209999872\n\
coach,track,544,2017-09-02 13:49:12.215000064\n\
track,team,544,2017-09-02 13:49:15.896000000\n\
team,competition,544,2017-09-02 13:49:29.943000064\n\
competition,exit,544,2017-09-02 13:49:29.943000064\n\
coach,team,545,2017-09-02 20:02:22.318000128\n\
team,competition,545,2017-09-02 20:02:45.351000064\n\
competition,routes,545,2017-09-02 20:02:53.336999936\n\
routes,personal,545,2017-09-02 20:02:56.952999936\n\
personal,routes,545,2017-09-02 20:03:03.280000000\n\
routes,badges,545,2017-09-02 20:03:08.288999936\n\
badges,coach,545,2017-09-02 20:03:19.520000000\n\
coach,team,545,2017-09-02 20:03:37.983000064\n\
team,exit,545,2017-09-02 20:03:37.983000064\n\
coach,track,546,2017-09-03 06:23:05.892000000\n\
track,exit,546,2017-09-03 06:23:05.892000000\n\
track,route,547,2017-09-03 09:21:35.504999936\n\
route,track,547,2017-09-03 09:21:44.039000064\n\
track,route,547,2017-09-03 09:21:52.470000128\n\
route,track,547,2017-09-03 09:21:55.755000064\n\
track,routes,547,2017-09-03 09:21:58.272000000\n\
routes,route,547,2017-09-03 09:22:04.027000064\n\
route,routes,547,2017-09-03 09:22:07.891000064\n\
routes,route,547,2017-09-03 09:22:09.030000128\n\
route,routes,547,2017-09-03 09:22:10.776999936\n\
routes,badges,547,2017-09-03 09:22:14.232000000\n\
badges,team,547,2017-09-03 09:22:19.400000000\n\
team,track,547,2017-09-03 09:22:32.831000064\n\
track,route,547,2017-09-03 09:22:48.246000128\n\
route,coach,547,2017-09-03 09:23:05.848000000\n\
coach,team,547,2017-09-03 09:23:21.835000064\n\
team,exit,547,2017-09-03 09:23:21.835000064\n\
coach,team,548,2017-09-03 10:24:29.140000000\n\
team,routes,548,2017-09-03 10:24:45.168000000\n\
routes,route,548,2017-09-03 10:24:48.808999936\n\
route,routes,548,2017-09-03 10:24:59.547000064\n\
routes,route,548,2017-09-03 10:25:01.393999872\n\
route,routes,548,2017-09-03 10:25:07.145999872\n\
routes,route,548,2017-09-03 10:25:08.724999936\n\
route,routes,548,2017-09-03 10:25:10.875000064\n\
routes,personal,548,2017-09-03 10:25:12.176999936\n\
personal,bugreport,548,2017-09-03 10:25:15.654000128\n\
bugreport,competition,548,2017-09-03 10:25:28.329999872\n\
competition,routes,548,2017-09-03 10:25:38.547000064\n\
routes,route,548,2017-09-03 10:25:41.377999872\n\
route,routes,548,2017-09-03 10:25:44.156999936\n\
routes,route,548,2017-09-03 10:25:45.321999872\n\
route,routes,548,2017-09-03 10:25:55.753999872\n\
routes,track,548,2017-09-03 10:25:58.260999936\n\
track,route,548,2017-09-03 10:26:15.276000000\n\
route,track,548,2017-09-03 10:26:17.353999872\n\
track,routes,548,2017-09-03 10:26:21.369999872\n\
routes,route,548,2017-09-03 10:26:32.073999872\n\
route,coach,548,2017-09-03 10:26:48.200999936\n\
coach,badges,548,2017-09-03 10:27:04.291000064\n\
badges,competition,548,2017-09-03 10:27:11.663000064\n\
competition,team,548,2017-09-03 10:27:17.280000000\n\
team,coach,548,2017-09-03 10:30:23.576999936\n\
coach,track,548,2017-09-03 10:31:49.259000064\n\
track,competition,548,2017-09-03 10:31:54.377999872\n\
competition,routes,548,2017-09-03 10:32:02.607000064\n\
routes,team,548,2017-09-03 10:32:06.079000064\n\
team,routes,548,2017-09-03 10:32:22.755000064\n\
routes,route,548,2017-09-03 10:32:25.708999936\n\
route,personal,548,2017-09-03 10:32:30.816999936\n\
personal,routes,548,2017-09-03 10:32:38.790000128\n\
routes,route,548,2017-09-03 10:32:41.107000064\n\
route,coach,548,2017-09-03 10:37:15.688999936\n\
coach,team,548,2017-09-03 10:37:22.846000128\n\
team,exit,548,2017-09-03 10:37:22.846000128\n\
coach,team,549,2017-09-03 11:19:24.216999936\n\
team,competition,549,2017-09-03 11:19:39.692000000\n\
competition,team,549,2017-09-03 11:19:49.283000064\n\
team,routes,549,2017-09-03 11:20:08.679000064\n\
routes,route,549,2017-09-03 11:20:11.180000000\n\
route,routes,549,2017-09-03 11:20:16.185999872\n\
routes,route,549,2017-09-03 11:20:17.576000000\n\
route,routes,549,2017-09-03 11:20:21.227000064\n\
routes,route,549,2017-09-03 11:20:22.696999936\n\
route,routes,549,2017-09-03 11:20:26.836999936\n\
routes,competition,549,2017-09-03 11:20:31.416000000\n\
competition,team,549,2017-09-03 11:20:41.702000128\n\
team,competition,549,2017-09-03 11:21:15.169999872\n\
competition,team,549,2017-09-03 11:21:23.724000000\n\
team,exit,549,2017-09-03 11:21:23.724000000\n\
coach,competition,550,2017-09-03 12:16:32.904000000\n\
competition,team,550,2017-09-03 12:16:39.576000000\n\
team,competition,550,2017-09-03 12:16:47.904999936\n\
competition,routes,550,2017-09-03 12:16:49.612999936\n\
routes,exit,550,2017-09-03 12:16:49.612999936\n\
coach,team,551,2017-09-03 12:55:06.148000000\n\
team,competition,551,2017-09-03 12:55:18.260000000\n\
competition,track,551,2017-09-03 12:55:25.032999936\n\
track,routes,551,2017-09-03 12:55:43.127000064\n\
routes,route,551,2017-09-03 12:55:48.007000064\n\
route,routes,551,2017-09-03 12:55:54.255000064\n\
routes,exit,551,2017-09-03 12:55:54.255000064\n\
coach,routes,552,2017-09-03 14:29:11.112000000\n\
routes,route,552,2017-09-03 14:29:14.544999936\n\
route,routes,552,2017-09-03 14:29:18.748000000\n\
routes,route,552,2017-09-03 14:29:20.247000064\n\
route,routes,552,2017-09-03 14:29:40.288999936\n\
routes,route,552,2017-09-03 14:29:42.481999872\n\
route,routes,552,2017-09-03 14:29:45.679000064\n\
routes,competition,552,2017-09-03 14:29:48.620000000\n\
competition,team,552,2017-09-03 14:30:01.257999872\n\
team,exit,552,2017-09-03 14:30:01.257999872\n\
coach,competition,553,2017-09-03 15:27:06.662000128\n\
competition,team,553,2017-09-03 15:27:11.380000000\n\
team,exit,553,2017-09-03 15:27:11.380000000\n\
coach,team,554,2017-09-03 17:22:13.019000064\n\
team,competition,554,2017-09-03 17:22:26.396000000\n\
competition,badges,554,2017-09-03 17:22:36.545999872\n\
badges,exit,554,2017-09-03 17:22:36.545999872\n\
coach,team,555,2017-09-04 06:44:58.632000000\n\
team,competition,555,2017-09-04 06:45:14.088000000\n\
competition,routes,555,2017-09-04 06:45:18.836000000\n\
routes,route,555,2017-09-04 06:45:21.364999936\n\
route,exit,555,2017-09-04 06:45:21.364999936\n\
coach,routes,556,2017-09-04 16:02:27.972000000\n\
routes,route,556,2017-09-04 16:02:30.180999936\n\
route,personal,556,2017-09-04 16:02:33.633999872\n\
personal,coach,556,2017-09-04 16:10:03.100999936\n\
coach,personal,556,2017-09-04 16:10:05.160000000\n\
personal,bugreport,556,2017-09-04 16:10:06.604000000\n\
bugreport,coach,556,2017-09-04 16:13:34.316999936\n\
coach,team,556,2017-09-04 16:13:40.903000064\n\
team,routes,556,2017-09-04 16:13:51.102000128\n\
routes,route,556,2017-09-04 16:13:53.655000064\n\
route,routes,556,2017-09-04 16:13:56.766000128\n\
routes,track,556,2017-09-04 16:14:05.839000064\n\
track,coach,556,2017-09-04 16:15:09.471000064\n\
coach,track,556,2017-09-04 16:15:13.767000064\n\
track,team,556,2017-09-04 16:15:17.000999936\n\
team,routes,556,2017-09-04 16:15:23.887000064\n\
routes,competition,556,2017-09-04 16:15:26.616999936\n\
competition,exit,556,2017-09-04 16:15:26.616999936\n\
coach,competition,557,2017-09-05 05:36:58.886000128\n\
competition,track,557,2017-09-05 05:37:04.934000128\n\
track,team,557,2017-09-05 05:37:10.344000000\n\
team,exit,557,2017-09-05 05:37:10.344000000\n\
coach,track,558,2017-09-05 16:21:19.368000000\n\
track,route,558,2017-09-05 16:24:54.547000064\n\
route,coach,558,2017-09-05 16:28:26.934000128\n\
coach,team,558,2017-09-05 16:28:33.254000128\n\
team,exit,558,2017-09-05 16:28:33.254000128\n\
coach,competition,559,2017-09-05 18:10:46.486000128\n\
competition,coach,559,2017-09-05 18:10:51.249999872\n\
coach,track,559,2017-09-05 18:10:56.614000128\n\
track,routes,559,2017-09-05 18:11:01.134000128\n\
routes,route,559,2017-09-05 18:11:04.036000000\n\
route,routes,559,2017-09-05 18:11:16.153999872\n\
routes,team,559,2017-09-05 18:11:20.689999872\n\
team,exit,559,2017-09-05 18:11:20.689999872\n\
coach,competition,560,2017-09-06 09:33:48.908999936\n\
competition,coach,560,2017-09-06 09:33:56.009999872\n\
coach,team,560,2017-09-06 09:33:58.791000064\n\
team,coach,560,2017-09-06 09:41:17.985999872\n\
coach,badges,560,2017-09-06 09:41:27.756000000\n\
badges,routes,560,2017-09-06 09:41:41.436000000\n\
routes,route,560,2017-09-06 09:41:44.455000064\n\
route,routes,560,2017-09-06 09:41:52.846000128\n\
routes,route,560,2017-09-06 09:41:54.412999936\n\
route,routes,560,2017-09-06 09:41:56.588000000\n\
routes,route,560,2017-09-06 09:41:57.744999936\n\
route,routes,560,2017-09-06 09:42:02.395000064\n\
routes,team,560,2017-09-06 09:42:07.296000000\n\
team,personal,560,2017-09-06 09:42:16.720000000\n\
personal,exit,560,2017-09-06 09:42:16.720000000\n\
coach,track,561,2017-09-06 16:17:10.385999872\n\
track,coach,561,2017-09-06 16:22:37.988000000\n\
coach,track,561,2017-09-06 16:22:42.179000064\n\
track,route,561,2017-09-06 16:22:45.145999872\n\
route,exit,561,2017-09-06 16:22:45.145999872\n\
coach,competition,562,2017-09-06 19:20:02.817999872\n\
competition,team,562,2017-09-06 19:20:11.884999936\n\
team,routes,562,2017-09-06 19:20:35.494000128\n\
routes,route,562,2017-09-06 19:20:38.060999936\n\
route,exit,562,2017-09-06 19:20:38.060999936\n\
coach,competition,563,2017-09-06 20:33:59.335000064\n\
competition,exit,563,2017-09-06 20:33:59.335000064\n\
coach,track,564,2017-09-07 05:30:19.359000064\n\
track,exit,564,2017-09-07 05:30:19.359000064\n\
coach,exit,565,2017-09-07 06:33:48.988999936\n\
coach,competition,566,2017-09-07 06:55:20.726000128\n\
competition,coach,566,2017-09-07 06:55:24.756999936\n\
coach,track,566,2017-09-07 06:55:28.824999936\n\
track,route,566,2017-09-07 06:55:31.828000000\n\
route,coach,566,2017-09-07 06:55:50.854000128\n\
coach,competition,566,2017-09-07 06:55:58.088999936\n\
competition,coach,566,2017-09-07 06:56:48.684000000\n\
coach,routes,566,2017-09-07 06:56:51.311000064\n\
routes,route,566,2017-09-07 06:56:53.084999936\n\
route,coach,566,2017-09-07 06:57:22.663000064\n\
coach,team,566,2017-09-07 06:57:35.623000064\n\
team,competition,566,2017-09-07 06:57:55.892999936\n\
competition,exit,566,2017-09-07 06:57:55.892999936\n\
coach,badges,567,2017-09-07 09:48:43.507000064\n\
badges,routes,567,2017-09-07 09:49:02.272000000\n\
routes,route,567,2017-09-07 09:49:05.268000000\n\
route,exit,567,2017-09-07 09:49:05.268000000\n\
coach,routes,568,2017-09-07 13:08:15.139000064\n\
routes,route,568,2017-09-07 13:08:17.424999936\n\
route,routes,568,2017-09-07 13:09:18.614000128\n\
routes,route,568,2017-09-07 13:09:20.184999936\n\
route,exit,568,2017-09-07 13:09:20.184999936\n\
coach,competition,569,2017-09-07 13:50:06.511000064\n\
competition,coach,569,2017-09-07 13:50:12.116000000\n\
coach,routes,569,2017-09-07 13:50:27.364999936\n\
routes,route,569,2017-09-07 13:50:29.800999936\n\
route,personal,569,2017-09-07 13:50:36.244999936\n\
personal,bugreport,569,2017-09-07 13:50:37.616999936\n\
bugreport,personal,569,2017-09-07 13:51:10.156000000\n\
personal,bugreport,569,2017-09-07 13:51:13.131000064\n\
bugreport,exit,569,2017-09-07 13:51:13.131000064\n\
coach,competition,570,2017-09-08 08:36:23.248999936\n\
competition,team,570,2017-09-08 08:36:28.500000000\n\
team,exit,570,2017-09-08 08:36:28.500000000\n\
coach,competition,571,2017-09-09 09:50:10.263000064\n\
competition,team,571,2017-09-09 09:50:15.113999872\n\
team,coach,571,2017-09-09 09:50:34.312000000\n\
coach,personal,571,2017-09-09 09:50:36.099000064\n\
personal,bugreport,571,2017-09-09 09:50:37.982000128\n\
bugreport,exit,571,2017-09-09 09:50:37.982000128\n\
coach,competition,572,2017-09-10 06:15:24.536999936\n\
competition,exit,572,2017-09-10 06:15:24.536999936\n\
coach,exit,573,2017-09-11 10:05:36.089999872\n\
coach,competition,574,2017-09-11 10:06:45.888999936\n\
competition,team,574,2017-09-11 10:06:53.382000128\n\
team,routes,574,2017-09-11 10:07:11.708000000\n\
routes,badges,574,2017-09-11 10:07:16.679000064\n\
badges,team,574,2017-09-11 10:07:21.556000000\n\
team,coach,574,2017-09-11 10:07:26.528999936\n\
coach,exit,574,2017-09-11 10:07:26.528999936\n\
coach,competition,575,2017-09-11 17:40:03.668999936\n\
competition,team,575,2017-09-11 17:40:17.865999872\n\
team,exit,575,2017-09-11 17:40:17.865999872\n\
coach,competition,576,2017-09-11 18:40:56.888999936\n\
competition,team,576,2017-09-11 18:41:20.836000000\n\
team,exit,576,2017-09-11 18:41:20.836000000\n\
coach,competition,577,2017-09-12 14:50:43.316000000\n\
competition,team,577,2017-09-12 14:50:49.724999936\n\
team,coach,577,2017-09-12 14:51:05.511000064\n\
coach,exit,577,2017-09-12 14:51:05.511000064\n\
coach,exit,578,2017-09-12 15:50:10.403000064\n\
coach,team,579,2017-09-13 12:57:02.668999936\n\
team,competition,579,2017-09-13 12:57:26.532999936\n\
competition,coach,579,2017-09-13 12:57:44.177999872\n\
coach,exit,579,2017-09-13 12:57:44.177999872\n\
coach,exit,580,2017-09-13 14:30:43.676999936\n\
coach,exit,581,2017-09-13 14:31:30.860000000\n\
coach,track,582,2017-09-13 16:18:58.809999872\n\
track,route,582,2017-09-13 16:23:37.956999936\n\
route,exit,582,2017-09-13 16:23:37.956999936\n\
coach,exit,583,2017-09-13 18:36:22.071000064\n\
coach,competition,584,2017-09-13 18:37:35.350000128\n\
competition,exit,584,2017-09-13 18:37:35.350000128\n\
coach,competition,585,2017-09-14 06:49:06.009999872\n\
competition,coach,585,2017-09-14 06:49:10.700000000\n\
coach,routes,585,2017-09-14 06:49:13.820000000\n\
routes,route,585,2017-09-14 06:49:17.652999936\n\
route,exit,585,2017-09-14 06:49:17.652999936\n\
coach,competition,586,2017-09-14 09:25:02.012000000\n\
competition,team,586,2017-09-14 09:25:07.848999936\n\
team,exit,586,2017-09-14 09:25:07.848999936\n\
coach,team,587,2017-09-14 13:44:18.784999936\n\
team,competition,587,2017-09-14 13:44:36.303000064\n\
competition,coach,587,2017-09-14 14:12:11.225999872\n\
coach,exit,587,2017-09-14 14:12:11.225999872\n\
coach,competition,588,2017-09-14 21:14:06.144999936\n\
competition,team,588,2017-09-14 21:14:16.230000128\n\
team,exit,588,2017-09-14 21:14:16.230000128\n\
coach,competition,589,2017-09-15 05:50:19.924999936\n\
competition,team,589,2017-09-15 05:50:33.839000064\n\
team,exit,589,2017-09-15 05:50:33.839000064\n\
coach,competition,590,2017-09-15 07:41:51.908000000\n\
competition,exit,590,2017-09-15 07:41:51.908000000\n\
coach,exit,591,2017-09-15 14:02:30.736000000\n\
coach,track,592,2017-09-15 15:13:01.352999936\n\
track,exit,592,2017-09-15 15:13:01.352999936\n\
coach,competition,593,2017-09-15 16:01:59.393999872\n\
competition,team,593,2017-09-15 16:02:05.524999936\n\
team,coach,593,2017-09-15 16:02:26.035000064\n\
coach,routes,593,2017-09-15 16:02:29.876999936\n\
routes,route,593,2017-09-15 16:02:35.412000000\n\
route,routes,593,2017-09-15 16:03:17.056000000\n\
routes,competition,593,2017-09-15 16:03:22.665999872\n\
competition,coach,593,2017-09-15 16:12:00.081999872\n\
coach,competition,593,2017-09-15 16:12:05.982000128\n\
competition,coach,593,2017-09-15 16:12:10.441999872\n\
coach,routes,593,2017-09-15 16:12:16.216999936\n\
routes,route,593,2017-09-15 16:12:17.606000128\n\
route,exit,593,2017-09-15 16:12:17.606000128\n\
coach,personal,594,2017-09-15 16:51:11.126000128\n\
personal,coach,594,2017-09-15 16:51:13.753999872\n\
coach,team,594,2017-09-15 16:51:18.588999936\n\
team,coach,594,2017-09-15 16:51:44.492000000\n\
coach,exit,594,2017-09-15 16:51:44.492000000\n\
coach,personal,595,2017-09-15 16:52:41.614000128\n\
personal,bugreport,595,2017-09-15 16:52:43.107000064\n\
bugreport,exit,595,2017-09-15 16:52:43.107000064\n\
coach,exit,596,2017-09-15 17:50:35.156000000\n\
coach,exit,597,2017-09-16 06:38:36.569999872\n\
coach,track,598,2017-09-17 06:24:06.299000064\n\
track,exit,598,2017-09-17 06:24:06.299000064\n\
coach,routes,599,2017-09-17 09:53:54.088000000\n\
routes,route,599,2017-09-17 09:53:56.339000064\n\
route,exit,599,2017-09-17 09:53:56.339000064\n\
coach,competition,600,2017-09-17 12:32:41.908999936\n\
competition,team,600,2017-09-17 12:32:53.076999936\n\
team,routes,600,2017-09-17 12:33:13.409999872\n\
routes,route,600,2017-09-17 12:33:16.619000064\n\
route,routes,600,2017-09-17 12:33:34.939000064\n\
routes,badges,600,2017-09-17 12:33:39.440000000\n\
badges,exit,600,2017-09-17 12:33:39.440000000\n\
coach,routes,601,2017-09-17 14:48:58.409999872\n\
routes,route,601,2017-09-17 14:49:00.067000064\n\
route,personal,601,2017-09-17 14:49:12.524999936\n\
personal,bugreport,601,2017-09-17 14:49:14.088999936\n\
bugreport,routes,601,2017-09-17 14:49:26.671000064\n\
routes,route,601,2017-09-17 14:49:29.867000064\n\
route,routes,601,2017-09-17 14:50:02.996000000\n\
routes,team,601,2017-09-17 14:50:07.550000128\n\
team,coach,601,2017-09-17 14:50:50.784999936\n\
coach,competition,601,2017-09-17 14:54:40.137999872\n\
competition,exit,601,2017-09-17 14:54:40.137999872\n\
coach,competition,602,2017-09-17 17:45:57.255000064\n\
competition,coach,602,2017-09-17 17:46:02.283000064\n\
coach,team,602,2017-09-17 17:46:06.636999936\n\
team,routes,602,2017-09-17 17:46:17.448999936\n\
routes,route,602,2017-09-17 17:46:20.065999872\n\
route,personal,602,2017-09-17 17:47:15.771000064\n\
personal,exit,602,2017-09-17 17:47:15.771000064\n\
coach,competition,603,2017-09-18 05:41:21.784000000\n\
competition,team,603,2017-09-18 05:41:27.548000000\n\
team,routes,603,2017-09-18 05:41:37.516000000\n\
routes,route,603,2017-09-18 05:41:39.228000000\n\
route,exit,603,2017-09-18 05:41:39.228000000\n\
coach,routes,604,2017-09-18 11:22:26.185999872\n\
routes,route,604,2017-09-18 11:22:27.895000064\n\
route,routes,604,2017-09-18 11:22:53.870000128\n\
routes,route,604,2017-09-18 11:22:55.596000000\n\
route,exit,604,2017-09-18 11:22:55.596000000\n\
coach,team,605,2017-09-18 12:25:45.124999936\n\
team,competition,605,2017-09-18 12:25:58.129999872\n\
competition,exit,605,2017-09-18 12:25:58.129999872\n\
coach,competition,606,2017-09-19 09:49:16.732000000\n\
competition,exit,606,2017-09-19 09:49:16.732000000\n\
coach,exit,607,2017-09-19 11:31:32.468999936\n\
coach,exit,608,2017-09-19 11:32:31.020000000\n\
coach,exit,609,2017-09-19 13:39:10.188999936\n\
coach,exit,610,2017-09-19 14:05:15.652999936\n\
coach,competition,611,2017-09-20 05:45:36.803000064\n\
competition,exit,611,2017-09-20 05:45:36.803000064\n\
coach,exit,612,2017-09-20 17:20:29.377999872\n\
coach,competition,613,2017-09-20 19:38:23.409999872\n\
competition,team,613,2017-09-20 19:38:30.720999936\n\
team,exit,613,2017-09-20 19:38:30.720999936\n\
coach,track,614,2017-09-21 16:16:22.764000000\n\
track,exit,614,2017-09-21 16:16:22.764000000\n\
coach,track,615,2017-09-21 17:46:49.212999936\n\
track,route,615,2017-09-21 17:46:53.628999936\n\
route,track,615,2017-09-21 17:47:00.767000064\n\
track,personal,615,2017-09-21 17:47:03.303000064\n\
personal,track,615,2017-09-21 17:47:05.068000000\n\
track,routes,615,2017-09-21 17:47:07.412000000\n\
routes,coach,615,2017-09-21 17:47:09.183000064\n\
coach,competition,615,2017-09-21 17:47:12.820999936\n\
competition,coach,615,2017-09-21 17:47:16.395000064\n\
coach,routes,615,2017-09-21 17:47:20.200000000\n\
routes,team,615,2017-09-21 17:47:22.569999872\n\
team,exit,615,2017-09-21 17:47:22.569999872\n\
coach,competition,616,2017-09-21 20:23:28.670000128\n\
competition,coach,616,2017-09-21 20:23:33.140000000\n\
coach,competition,616,2017-09-21 20:23:37.230000128\n\
competition,team,616,2017-09-21 20:23:39.596000000\n\
team,exit,616,2017-09-21 20:23:39.596000000\n\
coach,competition,617,2017-09-22 08:39:00.139000064\n\
competition,routes,617,2017-09-22 08:39:05.499000064\n\
routes,route,617,2017-09-22 08:39:07.323000064\n\
route,routes,617,2017-09-22 08:39:52.940000000\n\
routes,coach,617,2017-09-22 08:41:38.772000000\n\
coach,team,617,2017-09-22 08:41:47.647000064\n\
team,exit,617,2017-09-22 08:41:47.647000064\n\
coach,track,618,2017-09-24 06:21:54.902000128\n\
track,exit,618,2017-09-24 06:21:54.902000128\n\
coach,routes,619,2017-09-24 10:10:39.496999936\n\
routes,route,619,2017-09-24 10:10:42.151000064\n\
route,coach,619,2017-09-24 10:11:04.491000064\n\
coach,competition,619,2017-09-24 10:11:08.510000128\n\
competition,team,619,2017-09-24 10:11:14.836000000\n\
team,exit,619,2017-09-24 10:11:14.836000000\n\
coach,competition,620,2017-09-24 15:45:45.283000064\n\
competition,coach,620,2017-09-24 15:45:59.416999936\n\
coach,routes,620,2017-09-24 15:46:09.262000128\n\
routes,route,620,2017-09-24 15:46:13.760999936\n\
route,exit,620,2017-09-24 15:46:13.760999936\n\
coach,team,621,2017-09-24 16:59:55.459000064\n\
team,competition,621,2017-09-24 17:00:25.244000000\n\
competition,exit,621,2017-09-24 17:00:25.244000000\n\
coach,competition,622,2017-09-25 06:08:37.104000000\n\
competition,exit,622,2017-09-25 06:08:37.104000000\n\
coach,exit,623,2017-09-10 12:25:29.672999936\n\
coach,exit,624,2017-09-10 12:26:37.028000000\n\
coach,personal,625,2017-09-10 12:30:21.718000128\n\
personal,coach,625,2017-09-10 12:31:46.447000064\n\
coach,track,625,2017-09-10 12:32:32.976999936\n\
track,route,625,2017-09-10 12:32:53.951000064\n\
route,track,625,2017-09-10 12:32:58.256999936\n\
track,route,625,2017-09-10 12:33:07.430000128\n\
route,track,625,2017-09-10 12:33:15.040000000\n\
track,team,625,2017-09-10 12:33:19.958000128\n\
team,personal,625,2017-09-10 12:33:35.169999872\n\
personal,team,625,2017-09-10 12:33:56.256000000\n\
team,personal,625,2017-09-10 12:34:06.748999936\n\
personal,team,625,2017-09-10 12:34:16.103000064\n\
team,competition,625,2017-09-10 12:34:53.427000064\n\
competition,routes,625,2017-09-10 12:35:03.003000064\n\
routes,route,625,2017-09-10 12:35:05.880999936\n\
route,routes,625,2017-09-10 12:35:11.756999936\n\
routes,route,625,2017-09-10 12:35:13.161999872\n\
route,routes,625,2017-09-10 12:35:16.006000128\n\
routes,route,625,2017-09-10 12:35:18.820999936\n\
route,routes,625,2017-09-10 12:35:23.392000000\n\
routes,badges,625,2017-09-10 12:35:27.320000000\n\
badges,coach,625,2017-09-10 12:35:47.374000128\n\
coach,track,625,2017-09-10 12:36:59.782000128\n\
track,personal,625,2017-09-10 12:37:05.796000000\n\
personal,track,625,2017-09-10 12:37:13.840000000\n\
track,personal,625,2017-09-10 12:48:21.305999872\n\
personal,track,625,2017-09-10 12:48:27.312000000\n\
track,team,625,2017-09-10 12:48:34.275000064\n\
team,track,625,2017-09-10 12:58:54.121999872\n\
track,personal,625,2017-09-10 12:59:04.767000064\n\
personal,bugreport,625,2017-09-10 12:59:22.798000128\n\
bugreport,team,625,2017-09-10 12:59:30.940999936\n\
team,personal,625,2017-09-10 12:59:33.923000064\n\
personal,team,625,2017-09-10 12:59:38.046000128\n\
team,coach,625,2017-09-10 13:09:05.016999936\n\
coach,competition,625,2017-09-10 13:09:50.532000000\n\
competition,routes,625,2017-09-10 13:10:02.241999872\n\
routes,badges,625,2017-09-10 13:10:07.153999872\n\
badges,coach,625,2017-09-10 13:10:17.724000000\n\
coach,track,625,2017-09-10 13:10:21.406000128\n\
track,personal,625,2017-09-10 13:10:26.772000000\n\
personal,track,625,2017-09-10 13:10:52.772000000\n\
track,exit,625,2017-09-10 13:10:52.772000000\n\
personal,track,626,2017-09-10 16:57:16.361999872\n\
track,team,626,2017-09-10 16:57:20.692000000\n\
team,track,626,2017-09-10 17:18:07.444000000\n\
track,exit,626,2017-09-10 17:18:07.444000000\n\
track,exit,627,2017-09-11 08:32:17.416000000\n\
coach,exit,628,2017-09-11 09:27:15.620999936\n\
track,route,629,2017-09-11 10:34:40.039000064\n\
route,coach,629,2017-09-11 10:35:38.007000064\n\
coach,competition,629,2017-09-11 10:41:17.204999936\n\
competition,team,629,2017-09-11 10:41:28.761999872\n\
team,personal,629,2017-09-11 10:41:56.752999936\n\
personal,bugreport,629,2017-09-11 10:42:04.527000064\n\
bugreport,personal,629,2017-09-11 10:43:26.359000064\n\
personal,bugreport,629,2017-09-11 10:43:30.108999936\n\
bugreport,track,629,2017-09-11 10:43:32.856000000\n\
track,routes,629,2017-09-11 10:43:43.038000128\n\
routes,route,629,2017-09-11 10:43:48.729999872\n\
route,exit,629,2017-09-11 10:43:48.729999872\n\
routes,track,630,2017-09-11 12:43:09.343000064\n\
track,route,630,2017-09-11 13:12:43.616000000\n\
route,coach,630,2017-09-11 13:12:56.916999936\n\
coach,competition,630,2017-09-11 13:13:10.795000064\n\
competition,coach,630,2017-09-11 13:13:30.809999872\n\
coach,team,630,2017-09-11 13:13:34.329999872\n\
team,routes,630,2017-09-11 13:14:08.320999936\n\
routes,route,630,2017-09-11 13:14:11.008000000\n\
route,routes,630,2017-09-11 13:14:24.729999872\n\
routes,route,630,2017-09-11 13:14:28.896999936\n\
route,personal,630,2017-09-11 13:16:44.128999936\n\
personal,routes,630,2017-09-11 13:16:48.239000064\n\
routes,route,630,2017-09-11 13:16:49.910000128\n\
route,routes,630,2017-09-11 13:16:52.908000000\n\
routes,route,630,2017-09-11 13:16:55.609999872\n\
route,routes,630,2017-09-11 13:17:17.222000128\n\
routes,route,630,2017-09-11 13:17:21.510000128\n\
route,routes,630,2017-09-11 13:17:27.440000000\n\
routes,route,630,2017-09-11 13:17:32.488000000\n\
route,exit,630,2017-09-11 13:17:32.488000000\n\
routes,track,631,2017-09-11 16:34:26.063000064\n\
track,exit,631,2017-09-11 16:34:26.063000064\n\
coach,exit,632,2017-09-11 17:34:18.668999936\n\
route,track,633,2017-09-11 18:14:57.990000128\n\
track,coach,633,2017-09-11 18:14:59.132000000\n\
coach,competition,633,2017-09-11 18:15:56.398000128\n\
competition,coach,633,2017-09-11 18:16:08.436999936\n\
coach,exit,633,2017-09-11 18:16:08.436999936\n\
coach,competition,634,2017-09-11 18:19:16.143000064\n\
competition,coach,634,2017-09-11 18:19:20.614000128\n\
coach,team,634,2017-09-11 18:20:09.252000000\n\
team,routes,634,2017-09-11 18:21:42.948999936\n\
routes,route,634,2017-09-11 18:21:47.372000000\n\
route,routes,634,2017-09-11 18:21:55.035000064\n\
routes,route,634,2017-09-11 18:21:56.711000064\n\
route,personal,634,2017-09-11 18:22:52.424000000\n\
personal,routes,634,2017-09-11 18:23:06.432999936\n\
routes,route,634,2017-09-11 18:23:08.705999872\n\
route,routes,634,2017-09-11 18:23:11.190000128\n\
routes,route,634,2017-09-11 18:23:14.169999872\n\
route,routes,634,2017-09-11 18:23:19.776999936\n\
routes,route,634,2017-09-11 18:23:26.715000064\n\
route,routes,634,2017-09-11 18:23:36.204999936\n\
routes,team,634,2017-09-11 18:23:40.636999936\n\
team,exit,634,2017-09-11 18:23:40.636999936\n\
coach,team,635,2017-09-12 07:42:10.297999872\n\
team,badges,635,2017-09-12 07:42:33.656000000\n\
badges,competition,635,2017-09-12 07:42:48.896000000\n\
competition,exit,635,2017-09-12 07:42:48.896000000\n\
track,coach,636,2017-09-12 08:41:55.571000064\n\
coach,exit,636,2017-09-12 08:41:55.571000064\n\
track,route,637,2017-09-12 11:10:46.905999872\n\
route,coach,637,2017-09-12 11:11:07.643000064\n\
coach,routes,637,2017-09-12 11:11:37.792999936\n\
routes,route,637,2017-09-12 11:11:43.281999872\n\
route,exit,637,2017-09-12 11:11:43.281999872\n\
routes,route,638,2017-09-12 12:26:19.977999872\n\
route,coach,638,2017-09-12 12:26:28.904000000\n\
coach,routes,638,2017-09-12 12:26:33.943000064\n\
routes,route,638,2017-09-12 12:26:35.707000064\n\
route,exit,638,2017-09-12 12:26:35.707000064\n\
routes,team,639,2017-09-12 13:12:09.712000000\n\
team,badges,639,2017-09-12 13:12:37.956999936\n\
badges,exit,639,2017-09-12 13:12:37.956999936\n\
coach,competition,640,2017-09-13 06:08:50.771000064\n\
competition,coach,640,2017-09-13 06:08:57.652999936\n\
coach,team,640,2017-09-13 06:09:00.812999936\n\
team,competition,640,2017-09-13 06:14:56.412999936\n\
competition,exit,640,2017-09-13 06:14:56.412999936\n\
competition,team,641,2017-09-13 11:32:20.240999936\n\
team,competition,641,2017-09-13 11:32:39.289999872\n\
competition,track,641,2017-09-13 11:32:45.531000064\n\
track,exit,641,2017-09-13 11:32:45.531000064\n\
coach,exit,642,2017-09-13 12:26:58.272000000\n\
track,route,643,2017-09-13 13:21:58.631000064\n\
route,coach,643,2017-09-13 13:22:03.860000000\n\
coach,track,643,2017-09-13 13:22:36.939000064\n\
track,routes,643,2017-09-13 13:22:44.439000064\n\
routes,route,643,2017-09-13 13:22:50.318000128\n\
route,routes,643,2017-09-13 13:23:01.193999872\n\
routes,team,643,2017-09-13 13:23:08.495000064\n\
team,routes,643,2017-09-13 13:23:28.736000000\n\
routes,route,643,2017-09-13 13:23:33.664999936\n\
route,coach,643,2017-09-13 13:23:40.535000064\n\
coach,competition,643,2017-09-13 13:28:56.724000000\n\
competition,coach,643,2017-09-13 13:29:08.264999936\n\
coach,team,643,2017-09-13 13:29:32.251000064\n\
team,competition,643,2017-09-13 13:29:53.731000064\n\
competition,exit,643,2017-09-13 13:29:53.731000064\n\
coach,exit,644,2017-09-13 14:22:01.372999936\n\
competition,team,645,2017-09-13 14:54:05.004000000\n\
team,competition,645,2017-09-13 14:56:00.078000128\n\
competition,team,645,2017-09-13 14:56:39.964999936\n\
team,routes,645,2017-09-13 14:57:03.374000128\n\
routes,route,645,2017-09-13 14:57:07.854000128\n\
route,routes,645,2017-09-13 14:57:22.092000000\n\
routes,team,645,2017-09-13 14:57:26.147000064\n\
team,competition,645,2017-09-13 14:59:54.451000064\n\
competition,routes,645,2017-09-13 15:00:02.726000128\n\
routes,route,645,2017-09-13 15:00:07.627000064\n\
route,personal,645,2017-09-13 15:02:54.671000064\n\
personal,routes,645,2017-09-13 15:03:03.515000064\n\
routes,route,645,2017-09-13 15:03:21.424999936\n\
route,routes,645,2017-09-13 15:03:39.476999936\n\
routes,route,645,2017-09-13 15:03:41.520999936\n\
route,routes,645,2017-09-13 15:04:44.921999872\n\
routes,route,645,2017-09-13 15:04:55.912000000\n\
route,routes,645,2017-09-13 15:05:21.145999872\n\
routes,route,645,2017-09-13 15:05:23.968000000\n\
route,exit,645,2017-09-13 15:05:23.968000000\n\
coach,track,646,2017-09-14 12:03:26.564999936\n\
track,team,646,2017-09-14 12:03:29.430000128\n\
team,competition,646,2017-09-14 12:03:52.910000128\n\
competition,routes,646,2017-09-14 12:04:00.913999872\n\
routes,route,646,2017-09-14 12:04:05.868999936\n\
route,routes,646,2017-09-14 12:04:12.852000000\n\
routes,route,646,2017-09-14 12:04:14.212000000\n\
route,routes,646,2017-09-14 12:04:21.657999872\n\
routes,route,646,2017-09-14 12:04:25.364000000\n\
route,routes,646,2017-09-14 12:04:31.436000000\n\
routes,route,646,2017-09-14 12:04:37.523000064\n\
route,routes,646,2017-09-14 12:04:41.985999872\n\
routes,route,646,2017-09-14 12:04:44.052999936\n\
route,personal,646,2017-09-14 12:05:04.161999872\n\
personal,routes,646,2017-09-14 12:05:09.760999936\n\
routes,badges,646,2017-09-14 12:05:13.827000064\n\
badges,exit,646,2017-09-14 12:05:13.827000064\n\
coach,badges,647,2017-09-14 12:58:56.747000064\n\
badges,track,647,2017-09-14 12:58:59.408999936\n\
track,exit,647,2017-09-14 12:58:59.408999936\n\
coach,exit,648,2017-09-14 13:53:48.118000128\n\
track,route,649,2017-09-14 15:02:36.217999872\n\
route,track,649,2017-09-14 15:26:01.950000128\n\
track,team,649,2017-09-14 15:26:04.777999872\n\
team,competition,649,2017-09-14 15:26:16.062000128\n\
competition,team,649,2017-09-14 15:26:28.902000128\n\
team,routes,649,2017-09-14 15:26:44.124999936\n\
routes,route,649,2017-09-14 15:26:50.711000064\n\
route,coach,649,2017-09-14 15:27:20.155000064\n\
coach,routes,649,2017-09-14 15:27:38.016999936\n\
routes,route,649,2017-09-14 15:27:40.121999872\n\
route,routes,649,2017-09-14 15:28:03.377999872\n\
routes,route,649,2017-09-14 15:28:13.592999936\n\
route,routes,649,2017-09-14 15:28:19.276000000\n\
routes,route,649,2017-09-14 15:28:22.872000000\n\
route,routes,649,2017-09-14 15:28:38.500000000\n\
routes,route,649,2017-09-14 15:28:42.174000128\n\
route,routes,649,2017-09-14 15:28:56.502000128\n\
routes,route,649,2017-09-14 15:29:01.448999936\n\
route,routes,649,2017-09-14 15:29:27.683000064\n\
routes,route,649,2017-09-14 15:29:34.468999936\n\
route,routes,649,2017-09-14 15:29:39.820999936\n\
routes,route,649,2017-09-14 15:29:44.996000000\n\
route,exit,649,2017-09-14 15:29:44.996000000\n\
coach,team,650,2017-09-14 16:25:35.635000064\n\
team,routes,650,2017-09-14 16:26:07.804000000\n\
routes,route,650,2017-09-14 16:26:10.841999872\n\
route,exit,650,2017-09-14 16:26:10.841999872\n\
routes,route,651,2017-09-14 18:21:11.969999872\n\
route,routes,651,2017-09-14 18:22:36.465999872\n\
routes,route,651,2017-09-14 18:22:39.728999936\n\
route,routes,651,2017-09-14 18:22:47.472000000\n\
routes,route,651,2017-09-14 18:22:49.326000128\n\
route,routes,651,2017-09-14 18:23:46.046000128\n\
routes,route,651,2017-09-14 18:24:07.070000128\n\
route,routes,651,2017-09-14 18:24:17.464000000\n\
routes,route,651,2017-09-14 18:24:23.668999936\n\
route,routes,651,2017-09-14 18:24:27.145999872\n\
routes,route,651,2017-09-14 18:24:28.742000128\n\
route,routes,651,2017-09-14 18:24:35.948999936\n\
routes,route,651,2017-09-14 18:24:43.352999936\n\
route,routes,651,2017-09-14 18:24:50.830000128\n\
routes,route,651,2017-09-14 18:24:55.324999936\n\
route,routes,651,2017-09-14 18:25:08.971000064\n\
routes,route,651,2017-09-14 18:25:14.375000064\n\
route,routes,651,2017-09-14 18:25:26.904999936\n\
routes,competition,651,2017-09-14 18:25:32.336999936\n\
competition,team,651,2017-09-14 18:25:48.112999936\n\
team,competition,651,2017-09-14 18:29:13.025999872\n\
competition,team,651,2017-09-14 18:29:54.913999872\n\
team,routes,651,2017-09-14 18:32:02.060000000\n\
routes,route,651,2017-09-14 18:32:08.740999936\n\
route,routes,651,2017-09-14 18:32:29.924999936\n\
routes,route,651,2017-09-14 18:32:33.500999936\n\
route,routes,651,2017-09-14 18:32:35.961999872\n\
routes,route,651,2017-09-14 18:32:38.931000064\n\
route,routes,651,2017-09-14 18:33:02.296000000\n\
routes,badges,651,2017-09-14 18:33:15.524000000\n\
badges,competition,651,2017-09-14 18:34:02.608999936\n\
competition,routes,651,2017-09-14 18:34:38.494000128\n\
routes,route,651,2017-09-14 18:34:50.656000000\n\
route,routes,651,2017-09-14 18:35:46.020999936\n\
routes,personal,651,2017-09-14 18:35:50.376999936\n\
personal,routes,651,2017-09-14 18:36:12.128999936\n\
routes,coach,651,2017-09-14 18:36:20.503000064\n\
coach,team,651,2017-09-14 18:36:32.798000128\n\
team,competition,651,2017-09-14 18:37:13.611000064\n\
competition,coach,651,2017-09-14 18:37:21.216999936\n\
coach,competition,651,2017-09-14 18:37:48.273999872\n\
competition,coach,651,2017-09-14 18:38:09.888999936\n\
coach,badges,651,2017-09-14 18:38:52.433999872\n\
badges,team,651,2017-09-14 18:39:34.200000000\n\
team,exit,651,2017-09-14 18:39:34.200000000\n\
competition,team,652,2017-09-15 05:40:24.153999872\n\
team,coach,652,2017-09-15 05:40:49.606000128\n\
coach,competition,652,2017-09-15 05:40:53.508999936\n\
competition,coach,652,2017-09-15 05:41:08.216000000\n\
coach,team,652,2017-09-15 05:41:16.247000064\n\
team,competition,652,2017-09-15 05:42:04.547000064\n\
competition,routes,652,2017-09-15 05:43:30.350000128\n\
routes,route,652,2017-09-15 05:43:34.604000000\n\
route,routes,652,2017-09-15 05:43:54.438000128\n\
routes,route,652,2017-09-15 05:43:56.982000128\n\
route,routes,652,2017-09-15 05:44:00.076000000\n\
routes,route,652,2017-09-15 05:44:03.316000000\n\
route,routes,652,2017-09-15 05:44:08.577999872\n\
routes,route,652,2017-09-15 05:44:12.988000000\n\
route,routes,652,2017-09-15 05:44:15.868000000\n\
routes,route,652,2017-09-15 05:44:33.198000128\n\
route,routes,652,2017-09-15 05:44:45.972000000\n\
routes,route,652,2017-09-15 05:44:51.128000000\n\
route,routes,652,2017-09-15 05:45:03.017999872\n\
routes,exit,652,2017-09-15 05:45:03.017999872\n\
routes,team,653,2017-09-15 08:27:29.286000128\n\
team,competition,653,2017-09-15 08:27:45.955000064\n\
competition,exit,653,2017-09-15 08:27:45.955000064\n\
competition,track,654,2017-09-15 09:39:36.868000000\n\
track,exit,654,2017-09-15 09:39:36.868000000\n\
coach,track,655,2017-09-15 10:53:07.585999872\n\
track,exit,655,2017-09-15 10:53:07.585999872\n\
coach,exit,656,2017-09-15 11:29:46.595000064\n\
track,route,657,2017-09-15 12:09:39.636999936\n\
route,track,657,2017-09-15 12:09:54.979000064\n\
track,routes,657,2017-09-15 12:09:59.979000064\n\
routes,route,657,2017-09-15 12:10:09.361999872\n\
route,coach,657,2017-09-15 12:10:15.748999936\n\
coach,team,657,2017-09-15 12:34:22.851000064\n\
team,routes,657,2017-09-15 12:35:53.588000000\n\
routes,route,657,2017-09-15 12:35:58.028000000\n\
route,routes,657,2017-09-15 12:36:09.190000128\n\
routes,exit,657,2017-09-15 12:36:09.190000128\n\
competition,team,658,2017-09-15 13:41:22.139000064\n\
team,coach,658,2017-09-15 13:43:11.216000000\n\
coach,competition,658,2017-09-15 13:46:17.455000064\n\
competition,coach,658,2017-09-15 13:46:27.952000000\n\
coach,team,658,2017-09-15 13:46:30.830000128\n\
team,competition,658,2017-09-15 14:13:15.932000000\n\
competition,coach,658,2017-09-15 14:13:52.328999936\n\
coach,routes,658,2017-09-15 14:22:46.913999872\n\
routes,route,658,2017-09-15 14:22:53.710000128\n\
route,exit,658,2017-09-15 14:22:53.710000128\n\
routes,team,659,2017-09-16 08:08:41.097999872\n\
team,exit,659,2017-09-16 08:08:41.097999872\n\
team,exit,660,2017-09-16 14:26:37.326000128\n\
team,competition,661,2017-09-17 06:32:47.884000000\n\
competition,exit,661,2017-09-17 06:32:47.884000000\n\
competition,team,662,2017-09-17 15:42:34.780999936\n\
team,exit,662,2017-09-17 15:42:34.780999936\n\
team,competition,663,2017-09-18 08:19:30.787000064\n\
competition,team,663,2017-09-18 08:19:41.820999936\n\
team,exit,663,2017-09-18 08:19:41.820999936\n\
coach,track,664,2017-09-18 08:52:31.656000000\n\
track,coach,664,2017-09-18 09:14:09.704999936\n\
coach,exit,664,2017-09-18 09:14:09.704999936\n\
coach,track,665,2017-09-18 10:53:45.456000000\n\
track,route,665,2017-09-18 10:53:50.316999936\n\
route,exit,665,2017-09-18 10:53:50.316999936\n\
coach,exit,666,2017-09-18 11:53:07.379000064\n\
coach,exit,667,2017-09-19 07:25:10.814000128\n\
coach,exit,668,2017-09-19 07:39:10.232000000\n\
coach,exit,669,2017-09-19 07:45:40.667000064\n\
coach,exit,670,2017-09-19 08:09:56.139000064\n\
coach,exit,671,2017-09-19 09:16:17.436999936\n\
coach,exit,672,2017-09-19 10:47:51.780999936\n\
coach,exit,673,2017-09-19 11:37:25.700999936\n\
coach,exit,674,2017-09-19 12:23:51.087000064\n\
coach,exit,675,2017-09-19 13:53:48.760999936\n\
coach,exit,676,2017-09-19 15:28:36.796999936\n\
coach,team,677,2017-09-20 09:03:18.660000000\n\
team,competition,677,2017-09-20 09:03:48.020000000\n\
competition,track,677,2017-09-20 09:03:55.208000000\n\
track,exit,677,2017-09-20 09:03:55.208000000\n\
coach,track,678,2017-09-20 10:17:55.468999936\n\
track,exit,678,2017-09-20 10:17:55.468999936\n\
coach,track,679,2017-09-20 11:17:05.582000128\n\
track,route,679,2017-09-20 11:17:08.116000000\n\
route,exit,679,2017-09-20 11:17:08.116000000\n\
coach,track,680,2017-09-20 11:57:25.464999936\n\
track,competition,680,2017-09-20 11:57:30.439000064\n\
competition,team,680,2017-09-20 11:57:35.548999936\n\
team,track,680,2017-09-20 11:57:53.936000000\n\
track,route,680,2017-09-20 12:05:28.809999872\n\
route,exit,680,2017-09-20 12:05:28.809999872\n\
coach,exit,681,2017-09-20 12:43:13.849999872\n\
coach,competition,682,2017-09-21 05:39:49.105999872\n\
competition,coach,682,2017-09-21 05:40:00.790000128\n\
coach,team,682,2017-09-21 05:40:05.792000000\n\
team,competition,682,2017-09-21 05:41:12.828000000\n\
competition,badges,682,2017-09-21 05:41:17.576000000\n\
badges,routes,682,2017-09-21 05:41:54.156000000\n\
routes,route,682,2017-09-21 05:41:59.936000000\n\
route,routes,682,2017-09-21 05:42:14.131000064\n\
routes,route,682,2017-09-21 05:42:15.604999936\n\
route,routes,682,2017-09-21 05:42:30.400000000\n\
routes,coach,682,2017-09-21 05:42:59.312000000\n\
coach,routes,682,2017-09-21 05:50:04.198000128\n\
routes,route,682,2017-09-21 05:50:11.663000064\n\
route,routes,682,2017-09-21 05:50:16.838000128\n\
routes,track,682,2017-09-21 05:50:34.232999936\n\
track,exit,682,2017-09-21 05:50:34.232999936\n\
track,exit,683,2017-09-21 10:35:28.836999936\n\
coach,track,684,2017-09-21 11:48:25.328999936\n\
track,coach,684,2017-09-21 11:48:36.817999872\n\
coach,track,684,2017-09-21 11:49:34.760000000\n\
track,exit,684,2017-09-21 11:49:34.760000000\n\
coach,track,685,2017-09-21 12:55:14.428000000\n\
track,route,685,2017-09-21 12:55:16.740999936\n\
route,track,685,2017-09-21 12:56:04.064000000\n\
track,team,685,2017-09-21 12:56:08.864999936\n\
team,coach,685,2017-09-21 13:22:02.363000064\n\
coach,exit,685,2017-09-21 13:22:02.363000064\n\
coach,team,686,2017-09-21 15:57:45.871000064\n\
team,exit,686,2017-09-21 15:57:45.871000064\n\
team,competition,687,2017-09-22 08:43:58.003000064\n\
competition,coach,687,2017-09-22 09:09:41.145999872\n\
coach,track,687,2017-09-22 09:09:48.371000064\n\
track,coach,687,2017-09-22 09:37:54.759000064\n\
coach,exit,687,2017-09-22 09:37:54.759000064\n\
track,route,688,2017-09-22 11:08:29.067000064\n\
route,track,688,2017-09-22 11:08:38.124999936\n\
track,team,688,2017-09-22 11:08:44.264999936\n\
team,exit,688,2017-09-22 11:08:44.264999936\n\
coach,team,689,2017-09-22 16:27:16.558000128\n\
team,competition,689,2017-09-22 16:27:50.604000000\n\
competition,team,689,2017-09-22 16:28:19.720999936\n\
team,exit,689,2017-09-22 16:28:19.720999936\n\
coach,exit,690,2017-09-23 10:57:41.895000064\n\
competition,coach,691,2017-09-23 17:32:11.022000128\n\
coach,team,691,2017-09-23 17:32:17.673999872\n\
team,exit,691,2017-09-23 17:32:17.673999872\n\
coach,team,692,2017-09-24 06:59:37.184999936\n\
team,track,692,2017-09-24 06:59:56.320999936\n\
track,route,692,2017-09-24 07:00:04.964999936\n\
route,exit,692,2017-09-24 07:00:04.964999936\n\
coach,track,693,2017-09-24 08:33:14.815000064\n\
track,routes,693,2017-09-24 08:54:39.049999872\n\
routes,route,693,2017-09-24 08:55:03.726000128\n\
route,routes,693,2017-09-24 08:55:03.727000064\n\
routes,route,693,2017-09-24 08:55:03.752999936\n\
route,routes,693,2017-09-24 08:55:07.544999936\n\
routes,track,693,2017-09-24 08:55:11.264999936\n\
track,exit,693,2017-09-24 08:55:11.264999936\n\
coach,track,694,2017-09-24 09:43:17.723000064\n\
track,route,694,2017-09-24 09:43:21.040999936\n\
route,track,694,2017-09-24 09:43:33.820999936\n\
track,coach,694,2017-09-24 09:43:36.030000128\n\
coach,team,694,2017-09-24 09:43:57.456000000\n\
team,exit,694,2017-09-24 09:43:57.456000000\n\
coach,team,695,2017-09-24 10:27:36.974000128\n\
team,competition,695,2017-09-24 10:28:40.139000064\n\
competition,personal,695,2017-09-24 10:28:57.579000064\n\
personal,competition,695,2017-09-24 10:29:04.849999872\n\
competition,routes,695,2017-09-24 10:29:09.486000128\n\
routes,route,695,2017-09-24 10:29:15.244000000\n\
route,routes,695,2017-09-24 10:29:19.108000000\n\
routes,route,695,2017-09-24 10:29:21.206000128\n\
route,routes,695,2017-09-24 10:29:35.929999872\n\
routes,route,695,2017-09-24 10:29:40.585999872\n\
route,exit,695,2017-09-24 10:29:40.585999872\n\
routes,track,696,2017-09-24 11:12:42.769999872\n\
track,coach,696,2017-09-24 11:17:35.536999936\n\
coach,track,696,2017-09-24 11:25:35.963000064\n\
track,exit,696,2017-09-24 11:25:35.963000064\n\
coach,exit,697,2017-09-24 12:12:32.600999936\n\
track,team,698,2017-09-24 13:04:08.075000064\n\
team,coach,698,2017-09-24 13:07:35.382000128\n\
coach,team,698,2017-09-24 13:08:14.403000064\n\
team,competition,698,2017-09-24 13:10:10.567000064\n\
competition,track,698,2017-09-24 13:10:34.824000000\n\
track,route,698,2017-09-24 13:10:46.307000064\n\
route,track,698,2017-09-24 13:11:00.147000064\n\
track,team,698,2017-09-24 13:11:07.728000000\n\
team,coach,698,2017-09-24 13:13:18.004000000\n\
coach,competition,698,2017-09-24 13:13:47.401999872\n\
competition,exit,698,2017-09-24 13:13:47.401999872\n\
coach,track,699,2017-09-24 13:58:28.779000064\n\
track,coach,699,2017-09-24 14:02:33.507000064\n\
coach,track,699,2017-09-24 14:16:46.091000064\n\
track,route,699,2017-09-24 14:16:50.572999936\n\
route,track,699,2017-09-24 14:16:55.092999936\n\
track,team,699,2017-09-24 14:16:59.788000000\n\
team,coach,699,2017-09-24 14:17:28.694000128\n\
coach,exit,699,2017-09-24 14:17:28.694000128\n\
team,competition,700,2017-09-24 17:05:59.942000128\n\
competition,team,700,2017-09-24 17:06:28.894000128\n\
team,competition,700,2017-09-24 17:08:20.872999936\n\
competition,routes,700,2017-09-24 17:08:41.065999872\n\
routes,route,700,2017-09-24 17:08:46.590000128\n\
route,routes,700,2017-09-24 17:08:50.849999872\n\
routes,route,700,2017-09-24 17:08:56.372000000\n\
route,routes,700,2017-09-24 17:09:09.849999872\n\
routes,route,700,2017-09-24 17:09:14.068000000\n\
route,routes,700,2017-09-24 17:09:27.488000000\n\
routes,route,700,2017-09-24 17:09:37.959000064\n\
route,routes,700,2017-09-24 17:09:47.599000064\n\
routes,exit,700,2017-09-24 17:09:47.599000064\n\
coach,team,701,2017-09-24 18:06:13.110000128\n\
team,exit,701,2017-09-24 18:06:13.110000128\n\
coach,exit,702,2017-09-24 18:37:36.361999872\n\
coach,team,703,2017-09-25 03:50:52.791000064\n\
team,competition,703,2017-09-25 03:53:59.536999936\n\
competition,exit,703,2017-09-25 03:53:59.536999936\n\
coach,competition,704,2017-09-25 08:54:36.223000064\n\
competition,team,704,2017-09-25 08:54:42.812000000\n\
team,exit,704,2017-09-25 08:54:42.812000000\n\
coach,team,705,2017-09-11 13:21:46.512000000\n\
team,personal,705,2017-09-11 13:22:03.662000128\n\
personal,team,705,2017-09-11 13:22:34.214000128\n\
team,competition,705,2017-09-11 13:22:51.880000000\n\
competition,badges,705,2017-09-11 13:23:14.062000128\n\
badges,coach,705,2017-09-11 13:23:31.865999872\n\
coach,personal,705,2017-09-11 13:23:39.528999936\n\
personal,bugreport,705,2017-09-11 13:24:02.176000000\n\
bugreport,track,705,2017-09-11 13:24:12.491000064\n\
track,route,705,2017-09-11 13:24:24.956999936\n\
route,track,705,2017-09-11 13:24:33.248000000\n\
track,team,705,2017-09-11 13:24:38.086000128\n\
team,competition,705,2017-09-11 13:24:52.576999936\n\
competition,routes,705,2017-09-11 13:25:04.948000000\n\
routes,route,705,2017-09-11 13:25:09.380000000\n\
route,routes,705,2017-09-11 13:25:24.348999936\n\
routes,exit,705,2017-09-11 13:25:24.348999936\n\
coach,team,706,2017-09-11 21:34:09.297999872\n\
team,routes,706,2017-09-11 21:34:42.336999936\n\
routes,route,706,2017-09-11 21:34:54.569999872\n\
route,routes,706,2017-09-11 21:35:17.675000064\n\
routes,route,706,2017-09-11 21:35:23.463000064\n\
route,routes,706,2017-09-11 21:35:28.695000064\n\
routes,badges,706,2017-09-11 21:35:34.479000064\n\
badges,track,706,2017-09-11 21:35:41.972999936\n\
track,exit,706,2017-09-11 21:35:41.972999936\n\
coach,team,707,2017-09-12 11:46:23.073999872\n\
team,competition,707,2017-09-12 11:46:43.924999936\n\
competition,exit,707,2017-09-12 11:46:43.924999936\n\
coach,track,708,2017-09-12 16:34:14.692999936\n\
track,exit,708,2017-09-12 16:34:14.692999936\n\
coach,exit,709,2017-09-12 17:29:04.222000128\n\
track,route,710,2017-09-12 18:24:48.609999872\n\
route,coach,710,2017-09-12 18:25:04.232000000\n\
coach,personal,710,2017-09-12 18:25:05.116000000\n\
personal,team,710,2017-09-12 18:25:15.236999936\n\
team,exit,710,2017-09-12 18:25:15.236999936\n\
competition,team,711,2017-09-12 21:09:56.780000000\n\
team,routes,711,2017-09-12 21:10:56.601999872\n\
routes,route,711,2017-09-12 21:11:02.366000128\n\
route,routes,711,2017-09-12 21:11:20.884999936\n\
routes,route,711,2017-09-12 21:11:23.680999936\n\
route,routes,711,2017-09-12 21:11:57.292000000\n\
routes,route,711,2017-09-12 21:12:00.703000064\n\
route,personal,711,2017-09-12 21:12:41.529999872\n\
personal,routes,711,2017-09-12 21:12:46.680999936\n\
routes,coach,711,2017-09-12 21:12:52.088999936\n\
coach,personal,711,2017-09-12 21:13:40.532000000\n\
personal,coach,711,2017-09-12 21:14:36.100999936\n\
coach,badges,711,2017-09-12 21:14:58.790000128\n\
badges,exit,711,2017-09-12 21:14:58.790000128\n\
coach,competition,712,2017-09-13 09:31:48.328999936\n\
competition,coach,712,2017-09-13 09:31:57.660999936\n\
coach,team,712,2017-09-13 09:32:00.881999872\n\
team,exit,712,2017-09-13 09:32:00.881999872\n\
coach,team,713,2017-09-14 09:27:47.940000000\n\
team,competition,713,2017-09-14 09:28:00.923000064\n\
competition,exit,713,2017-09-14 09:28:00.923000064\n\
coach,exit,714,2017-09-14 10:01:58.791000064\n\
coach,exit,715,2017-09-14 10:03:46.856999936\n\
coach,competition,716,2017-09-14 11:04:51.131000064\n\
competition,exit,716,2017-09-14 11:04:51.131000064\n\
coach,exit,717,2017-09-14 12:02:22.057999872\n\
coach,competition,718,2017-09-14 20:36:58.609999872\n\
competition,team,718,2017-09-14 20:37:29.969999872\n\
team,competition,718,2017-09-14 20:38:06.545999872\n\
competition,team,718,2017-09-14 20:38:16.868999936\n\
team,routes,718,2017-09-14 20:38:22.953999872\n\
routes,personal,718,2017-09-14 20:38:26.632999936\n\
personal,routes,718,2017-09-14 20:38:30.787000064\n\
routes,badges,718,2017-09-14 20:38:34.368000000\n\
badges,coach,718,2017-09-14 20:38:52.919000064\n\
coach,exit,718,2017-09-14 20:38:52.919000064\n\
coach,exit,719,2017-09-15 11:19:25.300999936\n\
competition,exit,720,2017-09-15 14:47:23.592999936\n\
coach,track,721,2017-09-15 17:34:37.636000000\n\
track,exit,721,2017-09-15 17:34:37.636000000\n\
coach,exit,722,2017-09-15 18:30:01.808000000\n\
track,route,723,2017-09-15 21:06:39.974000128\n\
route,track,723,2017-09-15 21:07:38.584999936\n\
track,team,723,2017-09-15 21:08:13.464000000\n\
team,competition,723,2017-09-15 21:08:13.467000064\n\
competition,coach,723,2017-09-15 21:21:46.743000064\n\
coach,exit,723,2017-09-15 21:21:46.743000064\n\
coach,team,724,2017-09-16 17:23:48.500999936\n\
team,competition,724,2017-09-16 17:24:04.296000000\n\
competition,exit,724,2017-09-16 17:24:04.296000000\n\
coach,competition,725,2017-09-17 07:38:42.528000000\n\
competition,coach,725,2017-09-17 07:39:00.678000128\n\
coach,team,725,2017-09-17 07:39:15.462000128\n\
team,routes,725,2017-09-17 07:40:02.985999872\n\
routes,route,725,2017-09-17 07:40:14.550000128\n\
route,routes,725,2017-09-17 07:41:12.724999936\n\
routes,badges,725,2017-09-17 07:41:18.822000128\n\
badges,exit,725,2017-09-17 07:41:18.822000128\n\
coach,competition,726,2017-09-19 05:31:33.727000064\n\
competition,team,726,2017-09-19 05:31:39.571000064\n\
team,track,726,2017-09-19 05:31:54.739000064\n\
track,route,726,2017-09-19 05:47:46.579000064\n\
route,track,726,2017-09-19 05:48:14.627000064\n\
track,team,726,2017-09-19 05:48:25.484999936\n\
team,routes,726,2017-09-19 05:48:35.428999936\n\
routes,competition,726,2017-09-19 05:48:42.536999936\n\
competition,exit,726,2017-09-19 05:48:42.536999936\n\
coach,competition,727,2017-09-21 05:53:35.809999872\n\
competition,exit,727,2017-09-21 05:53:35.809999872\n\
coach,track,728,2017-09-24 13:45:02.839000064\n\
track,competition,728,2017-09-24 13:45:12.769999872\n\
competition,team,728,2017-09-24 13:45:23.599000064\n\
team,personal,728,2017-09-24 13:45:55.571000064\n\
personal,team,728,2017-09-24 13:46:01.628999936\n\
team,exit,728,2017-09-24 13:46:01.628999936\n\
coach,team,729,2017-09-24 20:39:00.257999872\n\
team,personal,729,2017-09-24 20:39:19.379000064\n\
personal,team,729,2017-09-24 20:39:24.740000000\n\
team,competition,729,2017-09-24 20:39:29.476000000\n\
competition,coach,729,2017-09-24 20:39:43.772999936\n\
coach,badges,729,2017-09-24 20:39:49.096000000\n\
badges,exit,729,2017-09-24 20:39:49.096000000\n\
coach,exit,730,2017-09-25 07:32:06.116999936\n\
coach,competition,731,2017-09-25 07:36:28.830000128\n\
competition,track,731,2017-09-25 07:37:15.904999936\n\
track,exit,731,2017-09-25 07:37:15.904999936\n\
coach,exit,732,2017-09-08 21:04:01.225999872\n\
coach,exit,733,2017-09-08 21:05:28.497999872\n\
personal,track,734,2017-09-09 07:11:40.491000064\n\
track,team,734,2017-09-09 07:11:47.500000000\n\
team,routes,734,2017-09-09 07:12:33.627000064\n\
routes,badges,734,2017-09-09 07:12:43.519000064\n\
badges,coach,734,2017-09-09 07:13:08.263000064\n\
coach,personal,734,2017-09-09 07:13:56.520000000\n\
personal,coach,734,2017-09-09 07:13:59.479000064\n\
coach,competition,734,2017-09-09 07:14:22.788999936\n\
competition,team,734,2017-09-09 07:14:57.961999872\n\
team,badges,734,2017-09-09 07:16:00.260999936\n\
badges,exit,734,2017-09-09 07:16:00.260999936\n\
coach,track,735,2017-09-09 09:41:32.704000000\n\
track,route,735,2017-09-09 09:54:43.204999936\n\
route,coach,735,2017-09-09 09:54:56.041999872\n\
coach,track,735,2017-09-09 09:55:00.348000000\n\
track,team,735,2017-09-09 09:55:03.352000000\n\
team,competition,735,2017-09-09 09:55:45.148999936\n\
competition,exit,735,2017-09-09 09:55:45.148999936\n\
track,exit,736,2017-09-09 10:29:52.592000000\n\
track,route,737,2017-09-09 10:41:53.532999936\n\
route,personal,737,2017-09-09 10:41:56.628999936\n\
personal,track,737,2017-09-09 10:41:58.483000064\n\
track,team,737,2017-09-09 10:42:03.990000128\n\
team,coach,737,2017-09-09 10:42:11.934000128\n\
coach,competition,737,2017-09-09 10:42:20.752999936\n\
competition,coach,737,2017-09-09 10:42:22.615000064\n\
coach,routes,737,2017-09-09 10:42:26.310000128\n\
routes,competition,737,2017-09-09 10:42:29.724000000\n\
competition,team,737,2017-09-09 10:42:32.464999936\n\
team,badges,737,2017-09-09 10:42:44.703000064\n\
badges,exit,737,2017-09-09 10:42:44.703000064\n\
badges,exit,738,2017-09-09 12:53:01.040000000\n\
badges,team,739,2017-09-09 17:06:14.316000000\n\
team,exit,739,2017-09-09 17:06:14.316000000\n\
coach,routes,740,2017-09-09 21:07:34.463000064\n\
routes,route,740,2017-09-09 21:07:36.488000000\n\
route,routes,740,2017-09-09 21:07:56.620999936\n\
routes,route,740,2017-09-09 21:07:57.822000128\n\
route,routes,740,2017-09-09 21:08:06.951000064\n\
routes,route,740,2017-09-09 21:08:08.159000064\n\
route,routes,740,2017-09-09 21:08:14.385999872\n\
routes,competition,740,2017-09-09 21:08:17.102000128\n\
competition,badges,740,2017-09-09 21:08:22.588999936\n\
badges,track,740,2017-09-09 21:13:55.542000128\n\
track,personal,740,2017-09-09 21:13:59.499000064\n\
personal,track,740,2017-09-09 21:14:03.784999936\n\
track,team,740,2017-09-09 21:14:07.329999872\n\
team,coach,740,2017-09-09 21:14:25.099000064\n\
coach,competition,740,2017-09-09 21:14:49.499000064\n\
competition,coach,740,2017-09-09 21:14:54.329999872\n\
coach,routes,740,2017-09-09 21:14:58.569999872\n\
routes,route,740,2017-09-09 21:15:00.358000128\n\
route,routes,740,2017-09-09 21:16:14.430000128\n\
routes,route,740,2017-09-09 21:16:15.576999936\n\
route,routes,740,2017-09-09 21:16:45.985999872\n\
routes,exit,740,2017-09-09 21:16:45.985999872\n\
coach,exit,741,2017-09-10 21:09:40.467000064\n\
coach,team,742,2017-09-11 10:06:14.998000128\n\
team,competition,742,2017-09-11 10:06:59.991000064\n\
competition,exit,742,2017-09-11 10:06:59.991000064\n\
team,competition,743,2017-09-11 18:38:45.985999872\n\
competition,coach,743,2017-09-11 18:38:54.240999936\n\
coach,badges,743,2017-09-11 18:38:58.449999872\n\
badges,exit,743,2017-09-11 18:38:58.449999872\n\
coach,personal,744,2017-09-12 15:48:11.567000064\n\
personal,coach,744,2017-09-12 15:48:13.201999872\n\
coach,team,744,2017-09-12 15:48:15.604999936\n\
team,exit,744,2017-09-12 15:48:15.604999936\n\
track,exit,745,2017-09-12 16:29:13.918000128\n\
track,route,746,2017-09-12 17:19:36.279000064\n\
route,coach,746,2017-09-12 17:19:52.411000064\n\
coach,competition,746,2017-09-12 17:21:04.708999936\n\
competition,coach,746,2017-09-12 17:22:47.152999936\n\
coach,badges,746,2017-09-12 17:22:52.694000128\n\
badges,exit,746,2017-09-12 17:22:52.694000128\n\
coach,competition,747,2017-09-13 19:00:35.115000064\n\
competition,team,747,2017-09-13 19:00:42.372000000\n\
team,routes,747,2017-09-13 19:00:56.368000000\n\
routes,track,747,2017-09-13 19:01:00.343000064\n\
track,coach,747,2017-09-13 19:01:04.811000064\n\
coach,exit,747,2017-09-13 19:01:04.811000064\n\
competition,team,748,2017-09-13 19:43:39.543000064\n\
team,exit,748,2017-09-13 19:43:39.543000064\n\
coach,competition,749,2017-09-14 22:19:53.180000000\n\
competition,team,749,2017-09-14 22:20:02.659000064\n\
team,routes,749,2017-09-14 22:20:19.231000064\n\
routes,track,749,2017-09-14 22:20:22.286000128\n\
track,coach,749,2017-09-14 22:20:25.105999872\n\
coach,exit,749,2017-09-14 22:20:25.105999872\n\
coach,competition,750,2017-09-15 10:59:51.048000000\n\
competition,exit,750,2017-09-15 10:59:51.048000000\n\
coach,competition,751,2017-09-16 12:01:31.692000000\n\
competition,team,751,2017-09-16 12:01:40.529999872\n\
team,badges,751,2017-09-16 12:02:06.835000064\n\
badges,exit,751,2017-09-16 12:02:06.835000064\n\
coach,track,752,2017-09-17 16:28:27.779000064\n\
track,exit,752,2017-09-17 16:28:27.779000064\n\
coach,track,753,2017-09-17 17:32:27.409999872\n\
track,route,753,2017-09-17 17:32:28.774000128\n\
route,coach,753,2017-09-17 17:32:48.315000064\n\
coach,competition,753,2017-09-17 17:34:04.252000000\n\
competition,team,753,2017-09-17 17:34:18.111000064\n\
team,routes,753,2017-09-17 17:41:19.080000000\n\
routes,route,753,2017-09-17 17:41:21.324000000\n\
route,routes,753,2017-09-17 17:41:24.423000064\n\
routes,exit,753,2017-09-17 17:41:24.423000064\n\
routes,competition,754,2017-09-17 21:07:08.849999872\n\
competition,exit,754,2017-09-17 21:07:08.849999872\n\
competition,track,755,2017-09-18 11:35:53.303000064\n\
track,exit,755,2017-09-18 11:35:53.303000064\n\
coach,exit,756,2017-09-18 15:27:30.200000000\n\
coach,track,757,2017-09-18 21:06:24.294000128\n\
track,route,757,2017-09-18 21:06:30.376999936\n\
route,track,757,2017-09-18 21:06:31.985999872\n\
track,routes,757,2017-09-18 21:06:33.361999872\n\
routes,route,757,2017-09-18 21:06:35.444000000\n\
route,routes,757,2017-09-18 21:06:44.264000000\n\
routes,team,757,2017-09-18 21:06:48.926000128\n\
team,badges,757,2017-09-18 21:07:04.780999936\n\
badges,competition,757,2017-09-18 21:07:12.411000064\n\
competition,routes,757,2017-09-18 21:10:33.030000128\n\
routes,route,757,2017-09-18 21:10:35.225999872\n\
route,routes,757,2017-09-18 21:10:36.356999936\n\
routes,route,757,2017-09-18 21:10:39.104000000\n\
route,routes,757,2017-09-18 21:10:45.224000000\n\
routes,route,757,2017-09-18 21:10:47.235000064\n\
route,routes,757,2017-09-18 21:10:56.286000128\n\
routes,exit,757,2017-09-18 21:10:56.286000128\n\
coach,track,758,2017-09-19 17:35:52.192999936\n\
track,competition,758,2017-09-19 17:35:54.684999936\n\
competition,routes,758,2017-09-19 17:35:59.923000064\n\
routes,route,758,2017-09-19 17:36:01.550000128\n\
route,routes,758,2017-09-19 17:36:04.105999872\n\
routes,exit,758,2017-09-19 17:36:04.105999872\n\
routes,competition,759,2017-09-20 12:59:04.464000000\n\
competition,team,759,2017-09-20 12:59:12.497999872\n\
team,coach,759,2017-09-20 12:59:58.807000064\n\
coach,track,759,2017-09-20 13:00:59.180000000\n\
track,competition,759,2017-09-20 13:01:03.576999936\n\
competition,exit,759,2017-09-20 13:01:03.576999936\n\
coach,exit,760,2017-09-21 19:04:04.212999936\n\
team,competition,761,2017-09-22 13:31:57.425999872\n\
competition,exit,761,2017-09-22 13:31:57.425999872\n\
competition,team,762,2017-09-22 19:33:50.472000000\n\
team,badges,762,2017-09-22 19:34:10.100000000\n\
badges,personal,762,2017-09-22 19:34:16.000000000\n\
personal,bugreport,762,2017-09-22 19:34:18.908000000\n\
bugreport,personal,762,2017-09-22 19:34:28.337999872\n\
personal,bugreport,762,2017-09-22 19:34:31.048000000\n\
bugreport,routes,762,2017-09-22 19:34:33.908000000\n\
routes,route,762,2017-09-22 19:34:36.353999872\n\
route,routes,762,2017-09-22 19:34:38.044000000\n\
routes,route,762,2017-09-22 19:34:39.056999936\n\
route,routes,762,2017-09-22 19:34:39.891000064\n\
routes,route,762,2017-09-22 19:34:40.928000000\n\
route,routes,762,2017-09-22 19:34:48.012999936\n\
routes,route,762,2017-09-22 19:34:49.395000064\n\
route,routes,762,2017-09-22 19:34:51.907000064\n\
routes,exit,762,2017-09-22 19:34:51.907000064\n\
coach,track,763,2017-09-23 08:39:07.430000128\n\
track,exit,763,2017-09-23 08:39:07.430000128\n\
coach,track,764,2017-09-23 09:49:18.040999936\n\
track,route,764,2017-09-23 10:02:49.660000000\n\
route,track,764,2017-09-23 10:03:00.753999872\n\
track,routes,764,2017-09-23 10:03:02.896000000\n\
routes,route,764,2017-09-23 10:03:05.776000000\n\
route,coach,764,2017-09-23 10:03:07.016000000\n\
coach,competition,764,2017-09-23 10:03:08.968000000\n\
competition,team,764,2017-09-23 10:03:15.873999872\n\
team,badges,764,2017-09-23 10:03:41.496000000\n\
badges,competition,764,2017-09-23 10:04:16.660999936\n\
competition,team,764,2017-09-23 10:04:19.111000064\n\
team,badges,764,2017-09-23 10:04:21.311000064\n\
badges,coach,764,2017-09-23 10:04:22.740999936\n\
coach,exit,764,2017-09-23 10:04:22.740999936\n\
track,route,765,2017-09-23 13:48:31.777999872\n\
route,track,765,2017-09-23 13:48:36.672999936\n\
track,team,765,2017-09-23 13:48:41.731000064\n\
team,coach,765,2017-09-23 13:48:44.240000000\n\
coach,team,765,2017-09-23 13:48:46.665999872\n\
team,coach,765,2017-09-23 13:50:40.259000064\n\
coach,team,765,2017-09-23 14:02:43.286000128\n\
team,track,765,2017-09-23 14:02:44.836999936\n\
track,route,765,2017-09-23 14:20:12.304000000\n\
route,exit,765,2017-09-23 14:20:12.304000000\n\
coach,team,766,2017-09-24 13:15:07.968999936\n\
team,competition,766,2017-09-24 13:15:10.724999936\n\
competition,exit,766,2017-09-24 13:15:10.724999936\n\
coach,team,767,2017-09-08 09:23:04.880000000\n\
team,personal,767,2017-09-08 09:23:55.635000064\n\
personal,coach,767,2017-09-08 09:24:26.208999936\n\
coach,personal,767,2017-09-08 09:24:44.851000064\n\
personal,coach,767,2017-09-08 09:25:20.132999936\n\
coach,team,767,2017-09-08 09:25:25.300000000\n\
team,personal,767,2017-09-08 09:25:41.139000064\n\
personal,team,767,2017-09-08 09:25:43.724999936\n\
team,coach,767,2017-09-08 09:25:45.492000000\n\
coach,track,767,2017-09-08 09:25:46.612000000\n\
track,coach,767,2017-09-08 09:25:47.262000128\n\
coach,track,767,2017-09-08 09:26:21.540000000\n\
track,route,767,2017-09-08 09:26:49.632999936\n\
route,track,767,2017-09-08 09:27:10.236000000\n\
track,coach,767,2017-09-08 09:27:13.927000064\n\
coach,routes,767,2017-09-08 09:27:15.044000000\n\
routes,coach,767,2017-09-08 09:27:28.164999936\n\
coach,track,767,2017-09-08 09:27:33.115000064\n\
track,team,767,2017-09-08 09:27:39.718000128\n\
team,exit,767,2017-09-08 09:27:39.718000128\n\
coach,exit,768,2017-09-10 14:48:11.145999872\n\
coach,track,769,2017-09-10 14:48:11.427000064\n\
track,exit,769,2017-09-10 14:48:11.427000064\n\
coach,personal,770,2017-09-10 16:37:03.070000128\n\
personal,bugreport,770,2017-09-10 16:37:06.440999936\n\
bugreport,routes,770,2017-09-10 16:37:18.640999936\n\
routes,route,770,2017-09-10 16:37:23.993999872\n\
route,personal,770,2017-09-10 16:37:38.619000064\n\
personal,routes,770,2017-09-10 16:38:19.350000128\n\
routes,exit,770,2017-09-10 16:38:19.350000128\n\
coach,competition,771,2017-09-11 12:17:21.862000128\n\
competition,team,771,2017-09-11 12:17:40.579000064\n\
team,exit,771,2017-09-11 12:17:40.579000064\n\
coach,routes,772,2017-09-11 15:47:04.187000064\n\
routes,personal,772,2017-09-11 15:47:13.808000000\n\
personal,bugreport,772,2017-09-11 15:47:19.407000064\n\
bugreport,track,772,2017-09-11 15:47:45.547000064\n\
track,exit,772,2017-09-11 15:47:45.547000064\n\
personal,bugreport,773,2017-09-11 16:33:02.720999936\n\
bugreport,competition,773,2017-09-11 16:34:06.580999936\n\
competition,routes,773,2017-09-11 16:34:35.996999936\n\
routes,exit,773,2017-09-11 16:34:35.996999936\n\
coach,team,774,2017-09-12 05:53:21.171000064\n\
team,track,774,2017-09-12 05:54:14.481999872\n\
track,route,774,2017-09-12 05:54:38.391000064\n\
route,coach,774,2017-09-12 05:54:56.779000064\n\
coach,routes,774,2017-09-12 05:57:45.979000064\n\
routes,route,774,2017-09-12 05:57:54.780999936\n\
route,personal,774,2017-09-12 05:58:14.390000128\n\
personal,routes,774,2017-09-12 05:58:20.825999872\n\
routes,personal,774,2017-09-12 05:58:41.503000064\n\
personal,routes,774,2017-09-12 05:58:43.572000000\n\
routes,team,774,2017-09-12 05:58:58.068999936\n\
team,coach,774,2017-09-12 06:10:28.884000000\n\
coach,exit,774,2017-09-12 06:10:28.884000000\n\
coach,personal,775,2017-09-13 12:33:58.352999936\n\
personal,coach,775,2017-09-13 12:34:23.392999936\n\
coach,exit,775,2017-09-13 12:34:23.392999936\n\
coach,exit,776,2017-09-13 12:59:57.864000000\n\
coach,personal,777,2017-09-13 22:32:28.580999936\n\
personal,coach,777,2017-09-13 22:32:33.913999872\n\
coach,exit,777,2017-09-13 22:32:33.913999872\n\
coach,personal,778,2017-09-14 15:38:49.791000064\n\
personal,team,778,2017-09-14 15:39:01.132999936\n\
team,routes,778,2017-09-14 15:39:40.889999872\n\
routes,route,778,2017-09-14 15:39:45.655000064\n\
route,exit,778,2017-09-14 15:39:45.655000064\n\
coach,exit,779,2017-09-14 20:09:08.150000128\n\
coach,exit,780,2017-09-14 22:22:50.831000064\n\
coach,routes,781,2017-09-15 05:11:59.991000064\n\
routes,personal,781,2017-09-15 05:12:14.960000000\n\
personal,routes,781,2017-09-15 05:12:37.775000064\n\
routes,team,781,2017-09-15 05:12:42.451000064\n\
team,track,781,2017-09-15 05:13:12.556999936\n\
track,route,781,2017-09-15 05:13:34.059000064\n\
route,exit,781,2017-09-15 05:13:34.059000064\n\
coach,exit,782,2017-09-15 20:29:22.960000000\n\
coach,track,783,2017-09-16 15:41:47.471000064\n\
track,exit,783,2017-09-16 15:41:47.471000064\n\
route,coach,784,2017-09-16 16:20:26.472999936\n\
coach,team,784,2017-09-16 16:20:33.497999872\n\
team,exit,784,2017-09-16 16:20:33.497999872\n\
coach,competition,785,2017-09-16 18:05:48.750000128\n\
competition,coach,785,2017-09-16 18:06:02.924000000\n\
coach,track,785,2017-09-16 18:06:08.391000064\n\
track,exit,785,2017-09-16 18:06:08.391000064\n\
route,coach,786,2017-09-16 18:45:53.639000064\n\
coach,competition,786,2017-09-16 18:46:16.056999936\n\
competition,coach,786,2017-09-16 18:46:33.264999936\n\
coach,badges,786,2017-09-16 18:46:46.435000064\n\
badges,competition,786,2017-09-16 18:49:32.166000128\n\
competition,routes,786,2017-09-16 18:49:47.992999936\n\
routes,route,786,2017-09-16 18:49:53.833999872\n\
route,routes,786,2017-09-16 18:50:03.732000000\n\
routes,route,786,2017-09-16 18:50:08.371000064\n\
route,routes,786,2017-09-16 18:50:12.288000000\n\
routes,route,786,2017-09-16 18:50:15.027000064\n\
route,routes,786,2017-09-16 18:50:25.217999872\n\
routes,route,786,2017-09-16 18:50:28.049999872\n\
route,routes,786,2017-09-16 18:50:35.238000128\n\
routes,route,786,2017-09-16 18:50:38.343000064\n\
route,routes,786,2017-09-16 18:50:42.623000064\n\
routes,route,786,2017-09-16 18:50:46.377999872\n\
route,routes,786,2017-09-16 18:51:28.905999872\n\
routes,exit,786,2017-09-16 18:51:28.905999872\n\
coach,competition,787,2017-09-16 22:10:20.633999872\n\
competition,coach,787,2017-09-16 22:10:45.943000064\n\
coach,competition,787,2017-09-16 22:11:08.175000064\n\
competition,exit,787,2017-09-16 22:11:08.175000064\n\
coach,competition,788,2017-09-17 10:28:18.887000064\n\
competition,coach,788,2017-09-17 10:28:25.270000128\n\
coach,track,788,2017-09-17 10:28:32.044000000\n\
track,coach,788,2017-09-17 10:37:17.388000000\n\
coach,track,788,2017-09-17 10:37:22.612999936\n\
track,exit,788,2017-09-17 10:37:22.612999936\n\
coach,competition,789,2017-09-17 11:52:25.288000000\n\
competition,track,789,2017-09-17 11:52:34.878000128\n\
track,exit,789,2017-09-17 11:52:34.878000128\n\
coach,competition,790,2017-09-17 12:49:26.364999936\n\
competition,coach,790,2017-09-17 12:49:37.736000000\n\
coach,personal,790,2017-09-17 12:49:39.931000064\n\
personal,bugreport,790,2017-09-17 12:49:41.489999872\n\
bugreport,personal,790,2017-09-17 12:49:59.220999936\n\
personal,bugreport,790,2017-09-17 12:50:03.340000000\n\
bugreport,team,790,2017-09-17 12:50:07.096999936\n\
team,coach,790,2017-09-17 13:08:58.764000000\n\
coach,team,790,2017-09-17 13:14:07.428000000\n\
team,track,790,2017-09-17 13:14:21.558000128\n\
track,route,790,2017-09-17 13:14:29.596999936\n\
route,coach,790,2017-09-17 13:14:42.835000064\n\
coach,routes,790,2017-09-17 13:14:59.275000064\n\
routes,route,790,2017-09-17 13:15:04.185999872\n\
route,routes,790,2017-09-17 13:15:16.400000000\n\
routes,coach,790,2017-09-17 13:15:23.996000000\n\
coach,track,790,2017-09-17 13:32:32.801999872\n\
track,exit,790,2017-09-17 13:32:32.801999872\n\
coach,team,791,2017-09-17 15:23:17.191000064\n\
team,personal,791,2017-09-17 15:23:34.502000128\n\
personal,team,791,2017-09-17 15:23:48.804999936\n\
team,coach,791,2017-09-17 15:50:49.268000000\n\
coach,track,791,2017-09-17 15:50:52.691000064\n\
track,route,791,2017-09-17 15:51:05.060999936\n\
route,coach,791,2017-09-17 15:51:16.368000000\n\
coach,exit,791,2017-09-17 15:51:16.368000000\n\
team,routes,792,2017-09-17 16:29:50.076000000\n\
routes,route,792,2017-09-17 16:29:53.347000064\n\
route,exit,792,2017-09-17 16:29:53.347000064\n\
coach,competition,793,2017-09-17 20:53:46.916999936\n\
competition,coach,793,2017-09-17 20:54:18.967000064\n\
coach,competition,793,2017-09-17 20:54:22.224999936\n\
competition,coach,793,2017-09-17 20:54:26.399000064\n\
coach,competition,793,2017-09-17 20:54:29.542000128\n\
competition,team,793,2017-09-17 20:54:35.464000000\n\
team,coach,793,2017-09-17 20:55:00.879000064\n\
coach,exit,793,2017-09-17 20:55:00.879000064\n\
coach,exit,794,2017-09-17 21:28:07.174000128\n\
coach,competition,795,2017-09-18 11:27:40.436000000\n\
competition,team,795,2017-09-18 11:27:58.992999936\n\
team,coach,795,2017-09-18 11:28:11.974000128\n\
coach,track,795,2017-09-18 11:52:27.438000128\n\
track,exit,795,2017-09-18 11:52:27.438000128\n\
route,team,796,2017-09-18 13:35:23.561999872\n\
team,badges,796,2017-09-18 13:48:35.264999936\n\
badges,team,796,2017-09-18 13:48:44.832999936\n\
team,coach,796,2017-09-18 13:48:48.588999936\n\
coach,competition,796,2017-09-18 13:49:07.008000000\n\
competition,coach,796,2017-09-18 13:49:15.532999936\n\
coach,competition,796,2017-09-18 13:51:13.750000128\n\
competition,coach,796,2017-09-18 13:51:22.768000000\n\
coach,routes,796,2017-09-18 13:51:38.648000000\n\
routes,route,796,2017-09-18 13:51:42.912000000\n\
route,routes,796,2017-09-18 13:51:56.150000128\n\
routes,route,796,2017-09-18 13:51:58.632999936\n\
route,routes,796,2017-09-18 13:52:04.510000128\n\
routes,route,796,2017-09-18 13:52:07.696000000\n\
route,routes,796,2017-09-18 13:52:25.236000000\n\
routes,exit,796,2017-09-18 13:52:25.236000000\n\
coach,exit,797,2017-09-18 14:30:49.643000064\n\
coach,track,798,2017-09-18 14:31:45.143000064\n\
track,exit,798,2017-09-18 14:31:45.143000064\n\
route,coach,799,2017-09-18 17:16:33.028000000\n\
coach,exit,799,2017-09-18 17:16:33.028000000\n\
team,exit,800,2017-09-18 17:55:31.143000064\n\
coach,track,801,2017-09-19 09:11:32.991000064\n\
track,exit,801,2017-09-19 09:11:32.991000064\n\
coach,exit,802,2017-09-19 10:06:41.635000064\n\
coach,track,803,2017-09-19 10:12:15.094000128\n\
track,exit,803,2017-09-19 10:12:15.094000128\n\
coach,exit,804,2017-09-19 10:45:46.793999872\n\
coach,track,805,2017-09-19 12:15:00.425999872\n\
track,route,805,2017-09-19 12:15:14.312000000\n\
route,coach,805,2017-09-19 12:15:26.836999936\n\
coach,exit,805,2017-09-19 12:15:26.836999936\n\
coach,team,806,2017-09-19 12:30:59.388999936\n\
team,coach,806,2017-09-19 12:56:21.396999936\n\
coach,exit,806,2017-09-19 12:56:21.396999936\n\
coach,competition,807,2017-09-19 13:14:18.184999936\n\
competition,coach,807,2017-09-19 13:14:56.916000000\n\
coach,track,807,2017-09-19 13:15:03.913999872\n\
track,exit,807,2017-09-19 13:15:03.913999872\n\
coach,exit,808,2017-09-20 19:44:33.396999936\n\
coach,team,809,2017-09-21 09:45:43.044000000\n\
team,badges,809,2017-09-21 09:45:54.327000064\n\
badges,coach,809,2017-09-21 09:46:11.812000000\n\
coach,exit,809,2017-09-21 09:46:11.812000000\n\
coach,track,810,2017-09-21 13:27:40.152000000\n\
track,exit,810,2017-09-21 13:27:40.152000000\n\
coach,track,811,2017-09-21 14:09:50.264000000\n\
track,exit,811,2017-09-21 14:09:50.264000000\n\
track,route,812,2017-09-21 15:01:19.577999872\n\
route,track,812,2017-09-21 15:04:11.320000000\n\
track,team,812,2017-09-21 15:04:34.260999936\n\
team,coach,812,2017-09-21 15:05:12.454000128\n\
coach,competition,812,2017-09-21 15:05:35.536000000\n\
competition,coach,812,2017-09-21 15:05:49.376999936\n\
coach,route,812,2017-09-21 15:29:24.364000000\n\
route,track,812,2017-09-21 15:29:55.888000000\n\
track,route,812,2017-09-21 15:30:07.443000064\n\
route,track,812,2017-09-21 15:30:11.958000128\n\
track,coach,812,2017-09-21 15:30:20.804000000\n\
coach,competition,812,2017-09-21 15:30:29.470000128\n\
competition,coach,812,2017-09-21 15:30:41.686000128\n\
coach,track,812,2017-09-21 15:30:45.569999872\n\
track,route,812,2017-09-21 15:48:12.572000000\n\
route,coach,812,2017-09-21 15:48:25.423000064\n\
coach,competition,812,2017-09-21 15:49:28.727000064\n\
competition,coach,812,2017-09-21 15:49:45.556000000\n\
coach,team,812,2017-09-21 15:49:50.950000128\n\
team,badges,812,2017-09-21 15:51:51.198000128\n\
badges,routes,812,2017-09-21 15:52:35.748000000\n\
routes,route,812,2017-09-21 15:52:41.075000064\n\
route,routes,812,2017-09-21 15:53:08.585999872\n\
routes,route,812,2017-09-21 15:53:12.376999936\n\
route,routes,812,2017-09-21 15:53:18.248000000\n\
routes,route,812,2017-09-21 15:53:32.737999872\n\
route,routes,812,2017-09-21 15:53:57.377999872\n\
routes,route,812,2017-09-21 15:54:00.140000000\n\
route,routes,812,2017-09-21 15:54:57.896999936\n\
routes,route,812,2017-09-21 15:55:01.844999936\n\
route,routes,812,2017-09-21 15:55:08.577999872\n\
routes,route,812,2017-09-21 15:55:10.310000128\n\
route,routes,812,2017-09-21 15:55:40.827000064\n\
routes,route,812,2017-09-21 15:55:43.380000000\n\
route,routes,812,2017-09-21 15:56:19.472000000\n\
routes,exit,812,2017-09-21 15:56:19.472000000\n\
coach,personal,813,2017-09-21 20:49:11.991000064\n\
personal,coach,813,2017-09-21 20:50:35.047000064\n\
coach,competition,813,2017-09-21 20:50:47.059000064\n\
competition,coach,813,2017-09-21 20:51:02.704000000\n\
coach,team,813,2017-09-21 20:51:10.024999936\n\
team,exit,813,2017-09-21 20:51:10.024999936\n\
coach,team,814,2017-09-22 10:29:38.208000000\n\
team,competition,814,2017-09-22 10:30:05.176000000\n\
competition,badges,814,2017-09-22 10:30:21.248000000\n\
badges,exit,814,2017-09-22 10:30:21.248000000\n\
coach,competition,815,2017-09-23 00:06:15.969999872\n\
competition,coach,815,2017-09-23 00:06:32.761999872\n\
coach,team,815,2017-09-23 00:06:36.268000000\n\
team,exit,815,2017-09-23 00:06:36.268000000\n\
coach,team,816,2017-09-23 21:48:04.260000000\n\
team,routes,816,2017-09-23 21:48:57.316999936\n\
routes,route,816,2017-09-23 21:49:17.289999872\n\
route,routes,816,2017-09-23 21:49:18.441999872\n\
routes,route,816,2017-09-23 21:49:20.032999936\n\
route,routes,816,2017-09-23 21:50:33.702000128\n\
routes,route,816,2017-09-23 21:50:37.102000128\n\
route,routes,816,2017-09-23 21:50:44.044000000\n\
routes,route,816,2017-09-23 21:50:57.416999936\n\
route,routes,816,2017-09-23 21:51:09.456000000\n\
routes,route,816,2017-09-23 21:51:17.985999872\n\
route,exit,816,2017-09-23 21:51:17.985999872\n\
coach,team,817,2017-09-24 07:52:01.289999872\n\
team,exit,817,2017-09-24 07:52:01.289999872\n\
coach,track,818,2017-09-24 11:43:46.163000064\n\
track,exit,818,2017-09-24 11:43:46.163000064\n\
route,coach,819,2017-09-24 13:02:27.436000000\n\
coach,exit,819,2017-09-24 13:02:27.436000000\n\
route,routes,820,2017-09-24 14:27:12.524999936\n\
routes,route,820,2017-09-24 14:27:22.360000000\n\
route,routes,820,2017-09-24 14:27:45.080999936\n\
routes,route,820,2017-09-24 14:27:47.995000064\n\
route,routes,820,2017-09-24 14:29:17.926000128\n\
routes,route,820,2017-09-24 14:29:20.995000064\n\
route,routes,820,2017-09-24 14:29:38.915000064\n\
routes,competition,820,2017-09-24 14:29:44.996999936\n\
competition,team,820,2017-09-24 14:30:03.097999872\n\
team,coach,820,2017-09-24 14:53:01.456000000\n\
coach,track,820,2017-09-24 14:53:17.928999936\n\
track,exit,820,2017-09-24 14:53:17.928999936\n\
coach,track,821,2017-09-24 16:53:15.344000000\n\
track,route,821,2017-09-24 16:53:20.032999936\n\
route,coach,821,2017-09-24 16:53:32.023000064\n\
coach,competition,821,2017-09-24 17:13:01.464000000\n\
competition,team,821,2017-09-24 17:15:23.268999936\n\
team,routes,821,2017-09-24 17:15:58.985999872\n\
routes,route,821,2017-09-24 17:16:05.852000000\n\
route,exit,821,2017-09-24 17:16:05.852000000\n\
routes,route,822,2017-09-24 18:26:25.015000064\n\
route,routes,822,2017-09-24 18:26:37.464000000\n\
routes,route,822,2017-09-24 18:26:40.180999936\n\
route,routes,822,2017-09-24 18:26:49.852000000\n\
routes,route,822,2017-09-24 18:26:52.559000064\n\
route,routes,822,2017-09-24 18:27:05.303000064\n\
routes,badges,822,2017-09-24 18:27:09.320000000\n\
badges,exit,822,2017-09-24 18:27:09.320000000\n\
coach,competition,823,2017-09-24 19:56:43.017999872\n\
competition,exit,823,2017-09-24 19:56:43.017999872\n\
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
    console.log(sessions);
    for(var j = 0; j < sessions.length; j++){
      mc.add_session(sessions[j]);
    }

    var states = ['badges', 'bugreport', 'coach', 'competition', 'personal', 'route', 'routes', 'team', 'track', 'exit'];
    for(var i = 0; i < states.length; i++){
      for(var j = 0; j < states.length; j++){
        console.log(states[i], '-->', states[j], ':', mc.get_transition_matrix()[mc.state_to_id[states[i]]][mc.state_to_id[states[j]]].toFixed(3));
      }
    }

    console.log(mc);

    document.getElementById("nrClustersSlider").max = Math.min(10, sessions.length);

    //cmap = createColorMap(mc);
    cmap = {
      'track': "rgb(169, 117, 255)",
      'route': "rgb(65, 92, 244)",
      'routes': "rgb(66, 149, 244)",

      'competition': "rgb(244, 65, 65)",
      'team': "rgb(252, 122, 0)",

      'coach': "rgb(247, 235, 4)",

      'badges': "rgb(110, 237, 56)",
      'bugreport': "rgb(56, 237, 119)",
      'exit': "rgb(247, 181, 163)",
      'personal': "rgb(43, 226, 226)",

    };

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
