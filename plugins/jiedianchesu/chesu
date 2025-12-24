/*
作者：@wuhu_zzz @xream @keywos @整点猫咪 技术指导：整点薯条 
整点花里胡哨
各种花里胡哨参数，通过argument传入，用=连接key及相应value，用&链接各种key，可以任意选择想填入的参数
title：标题
iconfast、iconmid、iconslow 分别对应测速快中慢时的图标
colorlow、colormid、colorhigh 分别对应延迟低中高时的图标颜色
mb参数：每次测试消耗的流量，默认1MB，经测试最大可4MB参数：&mb=4
配置实例：title=花里胡哨才是生产力&iconfast=bird&iconmid=hare&iconslow=tortoise&colorlow=#06D6A0&colormid=#FFD166&colorhigh=#EF476F

⚠️不想变化多端？？
可直接使用最基本的panel参数，title、icon、icon-color
配置实例：title=不想花里胡哨了&icon=hare&icon-color=#CDCDCD
*/

const $ = new Env('network-speed')
let arg = {}
if (typeof $argument !== 'undefined') {
    arg = Object.fromEntries(
        $argument
            .split('&')
            .map(item => item.split('='))
            .filter(item => item.length === 2)
    )
}

(async () => {
    const mb = arg.mb || 1
    const bytes = mb * 1024 * 1024
    
    // Loon 特有的节点信息获取
    const nodeInfo = $environment?.params?.nodeInfo
    const nodeName = nodeInfo?.name || $environment?.params?.node || "当前节点"
    
    let up = {'url': 'https://speed.cloudflare.com/__up', timeout: 3000}
    let down = {'url': `https://speed.cloudflare.com/__down?bytes=${bytes}`, timeout: 3000}
    let cp = {'url': `https://speed.cloudflare.com/__up?bytes=${bytes}`, timeout: 3000}
    
    // Loon 配置
    if ($.isLoon()) {
        up = ReRequest(up, $environment?.params?.node)
        down = ReRequest(down, $environment?.params?.node)
        cp = ReRequest(cp, $environment?.params?.node)
    }
    
    // 下行速率测试
    try {
        const Down_start = Date.now()
        const Down_response = await $.http.get(down)
        const Down_end = Date.now()
        const duration = (Down_end - Down_start) / 1000
        const speed = mb / duration
        
        // 延时测试
        const Ping_start = Date.now()
        const Ping_response = await $.http.get(cp)
        const pingt = Date.now() - Ping_start
        
        const speedMbps = Math.abs(speed * 8)
        const roundedSpeedMbps = round(speedMbps, 1)
        const roundedSpeedMB = round(Math.abs(speed), 2)
        const roundedDuration = round(duration, 2)
        
        // 确定图标和颜色
        const speedLevel = Diydecide(0, 50, 100, roundedSpeedMbps) + 1 // 1-3
        const pingLevel = Diydecide(0, 100, 200, pingt) + 4 // 4-6
        
        const shifts = {
            '1': arg.iconslow || 'tortoise',
            '2': arg.iconmid || 'hare',
            '3': arg.iconfast || 'bird',
            '4': arg.colorlow || '#06D6A0',  // 绿色
            '5': arg.colormid || '#FFD166',  // 黄色
            '6': arg.colorhigh || '#EF476F'  // 红色
        }
        
        const icon = arg.icon || shifts[speedLevel.toString()]
        const color = arg['icon-color'] || shifts[pingLevel.toString()]
        
        // Loon 面板构造
        let panel = {
            title: arg.title || "网速测试",
            content: `┏━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                    `┃     网络测速报告      ┃\n` +
                    `┣━━━━━━━━━━━━━━━━━━━━━━┫\n` +
                    `┃ 下行速率: ${roundedSpeedMbps} Mbps\n` +
                    `┃          [${roundedSpeedMB} MB/s]\n` +
                    `┃ 网络延迟: ${pingt} ms\n` +
                    `┃ 测试用时: ${roundedDuration} s\n` +
                    `┃ 测试时间: ${new Date().toTimeString().split(' ')[0]}\n` +
                    `┃ 消耗流量: ${mb} MB\n` +
                    `┣━━━━━━━━━━━━━━━━━━━━━━┫\n` +
                    `┃ 节点: ${nodeName}\n` +
                    `┗━━━━━━━━━━━━━━━━━━━━━━┛`,
            icon: icon,
            'icon-color': color
        }
        
        // Loon 特有的日志输出
        $.log(`✅ 测速完成 - 速率: ${roundedSpeedMbps}Mbps, 延迟: ${pingt}ms`)
        
        // 返回给 Loon
        $done(panel)
        
    } catch (error) {
        $.logErr(error)
        $done({
            title: "测速失败",
            content: `错误: ${error.message || '未知错误'}`,
            icon: 'xmark.circle',
            'icon-color': '#FF3B30'
        })
    }
})()

// 四舍五入函数
function round(number, precision = 0) {
    const factor = Math.pow(10, precision)
    return Math.round(number * factor) / factor
}

// 确定数值所在区间
function Diydecide(x, y, z, item) {
    let array = [x, y, z]
    array.push(item)
    return array.sort((a, b) => a - b).findIndex(i => i === item)
}

/**
 * 构造重定向请求 (Loon 专用)
 * @param {Object} request - 原始请求
 * @param {String} proxyName - 代理名称
 * @return {Object} 修改后的请求
 */
function ReRequest(request = {}, proxyName = "") {
    if (proxyName && $.isLoon()) {
        request.node = proxyName
    }
    return request
}

// Loon 环境类
function Env(name) {
    this.name = name
    this.startTime = new Date().getTime()
    
    // 判断运行环境
    this.isLoon = function() {
        return typeof $loon !== 'undefined'
    }
    
    this.isQuanX = function() {
        return typeof $task !== 'undefined'
    }
    
    this.isSurge = function() {
        return typeof $environment !== 'undefined' && $environment['surge-version']
    }
    
    this.isStash = function() {
        return typeof $environment !== 'undefined' && $environment['stash-version']
    }
    
    this.isShadowrocket = function() {
        return typeof $rocket !== 'undefined'
    }
    
    // 获取参数值
    this.lodash_get = function(source, path, defaultValue = undefined) {
        const paths = path.replace(/\[(\d+)\]/g, '.$1').split('.')
        let result = source
        for (const p of paths) {
            result = Object(result)[p]
            if (result === undefined) {
                return defaultValue
            }
        }
        return result
    }
    
    // HTTP 请求
    this.http = {
        get: (options) => {
            return new Promise((resolve, reject) => {
                if (this.isLoon()) {
                    $httpClient.get(options, (error, response, body) => {
                        if (error) {
                            reject(error)
                        } else {
                            resolve({ data: body, status: response.status })
                        }
                    })
                } else if (this.isQuanX()) {
                    $task.fetch(options).then(
                        response => resolve(response),
                        error => reject(error)
                    )
                }
            })
        }
    }
    
    // 日志相关
    this.log = function(...args) {
        console.log(`[${this.name}]`, ...args)
    }
    
    this.logErr = function(error, ...context) {
        console.error(`[${this.name} ERROR]`, error, ...context)
    }
    
    this.done = function(value) {
        if (this.isLoon() || this.isQuanX() || this.isSurge()) {
            $done(value)
        }
    }
    
    return this
}
