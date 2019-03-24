import json
import re
import sys

abbreviations = {
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
}

with open(sys.argv[1]) as tsv:
    for line in tsv:
        if '\t' not in line or line.startswith('#'): continue
        full, abbrev = line.strip().split('\t')
        match = re.search(r'\[[A-Za-z ]+(, [A-Za-z]+)*\]', full)
        if match:
            before = full[:match.start(0)]
            after = full[match.end(0):]
            middles = match.group(0)[1:-1].split(', ')
            if len(middles) == 1:
                # Optional, like Europe[an]
                expanded = (before + after).strip()
            else:
                # Have to pick one.
                expanded = before + middles[0] + after
        else:
            expanded = full

        # Expand closed-up capitals.
        abbrev = re.sub(r'\.(?=[A-Z])', '. ', abbrev)

        print('[{}]: [{}]'.format(abbrev, expanded))
        num_words = abbrev.count(' ') + 1
        abbreviations[num_words][abbrev] = expanded
        if abbrev.endswith('.') and not abbrev.endswith('s.'):
            abbreviations[num_words][abbrev[:-1] + 's.'] = expanded + 's'

with open('data/abbreviations.json', 'w') as out:
    json.dump(abbreviations, out)
