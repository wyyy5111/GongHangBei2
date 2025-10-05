from pathlib import Path
path = Path('assets/js/app.js')
text = path.read_text(encoding='utf-8')
print('区块链' in text)
