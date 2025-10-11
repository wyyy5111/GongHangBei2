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


const OBJECTIVE_META = {
  cycleDays: { label: '融资周期', format: 'days', category: 'efficiency' },
  firstReview24h: { label: '24 小时内初审占比', format: 'percent', category: 'efficiency' },
  riskPreCheckHours: { label: '风险初判时长', format: 'hours', category: 'risk' },
  badDebt: { label: '坏账率', format: 'percent', category: 'risk' },
  compositeCost: { label: '综合融资成本', format: 'percent', category: 'cost' },
  materialCostSaving: { label: '材料成本节省率', format: 'percent', category: 'cost', defaultBefore: 0 },
  tPlusOneCoverage: { label: 'T+1 放款覆盖率', format: 'percent', category: 'efficiency' },
  crossBorderCycleDays: { label: '跨境融资周期', format: 'days', category: 'efficiency' },
  fraudDetectAccuracy: { label: '虚假贸易识别准确率', format: 'percent', category: 'risk' },
  riskAlertResponseHours: { label: '风险预警响应时间', format: 'hours', category: 'risk' },
  redundantRemovalRate: { label: '冗余环节消除率', format: 'percent', category: 'cost' },
  rateDiscountCoverage: { label: '利率优惠覆盖率', format: 'percent', category: 'cost' }
};

const OBJECTIVE_GROUPS = {
  efficiency: ['cycleDays', 'firstReview24h', 'tPlusOneCoverage', 'crossBorderCycleDays'],
  risk: ['riskPreCheckHours', 'badDebt', 'fraudDetectAccuracy', 'riskAlertResponseHours'],
  cost: ['compositeCost', 'materialCostSaving', 'redundantRemovalRate', 'rateDiscountCoverage']
};

const OBJECTIVE_CATEGORY_LABELS = {
  efficiency: '效率指标',
  risk: '风险指标',
  cost: '成本指标'
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


function formatMonth(monthStr) {
  if (!monthStr || typeof monthStr !== 'string') return '';
  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;
  const [year, month] = parts;
  return `${year}年${String(month).padStart(2, '0')}月`;
}

function formatMetricValue(value, format, unit = '') {
  if (value === undefined || value === null) return '--';
  switch (format) {
    case 'days':
      return `${formatNumber(value, { digits: 0 })} 天`;
    case 'hours':
      return `${formatNumber(value, { digits: 0 })} 小时`;
    case 'percent':
      return formatPercent(value, Math.abs(value) < 0.1 ? 1 : 0);
    case 'ratio':
      return formatPercent(value, 0);
    case 'currency-wanyuan':
      return `${formatNumber(value, { digits: 0 })} 万元`;
    case 'integer':
      return formatNumber(value, { digits: 0 });
    default: {
      if (typeof value === 'number') {
        if (!unit && Math.abs(value) <= 1) {
          return formatPercent(value, Math.abs(value) < 0.1 ? 1 : 0);
        }
        const digits = Number.isInteger(value) ? 0 : 1;
        return `${formatNumber(value, { digits })}${unit ? ` ${unit}` : ''}`;
      }
      return `${value}`;
    }
  }
}

function normalizeChange(entry, meta = {}) {
  if (entry && typeof entry === 'object' && 'before' in entry && 'after' in entry) {
    return { before: entry.before, after: entry.after };
  }
  const defaultBefore = meta.defaultBefore !== undefined ? meta.defaultBefore : 0;
  return { before: defaultBefore, after: entry };
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
  const chartId = 'chart-calculator';
  const sliderInputs = {};
  let summaryBox;
  let s4Notice;
  let s4State = { bucket: null, addons: new Set() };

  const CREDIT_MAP = [
    { min: 90, value: 1.2, label: '信用极佳' },
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

  function createNumberInput(id, label, value, step, unitLabel) {
    const wrapper = createElement('label', { className: 'calc-control' });
    wrapper.innerHTML = `
      <span>${label}</span>
      <div class="calc-input">
        <input type="number" id="${id}" value="${value}" step="${step}" aria-label="${label}" />
        <span class="calc-unit">${unitLabel || ''}</span>
      </div>
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

  function getIndustryCoefficient(industry, technology) {
    const kFactors = technology.limitModel?.kFactors || {};
    const value = kFactors[industry];
    return typeof value === 'number' ? value : 0.2;
  }

  function calcS4(technology) {
    const config = technology.scoreModel?.S4;
    if (!config) return { score: 0, truncated: false, appliedAddon: 0 };
    const buckets = config.prosperity?.buckets || [];
    const policy = config.policySupport || { base: 0, addons: [], addonsCap: 0, cap: 0 };
    let bucket = buckets.find((item) => item.key === s4State.bucket);
    if (!bucket) {
      bucket = buckets[0] || { score: 0 };
      s4State.bucket = bucket?.key || null;
    }
    const addonMap = new Map((policy.addons || []).map((addon) => [addon.key, addon.score]));
    let addonTotal = 0;
    s4State.addons.forEach((key) => {
      if (addonMap.has(key)) {
        addonTotal += addonMap.get(key);
      }
    });
    const cappedAddon = Math.min(addonTotal, policy.addonsCap || 0);
    const policyScore = Math.min(policy.base + cappedAddon, policy.cap || (policy.base + cappedAddon));
    const truncated = addonTotal > cappedAddon || policyScore > policy.cap;
    return {
      score: (bucket.score || 0) + (policyScore || 0),
      truncated,
      bucket,
      addonTotal,
      cappedAddon,
      policyScore
    };
  }

  function collectValues(defaults, technology) {
    const values = {
      S1: Number(sliderInputs.S1.value),
      S2: Number(sliderInputs.S2.value),
      S3: Number(sliderInputs.S3.value),
      revenue: Number(inputs.revenue.value || defaults.revenue),
      outstanding: Number(inputs.outstanding.value || defaults.outstanding),
      industry: inputs.industry.value
    };
    const s4Result = calcS4(technology);
    values.S4 = Number(s4Result.score.toFixed(1));
    values._s4Result = s4Result;
    return values;
  }

  function calculate(values, technology) {
    const score = Number(((values.S1 * 0.3) + (values.S2 * 0.4) + (values.S3 * 0.2) + (values.S4 * 0.1)).toFixed(1));
    const creditCoeff = getCreditCoefficient(score);
    const industryCoeff = getIndustryCoefficient(values.industry, technology);
    const limit = Math.max(0, values.revenue * industryCoeff * creditCoeff - values.outstanding);
    return {
      score,
      creditCoeff,
      creditLabel: getCreditLabel(score),
      industryCoeff,
      limit
    };
  }

  function renderChart(values, technology, result) {
    const seriesData = [];
    for (let s = 60; s <= 100; s += 5) {
      const creditCoeff = getCreditCoefficient(s);
      const limit = Math.max(0, values.revenue * getIndustryCoefficient(values.industry, technology) * creditCoeff - values.outstanding);
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

  const inputs = {};

  function update(defaults, technology) {
    const values = collectValues(defaults, technology);
    const result = calculate(values, technology);
    const s4Result = values._s4Result;
    summaryBox.innerHTML = `
      <p>综合评分 S：<strong>${result.score}</strong> (${result.creditLabel})</p>
      <p>S4 行业适配得分：<strong>${formatNumber(s4Result.score, { digits: 1 })}</strong>${s4Result.truncated ? ' <span class="calc-hint">加分封顶，超出部分未计分</span>' : ''}</p>
      <p>行业系数 K：<strong>${result.industryCoeff.toFixed(2)}</strong></p>
      <p>信用系数 C：<strong>${result.creditCoeff.toFixed(2)}</strong></p>
      <p>可贷额度 L：<strong>${formatNumber(result.limit, { digits: 0 })} 万元</strong></p>
    `;
    summaryBox.className = `calc-summary ${result.creditCoeff > 0 ? 'approved' : 'rejected'}`;
    if (s4Notice) {
      s4Notice.textContent = s4Result.truncated ? '政策加分已达到上限，超出部分未计分。' : '';
    }
    renderChart(values, technology, result);
  }

  function bindEvents(defaults, technology) {
    ['S1', 'S2', 'S3'].forEach((key) => {
      const range = sliderInputs[key];
      const output = document.getElementById(`${key}-output`);
      range.addEventListener('input', () => {
        output.textContent = range.value;
        update(defaults, technology);
      });
    });
    ['revenue', 'outstanding'].forEach((key) => {
      inputs[key].addEventListener('change', () => update(defaults, technology));
    });
    inputs.industry.addEventListener('change', () => update(defaults, technology));
    (inputs.s4Radios || []).forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          s4State.bucket = radio.value;
          update(defaults, technology);
        }
      });
    });
    (inputs.s4Addons || []).forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          s4State.addons.add(checkbox.value);
        } else {
          s4State.addons.delete(checkbox.value);
        }
        update(defaults, technology);
      });
    });
  }

  function renderS4Controls(form, defaults, technology) {
    const config = technology.scoreModel?.S4;
    if (!config) return;
    const section = createElement('div', { className: 'calc-s4-section' });
    section.appendChild(createElement('h4', { text: 'S4 行业适配分' }));

    const prosperityWrap = createElement('div', { className: 'calc-control' });
    prosperityWrap.appendChild(createElement('span', { text: '行业景气度分档' }));
    const radioGroup = createElement('div', { className: 'calc-radio-group' });
    const radios = [];
    (config.prosperity?.buckets || []).forEach((bucket) => {
      const id = `s4-bucket-${bucket.key}`;
      const label = createElement('label', { className: 'calc-radio' });
      label.innerHTML = `<input type="radio" name="s4-prosperity" id="${id}" value="${bucket.key}"> <span>${bucket.label}</span>`;
      radioGroup.appendChild(label);
      const input = label.querySelector('input');
      radios.push(input);
      if (defaults.prosperityBucket === bucket.key) {
        input.checked = true;
        s4State.bucket = bucket.key;
      }
    });
    if (!s4State.bucket && radios.length) {
      radios[0].checked = true;
      s4State.bucket = radios[0].value;
    }
    prosperityWrap.appendChild(radioGroup);
    section.appendChild(prosperityWrap);

    const policy = config.policySupport || { base: 0, addons: [], addonsCap: 0 };
    const addonWrap = createElement('div', { className: 'calc-control' });
    addonWrap.appendChild(createElement('span', { text: `政策扶持加分（基础 ${policy.base} 分，加分上限 ${policy.addonsCap} 分）` }));
    const addonGroup = createElement('div', { className: 'calc-checkbox-group' });
    const checkboxes = [];
    (policy.addons || []).forEach((addon) => {
      const id = `s4-addon-${addon.key}`;
      const label = createElement('label', { className: 'calc-checkbox' });
      label.innerHTML = `<input type="checkbox" id="${id}" value="${addon.key}"> <span>${addon.label}（${addon.score} 分）</span>`;
      addonGroup.appendChild(label);
      const input = label.querySelector('input');
      if ((defaults.policyAddons || []).includes(addon.key)) {
        input.checked = true;
        s4State.addons.add(addon.key);
      }
      checkboxes.push(input);
    });
    addonWrap.appendChild(addonGroup);
    section.appendChild(addonWrap);

    s4Notice = createElement('p', { className: 'calc-hint', text: '' });
    section.appendChild(s4Notice);

    form.appendChild(section);
    inputs.s4Radios = radios;
    inputs.s4Addons = checkboxes;
  }

  function init(target, defaults, technology) {
    container = target;
    container.innerHTML = '';
    s4State = { bucket: defaults.prosperityBucket || null, addons: new Set(defaults.policyAddons || []) };;
    const wrapper = createElement('section', { className: 'glass-card calc-card' });
    const header = createElement('header', { className: 'calc-header' });
    header.innerHTML = `<h3>${I18N.zh.calculatorTitle}</h3><p>${I18N.zh.calculatorDesc}</p>`;

    const form = createElement('div', { className: 'calc-grid' });
    ['S1', 'S2', 'S3'].forEach((key, idx) => {
      const label = technology.scoreModel.dimensions[idx].name;
      const slider = createSlider(key, `${label} (S${idx + 1})`, defaults[key]);
      form.appendChild(slider);
      sliderInputs[key] = slider.querySelector('input');
    });

    const revenueInput = createNumberInput('revenue', '年度营收 R', defaults.revenue, 1000, '万元');
    const outstandingInput = createNumberInput('outstanding', '未结清余额 D', defaults.outstanding, 100, '万元');
    const industrySelect = createElement('label', { className: 'calc-control' });
    const options = Object.keys(technology.limitModel.kFactors || {})
      .map((key) => `<option value="${key}" ${key === defaults.industry ? 'selected' : ''}>${key.toUpperCase()}</option>`)
      .join('');
    industrySelect.innerHTML = `<span>行业系数 K</span><select id="industry" aria-label="行业系数">${options}</select>`;

    form.append(revenueInput, outstandingInput, industrySelect);
    renderS4Controls(form, defaults, technology);

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

    inputs.revenue = revenueInput.querySelector('input');
    inputs.outstanding = outstandingInput.querySelector('input');
    inputs.industry = industrySelect.querySelector('select');

    ChartManager.registerDownloadButton(chartId, downloadBtn);
    bindEvents(defaults, technology);
    update(defaults, technology);
  }

  return { init };
})();


const UIBuilder = (() => {
  function renderMeta(meta) {
  document.getElementById('app-title').textContent = meta.titleZh || '';
  document.getElementById('app-subtitle').textContent = `${meta.titleEn || ''}｜${meta.scenario || ''}`;
  document.getElementById('app-slogan').textContent = meta.slogan || '';
  const teamList = Array.isArray(meta.team) ? meta.team.join('、') : '';
  document.getElementById('app-school').textContent = `团队：${teamList}｜学校：${meta.school || ''}`;
  const timestamp = meta.timestamp ? `数据更新：${formatMonth(meta.timestamp)}` : '';
  document.getElementById('app-timestamp').textContent = timestamp;
  document.getElementById('print-export').textContent = meta.printButtonText || '导出为 PDF（打印样式）';
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
  const grid = createElement('div', { className: 'section-grid kpi-grid' });
  const template = document.getElementById('kpi-card-template');
  (overview.kpiCards || []).forEach((kpi) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const front = card.querySelector('.flip-front');
    const back = card.querySelector('.flip-back');
    const format = kpi.format || (kpi.unit && kpi.unit.includes('工作日') ? 'days' : '');
    const { before, after } = normalizeChange(kpi.change || {}, kpi);
    const beforeText = formatMetricValue(before, format, kpi.unit);
    const afterText = formatMetricValue(after, format, kpi.unit);
    front.innerHTML = `
      <h3>${kpi.label}</h3>
      <p class="metric-caption">${kpi.description || ''}</p>
      <p class="key-metric">${afterText}</p>
    `;
    back.innerHTML = `
      <p>${I18N.zh.baseline}：${beforeText}</p>
      <p>${I18N.zh.target}：${afterText}</p>
    `;
    grid.appendChild(card);
  });
  panel.appendChild(grid);

  if (typeof overview.microCoverageTarget === 'number') {
    const microNote = createElement('p', {
      className: 'kpi-micro-note',
      text: `小微覆盖 ≥${formatPercent(overview.microCoverageTarget, 0)}`
    });
    panel.appendChild(microNote);
  }

  createChartCard(panel, {
    id: 'chart-kpi-overview',
    title: '融资周期对比',
    subtitle: '传统流程 vs 双链融合'
  });
  const cycleData = Array.isArray(assets.financeCycle) ? assets.financeCycle : [];
  ChartManager.initChart('chart-kpi-overview', {
    backgroundColor: 'transparent',
    legend: { data: ['传统流程', '双链融合'], textStyle: { color: '#BFD4FF' } },
    grid: { left: 50, right: 20, top: 50, bottom: 40 },
    textStyle: { color: '#BFD4FF' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: cycleData.map((item) => item.quarter), axisLine: { lineStyle: { color: '#1F6FEB' } } },
    yAxis: { type: 'value', name: '工作日', axisLine: { lineStyle: { color: '#1F6FEB' } }, splitLine: { lineStyle: { color: 'rgba(31,111,235,0.2)' } } },
    series: [
      { name: '传统流程', type: 'line', smooth: true, data: cycleData.map((item) => item.traditional), lineStyle: { color: '#8BA3C7' } },
      { name: '双链融合', type: 'line', smooth: true, data: cycleData.map((item) => item.dual), lineStyle: { color: '#1FBF9A' }, areaStyle: { color: 'rgba(31,191,154,0.25)' } }
    ]
  });

  const flowCard = createElement('section', { className: 'glass-card flow-card' });
  flowCard.innerHTML = `<h3>${overview.threeFlow.title}</h3><p>${overview.threeFlow.description || ''}</p>`;
  const flowGrid = createElement('div', { className: 'flow-grid' });
  (overview.threeFlow.flows || []).forEach((flow) => {
    const block = createElement('div', { className: 'glass-card flow-item' });
    block.innerHTML = `<h4>${flow.name}</h4>`;
    const list = createElement('ul');
    (flow.highlights || []).forEach((highlight) => list.appendChild(createElement('li', { text: highlight })));
    block.appendChild(list);
    flowGrid.appendChild(block);
  });
  flowCard.appendChild(flowGrid);
  panel.appendChild(flowCard);

  if (Array.isArray(overview.catalog) && overview.catalog.length) {
    const tocCard = createElement('section', { className: 'glass-card toc-card' });
    tocCard.innerHTML = '<h3>目录</h3>';
    const tocList = createElement('ol');
    overview.catalog.forEach((item) => {
      if (typeof item === 'string') {
        tocList.appendChild(createElement('li', { text: item }));
        return;
      }
      if (!item || typeof item !== 'object') return;
      const li = createElement('li', { text: item.label || '' });
      if (Array.isArray(item.children) && item.children.length) {
        const childList = createElement('ul');
        item.children.forEach((child) => {
          if (typeof child === 'string') {
            childList.appendChild(createElement('li', { text: child }));
          }
        });
        li.appendChild(childList);
      }
      tocList.appendChild(li);
    });
    tocCard.appendChild(tocList);
    panel.appendChild(tocCard);
  }
}


  function renderBackground(background, assets) {
    const panel = document.getElementById('panel-background');
    panel.innerHTML = '';
    if (background.introduction) {
      const introCard = createElement('section', { className: 'glass-card' });
      introCard.appendChild(createElement('h3', { text: '行业现状综述' }));
      const paragraphs = Array.isArray(background.introduction) ? background.introduction : [background.introduction];
      paragraphs.forEach((text) => {
        if (text) {
          introCard.appendChild(createElement('p', { text }));
        }
      });
      panel.appendChild(introCard);
    }
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

  
  
  function renderObjectives(objectives) {
  const panel = document.getElementById('panel-objectives');
  panel.innerHTML = '';
  if (objectives.introduction) {
    const introCard = createElement('section', { className: 'glass-card' });
    introCard.appendChild(createElement('h3', { text: '目标设定逻辑' }));
    const paragraphs = Array.isArray(objectives.introduction) ? objectives.introduction : [objectives.introduction];
    paragraphs.forEach((text) => {
      if (text) {
        introCard.appendChild(createElement('p', { text }));
      }
    });
    panel.appendChild(introCard);
  }
  const toggleWrap = createElement('div', { className: 'cta-group objective-tabs' });
  ['shortTerm', 'midTerm'].forEach((phaseKey) => {
    const isActive = phaseKey === STATE.currentObjectivePhase;
    const btn = createElement('button', {
      className: 'btn' + (isActive ? ' active' : ''),
      text: phaseKey === 'shortTerm' ? '短期（落地 1 年）' : '中期（落地 2 年）',
      attrs: { type: 'button', 'data-phase': phaseKey }
    });
    btn.addEventListener('click', () => {
      STATE.currentObjectivePhase = phaseKey;
      toggleWrap.querySelectorAll('button').forEach((node) => node.classList.remove('active'));
      btn.classList.add('active');
      renderObjectives(objectives);
    });
    toggleWrap.appendChild(btn);
  });
  panel.appendChild(toggleWrap);

  const infoRow = createElement('div', { className: 'objective-info-row' });
  infoRow.appendChild(createElement('div', { className: 'warning-card', text: objectives.warningRules.message }));
  const badgeCard = createElement('div', { className: 'glass-card badge-card' });
  badgeCard.append(createElement('span', { className: 'badge badge-rolling', text: objectives.rollingBadge.label }), createElement('p', { className: 'metric-caption', text: objectives.rollingBadge.text }));
  infoRow.appendChild(badgeCard);
  panel.appendChild(infoRow);

  const metricsWrap = createElement('div', { className: 'section-grid objective-metrics' });
  const phaseData = objectives[STATE.currentObjectivePhase] || {};
  Object.entries(phaseData).forEach(([key, value]) => {
    const meta = OBJECTIVE_META[key] || { label: key, format: 'integer', category: 'efficiency' };
    const { before, after } = normalizeChange(value, meta);
    const card = createElement('article', { className: 'glass-card objective-card' });
    const beforeText = formatMetricValue(before, meta.format, meta.unit);
    const afterText = formatMetricValue(after, meta.format, meta.unit);
    card.innerHTML = `
      <h3>${meta.label}</h3>
      <p class="metric-caption">前：${beforeText}</p>
      <p class="metric-caption">后：${afterText}</p>
    `;
    metricsWrap.appendChild(card);
  });
  panel.appendChild(metricsWrap);

  const chartsGrid = createElement('div', { className: 'charts-grid' });
  panel.appendChild(chartsGrid);
  createChartCard(chartsGrid, {
    id: 'chart-objective-gauges',
    title: '效率 / 风险 / 成本 指标均值对比',
    subtitle: '以基准值与目标值对比'
  });
  createChartCard(chartsGrid, {
    id: 'chart-cost-compare',
    title: '成本结构对比',
    subtitle: '自动化前后'
  });

  const averagesBefore = [];
  const averagesAfter = [];
  const categories = [];
  Object.entries(OBJECTIVE_GROUPS).forEach(([category, keys]) => {
    const points = keys
      .map((metricKey) => {
        if (!(metricKey in phaseData)) return null;
        const meta = OBJECTIVE_META[metricKey];
        const change = normalizeChange(phaseData[metricKey], meta);
        return change;
      })
      .filter(Boolean);
    if (!points.length) return;
    const beforeAvg = average(points.map((item) => item.before));
    const afterAvg = average(points.map((item) => item.after));
    categories.push(OBJECTIVE_CATEGORY_LABELS[category] || category);
    averagesBefore.push(beforeAvg);
    averagesAfter.push(afterAvg);
  });

  ChartManager.initChart('chart-objective-gauges', {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: ['基准', '目标'], textStyle: { color: '#BFD4FF' } },
    grid: { left: 70, right: 60, top: 50, bottom: 60 },
    textStyle: { color: '#BFD4FF' },
    xAxis: { type: 'category', data: categories, axisLine: { lineStyle: { color: '#1F6FEB' } }, axisLabel: { color: '#BFD4FF', fontSize: 12 } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color: '#1F6FEB' } }, splitLine: { lineStyle: { color: 'rgba(31,111,235,0.2)' } } },
    series: [
      {
        name: '基准',
        type: 'bar',
        data: averagesBefore,
        itemStyle: { color: 'rgba(31,111,235,0.6)' },
        barMaxWidth: 40,
        // 让非常小的数值也能有可见的柱形高度
        barMinHeight: 6,
        label: {
          show: true,
          position: 'top',
          color: '#BFD4FF',
          formatter: (params) => {
            const v = Number(params.value);
            return v < 1 ? v.toFixed(2) : v.toFixed(1);
          }
        }
      },
      {
        name: '目标',
        type: 'bar',
        data: averagesAfter,
        itemStyle: { color: 'rgba(31,191,154,0.75)' },
        barMaxWidth: 40,
        barMinHeight: 6,
        label: {
          show: true,
          position: 'top',
          color: '#BFD4FF',
          formatter: (params) => {
            const v = Number(params.value);
            return v < 1 ? v.toFixed(2) : v.toFixed(1);
          }
        }
      }
    ]
  });

  const cost = STATE.data?.dataAssets?.costStructure;
  if (cost) {
    ChartManager.initChart('chart-cost-compare', {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['优化前', '优化后'], textStyle: { color: '#BFD4FF' } },
      grid: { left: 60, right: 20, top: 50, bottom: 40 },
      textStyle: { color: '#BFD4FF' },
      xAxis: { type: 'category', data: cost.categories, axisLine: { lineStyle: { color: '#1F6FEB' } } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#1F6FEB' } }, splitLine: { lineStyle: { color: 'rgba(31,111,235,0.2)' } } },
      series: [
        { name: '优化前', type: 'bar', data: cost.before, itemStyle: { color: 'rgba(139,163,199,0.7)' } },
        { name: '优化后', type: 'bar', data: cost.after, itemStyle: { color: 'rgba(31,191,154,0.75)' } }
      ]
    });
  }
}


  function renderTechnology(technology, dataAssets) {
  const panel = document.getElementById('panel-technology');
  panel.innerHTML = '';

  if (technology.introduction) {
    const introCard = createElement('section', { className: 'glass-card' });
    introCard.appendChild(createElement('h3', { text: '技术架构定位' }));
    const paragraphs = Array.isArray(technology.introduction) ? technology.introduction : [technology.introduction];
    paragraphs.forEach((text) => {
      if (text) {
        introCard.appendChild(createElement('p', { text }));
      }
    });
    panel.appendChild(introCard);
  }

  const archCard = createElement('section', { className: 'glass-card' });
  archCard.innerHTML = '<h3>技术架构总览</h3>';
  const archImg = createElement('img', {
    attrs: {
      src: technology.architectureDiagram,
      alt: '双链融合技术架构图',
      loading: 'lazy'
    }
  });
  archCard.appendChild(archImg);
  panel.appendChild(archCard);

  const scoreCard = createElement('section', { className: 'glass-card' });
  scoreCard.innerHTML = `<h3>S 信用评分模型</h3><p>${technology.scoreModel.formula}</p>`;
  const scoreList = createElement('ul');
  (technology.scoreModel.dimensions || []).forEach((dim, idx) => {
    const li = createElement('li');
    li.innerHTML = `<strong>S${idx + 1} ${dim.name}</strong>｜${(dim.items || []).join(' / ')}`;
    scoreList.appendChild(li);
  });
  scoreCard.appendChild(scoreList);
  panel.appendChild(scoreCard);

  const s4Info = technology.scoreModel?.S4;
  if (s4Info) {
    const s4Card = createElement('section', { className: 'glass-card s4-card' });
    s4Card.innerHTML = '<h3>S4 行业适配分细则</h3>';
    const s4Grid = createElement('div', { className: 's4-grid' });

    const leftCol = createElement('div', { className: 's4-column' });
    leftCol.appendChild(createElement('h4', { text: '行业景气度分档' }));
    const bucketList = createElement('ul');
    (s4Info.prosperity?.buckets || []).forEach((bucket) => {
      bucketList.appendChild(createElement('li', { text: `${bucket.label}：${bucket.score} 分` }));
    });
    leftCol.appendChild(bucketList);

    const rightCol = createElement('div', { className: 's4-column' });
    const policy = s4Info.policySupport || { base: 0, addons: [], addonsCap: 0, cap: 0 };
    const policyTitle = `政策扶持加分（基础 ${policy.base || 0} 分，加分上限 ${policy.addonsCap || 0} 分）`;
    rightCol.appendChild(createElement('h4', { text: policyTitle }));
    const policyList = createElement('ul');
    (policy.addons || []).forEach((addon) => {
      policyList.appendChild(createElement('li', { text: `${addon.label}：${addon.score} 分` }));
    });
    rightCol.appendChild(policyList);
    const policyCapValue = typeof policy.cap === 'number' ? policy.cap : (policy.base || 0) + (policy.addonsCap || 0);
    rightCol.appendChild(createElement('p', { className: 'metric-caption', text: `加分封顶：${policyCapValue} 分` }));

    s4Grid.append(leftCol, rightCol);
    s4Card.appendChild(s4Grid);
    panel.appendChild(s4Card);
  }

  const limitCard = createElement('section', { className: 'glass-card' });
  limitCard.innerHTML = `<h3>L 额度公式</h3><p>${technology.limitModel.formula}</p>`;
  const kList = createElement('ul');
  Object.entries(technology.limitModel.kFactors || {}).forEach(([industry, value]) => {
    kList.appendChild(createElement('li', { text: `行业 ${industry.toUpperCase()}：K = ${value}` }));
  });
  limitCard.appendChild(kList);
  const creditList = createElement('ul');
  (technology.limitModel.creditBands || []).forEach((band) => {
    creditList.appendChild(createElement('li', { text: `${band.range} → C=${band.coefficient}｜${band.label}` }));
  });
  limitCard.appendChild(creditList);
  const notesList = createElement('ul');
  (technology.limitModel.notes || []).forEach((note) => notesList.appendChild(createElement('li', { text: note })));
  limitCard.appendChild(notesList);
  panel.appendChild(limitCard);

  const calcContainer = createElement('div', { attrs: { id: 'calculator-panel' } });
  panel.appendChild(calcContainer);
  ScoreLimitCalculator.init(calcContainer, technology.calculatorDefaults, technology);

  const componentGrid = createElement('div', { className: 'section-grid' });
  (technology.components || []).forEach((comp) => {
    const compCard = createElement('article', { className: 'glass-card' });
    compCard.innerHTML = `<h3>${comp.name}</h3><p>${comp.description}</p>`;
    componentGrid.appendChild(compCard);
  });
  panel.appendChild(componentGrid);
}


  function renderBusinessFlow(flow, assets) {
    const panel = document.getElementById('panel-business');
    panel.innerHTML = '';
    if (flow.introduction) {
      const introCard = createElement('section', { className: 'glass-card' });
      introCard.appendChild(createElement('h3', { text: '流程设计总览' }));
      const paragraphs = Array.isArray(flow.introduction) ? flow.introduction : [flow.introduction];
      paragraphs.forEach((text) => {
        if (text) {
          introCard.appendChild(createElement('p', { text }));
        }
      });
      panel.appendChild(introCard);
    }
    const wrapper = createElement('div', { className: 'flow-grid' });
    const ringCard = createElement('section', { className: 'glass-card' });
    ringCard.innerHTML = '<h3>流程演示播放器</h3>';
    // 线性固定布局：左上排列，不旋转不超框
    const listWrap = createElement('div', { className: 'flow-steps' });
    flow.timelineSteps.forEach((step, idx) => {
      const stepEl = createElement('div', {
        className: 'glass-card flow-item',
        attrs: { tabindex: '0', role: 'button', 'aria-label': step.title, 'data-step-index': String(step.step || idx + 1) }
      });
      const indexBadge = createElement('span', { className: 'flow-step-index', text: String(step.step || idx + 1).padStart(2, '0') });
      const title = createElement('strong', { text: step.title });
      const desc = createElement('p', { className: 'flow-item-desc', text: step.description });
      stepEl.append(indexBadge, title, desc);
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

    TimelinePlayer.init(listWrap.querySelectorAll('.flow-item'), detailPane, { data: flow.timelineSteps, speed: flow.player.defaultSpeed, container: listWrap });

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
  createChartCard(panel, {
    id: 'chart-risk-matrix',
    title: '风险热度矩阵',
    subtitle: '概率 × 损失'
  });

  const categories = (risk.matrix || []).map((item) => item.type);
  const heatData = (risk.matrix || []).map((item, index) => [index, 0, Number((item.prob * item.loss).toFixed(3))]);
  
  // 计算数据的最小值和最大值
  const values = heatData.map(item => item[2]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // 深蓝科技主题配色 - 符合整体风格的渐变色系
  const colorMap = {
    '合规': 'linear-gradient(135deg, #06B6D4, #1F6FEB)',  // 青蓝渐变 - 低风险
    '技术': 'linear-gradient(135deg, #1F6FEB, #1FBF9A)',  // 蓝绿渐变 - 中风险
    '业务': 'linear-gradient(135deg, #1FBF9A, #E0B95B)',  // 绿金渐变 - 中高风险
    '合作': 'linear-gradient(135deg, #E0B95B, #F97316)'   // 金橙渐变 - 高风险
  };
  
  ChartManager.initChart('chart-risk-matrix', {
    backgroundColor: 'transparent',
    tooltip: {
      position: 'top',
      formatter: (params) => {
        const item = risk.matrix[params.data[0]];
        const heatValue = params.data[2];
        let riskLevel = '低风险';
        let riskColor = '#06B6D4';
        if (heatValue >= 0.14) {
          riskLevel = '高风险';
          riskColor = '#EC4899';
        } else if (heatValue >= 0.10) {
          riskLevel = '中高风险';
          riskColor = '#E0B95B';
        } else if (heatValue >= 0.05) {
          riskLevel = '中风险';
          riskColor = '#1FBF9A';
        }
        return `<strong style="font-size:18px;color:${riskColor};">【${item.type}风险】</strong><br/>
                <span style="color:#1FBF9A;font-size:15px;">● 概率：${formatPercent(item.prob, 1)}</span><br/>
                <span style="color:#E0B95B;font-size:15px;">● 损失：${formatNumber(item.loss, { digits: 2 })}</span><br/>
                <span style="color:#EC4899;font-size:15px;">● 热度值：${heatValue.toFixed(3)}</span><br/>
                <span style="color:#fff;font-weight:bold;font-size:16px;">🎯 风险等级：${riskLevel}</span>`;
      }
    },
    grid: {
      top: 50,
      bottom: 90,
      left: 140,
      right: 60,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: categories,
      splitArea: { 
        show: false  // 去除间隙
      },
      axisLine: { 
        lineStyle: { 
          color: '#1FBF9A', 
          width: 3 
        } 
      },
      axisLabel: {
        color: '#BFD4FF',  // 使用主题次要文字色
        fontSize: 18,
        fontWeight: '600',
        fontFamily: '-apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
        interval: 0,
        rotate: 0,
        margin: 15
      },
      axisTick: {
        show: false
      },
      splitLine: {
        show: false  // 去除分割线
      }
    },
    yAxis: {
      type: 'category',
      data: ['风险热度'],
      axisLine: { 
        lineStyle: { 
          color: '#1FBF9A', 
          width: 3 
        } 
      },
      axisLabel: {
        color: '#BFD4FF',  // 使用主题次要文字色
        fontSize: 19,
        fontWeight: '600',
        fontFamily: '-apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
        margin: 20
      },
      axisTick: {
        show: false
      },
      splitLine: {
        show: false  // 去除分割线
      }
    },
    visualMap: {
      show: false  // 隐藏默认图例，使用自定义颜色
    },
    series: [{
      name: '风险热度',
      type: 'heatmap',
      data: heatData.map((item, index) => {
        const riskType = categories[index];
        // 创建渐变色 - 符合深蓝科技主题
        const gradientColor = new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: colorMap[riskType].match(/#[0-9A-F]{6}/gi)[0] },
          { offset: 1, color: colorMap[riskType].match(/#[0-9A-F]{6}/gi)[1] }
        ]);
        return {
          value: item,
          itemStyle: {
            color: gradientColor,
            borderColor: 'rgba(11, 31, 59, 0.4)',
            borderWidth: 2,
            shadowBlur: 8,
            shadowColor: 'rgba(31, 111, 235, 0.2)'
          }
        };
      }),
      label: { 
        show: true, 
        color: '#F5F7FF',
        fontSize: 22,
        fontWeight: '700',
        fontFamily: '-apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
        textBorderColor: 'rgba(11, 31, 59, 0.8)',
        textBorderWidth: 2,
        formatter: (params) => {
          const value = params.value[2];
          return value.toFixed(3);
        }
      },
      emphasis: { 
        itemStyle: { 
          shadowBlur: 20, 
          shadowColor: 'rgba(31, 191, 154, 0.6)',  // 青绿发光
          borderColor: '#1FBF9A',  // 主题青绿色
          borderWidth: 3,
          opacity: 1
        },
        label: {
          fontSize: 26,
          fontWeight: '700',
          color: '#FFFFFF',
          textBorderWidth: 3
        }
      }
    }]
  });

  // 添加深蓝主题的颜色说明卡片
  const legendCard = createElement('div', { 
    className: 'glass-card',
    html: `
      <h4 style="margin-bottom: 18px; font-size: 17px; color: #BFD4FF; font-weight: 600;">📊 风险热度色阶说明</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="display: inline-block; width: 50px; height: 28px; background: linear-gradient(135deg, #06B6D4, #1F6FEB); border-radius: 6px; border: 1px solid rgba(31, 111, 235, 0.3); box-shadow: 0 2px 8px rgba(6, 182, 212, 0.25);"></span>
          <span style="font-size: 14px; color: #BFD4FF;"><strong style="color: #06B6D4;">合规</strong> 低风险 <span style="color: #8BA3C7;">(0.027)</span></span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="display: inline-block; width: 50px; height: 28px; background: linear-gradient(135deg, #1F6FEB, #1FBF9A); border-radius: 6px; border: 1px solid rgba(31, 191, 154, 0.3); box-shadow: 0 2px 8px rgba(31, 111, 235, 0.25);"></span>
          <span style="font-size: 14px; color: #BFD4FF;"><strong style="color: #1F6FEB;">技术</strong> 中风险 <span style="color: #8BA3C7;">(0.102)</span></span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="display: inline-block; width: 50px; height: 28px; background: linear-gradient(135deg, #1FBF9A, #E0B95B); border-radius: 6px; border: 1px solid rgba(224, 185, 91, 0.3); box-shadow: 0 2px 8px rgba(31, 191, 154, 0.25);"></span>
          <span style="font-size: 14px; color: #BFD4FF;"><strong style="color: #1FBF9A;">业务</strong> 中高风险 <span style="color: #8BA3C7;">(0.112)</span></span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="display: inline-block; width: 50px; height: 28px; background: linear-gradient(135deg, #E0B95B, #F97316); border-radius: 6px; border: 1px solid rgba(249, 115, 22, 0.3); box-shadow: 0 2px 8px rgba(224, 185, 91, 0.25);"></span>
          <span style="font-size: 14px; color: #BFD4FF;"><strong style="color: #E0B95B;">合作</strong> 高风险 <span style="color: #8BA3C7;">(0.144)</span></span>
        </div>
      </div>
    `
  });
  panel.appendChild(legendCard);

  const riskList = createElement('div', { className: 'section-grid' });
  (risk.matrix || []).forEach((item) => {
    const card = createElement('article', { className: 'glass-card' });
    card.innerHTML = `<h3>${item.type}风险</h3><p class="metric-caption">概率：${formatPercent(item.prob, 1)}｜损失：${formatNumber(item.loss, { digits: 2 })}｜等级：${item.level}</p>`;
    const btn = createElement('button', {
      className: 'btn btn-outline',
      text: '查看应对策略',
      attrs: { type: 'button', 'data-risk': item.type }
    });
    btn.addEventListener('click', () => renderRiskDetail(item.type));
    card.appendChild(btn);
    riskList.appendChild(card);
  });
  panel.appendChild(riskList);

  const detailCard = createElement('section', { className: 'glass-card' });
  detailCard.innerHTML = `<h3>${I18N.zh.riskStrategy}</h3>`;
  const detailContent = createElement('div');
  detailCard.appendChild(detailContent);
  panel.appendChild(detailCard);

  const controlCard = createElement('section', { className: 'glass-card' });
  controlCard.innerHTML = `<h3>${I18N.zh.controlLayer}</h3>`;
  Object.values(risk.controls || {}).forEach((layer) => {
    const block = createElement('div');
    const sla = layer.sla ? (layer.sla.unit === 'minute' ? `${layer.sla.value} 分钟` : layer.sla) : '';
    block.innerHTML = `<strong>${layer.title}</strong>${sla ? `｜SLA：${sla}` : ''}`;
    const list = createElement('ul');
    (layer.actions || []).forEach((action) => list.appendChild(createElement('li', { text: action })));
    block.appendChild(list);
    controlCard.appendChild(block);
  });
  panel.appendChild(controlCard);

  function formatDetailItem(item) {
    if (!item) return '';
    if (typeof item === 'string') return item;
    let base = item.text || '';
    if (item.value !== undefined) {
      if (item.unit === 'budgetShare' || item.unit === 'coverage' || item.unit === 'guarantee') {
        base += `：${formatPercent(item.value, 0)}`;
      } else if (item.unit === 'minute') {
        base += `：${formatNumber(item.value, { digits: 0 })} 分钟`;
      } else if (item.unit === 'tenThousand') {
        base += `：${formatNumber(item.value, { digits: 0 })} 万元`;
      } else if (item.unit === 'yuan') {
        base += `：${formatNumber(item.value / 10000, { digits: 0 })} 万元`;
      } else if (item.unit === 'count') {
        base += `：≥${item.value} 家`;
      } else {
        base += `：${item.value}`;
      }
    } else if (item.frequency) {
      base += `（${item.frequency === 'quarterly' ? '季度' : item.frequency}）`;
    }
    return base;
  }

  function renderRiskDetail(type) {
    const keyMap = { '技术': 'technical', '业务': 'business', '合作': 'cooperation', '合规': 'compliance' };
    const detail = risk.detail[keyMap[type]];
    if (!detail) { detailContent.innerHTML = '<p>暂无详情。</p>'; return; }
    detailContent.innerHTML = '';
    const issueTitle = createElement('h4', { text: '风险点' });
    detailContent.appendChild(issueTitle);
    const issueList = createElement('ul');
    (detail.issues || []).forEach((issue) => issueList.appendChild(createElement('li', { text: formatDetailItem(issue) })));
    detailContent.appendChild(issueList);
    const strategyTitle = createElement('h4', { text: '应对措施' });
    detailContent.appendChild(strategyTitle);
    const strategyList = createElement('ul');
    (detail.strategies || []).forEach((strategy) => strategyList.appendChild(createElement('li', { text: formatDetailItem(strategy) })));
    detailContent.appendChild(strategyList);
    const triggerTitle = createElement('h4', { text: '触发条件' });
    detailContent.appendChild(triggerTitle);
    const triggerList = createElement('ul');
    (detail.triggers || []).forEach((trigger) => triggerList.appendChild(createElement('li', { text: formatDetailItem(trigger) })));
    detailContent.appendChild(triggerList);
  }

  if (risk.matrix && risk.matrix.length) {
    renderRiskDetail(risk.matrix[0].type);
  }
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
    subtitle: '服务企业数 & 融资规模'
  });
  const projection = outcomes.projection || [];
  ChartManager.initChart('chart-outcome-projection', {
    backgroundColor: 'transparent',
    legend: { data: ['服务企业数', '融资额度 (亿元)'], textStyle: { color: '#BFD4FF' } },
    grid: { left: 60, right: 60, top: 50, bottom: 40 },
    textStyle: { color: '#BFD4FF' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: projection.map((item) => item.year), axisLine: { lineStyle: { color: '#1F6FEB' } } },
    yAxis: [
      { type: 'value', name: '服务企业数', axisLine: { lineStyle: { color: '#1F6FEB' } }, splitLine: { lineStyle: { color: 'rgba(31,111,235,0.2)' } } },
      { type: 'value', name: '融资额度 (亿元)', axisLine: { lineStyle: { color: '#1FBF9A' } }, splitLine: { show: false } }
    ],
    series: [
      { name: '服务企业数', type: 'bar', data: projection.map((item) => item.enterprises), itemStyle: { color: 'rgba(31,111,235,0.7)' } },
      { name: '融资额度 (亿元)', type: 'line', yAxisIndex: 1, data: projection.map((item) => item.financing), lineStyle: { color: '#E0B95B' }, areaStyle: { color: 'rgba(224,185,91,0.25)' } }
    ]
  });

  const savingsCard = createElement('section', { className: 'glass-card' });
  savingsCard.innerHTML = '<h3>成本节省估算</h3>';
  const savingsList = createElement('ul');
  savingsList.appendChild(createElement('li', { text: `企业端：约 ${formatNumber(outcomes.costSavings.enterprise / 100000000, { digits: 1 })} 亿元/年` }));
  savingsList.appendChild(createElement('li', { text: `机构端人工：-${formatPercent(outcomes.costSavings.institution.manualReduction, 0)}` }));
  savingsList.appendChild(createElement('li', { text: `纸质单据成本节省：${formatNumber(outcomes.costSavings.institution.paperCost / 10000, { digits: 0 })} 万元/年` }));
  savingsList.appendChild(createElement('li', { text: `流程自动化节省：${formatNumber(outcomes.costSavings.institution.automationSaving / 10000, { digits: 0 })} 万元/年` }));
  savingsCard.appendChild(savingsList);
  panel.appendChild(savingsCard);

  const impactCard = createElement('section', { className: 'glass-card' });
  impactCard.innerHTML = '<h3>行业效益</h3>';
  const impactList = createElement('ul');
  impactList.appendChild(createElement('li', { text: `效率提升：${formatPercent(outcomes.industryImpact.efficiency, 0)}` }));
  impactList.appendChild(createElement('li', { text: `不良率下降：${formatPercent(Math.abs(outcomes.industryImpact.badLoan), 0)}` }));
  impactList.appendChild(createElement('li', { text: `融资可得性提升：${formatPercent(outcomes.industryImpact.access, 0)}` }));
  impactCard.appendChild(impactList);
  panel.appendChild(impactCard);

  const scaleCard = createElement('section', { className: 'glass-card' });
  scaleCard.innerHTML = '<h3>可复制推广</h3>';
  const scaleList = createElement('ul');
  (outcomes.scalability || []).forEach((item) => scaleList.appendChild(createElement('li', { text: item })));
  scaleCard.appendChild(scaleList);
  panel.appendChild(scaleCard);
}


  function renderTeam(team, meta) {
  const panel = document.getElementById('panel-team');
  panel.innerHTML = '';
  const teamCard = createElement('section', { className: 'glass-card' });
  teamCard.innerHTML = '<h3>团队与鸣谢</h3>';
  const members = createElement('ul');
  (team.members || []).forEach((member) => members.appendChild(createElement('li', { text: `${member.name}｜${member.role}` })));
  teamCard.appendChild(members);
  if (Array.isArray(team.advisors) && team.advisors.length) {
    teamCard.appendChild(createElement('p', { text: team.advisors.join('；') }));
  }
  if (team.thanks) {
    teamCard.appendChild(createElement('p', { text: team.thanks }));
  }
  panel.appendChild(teamCard);

  if (team.appendix) {
    const appendixCard = createElement('section', { className: 'glass-card' });
    appendixCard.appendChild(createElement('h3', { text: team.appendix.title || '附录' }));
    const appendixList = createElement('ul');
    (team.appendix.links || []).forEach((link) => {
      if (!link) return;
      const item = createElement('li');
      if (link.url) {
        const anchor = createElement('a', {
          text: link.label || link.url,
          attrs: { href: link.url, target: '_blank', rel: 'noopener noreferrer' }
        });
        item.appendChild(anchor);
      } else if (link.label) {
        item.textContent = link.label;
      }
      appendixList.appendChild(item);
    });
    appendixCard.appendChild(appendixList);
    panel.appendChild(appendixCard);
  }

  if (team.license) {
    const licenseCard = createElement('section', { className: 'glass-card' });
    licenseCard.appendChild(createElement('p', { text: team.license }));
    panel.appendChild(licenseCard);
  }

  const footer = document.getElementById('app-footer');
  footer.innerHTML = `© ${new Date().getFullYear()} ${meta.school || ''}｜${meta.slogan || ''}`;
  const teamSpan = createElement('span', { text: `队员：${(team.members || []).map((m) => m.name).join('、')}` });
  footer.appendChild(teamSpan);
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

