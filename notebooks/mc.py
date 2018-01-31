from collections import defaultdict
import json

class MarkovChain(object):
    def __init__(self):
        # A dictionary of dictionaries with the transition counts
        # self.transition_counts['A']['B'] contains the number
        # of transitions from page 'A' to 'B'
        self.transition_counts = defaultdict(lambda: defaultdict(int))
        
    def add_sequence(self, sequence):
        """Iterate over the different actions in the sequence
        and increment the counters in the self.transition_counts"""
        for i in range(len(sequence) - 1):
            self.transition_counts[sequence[i]][sequence[i + 1]] += 1
            
    def get_transition_matrix(self):
        """Generate the transition matrix, based on the transition_counts,
        by normalizing each row such that it sums to 1.0"""
        transition_matrix = defaultdict(lambda: defaultdict(int))
        for from_page in self.transition_counts:
            total = sum(self.transition_counts[from_page][x] for x in self.transition_counts[from_page])
            for to_page in self.transition_counts[from_page]:
                transition_matrix[from_page][to_page] = self.transition_counts[from_page][to_page]/total
        return transition_matrix
    
    def print_transition_matrix(self):
        """Print out the transition matrix, used for debugging"""
        transition_matrix = self.get_transition_matrix()
        for from_page in transition_matrix:
            print('Transitions from {}'.format(from_page))
            for to_page in transition_matrix[from_page]:
                print('\t to {}: {}'.format(to_page, transition_matrix[from_page][to_page]))
                
    def get_probability(self, sequence):
        """Get the probability that a certain sequence was generated
        by this markov chain"""
        prod = 1
        transition_matrix = self.get_transition_matrix()
        for i in range(len(sequence) - 1):
            prod *= transition_matrix[sequence[i]][sequence[i+1]]
        return prod

    def to_json(self, time_on_pages, output_path, metrics=None):
        """Serialize the transition matrix into JSON format
        Args:
            - time_on_pages: dict with keys the pages
            - metrics: pd.DataFrame, with the index the pages"""
        colors = [
            '#a6cee3', '#1f78b4', '#b2df8a', '#33a02c',
            '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00',
            '#cab2d6', '#6a3d9a', '#ffff99', '#b15928'
        ]
        pages = list(self.get_transition_matrix().keys()) + ['exit']
        data = {'nodes': [], 'edges': []}

        # Generate all the node data
        for i in range(len(pages)):
            node_data = {
                'id': pages[i],
                'x': (i + 1)*100,
                'y': (i//2 + 1)*60,
                'enabled': True,
                'color': colors[i], 
                'time_on_page': time_on_pages[pages[i]],
                'metrics': {}
            }
            # Add all metrics from the dataframe
            if metrics is not None:
                for metric in list(metrics.columns):
                    node_data['metrics'][metric] = metrics.loc[pages[i]][metric]
            # Add our newly created object to the list
            data['nodes'].append(node_data)

        # Generate the edge data
        transition_matrix = self.get_transition_matrix()
        for from_page in transition_matrix:
            for to_page in transition_matrix[from_page]:
                data['edges'].append({
                    'target': to_page, 
                    'source': from_page, 
                    'prob': transition_matrix[from_page][to_page]
                })

        # Serialize
        with open(output_path, 'w+') as ofp:
            json.dump(data, ofp)








"""
{
  "nodes": [
    {
      "metrics": {
        "page_views": 0.0762522814844859,
        "page_rank": 0.1182832058513775
      },
      "x": 100,
      "color": "#a6cee3",
      "enabled": true,
      "id": "route",
      "y": 60,
      "timeOnPage": 19.91299388379205
    },
    ...
  ],
  "edges": [
    {
      "target": "route",
      "source": "route",
      "prob": 0.0
    },
    ...
  ]
}
"""