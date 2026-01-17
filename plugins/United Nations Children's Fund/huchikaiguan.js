// ================== 工具 ==================
function read(key, def = false) {
  const v = $persistentStore.read(key);
  if (v === null) return def;
  return v === "true";
}

function write(key, value) {
  $persistentStore.write(String(value), key);
}

// ================== 互斥组 ==================
const SOURCE_GROUP = [
  "xhl",
  "jvid",
  "zks"
];

// ================== 互斥逻辑 ==================
function enforceExclusive(group) {
  const enabled = group.filter(k => read(k));

  if (enabled.length <= 1) return;

  // 保留最后一个为 true 的
  const keep = enabled[enabled.length - 1];

  group.forEach(k => {
    if (k !== keep && read(k)) {
      write(k, false);
    }
  });
}

// ================== 主逻辑 ==================
(function () {
  if (!read("enable")) {
    SOURCE_GROUP.forEach(k => write(k, false));
    $done({});
    return;
  }

  enforceExclusive(SOURCE_GROUP);

  $done({});
})();
