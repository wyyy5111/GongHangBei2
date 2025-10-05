import json
from pathlib import Path
path = Path('assets/data/mock.json')
data = json.load(path.open('r', encoding='utf-8'))
print(data['dataAssets']['enterprises'][0])
