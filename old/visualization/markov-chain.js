/* MAIN CODE TEMPLATE: https://github.com/matheusportela/markov-chain */


/* FROM: https://j11y.io/javascript/regex-selector-for-jquery/ */
jQuery.expr[':'].regex = function(elem, index, match) {
    var matchParams = match[3].split(','),
        validLabels = /^(data|css):/,
        attr = {
            method: matchParams[0].match(validLabels) ? 
                        matchParams[0].split(':')[0] : 'attr',
            property: matchParams.shift().replace(validLabels,'')
        },
        regexFlags = 'ig',
        regex = new RegExp(matchParams.join('').replace(/^\s+|\s+$/g,''), regexFlags);
    return regex.test(jQuery(elem)[attr.method](attr.property));
}

$(function() {
    
    // Read our data
    d3.json("visualization_data.json", function(error, data) {

        var name_to_node = {}
        for(node in data.nodes){
            name_to_node[data.nodes[node].id] = data.nodes[node];
        }

        // Append a div for our edges
        var div = d3.select("body").append("div")   
                                   .attr("class", "tooltip")               
                                   .style("opacity", 0);

        // The SVG itself
        var svg = d3.select('.chart'),
            width = +svg.attr('width'),
            height = +svg.attr('height');

        // Create edge html elements
        // position, width and color or set in drawEdges()
        var edges = svg.selectAll('path')
                .data(data.edges)
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
                .data(data.nodes);

        var elemEnter = elem.enter()
                .append("g");

        var circle = elemEnter.append("circle");
        var text = elemEnter.append("text");

        // Use JQuery to append HTML code into #controlPanel
        // First we append a checkbox for every node in our data
        for(node in data.nodes){
            $('#checkboxes').append('<p style="display: inline-block; text-align: left;">'+data.nodes[node].id+': </p>')
            $('#checkboxes').append('<input type="checkbox" style="display: inline-block; margin-left: 5px;" checked=true id="checkbox_'+data.nodes[node].id+'"/>')
            $('#checkboxes').append('<br/>')
            $('#checkboxes').append("<script>$('#checkbox_"+data.nodes[node].id+"').change( function() {\n$('#circle_"+data.nodes[node].id+"').toggle();\n$('#text_"+data.nodes[node].id+"').toggle();\n})</script>");
        }

        // Now a dropdown with options the different metrics of a node
        $('#metrics').append('<select id="metricDropdown">');

        var metricNames = Object.keys(data.nodes[0].metrics);
        for(metric in metricNames){
            $('#metricDropdown').append('<option value="'+metricNames[metric]+'">'+metricNames[metric]+'</option');
        }

        $('#metrics').append('</select>');


        // Draw edges and nodes
        drawEdges();
        drawNodes();


        function drawNodes() {
            var dropdown = document.getElementById('metricDropdown');
            var selectedMetric = dropdown.options[dropdown.selectedIndex].value;

            circle.attr("r", function(d) { return d.metrics[selectedMetric]*250; } )
                .attr("stroke","black")
                .attr("fill", function(d) { return d.color; })
                .style("opacity", .75)
                .attr('cx', function(d) { return d.x; })
                .attr('cy', function(d) { return d.y; })
                .attr('id', function(d){ return 'circle_'+d.id; })
                .style('display', 'block')
                .call(d3.drag()
                    .on('drag', drag));

            text.attr("dx", function(d){return d.x - d.id.length*2.5; })
                .attr("dy", function(d){return d.y - d.metrics[selectedMetric]*250; })
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
                console.log(d, d.source, d.target, name_to_node);

                source_checkbox_checked = document.getElementById('checkbox_' + source_node.id).checked;
                target_checkbox_checked = document.getElementById('checkbox_' + target_node.id).checked;

                var min_prob = $('#minimumProbabilitySlider').val();
                if(source_checkbox_checked && target_checkbox_checked && d.prob >= min_prob){
                    // Initial and final coordinates
                    var x1 = source_node.x,
                        y1 = source_node.y,
                        x2 = target_node.x,
                        y2 = target_node.y;

                    if (x1 == x2 && y1 == y2)
                        return drawBezierCurve(x1, y1);
                    return drawQuadraticCurve(x1, y1, x2, y2);
                }
            });
            edges.attr('stroke-width', function(d){
                return d.prob ** (0.75) * 25;
            });
            edges.attr('stroke', function(d){
                var source_node = name_to_node[d.source];
                return source_node.color;
            });
            edges.style('display', function(d){
                var source_node = name_to_node[d.source];
                if(source_node.enabled) {
                    return 'block';
                } else {
                    return 'none';
                }
            });
            edges.attr('id', function(d){
                var source_node = name_to_node[d.source];
                var target_node = name_to_node[d.target];
                return 'edge_'+source_node.id+'_'+target_node.id;
            });
        };

        function drawQuadraticCurve(x1, y1, x2, y2) {
            // Angle between initial and final coordinates
            var theta = Math.atan2(y2 - y1, x2 - x1);

            // How far the curve will be from the line connecting the two nodes
            var h = 50;

            // Curve control point
            var xf = (x1 + x2)/2 + h*Math.cos(theta + Math.PI/2),
                yf = (y1 + y2)/2 + h*Math.sin(theta + Math.PI/2);

            // Creating quadratic curve
            // https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
            return ('M' + x1 + ' ' + y1 +
                   ' Q ' + xf + ' ' + yf +
                   ', ' + x2 + ' ' + y2);
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
            d.x = d3.event.x;
            d.y = d3.event.y;
            var dropdown = document.getElementById('metricDropdown');
            var selectedMetric = dropdown.options[dropdown.selectedIndex].value;

            d3.select(this.parentElement.getElementsByTagName('circle')[0])
                .attr('cx', d.x)
                .attr('cy', d.y);

            d3.select(this.parentElement.getElementsByTagName('text')[0])
                .attr('dx', d.x - d.id.length*2.5)
                .attr('dy', d.y - d.metrics[selectedMetric]*250);

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

        // When another metric is selected, we change the size of the nodes
        $('#metricDropdown').on('input', function () {
            /*var dropdown = document.getElementById('metricDropdown');
            var selectedMetric = dropdown.options[dropdown.selectedIndex].value;
            circle.attr('r', function(d){
                return d.metrics[selectedMetric]*250;
            });
            elemEnter.attr("dy", function(d){return d.y - d.metrics[selectedMetric]*250; });*/
            drawNodes();
        });

        // If slider moves, update the label with the value
        $('#minimumProbabilitySlider').on('input', function () {
            var output = document.getElementById("minimumProbabilityValue");
            output.innerHTML = this.value;
        });

        function sleep (time) {
          return new Promise((resolve) => setTimeout(resolve, time));
        }

        // MarkovChain class, used for simulation
        class MarkovChain {
            constructor(transitionMatrix, states) {
                this.transitionMatrix = transitionMatrix;
                this.state = 0;
                this.states = states;
            }

            set_state(state){
                this.state = state;
            }

            transition() {
                var sampledProb = Math.random();
                var nextState = this.state;
                var requiredProb;
                var sleepTime = name_to_node[this.states[this.state]].timeOnPage * 30;
                // Sleep, depending on time on page
                for (var i = 0; i < this.transitionMatrix.length; i++) {
                    requiredProb = this.transitionMatrix[this.state][i];
                    if (requiredProb >= $('#minimumProbabilitySlider').val() && 
                        document.getElementById('checkbox_' + this.states[i]).checked){
                        nextState = i;

                        if (sampledProb < requiredProb) {
                            break;
                        } else {
                            sampledProb -= requiredProb;
                        }
                    }
                }
                this.state = nextState;
            }
        }

        // Map node names to an index in the matrix
        // Create empty transition matrix and get all node names
        node_id_to_idx = {}
        var transitionMatrix = new Array(data.nodes.length);
        var states = new Array(data.nodes.length).fill(0);
        for(node in data.nodes){
            node_id_to_idx[data.nodes[node].id] = node;
            transitionMatrix[node] = new Array(data.nodes.length).fill(0);
            states[node] = data.nodes[node].id;
        }

        // Fill the transition matrix with the corresponding probabilities
        for(edge in data.edges){
            transitionMatrix[node_id_to_idx[data.edges[edge].source]][node_id_to_idx[data.edges[edge].target]] = data.edges[edge].prob;
        }

        // Simulation variables
        var markov = new MarkovChain(transitionMatrix, states);
        var simulateThread = null;

        // Keep calling simulate with a new timeout variable
        function simulate(time){
            simulateThread = window.setTimeout(function(){
                $('#circle_' + markov.states[markov.state]).removeClass('current-node');
                markov.transition();
                $('#circle_' + markov.states[markov.state]).addClass('current-node');
                simulate(name_to_node[markov.states[markov.state]].timeOnPage * 50);
            }, time);
        }

        // When a node is clicked, we restart the simulation from that node
        $('[id^="circle_"],[id^="text_"]').on('click', function () {
            var clickedPage = this.id.split('_')[1];
            if(simulateThread != null){ clearInterval(simulateThread); }
            markov.set_state(node_id_to_idx[clickedPage]);
            $('[id^="circle_"]').removeClass('current-node');
            $('#circle_'+clickedPage).addClass('current-node');
            simulate(name_to_node[markov.states[markov.state]].timeOnPage * 50);
        });
    
    });

});