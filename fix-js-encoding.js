const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, 'public', 'admin', 'index.html');

const jsFixMap = {
    '已有账号？点击登�? : ': '已有账号？点击登录\' : ',
    '没有账号？点击注�?;': '没有账号？点击注册\';',
    '请填写完整信�?);': '请填写完整信息\');',
    '请填写昵�?);': '请填写昵称\');'
};

let content = fs.readFileSync(htmlFile, 'utf8');

for (const [oldStr, newStr] of Object.entries(jsFixMap)) {
    content = content.split(oldStr).join(newStr);
}

fs.writeFileSync(htmlFile, content, 'utf8');
console.log('JavaScript 语法错误修复完成！');
