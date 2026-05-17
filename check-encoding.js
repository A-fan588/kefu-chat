const fs = require('fs');

try {
  const content = fs.readFileSync('public/admin/index.html', 'utf8');
  
  // 检查是否有无效字符
  const invalidChars = [];
  for (let i = 0; i < content.length; i++) {
    const charCode = content.charCodeAt(i);
    // 检查是否是有效的UTF-8字符（排除控制字符）
    if ((charCode >= 0 && charCode <= 8) || 
        (charCode >= 11 && charCode <= 31) || 
        (charCode >= 127 && charCode <= 159)) {
      invalidChars.push({ pos: i, charCode, char: content[i] });
    }
  }
  
  if (invalidChars.length > 0) {
    console.log('发现无效字符:', invalidChars.slice(0, 10));
  } else {
    console.log('未发现无效字符');
  }
  
  // 检查JavaScript部分是否有语法错误
  const scriptStart = content.indexOf('<script>');
  const scriptEnd = content.indexOf('</script>');
  
  if (scriptStart !== -1 && scriptEnd !== -1) {
    const jsCode = content.substring(scriptStart + 8, scriptEnd);
    try {
      new Function(jsCode);
      console.log('JavaScript语法检查通过');
    } catch (e) {
      console.log('JavaScript语法错误:', e.message);
    }
  }
  
} catch (e) {
  console.log('读取文件失败:', e.message);
}
