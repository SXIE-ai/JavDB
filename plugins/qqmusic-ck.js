/*
QQ音乐Cookie获取脚本
自动获取签到所需的Cookie
*/

const $ = new API("qqmusic-cookie");

if ($request && $request.headers) {
    const cookie = $request.headers["Cookie"] || $request.headers["cookie"];
    
    if (cookie) {
        // 查找可用的账号位置
        for (let i = 1; i <= 4; i++) {
            const currentCookie = $.read(`qqmusic_cookie${i}`);
            if (!currentCookie || currentCookie.trim() === "") {
                $.write(`qqmusic_cookie${i}`, cookie);
                $.notice("QQ音乐Cookie获取", `成功`, `Cookie已保存到账号${i}，请开启开关`);
                break;
            }
        }
    }
}

function API(name) {
    this.name = name;
    
    this.read = function(key) {
        return $loon ? $loon.getConfig()[key] : $persistentStore.read(key);
    };
    
    this.write = function(key, value) {
        if ($loon) {
            $loon.setConfig(key, value);
        } else {
            $persistentStore.write(value, key);
        }
    };
    
    this.notice = function(title, subtitle, content) {
        $notification.post(title, subtitle, content);
    };
    
    return this;
}
