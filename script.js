/**
 * TaxGuide — script.js
 * Conversational tax assistant for the Indian tax system.
 * All calculations are client-side. No data is sent anywhere.
 *
 * Author: Sabarna Barik / Hack Orbit
 * Last updated: March 2026
 */

/* ==========================================================================
   STATE
   ========================================================================== */
const state = {
  step: 'idle',        // idle | income | regime | deductions | result
  income: 0,
  regime: null,        // 'old' | 'new' | 'unsure'
  deductions: [],      // array of selected deduction keys
};

/* ==========================================================================
   DOM REFERENCES
   ========================================================================== */
const chatMessages  = document.getElementById('chat-messages');
const chatInputArea = document.getElementById('chat-input-area');
const chatContainer = document.getElementById('chat-container');
const consentNotice = document.getElementById('consent-notice');
const consentBtn    = document.getElementById('consent-btn');
const startBtn      = document.getElementById('start-btn');
const navCtaBtn     = document.getElementById('nav-cta-btn');
const nav           = document.getElementById('nav');

/* ==========================================================================
   UTILITIES
   ========================================================================== */

/** Format a number as Indian currency string (₹X,XX,XXX) */
function formatINR(amount) {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

/** Scroll the chat message area to bottom */
function scrollChat() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/** Delay helper */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ==========================================================================
   CHAT RENDERING
   ========================================================================== */

/**
 * Add a bot message bubble.
 * @param {string|HTMLElement} content - Text string or a DOM node
 * @param {number} [delayMs=0] - Delay before showing message
 */
async function addBotMsg(content, delayMs = 0) {
  if (delayMs > 0) await delay(delayMs);

  // Show typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'msg bot';
  typingEl.innerHTML = `
    <div class="msg-avatar">◎</div>
    <div class="msg-bubble">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  chatMessages.appendChild(typingEl);
  scrollChat();

  // Simulate typing delay
  await delay(650);

  // Replace with actual message
  typingEl.remove();

  const msgEl = document.createElement('div');
  msgEl.className = 'msg bot';

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'msg-bubble';

  if (typeof content === 'string') {
    bubbleEl.textContent = content;
  } else {
    bubbleEl.appendChild(content);
  }

  msgEl.innerHTML = `<div class="msg-avatar">◎</div>`;
  msgEl.appendChild(bubbleEl);
  chatMessages.appendChild(msgEl);
  scrollChat();
}

/**
 * Add a user message bubble.
 * @param {string} text
 */
function addUserMsg(text) {
  const msgEl = document.createElement('div');
  msgEl.className = 'msg user';
  msgEl.innerHTML = `
    <div class="msg-bubble">${escapeHtml(text)}</div>
    <div class="msg-avatar">👤</div>`;
  chatMessages.appendChild(msgEl);
  scrollChat();
}

/** Basic HTML escaping to prevent XSS from user input */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Clear the input area */
function clearInput() {
  chatInputArea.innerHTML = '';
}

/* ==========================================================================
   TAX CALCULATION ENGINE
   ========================================================================== */

/** Standard deduction (applies to both regimes for salaried) */
const STD_DEDUCTION = 50000;

/**
 * Calculate New Regime tax.
 * Slabs: 0-3L:0%, 3-6L:5%, 6-9L:10%, 9-12L:15%, 12-15L:20%, >15L:30%
 * Standard deduction: ₹50,000
 * Rebate 87A: taxable income ≤ ₹7L → tax = 0 (Budget 2023)
 * Cess: 4% on tax
 */
function calcNewRegime(grossIncome) {
  const taxable = Math.max(0, grossIncome - STD_DEDUCTION);

  let tax = 0;
  const slabs = [
    [300000,  0],
    [600000,  0.05],
    [900000,  0.10],
    [1200000, 0.15],
    [1500000, 0.20],
    [Infinity,0.30],
  ];

  let prev = 0;
  for (const [limit, rate] of slabs) {
    if (taxable > prev) {
      const slice = Math.min(taxable, limit) - prev;
      tax += slice * rate;
      prev = limit;
    }
    if (taxable <= limit) break;
  }

  // Rebate u/s 87A — New Regime: taxable income ≤ ₹7,00,000
  if (taxable <= 700000) tax = 0;

  // 4% Health & Education Cess
  tax = tax * 1.04;

  return Math.round(tax);
}

/**
 * Calculate Old Regime tax.
 * Slabs: 0-2.5L:0%, 2.5-5L:5%, 5-10L:20%, >10L:30%
 * Standard deduction: ₹50,000
 * Deductions: 80C (max ₹1.5L), 80D (₹25k), Home Loan (₹2L), HRA (₹60k)
 * Rebate 87A: taxable income ≤ ₹5L → tax = 0
 * Cess: 4%
 */
function calcOldRegime(grossIncome, deductions) {
  // Standard + itemised deductions
  let totalDeductions = STD_DEDUCTION;
  if (deductions.includes('80c'))     totalDeductions += 150000;
  if (deductions.includes('80d'))     totalDeductions += 25000;
  if (deductions.includes('homeloan'))totalDeductions += 200000;
  if (deductions.includes('hra'))     totalDeductions += 60000;

  const taxable = Math.max(0, grossIncome - totalDeductions);

  let tax = 0;
  const slabs = [
    [250000,  0],
    [500000,  0.05],
    [1000000, 0.20],
    [Infinity,0.30],
  ];

  let prev = 0;
  for (const [limit, rate] of slabs) {
    if (taxable > prev) {
      const slice = Math.min(taxable, limit) - prev;
      tax += slice * rate;
      prev = limit;
    }
    if (taxable <= limit) break;
  }

  // Rebate u/s 87A — Old Regime: taxable income ≤ ₹5,00,000
  if (taxable <= 500000) tax = 0;

  // 4% Health & Education Cess
  tax = tax * 1.04;

  return Math.round(tax);
}

/**
 * Calculate how much more 80C investment is needed to save tax in Old Regime.
 * Returns ₹ amount needed (0 if already maxed out).
 */
function calc80CSavingsGap(grossIncome, deductions) {
  if (deductions.includes('80c')) return 0; // already using it

  // Simulate adding full 80C
  const withoutDeduction = [...deductions];
  const with80C = [...deductions, '80c'];

  const taxWithout = calcOldRegime(grossIncome, withoutDeduction);
  const taxWith    = calcOldRegime(grossIncome, with80C);
  return taxWithout - taxWith; // potential savings
}

/* ==========================================================================
   TIPS ENGINE
   ========================================================================== */

/**
 * Generate personalised tips based on income, regime, and deductions.
 * @returns {string[]} Array of tip strings
 */
function generateTips(income, deductions, oldTax, newTax) {
  const tips = [];

  // 80C tip
  if (!deductions.includes('80c') && income > 300000) {
    const savings = calc80CSavingsGap(income, deductions);
    if (savings > 0) {
      tips.push(`Invest up to ₹1,50,000 in ELSS / PPF / NPS under 80C to potentially save ${formatINR(savings)} in tax under Old Regime.`);
    }
  }

  // HRA tip
  if (!deductions.includes('hra') && income > 500000) {
    tips.push('If you live on rent, claim HRA exemption — it can reduce your taxable income significantly under Old Regime.');
  }

  // 80D tip
  if (!deductions.includes('80d') && income > 500000) {
    tips.push(`A health insurance premium (₹25,000/year) qualifies for 80D deduction — protects your family and lowers your tax.`);
  }

  // Home loan tip
  if (!deductions.includes('homeloan') && income > 800000) {
    tips.push('Home loan interest up to ₹2,00,000 per year is deductible under Section 24(b) in the Old Regime.');
  }

  // Regime switch tip
  if (oldTax < newTax) {
    const diff = newTax - oldTax;
    tips.push(`You save ${formatINR(diff)} by staying in the Old Regime — your deductions make it worth it.`);
  } else {
    const diff = newTax - oldTax;
    if (diff === 0) {
      tips.push('Both regimes result in equal tax for you. Consider New Regime for simplicity — no need to track deductions.');
    }
  }

  // NPS tip for high earners
  if (income > 1000000) {
    tips.push('Salaried taxpayers can claim an extra ₹50,000 deduction under NPS (Section 80CCD(1B)) in the Old Regime — over and above 80C.');
  }

  // Zero tax tip
  if (oldTax === 0 && newTax === 0) {
    tips.push('Your income falls under the rebate limit — no tax is payable in either regime. Keep investing for wealth creation!');
  }

  // Return top 3 tips max to keep UI clean
  return tips.slice(0, 4);
}

/* ==========================================================================
   RESULT CARD BUILDER
   ========================================================================== */

/**
 * Build and return the result card DOM element.
 */
function buildResultCard(income, deductions) {
  const oldTax = calcOldRegime(income, deductions);
  const newTax = calcNewRegime(income);

  const betterRegime = newTax <= oldTax ? 'new' : 'old';
  const savings = Math.abs(oldTax - newTax);

  const card = document.createElement('div');
  card.className = 'result-card';

  // Regime comparison grid
  const oldWinner = betterRegime === 'old';
  const newWinner = betterRegime === 'new';

  card.innerHTML = `
    <div class="result-title">Your Tax Breakdown</div>

    <div class="regime-grid">
      <div class="regime-box ${oldWinner ? 'winner' : ''}">
        <div class="regime-label">Old Regime</div>
        <div class="regime-tax">${formatINR(oldTax)}</div>
        <span class="regime-badge ${oldWinner ? 'best' : 'other'}">
          ${oldWinner ? '✓ Recommended' : 'Higher tax'}
        </span>
      </div>
      <div class="regime-box ${newWinner ? 'winner' : ''}">
        <div class="regime-label">New Regime</div>
        <div class="regime-tax">${formatINR(newTax)}</div>
        <span class="regime-badge ${newWinner ? 'best' : 'other'}">
          ${newWinner ? '✓ Recommended' : 'Higher tax'}
        </span>
      </div>
    </div>

    ${savings > 0 ? `
    <div class="savings-row">
      <span class="savings-label">
        ${betterRegime === 'new' ? 'New Regime saves you' : 'Old Regime saves you'}
      </span>
      <span class="savings-amount">${formatINR(savings)} / year</span>
    </div>` : `
    <div class="savings-row">
      <span class="savings-label">Both regimes result in equal tax</span>
      <span class="savings-amount">${formatINR(newTax)}</span>
    </div>`}

    ${buildTipsHTML(income, deductions, oldTax, newTax)}

    <div>
      <button class="restart-btn" id="restart-btn">↺ Start Over</button>
    </div>
  `;

  return card;
}

function buildTipsHTML(income, deductions, oldTax, newTax) {
  const tips = generateTips(income, deductions, oldTax, newTax);
  if (tips.length === 0) return '';

  const tipsHTML = tips
    .map(tip => `
      <div class="tip-item">
        <span class="tip-icon">→</span>
        <span>${tip}</span>
      </div>`)
    .join('');

  return `
    <div class="tips-block">
      <div class="tips-title">Legal Tax Saving Tips</div>
      ${tipsHTML}
    </div>`;
}

/* ==========================================================================
   CHAT FLOW — STEP HANDLERS
   ========================================================================== */

/** STEP 1: Welcome + ask income */
async function stepWelcome() {
  state.step = 'income';
  clearInput();

  await addBotMsg('Namaste! 👋 I\'m TaxGuide — your personal Indian tax assistant. I\'ll help you compare Old vs New regime and find how much you can legally save.');
  await addBotMsg('Let\'s start simple. What is your total gross yearly income?', 300);

  // Render text input
  showIncomeInput();
}

function showIncomeInput() {
  clearInput();
  chatInputArea.innerHTML = `
    <div class="input-row">
      <input
        class="chat-text-input"
        type="number"
        id="income-input"
        placeholder="e.g. 800000 (for ₹8 Lakhs)"
        min="0"
        max="100000000"
        autocomplete="off"
        aria-label="Enter your yearly income"
      />
      <button class="input-send-btn" id="income-send" aria-label="Submit income" title="Submit">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>`;

  const input  = document.getElementById('income-input');
  const sendBtn = document.getElementById('income-send');

  const submit = () => handleIncomeInput(input.value);
  sendBtn.addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  input.focus();
}

/** Handle income submission */
async function handleIncomeInput(raw) {
  const value = parseFloat(String(raw).replace(/,/g, '').trim());

  if (!value || value <= 0 || isNaN(value)) {
    showInputError('Please enter a valid income amount (e.g. 800000)');
    return;
  }

  if (value > 100000000) {
    showInputError('Please enter an income below ₹10 crore for this tool.');
    return;
  }

  state.income = value;
  addUserMsg(formatINR(value) + ' per year');
  clearInput();

  await stepRegime();
}

function showInputError(msg) {
  // Remove old error if present
  const old = chatInputArea.querySelector('.input-error');
  if (old) old.remove();

  const err = document.createElement('p');
  err.className = 'input-error';
  err.style.cssText = 'font-size:12px;color:#ef4444;margin-top:6px;padding-left:2px;';
  err.textContent = msg;
  chatInputArea.appendChild(err);
}

/** STEP 2: Ask regime */
async function stepRegime() {
  state.step = 'regime';

  const income = state.income;
  const lakhs  = (income / 100000).toFixed(1);

  await addBotMsg(`Got it — ${formatINR(income)} (${lakhs} Lakhs) per year. That's helpful.`);
  await addBotMsg('Which tax regime are you currently using, or planning to use?', 400);

  clearInput();
  chatInputArea.innerHTML = `
    <div class="options-row" id="regime-options">
      <button class="opt-btn" data-val="old"   aria-pressed="false">Old Regime</button>
      <button class="opt-btn" data-val="new"   aria-pressed="false">New Regime</button>
      <button class="opt-btn" data-val="unsure" aria-pressed="false">Not Sure — Compare Both</button>
    </div>`;

  document.querySelectorAll('#regime-options .opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;
      handleRegimeChoice(val, btn.textContent);
    });
  });
}

/** Handle regime choice */
async function handleRegimeChoice(val, label) {
  state.regime = val;
  addUserMsg(label);
  clearInput();
  await stepDeductions();
}

/** STEP 3: Ask deductions */
async function stepDeductions() {
  state.step = 'deductions';

  if (state.regime === 'new') {
    await addBotMsg('New Regime noted. It\'s simpler — most deductions are not applicable. I\'ll still compare it with Old Regime for you.');
  } else if (state.regime === 'old') {
    await addBotMsg('Old Regime — good, this one allows deductions which can really lower your tax.');
  } else {
    await addBotMsg('No problem, I\'ll calculate both and show you which is better.');
  }

  await addBotMsg('Do you currently claim any of these deductions? Select all that apply.', 400);

  clearInput();
  chatInputArea.innerHTML = `
    <div class="options-row" id="deduction-options">
      <button class="opt-btn" data-val="80c"      aria-pressed="false">80C — Investments (EPF/ELSS/PPF)</button>
      <button class="opt-btn" data-val="80d"      aria-pressed="false">80D — Health Insurance</button>
      <button class="opt-btn" data-val="homeloan" aria-pressed="false">Home Loan Interest</button>
      <button class="opt-btn" data-val="hra"      aria-pressed="false">HRA — House Rent</button>
      <button class="opt-btn" data-val="none"     aria-pressed="false">None of these</button>
    </div>
    <button class="confirm-btn" id="deduction-confirm" disabled>Calculate My Tax →</button>`;

  const options    = document.querySelectorAll('#deduction-options .opt-btn');
  const confirmBtn = document.getElementById('deduction-confirm');

  options.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;

      if (val === 'none') {
        // Deselect all others, select only None
        options.forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed','false'); });
        btn.classList.add('selected');
        btn.setAttribute('aria-pressed','true');
      } else {
        // Deselect "None" if selecting something else
        const noneBtn = document.querySelector('#deduction-options .opt-btn[data-val="none"]');
        noneBtn.classList.remove('selected');
        noneBtn.setAttribute('aria-pressed','false');

        btn.classList.toggle('selected');
        btn.setAttribute('aria-pressed', btn.classList.contains('selected') ? 'true' : 'false');
      }

      // Update confirm button state
      const anySelected = document.querySelector('#deduction-options .opt-btn.selected');
      confirmBtn.disabled = !anySelected;
    });
  });

  confirmBtn.addEventListener('click', () => {
    const selected = [...document.querySelectorAll('#deduction-options .opt-btn.selected')]
      .map(b => b.dataset.val)
      .filter(v => v !== 'none');

    state.deductions = selected;

    const labels = selected.length === 0
      ? 'None'
      : [...document.querySelectorAll('#deduction-options .opt-btn.selected')]
          .map(b => b.textContent.trim())
          .join(', ');

    addUserMsg(labels);
    clearInput();
    stepResult();
  });
}

/** STEP 4 & 5: Calculate + Show Results */
async function stepResult() {
  state.step = 'result';

  await addBotMsg('Analysing your tax profile...');
  await delay(600);

  const oldTax = calcOldRegime(state.income, state.deductions);
  const newTax = calcNewRegime(state.income);
  const better = newTax <= oldTax ? 'New Regime' : 'Old Regime';
  const savings = Math.abs(oldTax - newTax);

  let summaryText;
  if (savings === 0) {
    summaryText = `Both regimes result in the same tax of ${formatINR(newTax)} for your income. Here's the full breakdown:`;
  } else {
    summaryText = `${better} is better for you — you save ${formatINR(savings)} per year. Here's your complete breakdown:`;
  }

  await addBotMsg(summaryText, 200);

  // Add result card
  await delay(400);
  const resultNode = buildResultCard(state.income, state.deductions);

  const msgEl = document.createElement('div');
  msgEl.className = 'msg bot';
  msgEl.innerHTML = `<div class="msg-avatar">◎</div>`;
  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'msg-bubble';
  bubbleEl.style.padding = '0';
  bubbleEl.style.background = 'transparent';
  bubbleEl.style.border = 'none';
  bubbleEl.appendChild(resultNode);
  msgEl.appendChild(bubbleEl);
  chatMessages.appendChild(msgEl);
  scrollChat();

  // Close note
  await addBotMsg('Remember: these are estimates based on standard assumptions. Your actual tax may vary. Consult a CA for official filing.', 500);

  // Restart handler
  document.getElementById('restart-btn').addEventListener('click', restartChat);
}

/* ==========================================================================
   RESTART
   ========================================================================== */
function restartChat() {
  // Reset state
  state.step      = 'idle';
  state.income    = 0;
  state.regime    = null;
  state.deductions = [];

  // Clear messages
  chatMessages.innerHTML = '';
  clearInput();

  // Restart flow
  stepWelcome();
}

/* ==========================================================================
   BOOT SEQUENCE
   ========================================================================== */

/** Show chat after consent */
function activateChat() {
  consentNotice.style.display = 'none';
  chatContainer.classList.add('visible');
  stepWelcome();
}

/** Scroll to chat section */
function scrollToChat() {
  document.getElementById('chat-section').scrollIntoView({ behavior: 'smooth' });
}

/* ==========================================================================
   EVENT LISTENERS
   ========================================================================== */

// Consent button
consentBtn.addEventListener('click', () => {
  activateChat();
});

// Hero start button
startBtn.addEventListener('click', () => {
  scrollToChat();
  // Small delay to let scroll finish, then activate
  setTimeout(() => {
    if (state.step === 'idle') activateChat();
  }, 600);
});

// Nav CTA
navCtaBtn.addEventListener('click', e => {
  e.preventDefault();
  scrollToChat();
  setTimeout(() => {
    if (state.step === 'idle') activateChat();
  }, 600);
});

// Nav scroll shadow
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}, { passive: true });

/* ==========================================================================
   SCROLL FADE-UP ANIMATIONS (Intersection Observer)
   ========================================================================== */
const fadeEls = document.querySelectorAll('.hero-content, .hero-visual, .stats-bar, .section-header, .manifesto-block, .founder-card');
fadeEls.forEach(el => el.classList.add('fade-up'));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

fadeEls.forEach(el => observer.observe(el));

// Hero content visible immediately
document.querySelector('.hero-content')?.classList.add('visible');
