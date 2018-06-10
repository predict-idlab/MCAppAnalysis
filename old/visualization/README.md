# Markov Chain Visualizations

This repository contains all code required to run your own interactive visualization of Markov Chains. Just open `markov_chain.html` in your browser to see the visualization. If you want to plug in your own data, you will have to create a JSON file with the same structure as either `visualization_data.json` or `visualization_data_start_exit.json`. The code has been built further upon [this repository](https://github.com/matheusportela/markov-chain)

![Screenshot of the application](screenshot.png?raw=true)

Implemented features:
* You can drag nodes to create a nice structured diagram
* A slider that indicates the minimum probability to visualize an edge
* Hover over edges to get the exact probability
* Enable/disable nodes and their corresponding edges with checkboxes
* Different metrics, selectable through a dropdown, for the size of the nodes
* You can click on a node to start a simulation from there (e.g. click on the START-node to see a typical flow of a user)

List of supported browsers:
* Mozilla Firefox

List of unsupported browsers:
* Chrome and Chromium

If you can (or cannot) open the visualization in your browser (Safari, Opera, ...) please create an issue so I can append it to one of both lists. 

Ideally, the visualization is ran on a HTTP Server to avoid cross-origin problems (which is the case for e.g. Chrome). A HTTP Server with the visualization is temporary (until 2018) running [here](http://193.190.127.226:8000/).
