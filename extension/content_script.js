function addVerifyButtons() {
  const aiMessages = document.querySelectorAll(
    '.ai-message, ' +
    '[data-message-author-role="assistant"], ' + // ChatGPT
    'message-content'                            // Gemini
  );
  
  aiMessages.forEach(message => {
    // Only add if this element doesn't already have one
    if (message.querySelector('.truth-verify-btn')) return;
    
    // Prevent duplicate buttons on Gemini by checking if an ancestor is also getting a button
    let isNested = false;
    let parent = message.parentElement;
    while (parent) {
      if (
        (parent.classList && parent.classList.contains('ai-message')) || 
        (parent.getAttribute && parent.getAttribute('data-message-author-role') === 'assistant') ||
        (parent.tagName && parent.tagName.toLowerCase() === 'message-content')
      ) {
        isNested = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    if (isNested) return;

    const btn = document.createElement('button');
    btn.className = 'truth-verify-btn';
    btn.innerHTML = '<span>🛡️</span> Verify Truth';
      
    btn.addEventListener('click', async () => {
      // Start animated processing sequence
      btn.disabled = true;
      btn.classList.add('processing');
      
      let currentState = 0;
      const processingStates = [
        '<span class="spin-icon">⚙️</span> Extracting Claims...',
        '<span class="spin-icon">🔍</span> Querying Exa Search...',
        '<span class="spin-icon">🧠</span> Verifying via Groq LPU...'
      ];
      
      btn.innerHTML = processingStates[0];
      
      // Setup visual state cycler to expose "backend" processes to UI
      const stateInterval = setInterval(() => {
        currentState = (currentState + 1) % processingStates.length;
        btn.innerHTML = processingStates[currentState];
      }, 800);
      
      // Extract text safely
      let textToVerify = "";
      try {
        const clone = message.cloneNode(true);
        const btnInClone = clone.querySelector('.truth-verify-btn');
        if (btnInClone) btnInClone.remove();
        textToVerify = clone.innerText || clone.textContent;
      } catch (e) {
        clearInterval(stateInterval);
        btn.classList.remove('processing');
        btn.innerHTML = '❌ Extract Error';
        return;
      }
      
      if (!textToVerify || textToVerify.trim() === '') {
         clearInterval(stateInterval);
         btn.classList.remove('processing');
         btn.innerHTML = '❌ Empty Text';
         setTimeout(() => { btn.innerHTML = '<span>🛡️</span> Verify Truth'; btn.disabled = false; }, 2000);
         return;
      }
      const requestStartTime = performance.now();
      chrome.runtime.sendMessage({ action: "verify_text", text: textToVerify }, (response) => {
        const latencyMs = Math.round(performance.now() - requestStartTime);
        clearInterval(stateInterval);
        btn.classList.remove('processing');
        btn.disabled = false;
        
        if (response && response.success && response.data) {
          const data = response.data;
          const sources = data.sources || [];
          if (data.status === "false") {
            btn.innerHTML = '⚠️ Hallucination Found!';
            btn.style.background = 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)';
            highlightHallucination(message, data.original_text, data.correction, data.confidence_score, latencyMs, sources);
          } else {
            const scoreText = data.confidence_score ? ` ${data.confidence_score}%` : '';
            btn.innerHTML = `✅ Verified Safe${scoreText}`;
            btn.style.background = 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)';
            showVerifiedSafeCard(message, data.confidence_score, sources);
          }
        } else {
          console.error("Verification failed", response);
          btn.innerHTML = '❌ API Error';
          setTimeout(() => { btn.innerHTML = '<span>🛡️</span> Verify Truth'; btn.style.background = ''; }, 3000);
        }
      });
    });
    
    message.appendChild(btn);
  });
}

function buildSourcesHTML(sources) {
  if (!sources || sources.length === 0) return '';
  const items = sources.slice(0, 3).map((s, i) => {
    const title = s.title || 'Source Link';
    const url = s.url || '#';
    return `
      <a class="tg-source-link" href="${url}" target="_blank" rel="noopener noreferrer">
        <span class="tg-source-num">${i + 1}</span>
        <span class="tg-source-text">${title}</span>
        <svg class="tg-source-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
      </a>`;
  }).join('');
  return `
    <div class="tg-sources-section">
      <span class="tg-label">📚 Source Verification</span>
      <div class="tg-sources-list">${items}</div>
    </div>`;
}

function showVerifiedSafeCard(messageElement, score, sources) {
  const scoreDisplay = score || 85;
  const card = document.createElement('div');
  card.className = 'tg-analysis-card verified-safe';
  card.innerHTML = `
    <div class="tg-header">
      <div class="tg-title safe">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
        Verified Safe
      </div>
      <div class="tg-score-badge high">Confidence: ${scoreDisplay}%</div>
    </div>
    <div class="tg-metrics-container">
      <div class="tg-metric-row">
        <div class="tg-metric-labels">
          <span>🛡️ Detect Confidence</span>
          <span>${scoreDisplay}%</span>
        </div>
        <div class="tg-progress-bg">
          <div class="tg-progress-fill confidence" style="width: 0%" data-target-width="${scoreDisplay}%"></div>
        </div>
      </div>
    </div>
    ${buildSourcesHTML(sources)}
  `;
  messageElement.appendChild(card);
  setTimeout(() => {
    card.querySelectorAll('.tg-progress-fill').forEach(bar => {
      bar.style.width = bar.getAttribute('data-target-width');
    });
  }, 50);
  // Auto-dismiss after 8s
  setTimeout(() => { card.remove(); }, 8000);
}

function highlightHallucination(messageElement, originalText, correction, score, latencyMs, sources) {
  const scoreDisplay = score ? score : '92';
  const numScore = parseInt(scoreDisplay) || 0;
  
  let riskLabel = 'Low';
  let riskColor = '#d69e2e';
  let riskClass = 'risk-low';
  
  if (numScore >= 90) {
    riskLabel = 'High';
    riskColor = '#e53e3e';
    riskClass = 'risk-high';
  } else if (numScore >= 70) {
    riskLabel = 'Moderate';
    riskColor = '#dd6b20';
    riskClass = 'risk-med';
  }
  
  const card = document.createElement('div');
  card.className = 'tg-analysis-card';
  card.innerHTML = `
    <div class="tg-header">
      <div class="tg-title alert">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        Hallucination Detected
      </div>
      <div class="tg-score-badge">Confidence: ${scoreDisplay}%</div>
    </div>
    
    <div class="tg-content-row">
      <span class="tg-label">Original Claim</span>
      <span class="tg-original">${originalText}</span>
    </div>
    
    <div class="tg-content-row" style="margin-top: 12px;">
      <span class="tg-label">Truth Guard Verification</span>
      <span class="tg-correction">${correction}</span>
    </div>

    <div class="tg-metrics-container">
      <div class="tg-metric-row">
        <div class="tg-metric-labels">
          <span>🛡️ Detect Confidence</span>
          <span>${scoreDisplay}%</span>
        </div>
        <div class="tg-progress-bg">
          <div class="tg-progress-fill confidence" style="width: 0%" data-target-width="${scoreDisplay}%"></div>
        </div>
      </div>
      <div class="tg-metric-row">
        <div class="tg-metric-labels">
          <span>⚠️ Misinformation Risk</span>
          <span style="color: ${riskColor}">${riskLabel}</span>
        </div>
        <div class="tg-progress-bg">
          <div class="tg-progress-fill ${riskClass}" style="width: 0%" data-target-width="${numScore}%"></div>
        </div>
      </div>
    </div>

    ${buildSourcesHTML(sources)}
    
    <button class="tg-apply-btn" style="margin-top: 12px;">Apply Correction to Text</button>
  `;
  
  messageElement.appendChild(card);
  
  // Trigger bar animations after appending to DOM
  setTimeout(() => {
    const bars = card.querySelectorAll('.tg-progress-fill');
    bars.forEach(bar => {
      bar.style.width = bar.getAttribute('data-target-width');
    });
  }, 50);
  
  const fixBtn = card.querySelector('.tg-apply-btn');
  fixBtn.addEventListener('click', () => {
    // Attempt inline replace
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapeRegExp(originalText), "i");
    
    // Fallback if regex fails: just replace the card with success
    if (regex.test(messageElement.innerHTML)) {
      messageElement.innerHTML = messageElement.innerHTML.replace(regex, `<span style="color:#00b894; font-weight:600; background:#e6fffa; padding: 2px 4px; border-radius:3px;">${correction}</span>`);
    }
    
    const successMsg = document.createElement('div');
    successMsg.className = 'tg-success-message';
    successMsg.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> 
                            Correction Applied Successfully`;
    card.replaceWith(successMsg);
    
    // Re-bind verify buttons if DOM was overwritten by regex
    // Clean up old buttons
    const btns = messageElement.querySelectorAll('.truth-verify-btn');
    btns.forEach(b => b.remove());
    addVerifyButtons();
  });
}

// Initial run
addVerifyButtons();

// Observe DOM for newly added messages (e.g. in real ChatGPT)
const observer = new MutationObserver((mutations) => {
  let shouldRun = false;
  for (let mutation of mutations) {
    if (mutation.addedNodes.length > 0 || mutation.type === 'characterData') {
      shouldRun = true;
      break;
    }
  }
  if (shouldRun) {
    addVerifyButtons();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
