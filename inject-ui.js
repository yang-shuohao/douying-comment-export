// 创建悬浮面板（右上角）
const panel = document.createElement('div');
panel.id = 'dy-export-panel';
panel.innerHTML = `
  <div class="header">
    <span>抖音评论导出器</span>
    <button id="dy-toggle">⯆</button>
  </div>
  <div class="body">
    <button id="dy-export">导出 Excel</button>
    <button id="dy-export-md">导出 Markdown</button>
    <button id="github">Github</button>
    <div class="progress-bar"><div class="progress" id="dy-progress"></div></div>
  </div>
`;
document.body.appendChild(panel);

// 右上角定位
panel.style.top = '20px';
panel.style.right = '20px';
panel.style.left = 'auto';
panel.style.bottom = 'auto';

// 拖动功能
let isDragging = false, offsetX = 0, offsetY = 0;
const header = panel.querySelector('.header');

header.addEventListener('mousedown', (e) => {
  isDragging = true;
  offsetX = e.offsetX;
  offsetY = e.offsetY;
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    panel.style.left = 'auto';
    panel.style.top = `${e.pageY - offsetY}px`;
    panel.style.right = `${window.innerWidth - e.pageX - (panel.offsetWidth - offsetX)}px`;
  }
});

document.addEventListener('mouseup', () => isDragging = false);

// 折叠功能
const dyToggle = document.getElementById('dy-toggle');
dyToggle.addEventListener('click', () => {
  const body = panel.querySelector('.body');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    dyToggle.textContent = '⯆';
  } else {
    body.style.display = 'none';
    dyToggle.textContent = '⯈';
  }
});

// 导出按钮事件绑定
const exportBtn = document.getElementById('dy-export');
const exportMdBtn = document.getElementById('dy-export-md');
const githubBtn = document.getElementById('github');

exportBtn.addEventListener('click', () => {
  disableButtons(true);
  window.postMessage({ source: 'dy-plugin', action: 'export_comments' }, '*');
});

exportMdBtn.addEventListener('click', () => {
  disableButtons(true);
  window.postMessage({ source: 'dy-plugin', action: 'export_comments_md' }, '*');
});

githubBtn.addEventListener('click', () => {
  window.open('https://github.com/yang-shuohao/douying-comment-export', '_blank');
});

// 监听进度更新
window.addEventListener('message', (event) => {
  if (event.data?.source === 'dy-plugin' && event.data?.action === 'update_progress') {
    document.getElementById('dy-progress').style.width = `${event.data.percent}%`;
    if (event.data.percent >= 100) {
      disableButtons(false);
    }
  }
});

function disableButtons(disable) {
  exportBtn.disabled = disable;
  exportMdBtn.disabled = disable;
  if (disable) {
    exportBtn.textContent = '导出中...';
    exportMdBtn.textContent = '导出中...';
  } else {
    exportBtn.textContent = '导出 Excel';
    exportMdBtn.textContent = '导出 Markdown';
    document.getElementById('dy-progress').style.width = '0%';
  }
}
