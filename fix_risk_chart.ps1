# 修复风险矩阵图表的字体和颜色配置

$filePath = "c:\Users\33387\Desktop\GongHangBei3\assets\js\app.js"
$content = Get-Content $filePath -Raw -Encoding UTF8

# 替换label配置中的formatter
$pattern1 = "textBorderColor: 'rgba\(0, 0, 0, 0\.9\)',"
$replacement1 = "textBorderColor: 'rgba(11, 31, 59, 0.8)',"
$content = $content -replace $pattern1, $replacement1

# 替换textBorderWidth
$pattern2 = "textBorderWidth: 3,  // 加粗描边，增强可读性"
$replacement2 = "textBorderWidth: 2,"
$content = $content -replace $pattern2, $replacement2

# 替换formatter函数 - 简化版本
$pattern3 = "formatter: \(params\) => \{[^}]+const value = params\.value\[2\];[^}]+const riskType[^}]+icon[^}]+return[^}]+\}"
$replacement3 = "formatter: (params) => { const value = params.value[2]; return value.toFixed(3); }"
$content = $content -replace $pattern3, $replacement3

$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host "✅ 风险矩阵字体和颜色已更新为深蓝主题!" -ForegroundColor Green
