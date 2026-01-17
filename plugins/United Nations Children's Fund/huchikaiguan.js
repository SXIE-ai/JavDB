/********************
 * 基础工具
 ********************/
function read(key, def = false) {
  const v = $persistentStore.read(key);
  if (v === null) return def;
  return v === "true";
}

function write(key, value) {
  $persistentStore.write(String(value), key);
}

/********************
 * 互斥组配置
 ********************/
const SOURCE_GROUP = [
  "xhl",   // 小狐狸
  "jvid",  // JVID
  "zks"    // ZKS
];

/********************
 * 互斥逻辑
 ********************/
function enforceExclusive(group) {
  const enabled = group.filter(k => read(k));
  if (enabled.length <= 1) return;

  // 保留最后一个被打开的
  const keep = enabled[enabled.length - 1];
  group.forEach(k => {
    if (k !== keep && read(k)) {
      write(k, false);
    }
  });
}

/********************
 * 主入口
 ********************/
(function () {

  // ===== 总开关 =====
  if (!read("enable")) {
    SOURCE_GROUP.forEach(k => write(k, false));
    $done({});
    return;
  }

  // ===== 执行互斥 =====
  enforceExclusive(SOURCE_GROUP);

  // ===== 业务分发 =====
  const url = $request.url;
  const host = new URL(url).hostname;

  /******** 小狐狸 ********/
  if (read("xhl") && host.includes("xhlld")) {
    // 🔽 把你原来 xiaohuli.js 的逻辑放这
    // 示例：
    // let body = $response.body;
    // body = body.replace(...);
    // $done({ body });

    $done({});
    return;
  }

  /******** JVID ********/
  if (read("jvid") && host.includes("jvid")) {
    // 🔽 JVID 原逻辑
    $done({});
    return;
  }

  /******** ZKS ********/
  if (read("zks") && host.includes("zks")) {
    // 🔽 ZKS 原逻辑
    $done({});
    return;
  }

  // ===== 都没命中 =====
  $done({});

})();
