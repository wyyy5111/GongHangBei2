from pathlib import Path
text = Path('assets/js/app.js').read_text(encoding='utf-8')
start = text.find('function init(stepElements')
print(text[start:start+500])
