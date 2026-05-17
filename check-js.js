const fs = require('fs');

try {
  const content = fs.readFileSync('public/admin/index.html', 'utf8');
  
  // 找到所有script标签的位置
  const scriptTags = [];
  let idx = -1;
  while ((idx = content.indexOf('<script', idx + 1)) !== -1) {
    const endIdx = content.indexOf('>', idx) + 1;
    const isClosing = content.substring(idx, idx + 9) === '</script';
    
    if (!isClosing) {
      const tagContent = content.substring(idx, endIdx);
      const isSrc = tagContent.includes('src=');
      scriptTags.push({
        start: idx,
        end: endIdx,
        isSrc: isSrc,
        tag: tagContent
      });
    }
  }
  
  console.log('Script tags found:', scriptTags.length);
  scriptTags.forEach((tag, i) => {
    console.log(`Tag ${i}: ${tag.tag} at position ${tag.start}`);
  });
  
  // 找到第二个脚本块（内联脚本）
  if (scriptTags.length >= 2) {
    const secondScriptStart = scriptTags[1].end;
    const closingTagStart = content.indexOf('</script>', secondScriptStart);
    const jsCode = content.substring(secondScriptStart, closingTagStart);
    
    console.log('\nJavaScript code length:', jsCode.length);
    
    // 尝试解析JavaScript
    try {
      new Function(jsCode);
      console.log('JavaScript syntax is valid!');
    } catch (e) {
      console.log('JavaScript syntax error:', e.message);
      
      // 尝试定位错误位置
      const lines = jsCode.split('\n');
      for (let i = 0; i < lines.length; i++) {
        try {
          new Function(lines[i]);
        } catch (lineError) {
          console.log(`Error near line ${i + 1}:`, lines[i].substring(0, 100));
        }
      }
    }
  }
  
} catch (e) {
  console.log('Error:', e.message);
}
