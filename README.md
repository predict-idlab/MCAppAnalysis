# MCAppAnalysis
Code to reproduce the experiments and the proposed visualization from 'Data mining in the development of mHealth apps: assessing in-app navigation through Markov Chain analysis'

## Installing all requirements

The code can be run with Python3. Just run `(python3 -m) pip install -r requirements.txt` to install all python requirements.

## Generating the Markov Chain

Code to generate a Markov Chain based on raw data logs can be found in [this notebook](https://github.com/IBCNServices/MCAppAnalysis/blob/master/notebooks/create_markov_chain.ipynb). After running all cells, a new file `visualization_data.json` will be created in the `visualization/` directory. The notebook depends on the `mc.py` file, which contains native Python code for Markov Chains (automatically keep track of transition counts, normalize this matrix, serialize to json, calculate probability that a sequence is generated from a certain markov chain and so on).

## Rendering the visualization

After running all cells in `create_markov_chain.ipynb`, just open the markov_chain.html in FireFox.

## Sequence clustering

Please take a look at [this notebook](https://github.com/IBCNServices/MCAppAnalysis/blob/master/notebooks/sequence_clustering.ipynb)