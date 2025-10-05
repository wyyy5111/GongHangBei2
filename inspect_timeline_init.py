from pathlib import Path
text = Path('assets/js/app.js').read_text(encoding='utf-8')
idx = text.find('function init(stepElements')
print(idx)
print(text[idx:idx+200])
