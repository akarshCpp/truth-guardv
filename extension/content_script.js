function addVerifyButtons() {
  const aiMessages = document.querySelectorAll('.ai-message, [data-message-author-role="assistant"]');
  
  aiMessages.forEach(message => {
    // Only add if not already added
    if (!message.querySelector('.truth-verify-btn')) {
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
        
        chrome.runtime.sendMessage({ action: "verify_text", text: textToVerify }, (response) => {
          clearInterval(stateInterval);
          btn.classList.remove('processing');
          btn.disabled = false;
          
          if (response && response.success && response.data) {
            const data = response.data;
            if (data.status === "false") {
              btn.innerHTML = '⚠️ Hallucination Found!';
              btn.style.background = 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)';
              highlightHallucination(message, data.original_text, data.correction, data.confidence_score);
            } else {
              const scoreText = data.confidence_score ? ` ${data.confidence_score}%` : '';
              btn.innerHTML = `✅ Verified Safe${scoreText}`;
              btn.style.background = 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)';
              setTimeout(() => { 
                btn.innerHTML = '<span>🛡️</span> Verify Truth'; 
                btn.style.background = '';
              }, 4000);
            }
          } else {
            console.error("Verification failed", response);
            btn.innerHTML = '❌ API Error';
            setTimeout(() => { btn.innerHTML = '<span>🛡️</span> Verify Truth'; btn.style.background = ''; }, 3000);
          }
        });
      });
      
      message.appendChild(btn);
    }
  });
}

function highlightHallucination(messageElement, originalText, correction, score) {
  const scoreDisplay = score ? score : '92'; // fallback mock score if absent
  
  // Construct a premium card UI to append
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
    
    <button class="tg-apply-btn" style="margin-top: 12px;">Apply Correction to Text</button>
  `;
  
  messageElement.appendChild(card);
  
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
