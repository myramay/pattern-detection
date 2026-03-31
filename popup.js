'use strict';

const CATEGORIES = [
  { key: 'Fake Countdown Timer', emoji: '⏱', label: 'Fake Countdown Timer' },
  { key: 'False Scarcity',       emoji: '📦', label: 'False Scarcity'       },
  { key: 'Hidden Unsubscribe',   emoji: '🔍', label: 'Hidden Unsubscribe'   },
  { key: 'Pre-checked Box',      emoji: '☑',  label: 'Pre-checked Box'      },
  { key: 'Confirm-shaming',      emoji: '😤', label: 'Confirm-shaming'      },
];

document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return showError();
    chrome.tabs.sendMessage(tab.id, { action: 'getCounts' }, response => {
      if (chrome.runtime.lastError || !response) return showError();
      render(response.counts);
    });
  });
});

function render(counts) {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const content = document.getElementById('content');

  const summary = document.createElement('div');
  summary.className = total > 0 ? 'summary warn' : 'summary clean';
  summary.textContent = total === 0
    ? '✅ No dark patterns detected'
    : `⚠ ${total} dark pattern${total !== 1 ? 's' : ''} detected`;

  const ul = document.createElement('ul');
  ul.className = 'list';

  for (const { key, emoji, label } of CATEGORIES) {
    const n = counts[key] ?? 0;
    const li = document.createElement('li');
    if (n > 0) li.classList.add('found');
    li.innerHTML =
      `<span class="emoji">${emoji}</span>` +
      `<span class="label">${label}</span>` +
      `<span class="count ${n > 0 ? 'badge' : 'zero'}">${n}</span>`;
    ul.appendChild(li);
  }

  content.innerHTML = '';
  content.appendChild(summary);
  content.appendChild(ul);
}

function showError() {
  document.getElementById('content').innerHTML =
    '<p class="error">Unable to scan this page.<br>Try reloading the tab and reopening.</p>';
}
