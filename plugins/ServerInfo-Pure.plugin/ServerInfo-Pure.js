const IPPURE_URL = "https://my.ippure.com/v1/info";
// 使用多个备选 IP 查询服务
const IP_QUERY_APIS = [
  "https://api.ipify.org?format=json",           // 简单直接的 API
  "https://api64.ipify.org?format=json",         // IPv6 兼容
  "http://ip-api.com/json?lang=zh-CN",           // 原服务
  "https://ipapi.co/json/",                      // 备用服务
  "https://api.myip.com"                         // 备用服务
];

// 从环境参数获取节点名
const nodeName = $environment.params.node;

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    $httpClient.get({ url, node: nodeName, headers }, (err, resp, data) => {
      if (err) return reject(err);
      if (!data) return reject(new Error("响应为空"));
      resolve({ resp, data });
    });
  });
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch (_) {
    return null;
  }
}

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function severityMeta(sev) {
  if (sev >= 4) return { icon: "xmark.octagon.fill", color: "#8E0000" };
  if (sev >= 3) return { icon: "exclamationmark.triangle.fill", color: "#FF3B30" };
  if (sev >= 2) return { icon: "exclamationmark.circle.fill", color: "#FF9500" };
  if (sev >= 1) return { icon: "exclamationmark.circle", color: "#FFCC00" };
  return { icon: "checkmark.seal.fill", color: "#34C759" };
}

function gradeIppure(score) {
  const s = toInt(score);
  if (s === null) return { sev: 2, text: "IPPure：获取失败" };
  if (s >= 80) return { sev: 4, text: `IPPure：🛑 极高风险 (${s})` };
  if (s >= 70) return { sev: 3, text: `IPPure：⚠️ 高风险 (${s})` };
  if (s >= 40) return { sev: 1, text: `IPPure：🔶 中等风险 (${s})` };
  return { sev: 0, text: `IPPure：✅ 低风险 (${s})` };
}

// ipapi.is - 免费直接可用
function gradeIpapi(j) {
  if (!j || !j.company) return { sev: 2, text: "ipapi：获取失败" };
  
  const abuserScoreText = j.company.abuser_score;
  if (!abuserScoreText || typeof abuserScoreText !== "string") {
    return { sev: 2, text: "ipapi：无评分" };
  }
  const m = abuserScoreText.match(/([0-9.]+)\s*\(([^)]+)\)/);
  if (!m) return { sev: 2, text: `ipapi：${abuserScoreText}` };

  const ratio = Number(m[1]);
  const level = String(m[2] || "").trim();
  const pct = Number.isFinite(ratio) ? `${Math.round(ratio * 10000) / 100}%` : "?";

  const sevByLevel = { "Very Low": 0, Low: 0, Elevated: 2, High: 3, "Very High": 4 };
  const sev = sevByLevel[level] ?? 2;
  const label = sev >= 4 ? "🛑 极高风险" : sev >= 3 ? "⚠️ 高风险" : sev >= 2 ? "🔶 较高风险" : "✅ 低风险";

  return { sev, text: `ipapi：${label} (${pct}, ${level})` };
}

// ipapi.is 判断 IP 类型
function ipapiHostingText(j) {
  if (!j) return "IP类型（ipapi）：未知（获取失败）";
  
  const isDc = j.is_datacenter === true;
  const isMobile = j.is_mobile === true;
  const asnType = String(j.asn?.type || "").toLowerCase();
  const companyType = String(j.company?.type || "").toLowerCase();
  
  if (isMobile) return `IP类型（ipapi）：📱 蜂窝移动网络（可能是）`;
  if (asnType === "hosting" || companyType === "hosting") return `IP类型（ipapi）：🏢 托管服务器（可能是）`;
  if (asnType === "isp" || companyType === "isp") return `IP类型（ipapi）：🏠 家庭宽带（可能是）`;
  if (asnType === "business" || companyType === "business") return `IP类型（ipapi）：🏬 商业宽带（可能是）`;
  if (asnType === "education" || companyType === "education") return `IP类型（ipapi）：🎓 教育网络（可能是）`;
  if (asnType === "government" || companyType === "government") return `IP类型（ipapi）：🏛️ 政府网络（可能是）`;
  
  const typeInfo = asnType || companyType || "未知";
  return `IP类型（ipapi）：❓ ${typeInfo}`;
}

// DB-IP - 抓网页解析
function gradeDbip(html) {
  if (!html) return { sev: 2, text: "DB-IP：获取失败" };
  const riskTextMatch = html.match(/Estimated threat level for this IP address is\s*<span[^>]*>\s*([^<\s]+)\s*</i);
  const riskText = (riskTextMatch ? riskTextMatch[1] : "").toLowerCase();
  if (!riskText) return { sev: 2, text: "DB-IP：获取失败" };

  if (riskText === "high") return { sev: 3, text: "DB-IP：⚠️ 高风险" };
  if (riskText === "medium") return { sev: 1, text: "DB-IP：🔶 中风险" };
  if (riskText === "low") return { sev: 0, text: "DB-IP：✅ 低风险" };
  return { sev: 2, text: `DB-IP：${riskText}` };
}

// Scamalytics - 抓网页解析
function gradeScamalytics(html) {
  if (!html) return { sev: 2, text: "Scamalytics：获取失败" };
  const scoreMatch = html.match(/Fraud\s*Score[:\s]*(\d+)/i) 
    || html.match(/class="score"[^>]*>(\d+)/i)
    || html.match(/"score"\s*:\s*(\d+)/i);
  if (!scoreMatch) return { sev: 2, text: "Scamalytics：获取失败" };
  
  const s = toInt(scoreMatch[1]);
  if (s === null) return { sev: 2, text: "Scamalytics：获取失败" };
  if (s >= 90) return { sev: 4, text: `Scamalytics：🛑 极高风险 (${s})` };
  if (s >= 60) return { sev: 3, text: `Scamalytics：⚠️ 高风险 (${s})` };
  if (s >= 20) return { sev: 1, text: `Scamalytics：🔶 中风险 (${s})` };
  return { sev: 0, text: `Scamalytics：✅ 低风险 (${s})` };
}

// IPWhois - 免费 API
function gradeIpwhois(j) {
  if (!j || !j.security) return { sev: 2, text: "IPWhois：获取失败" };
  
  const sec = j.security;
  const items = [];
  if (sec.proxy === true) items.push("代理");
  if (sec.tor === true) items.push("Tor网络");
  if (sec.vpn === true) items.push("VPN");
  if (sec.hosting === true) items.push("托管服务");
  
  if (items.length === 0) {
    return { sev: 0, text: "IPWhois：✅ 低风险（无标记）" };
  }
  const sev = items.includes("Tor网络") ? 3 : items.length >= 2 ? 2 : 1;
  const label = sev >= 3 ? "⚠️ 高风险" : sev >= 2 ? "🔶 较高风险" : "🔶 有标记";
  return { sev, text: `IPWhois：${label} (${items.join("/")})` };
}

function flagEmoji(code) {
  if (!code) return "";
  let c = String(code).toUpperCase();
  if (c === "TW") c = "CN";
  if (c.length !== 2) return "";
  return String.fromCodePoint(...c.split("").map((x) => 127397 + x.charCodeAt(0)));
}

// 各家 API 请求
async function fetchIpapi(ip) {
  const { data } = await httpGet(`https://api.ipapi.is/?q=${encodeURIComponent(ip)}`);
  return safeJsonParse(data);
}

async function fetchDbipHtml(ip) {
  const { data } = await httpGet(`https://db-ip.com/${encodeURIComponent(ip)}`);
  return String(data);
}

async function fetchScamalyticsHtml(ip) {
  const { data } = await httpGet(`https://scamalytics.com/ip/${encodeURIComponent(ip)}`);
  return String(data);
}

async function fetchIpwhois(ip) {
  const { data } = await httpGet(`https://ipwhois.io/widget?ip=${encodeURIComponent(ip)}&lang=en`, {
    "Referer": "https://ipwhois.io/",
    "Accept": "*/*",
  });
  return safeJsonParse(data);
}

// 改进的 IP 获取函数 - 尝试多个 API
async function getCurrentIP() {
  const apiPromises = IP_QUERY_APIS.map(url => 
    httpGet(url).then(({ data }) => {
      const json = safeJsonParse(data);
      // 不同 API 返回格式不同
      if (json) {
        return json.ip || json.ip_addr || json.query;
      }
      return null;
    }).catch(() => null)
  );
  
  // 尝试所有 API，返回第一个成功的
  for (let i = 0; i < apiPromises.length; i++) {
    try {
      const ip = await apiPromises[i];
      if (ip && typeof ip === 'string' && ip.includes('.')) {
        return ip;
      }
    } catch (_) {
      continue;
    }
  }
  
  // 如果所有 API 都失败，尝试纯文本 API
  try {
    const { data } = await httpGet("https://api.ipify.org");
    if (data && typeof data === 'string' && data.includes('.')) {
      return data.trim();
    }
  } catch (_) {
    // 继续尝试下一个
  }
  
  try {
    const { data } = await httpGet("http://ifconfig.me/ip");
    if (data && typeof data === 'string' && data.includes('.')) {
      return data.trim();
    }
  } catch (_) {
    // 最后尝试
  }
  
  return null;
}

// ========== 主逻辑 ==========
(async () => {
  let ip = await getCurrentIP();

  if (!ip) {
    $done({ 
      title: "IP 纯净度检测", 
      content: "❌ 获取 IPv4 地址失败\n\n可能原因：\n1. 网络连接问题\n2. 所有查询服务都不可用\n3. 当前节点可能无法访问外部网络",
      icon: "network.slash" 
    });
    return;
  }

  let ippureFraudScore = null;
  try {
    const { data } = await httpGet(IPPURE_URL);
    const base = safeJsonParse(data);
    if (base) ippureFraudScore = base.fraudScore;
  } catch (_) {}

  const tasks = {
    ipapi: fetchIpapi(ip),
    dbipHtml: fetchDbipHtml(ip),
    scamHtml: fetchScamalyticsHtml(ip),
    ipwhois: fetchIpwhois(ip),
  };

  const results = await Promise.allSettled(
    Object.keys(tasks).map((k) => tasks[k].then((v) => [k, v]))
  );

  const ok = {};
  for (const r of results) {
    if (r.status === "fulfilled") {
      const [k, v] = r.value;
      ok[k] = v;
    }
  }

  const ipapiData = ok.ipapi || {};
  const asnText = ipapiData.asn?.asn ? `AS${ipapiData.asn.asn} ${ipapiData.asn.org || ""}`.trim() : "-";
  const countryCode = ipapiData.location?.country_code || "";
  const country = ipapiData.location?.country || "";
  const city = ipapiData.location?.city || "";
  const flag = flagEmoji(countryCode);

  const hostingLine = ipapiHostingText(ok.ipapi);

  const grades = [];
  grades.push(gradeIppure(ippureFraudScore));
  grades.push(gradeIpapi(ok.ipapi));
  grades.push(gradeScamalytics(ok.scamHtml));
  grades.push(gradeDbip(ok.dbipHtml));
  grades.push(gradeIpwhois(ok.ipwhois));

  const maxSev = grades.reduce((m, g) => Math.max(m, g.sev ?? 2), 0);
  const meta = severityMeta(maxSev);

  const factorParts = [];
  if (ok.ipapi) {
    const items = [];
    if (ok.ipapi.is_proxy === true) items.push("代理");
    if (ok.ipapi.is_tor === true) items.push("Tor网络");
    if (ok.ipapi.is_vpn === true) items.push("VPN");
    if (ok.ipapi.is_datacenter === true) items.push("数据中心");
    if (ok.ipapi.is_abuser === true) items.push("滥用者");
    if (ok.ipapi.is_crawler === true) items.push("爬虫");
    if (items.length) factorParts.push(`ipapi 标记：${items.join("/")}`);
  }
  if (ok.ipwhois && ok.ipwhois.security) {
    const sec = ok.ipwhois.security;
    const items = [];
    if (sec.proxy === true) items.push("代理");
    if (sec.tor === true) items.push("Tor网络");
    if (sec.vpn === true) items.push("VPN");
    if (sec.hosting === true) items.push("托管服务");
    if (items.length) factorParts.push(`IPWhois 标记：${items.join("/")}`);
  }
  const factorText = factorParts.length ? `\n\n——风险标记详情——\n${factorParts.join("\n")}` : "";

  const riskLines = grades.map((g) => g.text).join("\n");

  $done({
    title: "节点 IP 风险检测报告",
    content:
`✅ IP地址获取成功
🌐 IP地址：${ip}
📡 ASN信息：${asnText}
📍 地理位置：${flag} ${country} ${city}
🏷️ ${hostingLine}
🖥️ 当前节点：${nodeName || "未指定"}

——多源风险评分——
${riskLines}${factorText}`,
    icon: meta.icon,
    "title-color": meta.color,
  });
})().catch((e) => {
  $done({
    title: "IP 纯净度检测",
    content: `请求失败：${String(e && e.message ? e.message : e)}`,
    icon: "network.slash",
  });
});
