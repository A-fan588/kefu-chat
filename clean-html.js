const fs = require('fs');

try {
  const content = fs.readFileSync('public/admin/index.html', 'utf8');
  
  // 找到 socket.io 脚本标签的位置
  const socketScriptIndex = content.indexOf('<script src="/socket.io/socket.io.js"></script>');
  
  if (socketScriptIndex === -1) {
    console.log('未找到 socket.io 脚本标签');
    return;
  }
  
  // 找到 socket.io 脚本标签结束后的第一个换行
  const socketScriptEnd = socketScriptIndex + '<script src="/socket.io/socket.io.js"></script>'.length;
  
  // 找到最后的 </script> 标签
  const lastScriptEnd = content.lastIndexOf('</script>');
  
  // 找到最后的 </script> 标签之后的 </body> 标签
  const bodyEndStart = content.indexOf('</body>', lastScriptEnd);
  
  // 构建新内容：保留 socket.io 脚本，添加 admin.js 脚本，然后直接跳到 </body>
  const newContent = content.substring(0, socketScriptEnd) + '\n    <script src="admin.js"></script>\n' + content.substring(bodyEndStart);
  
  fs.writeFileSync('public/admin/index.html', newContent);
  console.log('HTML 文件已清理');
  
} catch (e) {
  console.log('清理失败:', e.message);
}
