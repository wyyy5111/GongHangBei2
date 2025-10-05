from pathlib import Path
import re
js_path = Path('assets/js/app.js')
text = js_path.read_text(encoding='utf-8')
pattern = r"      flow.timelineSteps.forEach\((step) => \{\n        const stepEl = createElement\('div', \{\n          className: 'glass-card flow-item',\n          attrs: \{ tabindex: '0', role: 'button', 'aria-label': step.title \}\n        \}\);\n        stepEl.innerHTML = `<strong>\$\{step.title\}</strong><p class=\"metric-caption\">\$\{step.description\}</p>`;\n        listWrap.appendChild\(stepEl\);\n      \}\);"
new_block = "      flow.timelineSteps.forEach((step, idx) => {\n        const stepEl = createElement('div', {\n          className: 'glass-card flow-item',\n          attrs: { tabindex: '0', role: 'button', 'aria-label': step.title, 'data-step-index': String(step.step || idx + 1) }\n        });\n        const indexBadge = createElement('span', { className: 'flow-step-index', text: String(step.step || idx + 1).padStart(2, '0') });\n        const title = createElement('strong', { text: step.title });\n        const desc = createElement('p', { className: 'flow-item-desc', text: step.description });\n        stepEl.append(indexBadge, title, desc);\n        listWrap.appendChild(stepEl);\n      });"
text_new, count = re.subn(pattern, new_block, text)
if count == 0:
    raise SystemExit('renderBusinessFlow block not matched')
js_path.write_text(text_new, encoding='utf-8')
