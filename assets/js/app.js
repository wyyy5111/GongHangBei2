'use strict';

const I18N = {
  zh: {
    downloadPng: '下载 PNG',
    baseline: '基准值',
    current: '当前值',
    target: '目标值',
    policyTimeline: '政策时间线',
    play: '播放',
    pause: '暂停',
    next: '下一步',
    prev: '上一步',
    calculatorTitle: 'S/L 计算器',
    calculatorDesc: '调节评分与营收参数，实时计算信用评分 S、行业系数 K、信用系数 C 以及可贷额度 L。',
    calculatorResult: '计算结果',
    regulatoryView: '监管穿透视图',
    selectQuarter: '选择季度',
    selectIndustry: '选择行业',
    selectRegion: '选择区域',
    totalAmount: '融资总额',
    loanCount: '放款笔数',
    alerts: '风险预警',
    percentage: '占比',
    deviationWarning: '偏差预警',
    deliverables: '交付清单',
    riskStrategy: '风险应对策略',
    controlLayer: '三层管控体系',
    printReady: '打印样式准备完毕',
    printReminder: '请在系统打印对话框中确认导出设置。'
  }
};

const STATE = {
  data: null,
  currentObjectivePhase: 'shortTerm',
  timelineIndex: 0,
  timelineTimer: null
};

function createElement(tag, options = {}) {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.html) el.innerHTML = options.html;
  if (options.text) el.textContent = options.text;
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        el.setAttribute(key, value);
      }
    });
  }
  return el;
}

function formatNumber(value, options = {}) {
  const { digits = 0 } = options;
  return Number(value).toLocaleString('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

function formatPercent(value, digits = 1) {
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function sum(values) {
  return values.reduce((acc, item) => acc + Number(item || 0), 0);
}

function average(values) {
  return values.length ? sum(values) / values.length : 0;
}

const Toast = (() => {
  const el = createElement('div', { className: 'toast', attrs: { role: 'status', 'aria-live': 'polite' } });
  document.body.appendChild(el);
  let timer;
  function show(message) {
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('show'), 2500);
  }
  return { show };
})();

const DataLoader = (() => {
  let cache = null;
  async function load() {
    if (cache) return cache;
    // 尝试从内联脚本加载数据
    const inline = document.getElementById('mock-data');
    if (inline && inline.textContent) {
      try {
        cache = JSON.parse(inline.textContent);
        return cache;
      } catch (parseError) {
        console.error('解析内嵌数据失败', parseError);
        // 如果解析失败，尝试其他方法
      }
    }

    // 如果内联失败或不存在，则尝试 fetch
    try {
      const jsonUrl = new URL('../data/mock.json', import.meta.url);
      const response = await fetch(jsonUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      cache = await response.json();
      return cache;
    } catch (error) {
      console.error('读取 mock.json 失败', error);
    }

    // 作为最终备用方案，检查全局变量
    if (window.__LOCAL_MOCK_DATA__) {
      cache = window.__LOCAL_MOCK_DATA__;
      return cache;
    }

    throw new Error('无法加载任何数据源');
  }
  return { load };
})();

const ChartManager = (() => {
  const charts = new Map();
  function initChart(id, option) {
    const dom = document.getElementById(id);
    if (!dom) return null;
    const instance = echarts.init(dom, null, { renderer: 'canvas' });
    instance.setOption(option);
    charts.set(id, instance);
    // 保证首屏与面板切换后尺寸正确
    setTimeout(() => {
      try { instance.resize(); } catch (e) { /* noop */ }
    }, 0);
    return instance;
  }

  function updateChart(id, updater) {
    const instance = charts.get(id);
    if (!instance) return;
    const option = instance.getOption();
    const nextOption = updater(option) || option;
    instance.setOption(nextOption, true);
  }

  function resizeAll() {
    charts.forEach((chart) => chart.resize());
  }

  function downloadChart(id, filename = `${id}.png`) {
    const instance = charts.get(id);
    if (!instance) return;
    const dataUrl = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#0B1F3B' });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Toast.show(`${filename} 已保存`);
  }

  function registerDownloadButton(id, button) {
    if (!button) return;
    button.addEventListener('click', () => downloadChart(id));
  }

  window.addEventListener('resize', debounce(resizeAll, 200));

  return {
    initChart,
    updateChart,
    registerDownloadButton,
    resizeAll
  };
})();

const PrintExport = (() => {
  function init(printButton, config) {
    if (!printButton) return;
    printButton.addEventListener('click', () => {
      document.body.classList.add('print-mode');
      const beforePrint = () => {
        const panels = document.querySelectorAll('.tab-panel');
        panels.forEach((panel) => {
          const keep = config.keepSections.includes(panel.dataset.tab);
          panel.style.display = keep ? 'block' : 'none';
        });
      };
      const afterPrint = () => {
        const panels = document.querySelectorAll('.tab-panel');
        panels.forEach((panel) => panel.style.removeProperty('display'));
        document.body.classList.remove('print-mode');
      };
      window.addEventListener('beforeprint', beforePrint, { once: true });
      window.addEventListener('afterprint', afterPrint, { once: true });
      Toast.show(I18N.zh.printReady);
      setTimeout(() => window.print(), 100);
    });
  }
  return { init };
})();

const Router = (() => {
  let navItems = [];
  let navList;
  let panels;
  let currentId = '';

  function createNav() {
    navList.innerHTML = '';
    navItems.forEach((item, index) => {
      const li = createElement('li');
      const button = createElement('button', {
        text: item.label,
        attrs: {
          id: `nav-${item.id}`,
          'data-tab': item.id,
          role: 'tab',
          'aria-selected': index === 0 ? 'true' : 'false',
          tabindex: index === 0 ? '0' : '-1'
        }
      });
      button.addEventListener('click', () => navigate(item.id, true));
      li.appendChild(button);
      navList.appendChild(li);
    });
  }

  function updatePanels(targetId) {
    panels.forEach((panel) => {
      const isTarget = panel.dataset.tab === targetId;
      panel.classList.toggle('active', isTarget);
      panel.setAttribute('aria-hidden', String(!isTarget));
      if (isTarget) {
        panel.focus({ preventScroll: true });
      }
    });
  }

  function updateNav(targetId) {
    navList.querySelectorAll('button').forEach((btn) => {
      const isTarget = btn.dataset.tab === targetId;
      btn.setAttribute('aria-selected', String(isTarget));
      btn.tabIndex = isTarget ? 0 : -1;
      if (isTarget) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function navigate(targetId, setHash = false) {
    if (!targetId || currentId === targetId) return;
    currentId = targetId;
    updateNav(targetId);
    updatePanels(targetId);
    // 面板切换时触发所有图表自适应
    try { ChartManager.resizeAll(); } catch (e) { /* noop */ }
    if (setHash) {
      history.replaceState(null, '', `#${targetId}`);
    }
  }

  function handleHashChange() {
    const hash = location.hash.replace('#', '');
    const found = navItems.find((item) => item.id === hash);
    navigate(found ? found.id : navItems[0].id);
  }

  function init(navigation) {
    navItems = navigation;
    navList = document.getElementById('tab-list');
    panels = document.querySelectorAll('.tab-panel');
    createNav();
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
  }

  return { init, navigate };
})();

const TimelinePlayer = (() => {
  let steps = [];
  let detailPane;
  let playbackSpeed = 1500;
  let timer = null;
  let timelineData = [];
  let currentIndex = 0;
  let containerEl = null;

  function renderDetail(step) {
    if (!detailPane || !step) return;
    detailPane.innerHTML = '';
    const title = createElement('h4', { text: step.title });
    const desc = createElement('p', { text: step.description });
    const ledger = createElement('div', { className: 'glass-card' });
    ledger.innerHTML = `<strong>链上字段：</strong> ${step.ledgerFields.join(' / ')}`;
    const participants = createElement('p', { text: `参与方：${step.participants.join('、')}` });
    const compliance = createElement('div', { className: 'warning-card', text: step.compliance });
    detailPane.append(title, desc, ledger, participants, compliance);
  }

  function highlight(index) {
    steps.forEach((stepEl, idx) => {
      stepEl.classList.toggle('active', idx === index);
    });
    // 更新容器偏移使点击项旋转至顶部
    if (containerEl) {
      try { containerEl.style.setProperty('--offset', String(index)); } catch (e) { /* noop */ }
    }
    renderDetail(timelineData[index]);
    currentIndex = index;
  }

  function play() {
    // 取消自动轮播：仅在交互时平滑移动至顶部位置
    stop();
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function init(stepElements, detailElement, options) {
    steps = Array.from(stepElements);
    detailPane = detailElement;
    timelineData = options.data;
    playbackSpeed = options.speed || 1500;
    containerEl = options.container || null;
    steps.forEach((stepEl, idx) => {
      stepEl.addEventListener('mouseenter', () => {
        stop();
        highlight(idx);
      });
      stepEl.addEventListener('focus', () => {
        stop();
        highlight(idx);
      });
      stepEl.addEventListener('click', () => {
        stop();
        currentIndex = idx;
        highlight(currentIndex);
        // 若步骤定义了目标页面，则进行页面跳转
        const target = timelineData && timelineData[idx] && timelineData[idx].targetTab;
        if (target) {
          try { Router.navigate(target, true); } catch (e) { /* noop */ }
        }
      });
    });
    highlight(0);
  }

  return { init, play, stop, highlight };
})();

const ScoreLimitCalculator = (() => {
  let container;
  let chartId = 'chart-calculator';
  const inputs = {};
  let summaryBox;

  const CREDIT_MAP = [
    { min: 90, value: 1.2, label: '信用优秀' },
    { min: 80, value: 1.0, label: '信用良好' },
    { min: 70, value: 0.8, label: '信用稳健' },
    { min: 60, value: 0.5, label: '需重点关注' }
  ];

  function createSlider(id, label, value = 80) {
    const wrapper = createElement('label', { className: 'calc-control' });
    wrapper.innerHTML = `
      <span>${label}</span>
      <div class="calc-input">
        <input type="range" min="40" max="100" value="${value}" id="${id}" aria-label="${label}" />
        <output id="${id}-output">${value}</output>
      </div>
    `;
    return wrapper;
  }

  function createNumberInput(id, label, value, step) {
    const wrapper = createElement('label', { className: 'calc-control' });
    wrapper.innerHTML = `
      <span>${label}</span>
      <input type="number" id="${id}" value="${value}" step="${step}" aria-label="${label}" />
    `;
    return wrapper;
  }

  function getCreditCoefficient(score) {
    const match = CREDIT_MAP.find((item) => score >= item.min);
    return match ? match.value : 0;
  }

  function getCreditLabel(score) {
    const match = CREDIT_MAP.find((item) => score >= item.min);
    return match ? match.label : '拒贷';
  }

  function getIndustryCoefficient(industry, rules) {
    const kFactors = (rules && rules.limitModel && rules.limitModel.kFactors) ? rules.limitModel.kFactors : {};
    const value = kFactors[industry];
    return typeof value === 'number' ? value : 0.2;
  }

  function calculate(values, rules) {
    // S 分计算：S = 0.3×S1 + 0.4×S2 + 0.2×S3 + 0.1×S4
    const score = Number(((values.S1 * 0.3) + (values.S2 * 0.4) + (values.S3 * 0.2) + (values.S4 * 0.1)).toFixed(1));
    const creditCoeff = getCreditCoefficient(score);
    const industryCoeff = getIndustryCoefficient(values.industry, rules);
    // L 额度计算：L = R × K × C − D
    const limit = Math.max(0, values.revenue * industryCoeff * creditCoeff - values.outstanding);
    return {
      score,
      creditCoeff,
      creditLabel: getCreditLabel(score),
      industryCoeff,
      limit
    };
  }

  function collectValues(defaults) {
    return {
      S1: Number(inputs.S1.value),
      S2: Number(inputs.S2.value),
      S3: Number(inputs.S3.value),
      S4: Number(inputs.S4.value),
      revenue: Number(inputs.revenue.value || defaults.revenue),
      outstanding: Number(inputs.outstanding.value || defaults.outstanding),
      industry: inputs.industry.value
    };
  }

  function renderChart(values, result) {
    const seriesData = [];
    for (let s = 60; s <= 100; s += 5) {
      const creditCoeff = getCreditCoefficient(s);
      const limit = Math.max(0, values.revenue * result.industryCoeff * creditCoeff - values.outstanding);
      seriesData.push([s, Number(limit.toFixed(2))]);
    }
    const option = {
      backgroundColor: 'transparent',
      textStyle: { color: '#BFD4FF' },
      grid: { left: 50, right: 20, top: 30, bottom: 40 },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (val) => `${formatNumber(val, { digits: 0 })} 万元`
      },
      xAxis: {
        type: 'value',
        name: '信用评分 S',
        min: 60,
        max: 100,
        axisLine: { lineStyle: { color: '#1F6FEB' } }
      },
      yAxis: {
        type: 'value',
        name: '额度 (万元)',
        axisLine: { lineStyle: { color: '#1FBF9A' } },
        splitLine: { lineStyle: { color: 'rgba(31,111,235,0.2)' } }
      },
      series: [
        {
          type: 'line',
          smooth: true,
          data: seriesData,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(31,191,154,0.35)' },
              { offset: 1, color: 'rgba(11,31,59,0.1)' }
            ])
          },
          lineStyle: { color: '#1FBF9A' },
          symbol: 'circle',
          symbolSize: 6
        },
        {
          type: 'scatter',
          data: [[result.score, Number(result.limit.toFixed(2))]],
          symbolSize: 16,
          itemStyle: { color: '#E0B95B' }
        }
      ]
    };
    ChartManager.initChart(chartId, option);
  }

  function update(defaults, rules) {
    const values = collectValues(defaults);
    const result = calculate(values, rules);
    summaryBox.innerHTML = `
      <p>评分 S：<strong>${result.score}</strong> (${result.creditLabel})</p>
      <p>行业系数 K：<strong>${result.industryCoeff.toFixed(2)}</strong></p>
      <p>信用系数 C：<strong>${result.creditCoeff.toFixed(2)}</strong></p>
      <p>可贷额度 L：<strong>${formatNumber(result.limit, { digits: 0 })} 万元</strong></p>
    `;
    summaryBox.className = `calc-summary ${result.creditCoeff > 0 ? 'approved' : 'rejected'}`;
    renderChart(values, result);
  }

  function bindEvents(defaults, rules) {
    ['S1', 'S2', 'S3', 'S4'].forEach((key) => {
      const range = inputs[key];
      const output = document.getElementById(`${key}-output`);
      range.addEventListener('input', () => {
        output.textContent = range.value;
        update(defaults, rules);
      });
    });
    ['revenue', 'outstanding'].forEach((key) => {
      inputs[key].addEventListener('change', () => update(defaults, rules));
    });
    inputs.industry.addEventListener('change', () => update(defaults, rules));
  }

  function init(target, defaults, rules) {
    container = target;
    container.innerHTML = '';
    const wrapper = createElement('section', { className: 'glass-card' });
    const header = createElement('header', { className: 'calc-header' });
    header.innerHTML = `<h3>${I18N.zh.calculatorTitle}</h3><p>${I18N.zh.calculatorDesc}</p>`;

    const form = createElement('div', { className: 'calc-grid' });
    ['S1', 'S2', 'S3', 'S4'].forEach((key, idx) => {
      const label = rules.scoreModel.dimensions[idx].name;
      const slider = createSlider(key, `${label} (S${idx + 1})`, defaults[key]);
      form.appendChild(slider);
    });

    const revenueInput = createNumberInput('revenue', '年度营收 R (万元)', defaults.revenue, 1000);
    const outstandingInput = createNumberInput('outstanding', '未结清余额 D (万元)', defaults.outstanding, 100);
    const industrySelect = createElement('label', { className: 'calc-control' });
    const options = Object.keys(rules.limitModel.kFactors)
      .map((key) => `<option value="${key}" ${key === defaults.industry ? 'selected' : ''}>${key.toUpperCase()}</option>`)
      .join('');
    industrySelect.innerHTML = `<span>行业系数 K</span><select id="industry" aria-label="行业系数">${options}</select>`;

    form.append(revenueInput, outstandingInput, industrySelect);
    wrapper.append(header, form);

    const chartCard = createElement('div', { className: 'chart-card' });
    chartCard.innerHTML = `<div id="${chartId}" class="chart-container" role="img" aria-label="额度变化图"></div>`;
    const chartActions = createElement('div', { className: 'chart-actions' });
    const downloadBtn = createElement('button', {
      className: 'btn btn-outline',
      text: I18N.zh.downloadPng,
      attrs: { type: 'button' }
    });
    chartActions.appendChild(downloadBtn);
    chartCard.appendChild(chartActions);
    wrapper.appendChild(chartCard);

    summaryBox = createElement('div', { className: 'calc-summary' });
    wrapper.appendChild(summaryBox);

    container.appendChild(wrapper);

    inputs.S1 = wrapper.querySelector('#S1');
    inputs.S2 = wrapper.querySelector('#S2');
    inputs.S3 = wrapper.querySelector('#S3');
    inputs.S4 = wrapper.querySelector('#S4');
    inputs.revenue = wrapper.querySelector('#revenue');
    inputs.outstanding = wrapper.querySelector('#outstanding');
    inputs.industry = wrapper.querySelector('#industry');

    ChartManager.registerDownloadButton(chartId, downloadBtn);
    bindEvents(defaults, rules);
    update(defaults, rules);
  }

  return { init };
})();

const UIBuilder = (() => {
  function renderMeta(meta) {
    document.getElementById('app-title').textContent = `${meta.titleZh}`;
    document.getElementById('app-subtitle').textContent = `${meta.titleEn}｜${meta.scenario}`;
    document.getElementById('app-slogan').textContent = meta.slogan;
    document.getElementById('app-school').textContent = `团队：${meta.team.join('、')}｜学校：${meta.school}`;
    document.getElementById('app-timestamp').textContent = `数据更新：${meta.timestamp}`;
    document.getElementById('print-export').textContent = meta.printButtonText;
  }

  function renderCTA(buttons) {
    const wrap = document.getElementById('cta-buttons');
    wrap.innerHTML = '';
    buttons.forEach((btn) => {
      const button = createElement('button', {
        className: 'btn',
        text: btn.label,
        attrs: { type: 'button', 'data-target': btn.targetTab, 'aria-label': btn.label }
      });
      button.addEventListener('click', () => Router.navigate(btn.targetTab, true));
      wrap.appendChild(button);
    });
  }

  function createChartCard(parent, config) {
    const card = createElement('section', { className: 'chart-card' });
    const title = createElement('h3', { text: config.title });
    if (config.subtitle) {
      const subtitle = createElement('p', { className: 'metric-caption', text: config.subtitle });
      card.append(title, subtitle);
    } else {
      card.appendChild(title);
    }
    const container = createElement('div', { className: 'chart-container', attrs: { id: config.id } });
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', config.title);
    card.appendChild(container);
    const actionBar = createElement('div', { className: 'chart-actions' });
    const downloadBtn = createElement('button', {
      className: 'btn btn-outline',
      text: I18N.zh.downloadPng,
      attrs: { type: 'button', 'aria-label': `${config.title} ${I18N.zh.downloadPng}` }
    });
    actionBar.appendChild(downloadBtn);
    card.appendChild(actionBar);
    parent.appendChild(card);
    ChartManager.registerDownloadButton(config.id, downloadBtn);
    return container;
  }

  function renderOverview(overview, assets) {
    const panel = document.getElementById('panel-overview');
    panel.innerHTML = '';
    const grid = createElement('div', { className: 'section-grid' });
    const template = document.getElementById('kpi-card-template');
    overview.kpiFlip.forEach((kpi) => {
      const card = template.content.firstElementChild.cloneNode(true);
      const front = card.querySelector('.flip-front');
      const back = card.querySelector('.flip-back');
      front.innerHTML = `
        <h3>${kpi.label}</h3>
        <p class="metric-caption">${kpi.description}</p>
        <p class="key-metric">${kpi.unit ? `${kpi.current}${kpi.unit}` : formatNumber(kpi.current, { digits: kpi.current < 1 ? 2 : 0 })}</p>
      `;
      back.innerHTML = `
        <p>${I18N.zh.baseline}：${kpi.unit ? `${kpi.baseline}${kpi.unit}` : formatNumber(kpi.baseline, { digits: kpi.baseline < 1 ? 2 : 0 })}</p>
        ${kpi.target !== undefined ? `<p>${I18N.zh.target}：${kpi.unit ? `${kpi.target}${kpi.unit}` : formatNumber(kpi.target, { digits: kpi.target < 1 ? 2 : 0 })}</p>` : ''}
        ${kpi.improvement !== undefined ? `<p>${I18N.zh.percentage}：${formatPercent(kpi.improvement)}</p>` : ''}
      `;
      grid.appendChild(card);
    });
    panel.appendChild(grid);

    const chartContainer = createChartCard(panel, {
      id: 'chart-kpi-overview',
      title: '融资周期对比',
      subtitle: '传统 vs 双链模式季度表现'
    });
    const cycleData = assets.financeCycle;
    ChartManager.initChart('chart-kpi-overview', {
      backgroundColor: 'transparent',
      legend: { data: ['传统流程', '双链优化'], textStyle: { color: '#BFD4FF' } },
      grid: { left: 50, right: 20, top: 50, bottom: 40 },
      textStyle: { color: '#BFD4FF' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: cycleData.map((item) => item.quarter),
        axisLine: { lineStyle: { color: '#1F6FEB' } }
      },
      yAxis: {
        type: 'value',
        name: '工作日',
        axisLine: { lineStyle: { color: '#1F6FEB' } },
        splitLine: { lineStyle: { color: 'rgba(31,111,235,0.2)' } }
      },
      series: [
        {
          name: '传统流程',
          type: 'line',
          smooth: true,
          data: cycleData.map((item) => item.traditional),
          lineStyle: { color: '#8BA3C7' }
        },
        {
          name: '双链优化',
          type: 'line',
          smooth: true,
          data: cycleData.map((item) => item.blockchain),
          lineStyle: { color: '#1FBF9A' },
          areaStyle: { color: 'rgba(31,191,154,0.25)' }
        }
      ]
    });
  }

  function renderBackground(background, assets) {
    const panel = document.getElementById('panel-background');
    panel.innerHTML = '';
    const painGrid = createElement('div', { className: 'section-grid' });
    background.painPoints.forEach((item) => {
      const card = createElement('article', { className: 'glass-card' });
      card.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <p class="metric-caption">影响：${item.impact}</p>
      `;
      painGrid.appendChild(card);
    });
    panel.appendChild(painGrid);

    const chartContainer = createChartCard(panel, {
      id: 'chart-advantage',
      title: '区块链应对优势对照',
      subtitle: background.blockchainAdvantage.notes
    });
    ChartManager.initChart('chart-advantage', {
      backgroundColor: 'transparent',
      legend: { data: ['传统流程', '双链融合'], textStyle: { color: '#BFD4FF' } },
      radar: {
        indicator: background.blockchainAdvantage.dimensions.map((dim) => ({ name: dim, max: 100 })),
        splitLine: { lineStyle: { color: ['rgba(31,111,235,0.2)', 'rgba(31,111,235,0.4)'] } },
        axisLine: { lineStyle: { color: 'rgba(31,111,235,0.5)' } }
      },
      textStyle: { color: '#BFD4FF' },
      series: [
        {
          type: 'radar',
          data: [
            { name: '传统流程', value: background.blockchainAdvantage.traditional },
            { name: '双链融合', value: background.blockchainAdvantage.blockchain }
          ],
          areaStyle: { opacity: 0.25 }
        }
      ]
    });

    const policyCard = createElement('section', { className: 'glass-card' });
    policyCard.innerHTML = `<h3>${I18N.zh.policyTimeline}</h3>`;
    const list = createElement('ol', { className: 'timeline policy-timeline' });
    background.policyTimeline.forEach((item, index) => {
      const li = createElement('li', { className: 'timeline-step', attrs: { 'data-step': index + 1 } });
      li.innerHTML = `<strong>${item.date}</strong>｜${item.title}<p class="metric-caption">${item.summary}</p>`;
      list.appendChild(li);
    });
    policyCard.appendChild(list);
    panel.appendChild(policyCard);

    const scenarioCard = createElement('section', { className: 'glass-card scenario-card' });
    scenarioCard.innerHTML = `
      <h3>${background.scenario.title}</h3>
      <p>${background.scenario.description}</p>
    `;
    const bulletList = createElement('ul');
    background.scenario.bullets.forEach((point) => {
      const li = createElement('li', { text: point });
      bulletList.appendChild(li);
    });
    scenarioCard.appendChild(bulletList);
    const img = createElement('img', {
      attrs: {
        src: background.scenario.diagram,
        alt: '应收账款融资示意图',
        loading: 'eager'
      }
    });
    scenarioCard.appendChild(img);
    panel.appendChild(scenarioCard);
  }

  
  
  function renderObjectives(objectives, assets) {
    const panel = document.getElementById('panel-objectives');
    panel.innerHTML = '';
    const toggleWrap = createElement('div', { className: 'cta-group' });
    objectives.phases.forEach((phase) => {
      const isActive = phase.id === STATE.currentObjectivePhase;
      const btn = createElement('button', {
        className: 'btn' + (isActive ? ' active' : ''),
        text: phase.label,
        attrs: { type: 'button', 'data-phase': phase.id }
      });
      btn.addEventListener('click', () => {
        STATE.currentObjectivePhase = phase.id;
        toggleWrap.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        updatePhase();
      });
      toggleWrap.appendChild(btn);
    });
    panel.appendChild(toggleWrap);

    // 预警与滚动迭代信息区，增大间距与可读性
    const infoRow = createElement('div', { className: 'section-grid' });
    const warningBox = createElement('div', { className: 'warning-card', text: objectives.warningRules.message });
    const rollingWrap = createElement('div', { className: 'glass-card' });
    const rollingBadge = createElement('span', { className: 'badge badge-rolling', text: objectives.rollingBadge.label });
    const rollingDesc = createElement('p', { className: 'metric-caption', text: objectives.rollingBadge.description });
    rollingWrap.append(rollingBadge, rollingDesc);
    infoRow.append(warningBox, rollingWrap);
    panel.appendChild(infoRow);

    const metricsWrap = createElement('div', { className: 'section-grid', attrs: { id: 'objective-metrics' } });
    panel.appendChild(metricsWrap);

    // 两张图并排展示的栅格容器
    const chartsGrid = createElement('div', { className: 'charts-grid' });
    panel.appendChild(chartsGrid);

    createChartCard(chartsGrid, {
      id: 'chart-objective-gauges',
      title: '效率 / 风险 / 成本 指标对比',
      subtitle: '以目标完成度展示'
    });

    createChartCard(chartsGrid, {
      id: 'chart-cost-compare',
      title: '成本结构对比',
      subtitle: '人工审核 / 纸质单据 / 对账沟通 / 资金占压'
    });

    // 移除重复的预警与滚动迭代徽章渲染，改为上方 infoRow 统一展示

    function displayValue(metric, value) {
      if (value < 1 && (!metric.unit || metric.unit.indexOf('率') !== -1 || metric.unit.indexOf('%') !== -1 || metric.unit.indexOf('比') !== -1)) {
        return formatPercent(value, 0);
      }
      if (metric.unit) {
        return formatNumber(value, { digits: value % 1 === 0 ? 0 : 2 }) + ' ' + metric.unit;
      }
      return formatNumber(value, { digits: value % 1 === 0 ? 0 : 2 });
    }

    function updatePhase() {
      const phase = objectives.phases.find((item) => item.id === STATE.currentObjectivePhase);
      metricsWrap.innerHTML = '';
      const grouped = { efficiency: [], risk: [], cost: [] };
      phase.metrics.forEach((metric) => {
        grouped[metric.category].push(metric);
        const card = createElement('article', { className: 'glass-card' });
        card.innerHTML = '<h3>' + metric.metric + '</h3>' +
          '<p class="metric-caption">' + I18N.zh.baseline + '：' + displayValue(metric, metric.baseline) + '</p>' +
          '<p class="metric-caption">' + I18N.zh.target + '：' + displayValue(metric, metric.target) + '</p>';
        metricsWrap.appendChild(card);
      });
      ChartManager.initChart('chart-objective-gauges', {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { data: ['基准', '目标'], textStyle: { color: '#BFD4FF' } },
        grid: { left: 60, right: 20, top: 50, bottom: 40 },
        textStyle: { color: '#BFD4FF' },
        xAxis: {
          type: 'category',
          data: Object.keys(grouped).map((key) => key.toUpperCase()),
          axisLine: { lineStyle: { color: '#1F6FEB' } }
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#1F6FEB' } },
          splitLine: { lineStyle: { color: 'rgba(31,111,235,0.2)' } }
        },
        series: [
          {
            name: '基准',
            type: 'bar',
            data: Object.values(grouped).map((metrics) => average(metrics.map((m) => m.baseline))),
            itemStyle: { color: 'rgba(31,111,235,0.6)' }
          },
          {
            name: '目标',
            type: 'bar',
            data: Object.values(grouped).map((metrics) => average(metrics.map((m) => m.target))),
            itemStyle: { color: 'rgba(31,191,154,0.75)' }
          }
        ]
      });
    }

    const cost = assets.costStructure;
    ChartManager.initChart('chart-cost-compare', {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['优化前', '优化后'], textStyle: { color: '#BFD4FF' } },
      grid: { left: 60, right: 20, top: 50, bottom: 40 },
      textStyle: { color: '#BFD4FF' },
      xAxis: {
        type: 'category',
        data: cost.categories,
        axisLine: { lineStyle: { color: '#1F6FEB' } }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#1F6FEB' } },
        splitLine: { lineStyle: { color: 'rgba(31,111,235,0.2)' } }
      },
      series: [
        { name: '优化前', type: 'bar', data: cost.before, itemStyle: { color: 'rgba(139,163,199,0.7)' } },
        { name: '优化后', type: 'bar', data: cost.after, itemStyle: { color: 'rgba(31,191,154,0.75)' } }
      ]
    });

    updatePhase();
  }

function renderTechnology(technology, dataAssets) {
    const panel = document.getElementById('panel-technology');
    panel.innerHTML = '';

    const archCard = createElement('section', { className: 'glass-card arch-card' });
    archCard.innerHTML = '<h3>技术架构总览</h3>';
    const archImg = createElement('img', {
      attrs: {
        src: technology.architectureDiagram,
        alt: '双链融合技术架构图',
        loading: 'eager'
      }
    });
    archCard.appendChild(archImg);
    panel.appendChild(archCard);

    const scoreCard = createElement('section', { className: 'glass-card' });
    scoreCard.innerHTML = `
      <h3>S 信用评分模型</h3>
      <div class="formula-card">
        <div class="formula"><span class="var">S</span> <span class="op">=</span> <span class="num">0.3</span><span class="op">×</span><span class="var">S1</span> <span class="op">+</span> <span class="num">0.4</span><span class="op">×</span><span class="var">S2</span> <span class="op">+</span> <span class="num">0.2</span><span class="op">×</span><span class="var">S3</span> <span class="op">+</span> <span class="num">0.1</span><span class="op">×</span><span class="var">S4</span></div>
        <p class="formula-hint">权重：S1/S2/S3/S4 分别 0.3/0.4/0.2/0.1</p>
      </div>`;
    const scoreList = createElement('ul');
    technology.scoreModel.dimensions.forEach((dim, idx) => {
      const li = createElement('li', { html: `<strong>S${idx + 1} ${dim.name}</strong>｜${dim.items.join(' / ')}｜${dim.note}` });
      scoreList.appendChild(li);
    });
    scoreCard.appendChild(scoreList);
    panel.appendChild(scoreCard);

    const limitCard = createElement('section', { className: 'glass-card' });
    const notesHtml = (technology.limitModel.notes || []).map((n) => `<li>${n}</li>`).join('');
    limitCard.innerHTML = `
      <h3>L 额度公式</h3>
      <div class="formula-card">
        <div class="formula">L = <span class="var">R</span> × <span class="var">K</span> × <span class="var">C</span> − <span class="var">D</span></div>
        <ul class="formula-vars">${notesHtml}</ul>
      </div>`;
    const kList = createElement('ul');
    Object.entries(technology.limitModel.kFactors).forEach(([industry, value]) => {
      kList.appendChild(createElement('li', { text: `行业 ${industry.toUpperCase()}：K = ${value}` }));
    });
    limitCard.appendChild(kList);
    const creditList = createElement('ul');
    technology.limitModel.creditBands.forEach((band) => {
      creditList.appendChild(createElement('li', { text: `${band.range} → C=${band.coefficient}｜${band.label}` }));
    });
    limitCard.appendChild(creditList);
    panel.appendChild(limitCard);

    const calcContainer = createElement('div', { attrs: { id: 'calculator-panel' } });
    panel.appendChild(calcContainer);
    ScoreLimitCalculator.init(calcContainer, technology.calculatorDefaults, technology);

    const workflowCard = createElement('section', { className: 'glass-card workflow-card' });
    workflowCard.innerHTML = '<h3>智能合约执行泳道</h3>';
    const wfImg = createElement('img', {
      attrs: {
        src: technology.workflowDiagram,
        alt: '智能合约执行流程泳道图',
        loading: 'eager'
      }
    });
    workflowCard.appendChild(wfImg);
    panel.appendChild(workflowCard);

    const componentGrid = createElement('div', { className: 'section-grid' });
    technology.components.forEach((comp) => {
      const compCard = createElement('article', { className: 'glass-card' });
      compCard.innerHTML = `<h3>${comp.name}</h3><p>${comp.description}</p>`;
      componentGrid.appendChild(compCard);
    });
    panel.appendChild(componentGrid);
  }

  function renderBusinessFlow(flow, assets) {
    const panel = document.getElementById('panel-business');
    panel.innerHTML = '';
    const wrapper = createElement('div', { className: 'flow-grid' });
    const ringCard = createElement('section', { className: 'glass-card' });
    ringCard.innerHTML = '<h3>流程演示播放器</h3>';
    // 线性固定布局：左上排列，不旋转不超框
    const listWrap = createElement('div', { className: 'flow-steps' });
    flow.timelineSteps.forEach((step) => {
      const stepEl = createElement('div', {
        className: 'glass-card flow-item',
        attrs: { tabindex: '0', role: 'button', 'aria-label': step.title }
      });
      stepEl.innerHTML = `<strong>${step.title}</strong><p class="metric-caption">${step.description}</p>`;
      listWrap.appendChild(stepEl);
    });
    ringCard.appendChild(listWrap);
    wrapper.appendChild(ringCard);

    const detailCard = createElement('section', { className: 'glass-card' });
    detailCard.innerHTML = '<h3>链上写入与合规说明</h3>';
    const detailPane = createElement('div', { className: 'timeline-detail' });
    detailCard.appendChild(detailPane);
    wrapper.appendChild(detailCard);
    panel.appendChild(wrapper);

    TimelinePlayer.init(listWrap.querySelectorAll('.flow-item'), detailPane, { data: flow.timelineSteps, speed: flow.player.defaultSpeed });

    const chartContainer = createChartCard(panel, {
      id: 'chart-flow-timeline',
      title: '冗余环节消除率',
      subtitle: '流程节点基准 vs 优化'
    });
    const timelineData = assets.redundantElimination;
    ChartManager.initChart('chart-flow-timeline', {
      backgroundColor: 'transparent',
      legend: { data: ['基准', '优化'], textStyle: { color: '#BFD4FF' } },
      grid: { left: 60, right: 20, top: 40, bottom: 40 },
      textStyle: { color: '#BFD4FF' },
      tooltip: { trigger: 'axis', valueFormatter: (val) => formatPercent(val, 0) },
      xAxis: {
        type: 'category',
        data: timelineData.stages,
        axisLine: { lineStyle: { color: '#1F6FEB' } }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1,
        axisLabel: { formatter: (val) => formatPercent(val, 0) },
        splitLine: { lineStyle: { color: 'rgba(31,111,235,0.2)' } }
      },
      series: [
        { name: '基准', type: 'bar', data: timelineData.baseline, itemStyle: { color: 'rgba(31,111,235,0.6)' } },
        { name: '优化', type: 'bar', data: timelineData.optimized, itemStyle: { color: 'rgba(31,191,154,0.75)' } }
      ]
    });
  }

  function renderRoles(rolesSection) {
    const panel = document.getElementById('panel-roles');
    panel.innerHTML = '';
    const roleLabels = { core: '核心企业', sme: '中小企业', bank: '合作银行', logistics: '物流方', regulator: '监管机构' };
    let currentRole = 'core';

    const nav = createElement('div', { className: 'cta-group' });
    Object.keys(rolesSection.roles).forEach((roleKey, idx) => {
      const btn = createElement('button', {
        className: `btn ${idx === 0 ? 'active' : ''}`,
        text: roleLabels[roleKey],
        attrs: { type: 'button', 'data-role': roleKey }
      });
      btn.addEventListener('click', () => {
        currentRole = roleKey;
        nav.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderRoleCards();
      });
      nav.appendChild(btn);
    });
    panel.appendChild(nav);

    const cardsWrap = createElement('div', { className: 'roles-grid', attrs: { id: 'roles-container' } });
    panel.appendChild(cardsWrap);

    const synergyCard = createElement('section', { className: 'glass-card' });
    synergyCard.innerHTML = '<h3>生态协同效应</h3>';
    const synergyList = createElement('ul');
    rolesSection.synergy.forEach((item) => {
      synergyList.appendChild(createElement('li', { html: `<strong>${item.name}</strong>｜${item.description}` }));
    });
    synergyCard.appendChild(synergyList);
    panel.appendChild(synergyCard);

    function renderRoleCards() {
      cardsWrap.innerHTML = '';
      rolesSection.roles[currentRole].forEach((role) => {
        const card = createElement('article', { className: 'roles-card' });
        const header = createElement('header');
        header.innerHTML = `<h3>${role.name}</h3>`;
        const badge = createElement('span', { className: 'status-badge', text: roleLabels[currentRole] });
        header.appendChild(badge);
        card.appendChild(header);
        const ops = createElement('div');
        ops.innerHTML = '<strong>操作清单</strong>';
        const opsList = createElement('ul');
        role.operations.forEach((op) => opsList.appendChild(createElement('li', { text: op })));
        ops.appendChild(opsList);
        card.appendChild(ops);
        const benefits = createElement('div');
        benefits.innerHTML = '<strong>收益清单</strong>';
        const benefitList = createElement('ul');
        role.benefits.forEach((bf) => benefitList.appendChild(createElement('li', { text: bf })));
        benefits.appendChild(benefitList);
        card.appendChild(benefits);
        const metric = createElement('p', {
          className: 'metric-caption',
          text: `效率 +${formatPercent(role.valueMetrics.efficiencyGain, 0)}｜成本 -${formatPercent(role.valueMetrics.costReduction, 2)}｜信用 ×${role.valueMetrics.creditMultiplier}`
        });
        card.appendChild(metric);
        cardsWrap.appendChild(card);
      });
    }

    renderRoleCards();
  }

  function renderImplementation(implementation) {
    const panel = document.getElementById('panel-implementation');
    panel.innerHTML = '';
    const phaseNav = createElement('div', { className: 'cta-group' });
    const deliverablePanel = createElement('section', { className: 'glass-card' });
    deliverablePanel.innerHTML = `<h3>${I18N.zh.deliverables}</h3>`;
    const deliverableList = createElement('ul');
    deliverablePanel.appendChild(deliverableList);
    panel.appendChild(phaseNav);
    panel.appendChild(deliverablePanel);

    implementation.phases.forEach((phase, idx) => {
      const btn = createElement('button', {
        className: `btn ${idx === 0 ? 'active' : ''}`,
        text: `${phase.period}｜${phase.title}`,
        attrs: { type: 'button', 'data-phase': phase.id }
      });
      btn.addEventListener('click', () => {
        phaseNav.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderDeliverables(phase);
      });
      phaseNav.appendChild(btn);
    });

    function renderDeliverables(phase) {
      deliverableList.innerHTML = '';
      phase.deliverables.forEach((item) => deliverableList.appendChild(createElement('li', { text: item })));
      deliverableList.appendChild(createElement('li', { className: 'metric-caption', text: `里程碑：${phase.milestone}` }));
    }

    renderDeliverables(implementation.phases[0]);

    const ganttCard = createElement('section', { className: 'glass-card' });
    ganttCard.innerHTML = '<h3>甘特图</h3>';
    const ganttGrid = createElement('div', { className: 'gantt-grid' });
    const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08'];
    const monthIndex = (value) => months.indexOf(value);

    implementation.gantt.forEach((task) => {
      const row = createElement('div', { className: 'gantt-row' });
      row.appendChild(createElement('div', { text: `${task.task}` }));
      const bar = createElement('div', { className: 'gantt-bar' });
      const span = createElement('span');
      const startIdx = Math.max(0, monthIndex(task.start));
      const endIdx = Math.max(0, monthIndex(task.end));
      const widthPercent = ((endIdx - startIdx + 1) / months.length) * 100;
      span.style.left = `${(startIdx / months.length) * 100}%`;
      span.style.width = `${widthPercent}%`;
      bar.appendChild(span);
      row.appendChild(bar);
      ganttGrid.appendChild(row);
    });
    ganttCard.appendChild(ganttGrid);
    panel.appendChild(ganttCard);
  }

  function renderRisk(risk) {
    const panel = document.getElementById('panel-risk');
    panel.innerHTML = '';
    const heatCard = createChartCard(panel, {
      id: 'chart-risk-matrix',
      title: '风险热度矩阵',
      subtitle: '概率 × 损失等级'
    });
    const categories = risk.matrix.map((item, idx) => ({
      value: [idx, idx],
      name: item.category,
      score: item.score
    }));
    const data = risk.matrix.map((item, idx) => [idx, 0, Number((item.probability * item.loss).toFixed(3))]);
    ChartManager.initChart('chart-risk-matrix', {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        formatter: (params) => {
          const item = risk.matrix[params.data[0]];
          return `${item.category}<br/>概率：${formatPercent(item.probability, 0)}<br/>损失：${formatPercent(item.loss, 0)}<br/>等级：${item.grade}`;
        }
      },
      xAxis: {
        type: 'category',
        data: risk.matrix.map((item) => item.category),
        splitArea: { show: true },
        axisLine: { lineStyle: { color: '#1F6FEB' } }
      },
      yAxis: {
        type: 'category',
        data: ['热度'],
        axisLine: { lineStyle: { color: '#1F6FEB' } }
      },
      visualMap: {
        min: 0,
        max: Math.max(...risk.matrix.map((item) => item.score)),
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: ['#1F6FEB', '#E0B95B'] }
      },
      series: [{
        name: '风险热度',
        type: 'heatmap',
        data,
        label: { show: true, color: '#fff', formatter: (params) => params.data[2].toFixed(2) },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } }
      }]
    });

    const riskList = createElement('div', { className: 'section-grid' });
    const detailCard = createElement('section', { className: 'glass-card' });
    detailCard.innerHTML = `<h3>${I18N.zh.riskStrategy}</h3>`;
    const detailContent = createElement('div');
    detailCard.appendChild(detailContent);
    const riskGrid = createElement('div', { className: 'risk-grid' });
    const riskRight = createElement('div', { className: 'risk-right' });
    riskGrid.appendChild(riskList);
    riskRight.appendChild(detailCard);
    riskGrid.appendChild(riskRight);
    panel.appendChild(riskGrid);

    function renderRiskDetail(id) {
      const detail = risk.detail[id];
      detailContent.innerHTML = '';
      if (!detail) return;
      const issues = createElement('ul');
      detail.issues.forEach((issue) => issues.appendChild(createElement('li', { text: issue })));
      const strategies = createElement('ul');
      detail.strategies.forEach((strategy) => strategies.appendChild(createElement('li', { text: strategy })));
      const triggers = createElement('ul');
      detail.triggers.forEach((trigger) => triggers.appendChild(createElement('li', { text: trigger })));
      detailContent.appendChild(createElement('h4', { text: '风险点' }));
      detailContent.appendChild(issues);
      detailContent.appendChild(createElement('h4', { text: '对策' }));
      detailContent.appendChild(strategies);
      detailContent.appendChild(createElement('h4', { text: '触发条件' }));
      detailContent.appendChild(triggers);
    }

    risk.matrix.forEach((item) => {
      const card = createElement('article', { className: 'glass-card' });
      const btn = createElement('button', {
        className: 'btn btn-outline',
        text: item.category,
        attrs: { type: 'button' }
      });
      btn.addEventListener('click', () => renderRiskDetail(item.id));
      card.appendChild(btn);
      card.appendChild(createElement('p', { className: 'metric-caption', text: `等级：${item.grade}｜优先级：${item.priority}` }));
      riskList.appendChild(card);
    });

    renderRiskDetail(risk.matrix[0].id);

    const controlCard = createElement('section', { className: 'glass-card' });
    controlCard.innerHTML = `<h3>${I18N.zh.controlLayer}</h3>`;
    Object.entries(risk.controls).forEach(([key, value]) => {
      const block = createElement('div');
      block.innerHTML = `<strong>${value.title}</strong>｜SLA：${value.sla || '—'}`;
      const list = createElement('ul');
      value.actions.forEach((action) => list.appendChild(createElement('li', { text: action })));
      block.appendChild(list);
      controlCard.appendChild(block);
    });
    // 将策略与管控体系放到右侧列，形成左右两栏布局
    riskRight.appendChild(controlCard);
  }

  function renderRegulatory(regulatory) {
    const panel = document.getElementById('panel-regulatory');
    panel.innerHTML = '';
    const filterCard = createElement('section', { className: 'glass-card' });
    filterCard.innerHTML = `<h3>${I18N.zh.regulatoryView}</h3>`;
    const filterGrid = createElement('div', { className: 'section-grid' });

    const quarterSelect = createElement('label', { className: 'calc-control' });
    quarterSelect.innerHTML = `<span>${I18N.zh.selectQuarter}</span><select id="reg-quarter">${regulatory.filters.quarters.map((q) => `<option value="${q}">${q}</option>`).join('')}</select>`;
    const industrySelect = createElement('label', { className: 'calc-control' });
    industrySelect.innerHTML = `<span>${I18N.zh.selectIndustry}</span><select id="reg-industry"><option value="all">全部</option>${regulatory.filters.industries.map((i) => `<option value="${i}">${i.toUpperCase()}</option>`).join('')}</select>`;
    const regionSelect = createElement('label', { className: 'calc-control' });
    regionSelect.innerHTML = `<span>${I18N.zh.selectRegion}</span><select id="reg-region"><option value="all">全部</option>${regulatory.filters.regions.map((r) => `<option value="${r}">${r}</option>`).join('')}</select>`;

    filterGrid.append(quarterSelect, industrySelect, regionSelect);
    filterCard.appendChild(filterGrid);
    const summary = createElement('div', { className: 'section-grid', attrs: { id: 'reg-summary' } });
    filterCard.appendChild(summary);
    panel.appendChild(filterCard);

    createChartCard(panel, {
      id: 'chart-regulatory',
      title: '监管维度指标',
      subtitle: '融资总额 / 放款笔数 / 风险预警'
    });

    const regionCard = createElement('section', { className: 'glass-card' });
    regionCard.innerHTML = '<h3>区域热度</h3>';
    const regionList = createElement('ul');
    regulatory.heatmap.regions.forEach((region, idx) => {
      regionList.appendChild(createElement('li', { text: `${region}：${regulatory.heatmap.values[idx]} 次预警` }));
    });
    regionCard.appendChild(regionList);
    panel.appendChild(regionCard);

    const quarterEl = filterCard.querySelector('#reg-quarter');
    const industryEl = filterCard.querySelector('#reg-industry');
    const regionEl = filterCard.querySelector('#reg-region');

    function updateView() {
      const quarter = quarterEl.value;
      const industry = industryEl.value;
      const region = regionEl.value;
      const filtered = regulatory.stats.filter((item) => {
        const matchQuarter = item.quarter === quarter;
        const matchIndustry = industry === 'all' || item.industry === industry;
        const matchRegion = region === 'all' || item.region === region;
        return matchQuarter && matchIndustry && matchRegion;
      });
      const totalAmount = sum(filtered.map((item) => item.totalAmount));
      const loanCount = sum(filtered.map((item) => item.loanCount));
      const alerts = sum(filtered.map((item) => item.alerts));
      summary.innerHTML = '';
      summary.appendChild(createElement('article', { className: 'glass-card', text: `${I18N.zh.totalAmount}：${formatNumber(totalAmount / 100000000, { digits: 2 })} 亿元` }));
      summary.appendChild(createElement('article', { className: 'glass-card', text: `${I18N.zh.loanCount}：${formatNumber(loanCount)}` }));
      summary.appendChild(createElement('article', { className: 'glass-card', text: `${I18N.zh.alerts}：${alerts}` }));

      const categories = filtered.map((item) => item.industry.toUpperCase());
      ChartManager.initChart('chart-regulatory', {
        backgroundColor: 'transparent',
        legend: { data: ['融资总额 (¥)', '放款笔数', '风险预警'], textStyle: { color: '#BFD4FF' } },
        grid: { left: 60, right: 60, top: 50, bottom: 40 },
        textStyle: { color: '#BFD4FF' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: categories, axisLine: { lineStyle: { color: '#1F6FEB' } } },
        yAxis: [
          {
            type: 'value',
            name: '融资总额 (¥)',
            axisLine: { lineStyle: { color: '#1F6FEB' } },
            splitLine: { lineStyle: { color: 'rgba(31,111,235,0.2)' } }
          },
          {
            type: 'value',
            name: '放款笔数/预警',
            axisLine: { lineStyle: { color: '#1FBF9A' } },
            splitLine: { show: false }
          }
        ],
        series: [
          {
            name: '融资总额 (¥)',
            type: 'bar',
            data: filtered.map((item) => item.totalAmount),
            itemStyle: { color: 'rgba(31,111,235,0.65)' }
          },
          {
            name: '放款笔数',
            type: 'line',
            yAxisIndex: 1,
            data: filtered.map((item) => item.loanCount),
            lineStyle: { color: '#1FBF9A' }
          },
          {
            name: '风险预警',
            type: 'line',
            yAxisIndex: 1,
            data: filtered.map((item) => item.alerts),
            lineStyle: { color: '#E0B95B' }
          }
        ]
      });
    }

    quarterEl.addEventListener('change', updateView);
    industryEl.addEventListener('change', updateView);
    regionEl.addEventListener('change', updateView);
    updateView();
  }

  function renderOutcomes(outcomes) {
    const panel = document.getElementById('panel-outcomes');
    panel.innerHTML = '';
    createChartCard(panel, {
      id: 'chart-outcome-projection',
      title: '三年成果展望',
      subtitle: '服务规模 & 融资额度'
    });
    ChartManager.initChart('chart-outcome-projection', {
      backgroundColor: 'transparent',
      legend: { data: ['服务企业数', '融资额度 (亿元)'], textStyle: { color: '#BFD4FF' } },
      grid: { left: 60, right: 60, top: 50, bottom: 40 },
      textStyle: { color: '#BFD4FF' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: outcomes.projection.map((item) => item.year), axisLine: { lineStyle: { color: '#1F6FEB' } } },
      yAxis: [
        { type: 'value', name: '服务企业数', axisLine: { lineStyle: { color: '#1F6FEB' } }, splitLine: { lineStyle: { color: 'rgba(31,111,235,0.2)' } } },
        { type: 'value', name: '融资额度 (亿元)', axisLine: { lineStyle: { color: '#1FBF9A' } }, splitLine: { show: false } }
      ],
      series: [
        { name: '服务企业数', type: 'bar', data: outcomes.projection.map((item) => item.serviceEnterprises), itemStyle: { color: 'rgba(31,111,235,0.7)' } },
        { name: '融资额度 (亿元)', type: 'line', yAxisIndex: 1, data: outcomes.projection.map((item) => item.financingAmount), lineStyle: { color: '#E0B95B' }, areaStyle: { color: 'rgba(224,185,91,0.25)' } }
      ]
    });

    const savingsCard = createElement('section', { className: 'glass-card' });
    savingsCard.innerHTML = '<h3>成本节省估算</h3>';
    const savingsList = createElement('ul');
    savingsList.appendChild(createElement('li', { text: `企业端：${formatNumber(outcomes.costSavings.enterprise / 100000000, { digits: 2 })} 亿元/年` }));
    savingsList.appendChild(createElement('li', { text: `机构端人工：-${formatPercent(outcomes.costSavings.institution.manualReduction, 0)}` }));
    savingsList.appendChild(createElement('li', { text: `纸质成本节省：${formatNumber(outcomes.costSavings.institution.paperCost / 10000, { digits: 0 })} 万元/年` }));
    savingsCard.appendChild(savingsList);
    panel.appendChild(savingsCard);

    const impactCard = createElement('section', { className: 'glass-card' });
    impactCard.innerHTML = '<h3>行业效益</h3>';
    const impactList = createElement('ul');
    impactList.appendChild(createElement('li', { text: `效率提升：${formatPercent(outcomes.industryImpact.efficiency, 0)}` }));
    impactList.appendChild(createElement('li', { text: `不良率下降：${formatPercent(Math.abs(outcomes.industryImpact.badLoan), 0)}` }));
    impactList.appendChild(createElement('li', { text: `可得性提升：${formatPercent(outcomes.industryImpact.access, 0)}` }));
    impactCard.appendChild(impactList);
    panel.appendChild(impactCard);

    const scaleCard = createElement('section', { className: 'glass-card' });
    scaleCard.innerHTML = '<h3>可复制推广</h3>';
    const scaleList = createElement('ul');
    outcomes.scalability.forEach((item) => scaleList.appendChild(createElement('li', { text: item })));
    scaleCard.appendChild(scaleList);
    panel.appendChild(scaleCard);
  }

  function renderTeam(team, meta) {
    const panel = document.getElementById('panel-team');
    panel.innerHTML = '';
    const teamCard = createElement('section', { className: 'glass-card' });
    teamCard.innerHTML = '<h3>团队与鸣谢</h3>';
    const members = createElement('ul');
    team.members.forEach((member) => members.appendChild(createElement('li', { text: `${member.name}｜${member.role}` })));
    teamCard.appendChild(members);
    teamCard.appendChild(createElement('p', { text: team.thanks }));
    panel.appendChild(teamCard);

    const licenseCard = createElement('section', { className: 'glass-card' });
    licenseCard.innerHTML = `<p>${team.license}</p>`;
    panel.appendChild(licenseCard);

    const footer = document.getElementById('app-footer');
    footer.innerHTML = `© ${new Date().getFullYear()} ${meta.school}｜${meta.slogan}`;
    // 删除“指导老师”栏，仅展示队员信息
    footer.appendChild(createElement('span', { text: `队员：${team.members.map((m) => m.name).join('、')}` }));
  }

  function renderAll(data) {
    renderMeta(data.meta);
    renderCTA(data.overview.ctaButtons);
    renderOverview(data.overview, data.dataAssets);
    renderBackground(data.background, data.dataAssets);
    renderObjectives(data.objectives, data.dataAssets);
    renderTechnology(data.technology, data.dataAssets);
    renderBusinessFlow(data.businessFlow, data.dataAssets);
    renderRoles(data.rolesSection);
    renderImplementation(data.implementation);
    renderRisk(data.risk);
    renderRegulatory(data.regulatory);
    renderOutcomes(data.outcomes);
    renderTeam(data.team, data.meta);
  }

  return { renderAll };
})();

const App = (() => {
  async function init() {
    try {
      const data = await DataLoader.load();
      STATE.data = data;
      Router.init(data.navigation);
      UIBuilder.renderAll(data);
      PrintExport.init(document.getElementById('print-export'), data.printConfig);
      ChartManager.resizeAll();
    } catch (error) {
      console.error(error);
      const main = document.getElementById('tab-panels');
      if (main) {
        main.innerHTML = '<section class="tab-panel active"><p>数据加载失败，请检查本地文件。</p></section>';
      }
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
