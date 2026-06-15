#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const outDir = process.argv[2];
if (!outDir) {
  console.error('Usage: node generate_self_drawn_figures.js <out-dir>');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

const baseStyle = `
  <style>
    svg { background: #ffffff; font-family: "PingFang SC", "Microsoft YaHei", Arial, sans-serif; }
    .title { font-size: 28px; font-weight: 700; fill: #17324d; }
    .note { font-size: 17px; fill: #415466; }
    .layer { fill: #f7fbff; stroke: #2f6f9f; stroke-width: 2.2; rx: 16; }
    .layer2 { fill: #f8fff7; stroke: #3d8050; stroke-width: 2.2; rx: 16; }
    .layer3 { fill: #fffaf0; stroke: #b7791f; stroke-width: 2.2; rx: 16; }
    .layer4 { fill: #fff7f7; stroke: #b24b4b; stroke-width: 2.2; rx: 16; }
    .head { font-size: 22px; font-weight: 700; fill: #1d2b36; }
    .body { font-size: 17px; fill: #23313d; }
    .small { font-size: 15px; fill: #4b5d6a; }
    .arrow { stroke: #40596b; stroke-width: 2.4; fill: none; marker-end: url(#arrow); }
    .dash { stroke-dasharray: 8 6; }
    .device { fill: #ffffff; stroke: #78909c; stroke-width: 1.5; rx: 10; }
  </style>
`;

const figure1 = `<!doctype html><html><body style="margin:0">
<svg width="1400" height="880" viewBox="0 0 1400 880" xmlns="http://www.w3.org/2000/svg">
${baseStyle}
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#40596b"/></marker></defs>
<text x="700" y="54" text-anchor="middle" class="title">温室智能灌溉系统四层架构图（自绘）</text>
<text x="700" y="86" text-anchor="middle" class="note">传感器采集、LoRaWAN 接入、MQTT 平台处理与应用端管理形成闭环</text>

<rect x="80" y="125" width="1240" height="125" class="layer4"/>
<text x="115" y="165" class="head">应用层</text>
<rect x="265" y="150" width="210" height="62" class="device"/><text x="370" y="176" text-anchor="middle" class="body">Web 控制台</text><text x="370" y="200" text-anchor="middle" class="small">配置阈值/查看趋势</text>
<rect x="520" y="150" width="210" height="62" class="device"/><text x="625" y="176" text-anchor="middle" class="body">移动端</text><text x="625" y="200" text-anchor="middle" class="small">告警确认/手动控制</text>
<rect x="775" y="150" width="210" height="62" class="device"/><text x="880" y="176" text-anchor="middle" class="body">报表复盘</text><text x="880" y="200" text-anchor="middle" class="small">用水量/在线率</text>
<rect x="1030" y="150" width="210" height="62" class="device"/><text x="1135" y="176" text-anchor="middle" class="body">维护任务</text><text x="1135" y="200" text-anchor="middle" class="small">校准/换电池</text>

<rect x="80" y="295" width="1240" height="145" class="layer3"/>
<text x="115" y="340" class="head">平台层</text>
<rect x="270" y="320" width="190" height="70" class="device"/><text x="365" y="348" text-anchor="middle" class="body">MQTT Broker</text><text x="365" y="373" text-anchor="middle" class="small">主题路由</text>
<rect x="510" y="320" width="190" height="70" class="device"/><text x="605" y="348" text-anchor="middle" class="body">规则引擎</text><text x="605" y="373" text-anchor="middle" class="small">阈值/趋势判断</text>
<rect x="750" y="320" width="190" height="70" class="device"/><text x="845" y="348" text-anchor="middle" class="body">时序数据库</text><text x="845" y="373" text-anchor="middle" class="small">历史数据</text>
<rect x="990" y="320" width="190" height="70" class="device"/><text x="1085" y="348" text-anchor="middle" class="body">告警模块</text><text x="1085" y="373" text-anchor="middle" class="small">异常追踪</text>

<rect x="80" y="485" width="1240" height="145" class="layer"/>
<text x="115" y="530" class="head">网络层 / 边缘层</text>
<rect x="300" y="510" width="200" height="72" class="device"/><text x="400" y="538" text-anchor="middle" class="body">LoRaWAN 网关</text><text x="400" y="563" text-anchor="middle" class="small">上行汇聚</text>
<rect x="600" y="510" width="220" height="72" class="device"/><text x="710" y="538" text-anchor="middle" class="body">边缘控制器</text><text x="710" y="563" text-anchor="middle" class="small">断网保护/本地校验</text>
<rect x="920" y="510" width="220" height="72" class="device"/><text x="1030" y="538" text-anchor="middle" class="body">互联网连接</text><text x="1030" y="563" text-anchor="middle" class="small">TLS 加密</text>

<rect x="80" y="675" width="1240" height="145" class="layer2"/>
<text x="115" y="720" class="head">感知与执行层</text>
<rect x="265" y="700" width="185" height="72" class="device"/><text x="357" y="728" text-anchor="middle" class="body">土壤湿度</text><text x="357" y="753" text-anchor="middle" class="small">分区三点布设</text>
<rect x="485" y="700" width="185" height="72" class="device"/><text x="577" y="728" text-anchor="middle" class="body">温湿度/光照</text><text x="577" y="753" text-anchor="middle" class="small">解释蒸腾变化</text>
<rect x="705" y="700" width="185" height="72" class="device"/><text x="797" y="728" text-anchor="middle" class="body">水压/流量</text><text x="797" y="753" text-anchor="middle" class="small">判断执行异常</text>
<rect x="925" y="700" width="185" height="72" class="device"/><text x="1017" y="728" text-anchor="middle" class="body">电磁阀/水泵</text><text x="1017" y="753" text-anchor="middle" class="small">执行灌溉动作</text>

<path d="M700 675 L700 630" class="arrow"/><path d="M700 485 L700 440" class="arrow"/><path d="M700 295 L700 250" class="arrow"/>
<path d="M1015 675 C1210 620 1210 420 1085 390" class="arrow dash"/>
<text x="1110" y="610" class="small">执行结果回传</text>
</svg></body></html>`;

const figure2 = `<!doctype html><html><body style="margin:0">
<svg width="1400" height="820" viewBox="0 0 1400 820" xmlns="http://www.w3.org/2000/svg">
${baseStyle}
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#40596b"/></marker></defs>
<text x="700" y="54" text-anchor="middle" class="title">数据流与灌溉控制闭环流程图（自绘）</text>
<text x="700" y="86" text-anchor="middle" class="note">监测流用于状态表达，控制流必须经过规则判断、边缘校验和执行反馈</text>

<rect x="70" y="155" width="200" height="90" class="layer2"/><text x="170" y="190" text-anchor="middle" class="head">传感器节点</text><text x="170" y="220" text-anchor="middle" class="small">湿度/温湿度/光照</text>
<rect x="325" y="155" width="200" height="90" class="layer"/><text x="425" y="190" text-anchor="middle" class="head">LoRa 网关</text><text x="425" y="220" text-anchor="middle" class="small">补充设备与时间戳</text>
<rect x="580" y="155" width="210" height="90" class="layer3"/><text x="685" y="190" text-anchor="middle" class="head">MQTT Broker</text><text x="685" y="220" text-anchor="middle" class="small">发布/订阅主题</text>
<rect x="845" y="155" width="210" height="90" class="layer3"/><text x="950" y="190" text-anchor="middle" class="head">平台规则引擎</text><text x="950" y="220" text-anchor="middle" class="small">阈值、趋势、作物阶段</text>
<rect x="1110" y="155" width="220" height="90" class="layer4"/><text x="1220" y="190" text-anchor="middle" class="head">管理端</text><text x="1220" y="220" text-anchor="middle" class="small">查看/配置/确认告警</text>

<path d="M270 200 L325 200" class="arrow"/><path d="M525 200 L580 200" class="arrow"/><path d="M790 200 L845 200" class="arrow"/><path d="M1055 200 L1110 200" class="arrow"/>
<text x="700" y="132" text-anchor="middle" class="head">监测流</text>

<rect x="250" y="420" width="230" height="92" class="device"/><text x="365" y="455" text-anchor="middle" class="head">控制建议</text><text x="365" y="486" text-anchor="middle" class="small">是否开阀/最长时长</text>
<rect x="585" y="420" width="230" height="92" class="layer"/><text x="700" y="455" text-anchor="middle" class="head">边缘控制器</text><text x="700" y="486" text-anchor="middle" class="small">模式、保护时间、设备状态</text>
<rect x="920" y="420" width="230" height="92" class="layer2"/><text x="1035" y="455" text-anchor="middle" class="head">执行设备</text><text x="1035" y="486" text-anchor="middle" class="small">阀门、水泵、继电器</text>
<path d="M950 245 C930 330 455 340 365 420" class="arrow"/>
<path d="M480 466 L585 466" class="arrow"/><path d="M815 466 L920 466" class="arrow"/>
<text x="700" y="386" text-anchor="middle" class="head">控制流</text>

<rect x="250" y="640" width="230" height="80" class="device"/><text x="365" y="672" text-anchor="middle" class="head">流量/水压反馈</text><text x="365" y="700" text-anchor="middle" class="small">验证是否真正灌溉</text>
<rect x="585" y="640" width="230" height="80" class="device"/><text x="700" y="672" text-anchor="middle" class="head">日志与告警</text><text x="700" y="700" text-anchor="middle" class="small">记录动作、原因、异常</text>
<rect x="920" y="640" width="230" height="80" class="device"/><text x="1035" y="672" text-anchor="middle" class="head">策略修正</text><text x="1035" y="700" text-anchor="middle" class="small">人工复盘后调阈值</text>
<path d="M1035 512 C1035 590 365 585 365 640" class="arrow dash"/>
<path d="M480 680 L585 680" class="arrow"/><path d="M815 680 L920 680" class="arrow"/>
<path d="M1035 640 C1220 540 1220 300 950 245" class="arrow dash"/>
<text x="710" y="600" text-anchor="middle" class="small">执行结果回传形成闭环</text>
</svg></body></html>`;

async function render(html, output) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  const svg = page.locator('svg');
  await svg.screenshot({ path: output });
  await browser.close();
}

(async () => {
  const assets = [
    ['fig1-system-architecture', figure1],
    ['fig2-data-control-flow', figure2],
  ];
  for (const [name, html] of assets) {
    fs.writeFileSync(path.join(outDir, `${name}.html`), html, 'utf8');
    await render(html, path.join(outDir, `${name}.png`));
  }
})();
