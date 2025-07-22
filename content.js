window.addEventListener('message', async (event) => {
  if (event.data?.source === 'dy-plugin' && event.data.action === 'export_comments') {
    await exportComments();
  }
  if (event.data?.source === 'dy-plugin' && event.data.action === 'export_comments_md') {
    await exportCommentsMarkdown();
  }
});

function updateProgress(percent) {
  window.postMessage({ source: 'dy-plugin', action: 'update_progress', percent }, '*');
}

async function exportComments() {
  const scrollBox = document.querySelector('[data-e2e="comment-list"]');
  if (!scrollBox) {
    alert('未找到评论区，请先打开视频页面并展开评论');
    return;
  }

  let prevHeight = 0, retries = 0;
  while (retries < 5) {
    scrollBox.scrollTo(0, scrollBox.scrollHeight);
    await delay(1000);
    if (scrollBox.scrollHeight === prevHeight) retries++;
    else {
      prevHeight = scrollBox.scrollHeight;
      retries = 0;
    }
  }

  await expandAllReplies();

  const commentEls = document.querySelectorAll('[data-e2e="comment-item"]');
  const comments = [];
  const total = commentEls.length;

  for (let i = 0; i < total; i++) {
    const el = commentEls[i];
    const isReply = el.closest('.replyContainer') !== null;
    const user = el.querySelector('a.uz1VJwFY span span span span span')?.innerText.trim() || '未知用户';
    const textEls = el.querySelectorAll('.arnSiSbK');
    const text = textEls.length >= 2 ? textEls[1]?.innerText.trim() : textEls[0]?.innerText.trim();
    const timePlace = el.querySelector('.fJhvAqos span')?.innerText.trim() || '未知时间';

    comments.push({ user, text, time: timePlace, type: isReply ? '回复' : '主评论' });
    updateProgress(Math.floor((i + 1) / total * 100));
  }

  const wsData = [['用户名', '评论内容', '时间地点', '类型']];
  comments.forEach(c => wsData.push([c.user, c.text, c.time, c.type]));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, '评论');
  XLSX.writeFile(wb, '抖音评论.xlsx');

  updateProgress(100);
}

async function exportCommentsMarkdown() {
  const scrollBox = document.querySelector('[data-e2e="comment-list"]');
  if (!scrollBox) {
    alert('未找到评论区，请先打开视频页面并展开评论');
    return;
  }

  let prevHeight = 0, retries = 0;
  while (retries < 5) {
    scrollBox.scrollTo(0, scrollBox.scrollHeight);
    await delay(1000);
    if (scrollBox.scrollHeight === prevHeight) retries++;
    else {
      prevHeight = scrollBox.scrollHeight;
      retries = 0;
    }
  }

  await expandAllReplies();

  const commentEls = Array.from(document.querySelectorAll('[data-e2e="comment-item"]'));
  const total = commentEls.length;
  let markdown = `# 抖音视频评论\n\n共 ${total} 条评论\n\n`;

  // 递归生成评论内容的 Markdown，处理表情图片和文本混合
function parseContentToMarkdown(node) {
  let result = '';
  node.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      // 文本节点，保留换行并缩进
      result += child.textContent.replace(/\n/g, '\n  > ');
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      if (child.tagName === 'IMG') {
        // 处理图片，转换 &amp; 为 & 避免链接错误
        const alt = child.alt || '表情';
        const src = (child.src || '').replace(/&amp;/g, '&');
        if (src) {
          result += ` ![${alt}](${src}) `;
        } else {
          result += ` [${alt}] `;
        }
      } else {
        // 递归处理其他元素（如 span）
        result += parseContentToMarkdown(child);
      }
    }
  });
  return result;
}


  for (const el of commentEls) {
    const isReply = el.closest('.replyContainer') !== null;
    const user = el.querySelector('a.uz1VJwFY span span span span span')?.innerText.trim() || '未知用户';

    // 尝试获取父评论用户名（如果是回复）
    let parentUser = '';
    if (isReply) {
      // 查找最近的主评论用户名作为回复对象
      const mainCommentEl = el.closest('.replyContainer')?.previousElementSibling;
      if (mainCommentEl) {
        parentUser = mainCommentEl.querySelector('a.uz1VJwFY span span span span span')?.innerText.trim() || '';
      }
    }

    // 获取评论文本内容节点，优先取第二个 .arnSiSbK ，没有则第一个
    const contentNode = el.querySelectorAll('.arnSiSbK')[1] || el.querySelector('.arnSiSbK');
    const contentMd = contentNode ? parseContentToMarkdown(contentNode).trim() : '';

    const timePlace = el.querySelector('.fJhvAqos span')?.innerText.trim() || '未知时间';

    // 缩进 0 或 4 空格区分主评论和回复
    const indent = isReply ? '    ' : '';

    // 生成 Markdown
    if (isReply && parentUser) {
      markdown += `${indent}- **${user}** 回复 **${parentUser}** (${timePlace}):\n${indent}  > ${contentMd.replace(/\n/g, `\n${indent}  > `)}\n\n`;
    } else {
      markdown += `${indent}- **${user}** (${timePlace}):\n${indent}  > ${contentMd.replace(/\n/g, `\n${indent}  > `)}\n\n`;
    }

    updateProgress(Math.floor((commentEls.indexOf(el) + 1) / total * 100));
  }

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '抖音评论.md';
  a.click();
  URL.revokeObjectURL(url);

  updateProgress(100);
}

async function expandAllReplies() {
  let tries = 0;
  while (tries < 10) {
    const replySpans = Array.from(document.querySelectorAll('span'))
      .filter(span => /^展开\d+条回复$/.test(span.innerText.trim()));

    const moreSpans = Array.from(document.querySelectorAll('span'))
      .filter(span => span.innerText.trim() === '展开更多');

    if (replySpans.length === 0 && moreSpans.length === 0) break;

    for (const span of replySpans) {
      span.click();
      await delay(300);
    }

    for (const span of moreSpans) {
      const parent = span.closest('div.xYPAOE0i');
      if (parent) {
        parent.click();
        await delay(300);
      }
    }

    await delay(1000);
    tries++;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
