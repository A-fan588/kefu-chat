const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, 'public', 'admin', 'index.html');

const completeFixMap = {
    '�?离线': '○ 离线',
    '(管理�?': '(管理员)',
    '请填写用户名和昵�?);': '请填写用户名和昵称\');',
    '提示音播放失�?': '提示音播放失败',
    '�?/button>': '◀</button>',
    '�?/button>': '▶</button>',
    '�?/button>': '✕</button>',
    '发�?/button>': '发送</button>',
    'Socket 未连�?': 'Socket 未连接',
    '发送媒体消�?': '发送媒体消息',
    '无结�?/div>': '无结果</div>'
};

let content = fs.readFileSync(htmlFile, 'utf8');

for (const [oldStr, newStr] of Object.entries(completeFixMap)) {
    content = content.split(oldStr).join(newStr);
}

fs.writeFileSync(htmlFile, content, 'utf8');
console.log('完整编码修复完成！');
