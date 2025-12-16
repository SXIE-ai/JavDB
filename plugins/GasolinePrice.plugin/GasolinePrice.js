// 汽油价格查询脚本 for Loon
// 版本: 1.0.6
// 作者: SXIE-ai
// 离线版本 - 带通知功能

const defaultConfig = {
    location: '湖南',
    type: '92',
    isShowAll: true,
    enableNotification: true  // 新增：是否启用通知
};

// 获取配置
function getConfig() {
    if (typeof $environment !== 'undefined' && $environment.params) {
        try {
            const params = new URLSearchParams($environment.params);
            return {
                location: params.get('location') || defaultConfig.location,
                type: params.get('type') || defaultConfig.type,
                isShowAll: params.get('isShowAll') === 'true' || defaultConfig.isShowAll,
                enableNotification: params.get('enableNotification') !== 'false'  // 默认true
            };
        } catch (e) {
            console.log('解析参数失败，使用默认配置');
        }
    }
    
    try {
        const savedConfig = $persistentStore.read('gasoline_config');
        if (savedConfig) {
            return { ...defaultConfig, ...JSON.parse(savedConfig) };
        }
    } catch (e) {
        console.log('读取持久化配置失败');
    }
    
    return defaultConfig;
}

// 油价数据
const oilPriceData = {
    'updateDate': '2025-12-16',
    'nextAdjustDate': '2025-12-30',
    'trend': '下调',
    'change': -0.04,  // 平均下调幅度
    
    'provinces': {
        '湖南': {
            name: '湖南省',
            92: 6.80,  95: 7.23,  98: 8.23,  0: 6.54,
            change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05,
            rank: 15,
            remark: '中部地区'
        },
        '北京': {
            name: '北京市',
            92: 7.05,  95: 7.50,  98: 8.50,  0: 6.79,
            change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05,
            rank: 28,
            remark: '一线城市'
        },
        '上海': {
            name: '上海市',
            92: 7.00,  95: 7.45,  98: 8.45,  0: 6.74,
            change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05,
            rank: 26,
            remark: '一线城市'
        },
        '广东': {
            name: '广东省',
            92: 7.10,  95: 7.69,  98: 8.69,  0: 6.77,
            change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05,
            rank: 30,
            remark: '华南地区'
        },
        '浙江': {
            name: '浙江省',
            92: 6.99,  95: 7.44,  98: 8.44,  0: 6.68,
            change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05,
            rank: 25,
            remark: '华东地区'
        },
        '江苏': {
            name: '江苏省',
            92: 6.98,  95: 7.43,  98: 8.43,  0: 6.67,
            change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05,
            rank: 24,
            remark: '华东地区'
        },
        '四川': {
            name: '四川省',
            92: 6.95,  95: 7.44,  98: 8.44,  0: 6.70,
            change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05,
            rank: 22,
            remark: '西南地区'
        },
        '湖北': {
            name: '湖北省',
            92: 6.85,  95: 7.33,  98: 8.33,  0: 6.60,
            change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05,
            rank: 18,
            remark: '中部地区'
        },
        '山东': {
            name: '山东省',
            92: 6.83,  95: 7.32,  98: 8.32,  0: 6.58,
            change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05,
            rank: 17,
            remark: '华东地区'
        },
        '河南': {
            name: '河南省',
            92: 6.82,  95: 7.30,  98: 8.30,  0: 6.57,
            change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05,
            rank: 16,
            remark: '中部地区'
        }
    }
};

// 获取省份数据
function getProvinceData(provinceKey) {
    const province = oilPriceData.provinces[provinceKey];
    if (province) {
        return {
            ...province,
            updateDate: oilPriceData.updateDate,
            nextAdjustDate: oilPriceData.nextAdjustDate,
            trend: oilPriceData.trend,
            avgChange: oilPriceData.change
        };
    }
    
    const hunanData = oilPriceData.provinces['湖南'];
    return {
        ...hunanData,
        name: `${provinceKey}（参考湖南）`,
        updateDate: oilPriceData.updateDate,
        nextAdjustDate: oilPriceData.nextAdjustDate,
        trend: oilPriceData.trend,
        avgChange: oilPriceData.change,
        isDefault: true
    };
}

// 发送通知
function sendNotification(provinceData, isShowAll, enableNotification) {
    if (!enableNotification || typeof $notification === 'undefined') {
        return;
    }
    
    const { name, updateDate, trend, avgChange } = provinceData;
    const shortName = name.replace('省', '').replace('市', '').replace('自治区', '').replace('（参考湖南）', '');
    
    // 生成通知标题
    const title = `⛽ ${shortName}油价更新`;
    
    // 生成通知内容
    let subtitle = '';
    let body = '';
    
    if (isShowAll) {
        subtitle = `92号: ¥${provinceData[92].toFixed(2)}  95号: ¥${provinceData[95].toFixed(2)}`;
        body = `98号: ¥${provinceData[98].toFixed(2)}  0号柴油: ¥${provinceData[0].toFixed(2)}\n`;
    } else {
        subtitle = `最新油价信息`;
        body = `${provinceData.name}今日油价已更新\n`;
    }
    
    body += `📅 ${updateDate}  📈 本轮${trend}${avgChange ? ` ${avgChange.toFixed(2)}元` : ''}`;
    
    // 发送通知
    console.log('发送通知:', title, subtitle, body);
    $notification.post(title, subtitle, body);
    
    // 记录最后通知时间
    const now = new Date();
    const lastNotifyTime = now.toISOString();
    $persistentStore.write(lastNotifyTime, 'last_gasoline_notify');
}

// 主函数
function main() {
    try {
        // 获取配置
        const config = getConfig();
        const { location, type, isShowAll, enableNotification } = config;
        
        console.log(`查询油价 - 地区: ${location}, 显示全部: ${isShowAll}, 通知: ${enableNotification}`);
        
        // 获取省份数据
        const provinceData = getProvinceData(location);
        const { name, updateDate, nextAdjustDate, trend, rank, remark } = provinceData;
        
        // 格式化显示内容
        let content = '';
        
        if (isShowAll) {
            content += `92号汽油: ¥${provinceData[92].toFixed(2)} ↓-0.04\n`;
            content += `95号汽油: ¥${provinceData[95].toFixed(2)} ↓-0.04\n`;
            content += `98号汽油: ¥${provinceData[98].toFixed(2)} ↓-0.04\n`;
            content += `0号柴油: ¥${provinceData[0].toFixed(2)} ↓-0.05\n`;
        } else {
            const price = provinceData[type];
            const label = type === '0' ? '0号柴油' : `${type}号汽油`;
            const change = type === '0' ? '-0.05' : '-0.04';
            content += `${label}: ¥${price.toFixed(2)} ↓${change}\n`;
        }
        
        content += `\n📍 ${name}`;
        
        if (remark) {
            content += `\n📌 ${remark}`;
        }
        
        if (rank) {
            content += `\n🏆 全国排名: ${rank}/31`;
        }
        
        content += `\n📅 更新: ${updateDate}`;
        content += `\n📈 趋势: 本轮${trend}`;
        content += `\n⏰ 下次调价: ${nextAdjustDate}`;
        
        // 判断是否发送通知
        const isCronTrigger = $environment && $environment['trigger'] === 'cron';
        const isManualRefresh = $environment && $environment['trigger'] === 'manual';
        
        if (isCronTrigger || (enableNotification && isManualRefresh)) {
            sendNotification(provinceData, isShowAll, enableNotification);
        }
        
        // 生成标题
        const shortName = name.replace('省', '').replace('市', '').replace('自治区', '').replace('（参考湖南）', '');
        const title = `今日油价 - ${shortName}`;
        
        // 输出到面板
        const result = {
            title: title,
            content: content,
            icon: "fuelpump"
        };
        
        $done(result);
        
    } catch (error) {
        console.error('油价查询错误:', error);
        
        const defaultData = oilPriceData.provinces['湖南'];
        const fallbackContent = 
            `92号汽油: ¥${defaultData[92].toFixed(2)} ↓-0.04\n` +
            `95号汽油: ¥${defaultData[95].toFixed(2)} ↓-0.04\n` +
            `98号汽油: ¥${defaultData[98].toFixed(2)} ↓-0.04\n` +
            `0号柴油: ¥${defaultData[0].toFixed(2)} ↓-0.05\n\n` +
            `📍 湖南省\n` +
            `📌 中部地区\n` +
            `🏆 全国排名: 15/31\n` +
            `📅 更新: ${oilPriceData.updateDate}\n` +
            `📈 趋势: ${oilPriceData.trend}\n` +
            `⏰ 下次调价: ${oilPriceData.nextAdjustDate}`;
        
        // 错误时也发送通知
        if (typeof $notification !== 'undefined') {
            $notification.post('油价查询失败', '请检查网络或配置', '使用本地数据继续服务');
        }
        
        $done({
            title: '今日油价 - 湖南',
            content: fallbackContent,
            icon: "fuelpump"
        });
    }
}

// 执行
try {
    main();
} catch (e) {
    console.error('脚本执行错误:', e);
    $done({
        title: '油价查询',
        content: '脚本执行出错\n\n错误信息：' + e.message,
        icon: "exclamationmark.triangle"
    });
}
