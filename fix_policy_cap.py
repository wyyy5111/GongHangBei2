from pathlib import Path
path = Path('assets/js/app.js')
text = path.read_text(encoding='utf-8')
old_line = "    rightCol.appendChild(createElement('p', { className: 'metric-caption', text: `加分封顶：${policy.cap || (policy.base || 0) + (policy.addonsCap || 0)} 分` }));\n"
if old_line not in text:
    raise SystemExit('old line not found')
new_lines = "    const policyCapValue = typeof policy.cap === 'number' ? policy.cap : (policy.base || 0) + (policy.addonsCap || 0);\n    rightCol.appendChild(createElement('p', { className: 'metric-caption', text: `加分封顶：${policyCapValue} 分` }));\n"
text = text.replace(old_line, new_lines)
path.write_text(text, encoding='utf-8')
