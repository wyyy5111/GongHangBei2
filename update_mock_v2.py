import json
from pathlib import Path

def update_data(data):
    # Meta updates
    data['meta'] = {
        'titleZh': '区块链与供应链双链融合的贸易融资平台',
        'titleEn': 'Dual-Chain Trade Finance Platform',
        'scenario': '应收账款融资示例场景',
        'team': ['马琬淳', '李沛柯', '汪文吉'],
        'school': '河南大学',
        'slogan': '双链融合·可信融资·数据即信用',
        'timestamp': '2025-10',
        'timestampSort': '2025-10-01',
        'printButtonText': '导出为 PDF（打印样式）'
    }

    # Overview updates
    data['overview'] = {
        'microCoverageTarget': 0.6,
        'kpiCards': [
            {
                'id': 'cycleDays',
                'label': '融资周期压缩',
                'unit': '工作日',
                'change': {'before': 18, 'after': 3},
                'description': '核心企业上下游融资周期由 18 个工作日缩短至 ≤3 个工作日'
            },
            {
                'id': 'tplusOne',
                'label': 'T+1 放款覆盖率',
                'unit': '',
                'change': {'before': 0.35, 'after': 0.7},
                'description': '70% 业务实现 T+1 放款，小微企业覆盖率不低于 60%'
            },
            {
                'id': 'badDebt',
                'label': '坏账率控制',
                'unit': '',
                'change': {'before': 0.031, 'after': 0.008},
                'description': '坏账率由 3.1% 降至 0.8% 以下，降幅约 74.2%'
            },
            {
                'id': 'fraudDetect',
                'label': '虚假贸易识别准确率',
                'unit': '',
                'change': {'before': 0.88, 'after': 0.98},
                'description': '智能风险识别准确率提升至 ≥98%'
            }
        ],
        'threeFlow': {
            'title': '三流协同：信息流、物流、资金流一体化',
            'description': '以区块链为可信底座，统一汇聚贸易合同、物流轨迹与资金流转，形成可追溯的“交易事实链”，让数据成为新型信用资产。',
            'poster': 'assets/img/triple-flow.svg',
            'flows': [
                {'key': 'info', 'name': '信息流', 'highlights': ['合同签署留痕', '发票验真', '政策合规映射']},
                {'key': 'logistics', 'name': '物流流', 'highlights': ['IoT 轨迹', '仓储签收', '温控监测']},
                {'key': 'funds', 'name': '资金流', 'highlights': ['智能授信', '额度池调度', '链上留痕对账']}
            ]
        },
        'ctaButtons': data['overview'].get('ctaButtons', [])
    }

    # Objectives restructure
    data['objectives'] = {
        'shortTerm': {
            'cycleDays': {'before': 18, 'after': 3},
            'firstReview24h': {'before': 0.33, 'after': 0.80},
            'riskPreCheckHours': {'before': 48, 'after': 4},
            'badDebt': {'before': 0.031, 'after': 0.008},
            'compositeCost': {'before': 0.068, 'after': 0.05},
            'materialCostSaving': 0.15
        },
        'midTerm': {
            'tPlusOneCoverage': {'before': 0.4, 'after': 0.7},
            'crossBorderCycleDays': {'before': 50, 'after': 10},
            'fraudDetectAccuracy': {'before': 0.9, 'after': 0.98},
            'riskAlertResponseHours': {'before': 24, 'after': 1},
            'redundantRemovalRate': {'before': 0.2, 'after': 0.8},
            'rateDiscountCoverage': {'before': 0.2, 'after': 0.6}
        },
        'warningRules': {
            'deviationThreshold': 0.1,
            'message': '监测指标偏离目标超过 10% 时，自动触发诊断机制，3 个工作日内形成优化方案。'
        },
        'rollingBadge': {
            'label': '迭代保障',
            'text': '每季度更新智能合约与风控模型，结合新增链上数据动态校准参数。'
        }
    }

    # Technology updates
    score_model = data['technology']['scoreModel'] if 'technology' in data and 'scoreModel' in data['technology'] else {}
    score_model['formula'] = 'S = S₁×30% + S₂×40% + S₃×20% + S₄×10%'
    score_model['weights'] = {'S1': 0.3, 'S2': 0.4, 'S3': 0.2, 'S4': 0.1}
    score_model['dimensions'] = [
        {
            'id': 'S1',
            'name': '基础资质分',
            'items': [
                '注册资本：每 1000 万元计 5 分，最高 50 分',
                '成立年限：每年 3 分，最高 15 分',
                '征信记录：无逾期得 30 分，每次逾期扣 5 分',
                '法律诉讼：每条诉讼记录扣 10 分'
            ],
            'note': '数据来源：市场监管局注册资本、工商登记与央行征信系统'
        },
        {
            'id': 'S2',
            'name': '供应链履约分',
            'items': [
                '历史订单完成率：100% 满分 30 分，每下降 5% 扣 3 分',
                '应收账款确权率：100% 满分 30 分，每下降 10% 扣 5 分',
                '物流匹配度：匹配率 100% 得 40 分，每下降 10% 扣 8 分'
            ],
            'note': '通过 ERP、票据及物联网设备上链对比，确保交易真实性'
        },
        {
            'id': 'S3',
            'name': '历史融资分',
            'items': [
                '还款率：100% 按时还款得 50 分，逾期一次扣 10 分',
                '用途合规性：用途匹配 30 分，违规一次扣 30 分',
                '申请频次：半年内 ≤3 次得 20 分，每超 1 次扣 5 分'
            ],
            'note': '接入银行信贷系统及资金流向数据，智能合约自动核验用途'
        }
    ]
    score_model['S4'] = {
        'prosperity': {
            'buckets': [
                {'key': '>=80', 'label': '≥80（高端制造/AI）', 'score': 50},
                {'key': '60-79', 'label': '60–79（装备/电子信息）', 'score': 30},
                {'key': '<60', 'label': '<60（传统加工）', 'score': 10}
            ]
        },
        'policySupport': {
            'base': 20,
            'addons': [
                {'key': 'sxzx_national_giant', 'label': '国家级专精特新小巨人', 'score': 15},
                {'key': 'sxzx_provincial', 'label': '省级专精特新', 'score': 10},
                {'key': 'sxzx_city', 'label': '市级专精特新', 'score': 5},
                {'key': 'green_zero_carbon_leader', 'label': '绿色技术领军/零碳工厂', 'score': 12},
                {'key': 'green_factory_demo', 'label': '绿色工厂/低碳示范', 'score': 8},
                {'key': 'circular_economy', 'label': '资源循环利用', 'score': 5}
            ],
            'addonsCap': 30,
            'cap': 50
        }
    }
    data.setdefault('technology', {})['scoreModel'] = score_model

    data['technology']['limitModel'] = {
        'formula': 'L = R × K × C − D',
        'kFactors': {
            'manufacturing': 0.3,
            'retail': 0.2,
            'logistics': 0.25,
            'it': 0.35
        },
        'creditBands': [
            {'range': '>=90', 'coefficient': 1.2, 'label': '信用极佳'},
            {'range': '80-89', 'coefficient': 1.0, 'label': '信用良好'},
            {'range': '70-79', 'coefficient': 0.8, 'label': '信用稳健'},
            {'range': '60-69', 'coefficient': 0.5, 'label': '需重点关注'},
            {'range': '<60', 'coefficient': 0.0, 'label': '拒绝融资'}
        ],
        'notes': [
            'R：企业年度营收（万元），由核心企业与税务数据联合校验',
            'K：行业周转系数，依托行业资金周期设定',
            'C：信用评分系数，由 S 模型实时更新',
            'D：未结清融资余额，来自银行与票据节点穿透查询'
        ]
    }

    data['technology']['components'] = [
        {'name': '联盟链平台', 'description': '基于 Hyperledger Fabric 构建多节点联盟链，实现数据共享与隐私隔离。'},
        {'name': '智能合约引擎', 'description': '使用 Solidity 开发授信、额度测算、资金划拨规则，实现自动执行。'},
        {'name': '数据接口模块', 'description': 'API 网关联通 ERP、税务、物流及征信系统，Chainlink 预言机保障跨域数据可信。'},
        {'name': '安全防护体系', 'description': '引入国密算法 SM2/SM3 与隐私计算，配合第三方审计确保链上数据和合约安全。'}
    ]
    data['technology']['calculatorDefaults'] = {
        'prosperityBucket': '>=80',
        'policyAddons': ['sxzx_national_giant'],
        'S1': 85,
        'S2': 88,
        'S3': 82,
        'industry': 'manufacturing',
        'revenue': 320000,
        'outstanding': 18000
    }

    # Business flow 5-step timeline
    data['businessFlow']['timelineSteps'] = [
        {
            'step': 1,
            'title': '贸易合同与物流数据上链',
            'description': '贸易双方签署合同后上传订单哈希，物流系统自动同步运单、签收等数据，构建不可篡改的交易事实链。',
            'ledgerFields': ['订单哈希', '合同要素', '物流轨迹哈希'],
            'participants': ['核心企业', '供应商', '物流方'],
            'compliance': '满足银行贷前核验真实贸易背景的要求。'
        },
        {
            'step': 2,
            'title': '发票验真与电子确权',
            'description': '连接税务发票查验平台验证票据真伪，核心企业在线使用电子签名完成应收账款确权。',
            'ledgerFields': ['发票查验结果', '税控码哈希', '电子签章记录'],
            'participants': ['供应商', '核心企业', '税务接口'],
            'compliance': '符合《电子签名法》要求，确权记录具法律效力。'
        },
        {
            'step': 3,
            'title': '生成数字债权凭证并发起融资',
            'description': '平台生成唯一数字债权凭证，可拆分流转；供应商基于凭证一键向合作银行发起融资申请。',
            'ledgerFields': ['数字凭证 ID', '面值', '到期日'],
            'participants': ['供应商', '平台智能合约'],
            'compliance': '凭证唯一且可追溯，杜绝“一单多押”欺诈。'
        },
        {
            'step': 4,
            'title': '智能合约自动授信与放款',
            'description': '智能合约校验凭证、额度池与白名单条件，实时计算额度 L 值，满足条件即刻放款，支持 T+0/T+1 到账。',
            'ledgerFields': ['额度测算过程', '白名单状态', '放款指令哈希'],
            'participants': ['合作银行', '核心企业', '智能合约'],
            'compliance': '债项风控与主体授信解耦，满足监管穿透管理。'
        },
        {
            'step': 5,
            'title': '到期还款与信用回流',
            'description': '核心企业按约定付款至银行监管账户，系统自动将凭证状态更新为“已结清”，沉淀企业信用资产。',
            'ledgerFields': ['还款流水', '凭证状态更新', '风险复核记录'],
            'participants': ['核心企业', '合作银行', '供应商'],
            'compliance': '形成贷前-贷中-贷后闭环留痕，便于审计与再融资。'
        }
    ]
    data['businessFlow']['player'] = {
        'description': '流程播放器覆盖“合同上链 → 确权发票 → 数字凭证 → 智能授信 → 结清回流”五步闭环，逐步查看链上字段和合规说明。',
        'defaultSpeed': 1600
    }

    # Roles section simple canonical entries
    data['rolesSection'] = {
        'roles': {
            'core': [
                {
                    'id': 'CORE-01',
                    'name': '核心企业',
                    'operations': ['授权上传贸易合同与订单数据', '在线完成应收账款电子确权', '按约定将回款打入监管账户'],
                    'benefits': ['优化现金流，延长账期', '稳定供应链生态', '获取链上数据支撑经营决策'],
                    'valueMetrics': {'efficiencyGain': 0.45, 'costReduction': 0.12, 'creditMultiplier': 2.4}
                }
            ],
            'sme': [
                {
                    'id': 'SME-01',
                    'name': '中小企业供应商',
                    'operations': ['基于数字凭证一键申请融资', '管理融资账户与回款计划', '维护凭证拆分与流转记录'],
                    'benefits': ['融资通过率显著提升', '资金成本下降 20%-30%', 'T+0/T+1 到账缓解现金流压力', '沉淀数字信用档案'],
                    'valueMetrics': {'efficiencyGain': 0.6, 'costReduction': 0.25, 'creditMultiplier': 1.8}
                }
            ],
            'bank': [
                {
                    'id': 'BANK-01',
                    'name': '合作银行',
                    'operations': ['设定白名单、额度池等合约规则', '自动审批并放款，管理资金划拨', '开展链上贷后监测与风险预警'],
                    'benefits': ['批量获客并下沉普惠金融', '不良率降低，风控成本下降 50% 以上', '获取核心企业背书的优质底层资产'],
                    'valueMetrics': {'efficiencyGain': 0.55, 'costReduction': 0.2, 'creditMultiplier': 2.6}
                }
            ],
            'logistics': [
                {
                    'id': 'LOGI-01',
                    'name': '物流与仓储服务商',
                    'operations': ['同步签收凭证、仓单、温控数据上链', '提供异常事件实时同步', '与智能合约联动触发风控提示'],
                    'benefits': ['拓展数据服务收入', '提升数字化协同能力', '成为供应链金融可信数据源'],
                    'valueMetrics': {'efficiencyGain': 0.4, 'costReduction': 0.1, 'creditMultiplier': 1.3}
                }
            ],
            'regulator': [
                {
                    'id': 'REG-01',
                    'name': '监管机构',
                    'operations': ['通过监管节点实时查看匿名化统计', '跟踪资金流向与风险预警指标', '结合沙盒机制评估创新模式合规性'],
                    'benefits': ['提升穿透式监管效率', '掌握真实产业运行数据', '保障普惠金融政策落地'],
                    'valueMetrics': {'efficiencyGain': 0.35, 'costReduction': 0.08, 'creditMultiplier': 1.2}
                }
            ]
        },
        'synergy': [
            {'name': '信用乘数效应', 'description': '核心企业信用通过数字凭证多级传导，帮助末端供应商获得同步融资条件。'},
            {'name': '数据网络效应', 'description': '链上多维数据越丰富，智能风控越精准，预警更及时。'},
            {'name': '流程协同效应', 'description': '合同、物流、资金在同一平台协作，消除信息孤岛，实现端到端自动化。'}
        ]
    }

    # Risk matrix and detail restructure
    data['risk']['matrix'] = [
        {'type': '技术', 'prob': 0.05, 'loss': 0.75, 'level': '中高'},
        {'type': '业务', 'prob': 0.08, 'loss': 0.35, 'level': '中'},
        {'type': '合作', 'prob': 0.03, 'loss': 1.50, 'level': '高'},
        {'type': '合规', 'prob': 0.02, 'loss': 0.40, 'level': '中'}
    ]

    data['risk']['detail'] = {
        'technical': {
            'issues': [{'text': '链上数据泄露'}, {'text': '智能合约逻辑漏洞'}],
            'strategies': [
                {'text': '年度安全审计预算占比', 'value': 0.15, 'unit': 'budgetShare'},
                {'text': '第三方安全审计频率', 'frequency': 'quarterly'},
                {'text': '部署实时监测工具，漏洞响应时间控制', 'value': 10, 'unit': 'minute'}
            ],
            'triggers': [{'text': '安全审计发现高危问题'}, {'text': '监控到异常调用或交易峰值'}]
        },
        'business': {
            'issues': [{'text': '虚假贸易背景'}, {'text': '企业违约或履约不足'}],
            'strategies': [
                {'text': '政务征信与物流数据覆盖率', 'value': 0.95, 'unit': 'coverage'},
                {'text': '低信用企业追加担保比例', 'value': 0.3, 'unit': 'guarantee'},
                {'text': '设置单户单笔融资上限', 'value': 100, 'unit': 'tenThousand'}
            ],
            'triggers': [{'text': '链上风控模型预警'}, {'text': '供应链关系或账期异常'}]
        },
        'cooperation': {
            'issues': [{'text': '合作银行或核心企业退出'}, {'text': '系统改造成本过高'}],
            'strategies': [
                {'text': '签约银行数量', 'value': 3, 'unit': 'count'},
                {'text': '签约核心企业数量', 'value': 5, 'unit': 'count'},
                {'text': '应急资金池规模', 'value': 20000000, 'unit': 'yuan'}
            ],
            'triggers': [{'text': '合作方 SLA 指标异常'}, {'text': '业务量持续低于目标'}]
        },
        'compliance': {
            'issues': [{'text': '数字债权凭证法律地位'}, {'text': '数据隐私与跨境监管边界'}],
            'strategies': [
                {'text': '依据《民法典》《电子签名法》制定标准合同'},
                {'text': '坚持数据最小化，仅上链哈希与关键字段'},
                {'text': '保持技术服务方定位，不触资不担保，开放监管节点'}
            ],
            'triggers': [{'text': '监管政策调整或新规发布'}, {'text': '跨境数据调用或司法取证需求'}]
        }
    }

    data['risk']['controls'] = {
        'daily': {
            'title': '日常监测层',
            'sla': {'value': 30, 'unit': 'minute'},
            'actions': ['搭建风险预警系统实时监测违约率与异常交易', '安全与风控团队联合响应，10 分钟内完成初步处置', '异常流程自动冻结待复核']
        },
        'monthly': {
            'title': '定期复盘层',
            'cycle': 'monthly',
            'actions': ['每月更新各类风险概率与损失测算', '召开合作方联席会复盘风险案例', '据复盘结果调整授信策略与模型参数']
        },
        'annual': {
            'title': '第三方验证层',
            'cycle': 'annual',
            'actions': ['邀请律所、安全公司开展年度评估', '验证数字凭证与合约执行的合规性', '形成整改清单并跟踪闭环']
        }
    }

    # Outcomes structure
    data['outcomes'] = {
        'projection': [
            {'year': 2024, 'enterprises': 500, 'financing': 50},
            {'year': 2025, 'enterprises': 1500, 'financing': 150},
            {'year': 2026, 'enterprises': 3000, 'financing': 300}
        ],
        'costSavings': {
            'enterprise': 1500000000,
            'institution': {
                'manualReduction': 0.6,
                'paperCost': 5000000,
                'automationSaving': 8000000
            }
        },
        'industryImpact': {'efficiency': 0.5, 'badLoan': -0.6, 'access': 0.4},
        'scalability': [
            '打造可复制的“双链融合”贸易融资标准方案',
            '支持跨区域、跨境贸易场景的信用协同与风控'
        ]
    }

    data['team'] = {
        'members': [
            {'name': '马琬淳', 'role': '架构设计'},
            {'name': '李沛柯', 'role': '数据与可视化'},
            {'name': '汪文吉', 'role': '业务策略'}
        ],
        'school': '河南大学',
        'advisors': ['指导老师：'],
        'thanks': '感谢区块链联盟、合作银行与监管单位的协同支持',
        'license': '仅用于技术演示，示例数据依据最新方案重构，不代表真实业务。'
    }

    # Data assets update referencing overview
    data['dataAssets']['kpi'] = {
        'cycleDays': {'before': 18, 'after': 3},
        'tPlusOne': {'before': 0.35, 'after': 0.7},
        'badDebt': {'before': 0.031, 'after': 0.008},
        'fraudDetect': {'before': 0.88, 'after': 0.98}
    }
    data['dataAssets']['cycleDays'] = {'traditional': 18, 'current': 3}
    data['dataAssets']['tPlusOneRate'] = 0.7
    data['dataAssets']['badDebtRate'] = 0.008
    data['dataAssets']['fraudDetectAcc'] = 0.98
    data['dataAssets']['crossBorderCycle'] = {'traditional': 50, 'current': 10}
    data['dataAssets']['financeCycle'] = [
        {'quarter': '2024Q1', 'traditional': 18, 'dual': 6},
        {'quarter': '2024Q2', 'traditional': 16, 'dual': 5},
        {'quarter': '2024Q3', 'traditional': 15, 'dual': 4},
        {'quarter': '2024Q4', 'traditional': 14, 'dual': 3}
    ]
    data['dataAssets']['costStructure'] = {
        'categories': ['人工审核', '纸质单据', '对账沟通', '资金占压'],
        'before': [100, 45, 60, 120],
        'after': [40, 10, 18, 70]
    }
    data['dataAssets']['redundantElimination'] = {
        'stages': ['申请', '审批', '放款', '回款'],
        'baseline': [0.3, 0.35, 0.4, 0.25],
        'optimized': [0.82, 0.85, 0.9, 0.8]
    }

    return data


path = Path('assets/data/mock.json')
data = json.load(path.open('r', encoding='utf-8'))
data = update_data(data)
path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
