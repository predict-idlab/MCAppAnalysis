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

  var sortedSessions  = sessions.slice(0).sort(sortByLength),
      // Discard outliers in terms of session length
      minLength = sortedSessions[parseInt(0.05*sessions.length)].length, 
      maxLength = sortedSessions[parseInt(0.95*sessions.length)].length;

  sessions = sessions.filter(x => x.length > minLength && x.length < maxLength);

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

        this.state_to_id = {};
        this.id_to_state = {};
        for(var i = 0; i < states.length; i++){
          this.state_to_id[states[i]] = i;
          this.id_to_state[i] = states[i];
        }

        this.state = this.id_to_state[0];
    }

    add_session(session){
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

    get_probability(session){
      var transitionMatrix = this.get_transition_matrix(),
          prob = 1.0;
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

document.getElementById('files').addEventListener('change', handleFileSelect, false);