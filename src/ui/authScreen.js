// Authentication Screen UI for Tactical Risk multiplayer

import { getAuthManager } from '../multiplayer/auth.js';

export class AuthScreen {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.authManager = getAuthManager();
    this.el = null;
    this.mode = 'login'; // 'login', 'signup', 'phone', 'verify'
    this.phoneNumber = '';
    this.isLoading = false;
  }

  show() {
    if (!this.el) {
      this._create();
    }
    this.el.classList.remove('hidden');
    this._render();
  }

  hide() {
    if (this.el) {
      this.el.classList.add('hidden');
    }
  }

  destroy() {
    if (this.el?.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }

  _create() {
    this.el = document.createElement('div');
    this.el.id = 'auth-screen';
    this.el.className = 'auth-overlay';
    document.body.appendChild(this.el);
  }

  _render() {
    const html = `
      <div class="auth-content">
        <div class="auth-header">
          <h1 class="auth-title">Tactical Risk Online</h1>
          <p class="auth-subtitle">Sign in to play multiplayer</p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab ${this.mode === 'login' ? 'active' : ''}" data-mode="login">Sign In</button>
          <button class="auth-tab ${this.mode === 'signup' ? 'active' : ''}" data-mode="signup">Sign Up</button>
          <button class="auth-tab ${this.mode === 'phone' || this.mode === 'verify' ? 'active' : ''}" data-mode="phone">Phone</button>
        </div>

        <div class="auth-form-container">
          ${this._renderForm()}
        </div>

        <div class="auth-footer">
          <button class="auth-back-btn" data-action="back">Back to Lobby</button>
        </div>
      </div>
    `;

    this.el.innerHTML = html;
    this._bindEvents();
  }

  _renderForm() {
    if (this.mode === 'login') {
      return `
        <form class="auth-form" data-form="login">
          <div class="auth-field">
            <label for="login-email">Email</label>
            <input type="email" id="login-email" placeholder="your@email.com" required>
          </div>
          <div class="auth-field">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" placeholder="Password" required>
          </div>
          <div class="auth-error hidden" id="login-error"></div>
          <button type="submit" class="auth-submit-btn" ${this.isLoading ? 'disabled' : ''}>
            ${this.isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      `;
    }

    if (this.mode === 'signup') {
      return `
        <form class="auth-form" data-form="signup">
          <div class="auth-field">
            <label for="signup-name">Display Name</label>
            <input type="text" id="signup-name" placeholder="Your name" maxlength="20" required>
          </div>
          <div class="auth-field">
            <label for="signup-email">Email</label>
            <input type="email" id="signup-email" placeholder="your@email.com" required>
          </div>
          <div class="auth-field">
            <label for="signup-password">Password</label>
            <input type="password" id="signup-password" placeholder="Min 6 characters" minlength="6" required>
          </div>
          <div class="auth-error hidden" id="signup-error"></div>
          <button type="submit" class="auth-submit-btn" ${this.isLoading ? 'disabled' : ''}>
            ${this.isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      `;
    }

    if (this.mode === 'phone') {
      return `
        <form class="auth-form" data-form="phone">
          <div class="auth-field">
            <label for="phone-number">Phone Number</label>
            <input type="tel" id="phone-number" placeholder="+1234567890" required>
            <span class="auth-hint">Include country code (e.g., +1 for US)</span>
          </div>
          <div class="auth-error hidden" id="phone-error"></div>
          <button type="submit" id="phone-submit-btn" class="auth-submit-btn" ${this.isLoading ? 'disabled' : ''}>
            ${this.isLoading ? 'Sending code...' : 'Send Verification Code'}
          </button>
        </form>
      `;
    }

    if (this.mode === 'verify') {
      return `
        <form class="auth-form" data-form="verify">
          <p class="auth-verify-info">Enter the code sent to ${this.phoneNumber}</p>
          <div class="auth-field">
            <label for="verify-code">Verification Code</label>
            <input type="text" id="verify-code" placeholder="123456" maxlength="6" required>
          </div>
          <div class="auth-error hidden" id="verify-error"></div>
          <button type="submit" class="auth-submit-btn" ${this.isLoading ? 'disabled' : ''}>
            ${this.isLoading ? 'Verifying...' : 'Verify Code'}
          </button>
          <button type="button" class="auth-resend-btn" data-action="resend">
            Didn't receive code? Resend
          </button>
        </form>
      `;
    }

    return '';
  }

  _bindEvents() {
    // Tab switching
    this.el.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.mode = tab.dataset.mode;
        this._render();
      });
    });

    // Back button
    this.el.querySelector('.auth-back-btn')?.addEventListener('click', () => {
      this.hide();
      if (this.onComplete) {
        this.onComplete(null); // Cancelled
      }
    });

    // Login form
    this.el.querySelector('[data-form="login"]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleLogin(e.target);
    });

    // Signup form
    this.el.querySelector('[data-form="signup"]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleSignup(e.target);
    });

    // Phone form
    this.el.querySelector('[data-form="phone"]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handlePhoneSend(e.target);
    });

    // Verify form
    this.el.querySelector('[data-form="verify"]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handlePhoneVerify(e.target);
    });

    // Resend button
    this.el.querySelector('[data-action="resend"]')?.addEventListener('click', () => {
      this.mode = 'phone';
      this._render();
    });
  }

  async _handleLogin(form) {
    const email = form.querySelector('#login-email').value;
    const password = form.querySelector('#login-password').value;
    const errorEl = form.querySelector('#login-error');

    this.isLoading = true;
    this._render();

    const result = await this.authManager.signInWithEmail(email, password);

    this.isLoading = false;

    if (result.success) {
      this.hide();
      if (this.onComplete) {
        this.onComplete(this.authManager.getUser());
      }
    } else {
      this._render();
      const newErrorEl = this.el.querySelector('#login-error');
      if (newErrorEl) {
        newErrorEl.textContent = result.error;
        newErrorEl.classList.remove('hidden');
      }
    }
  }

  async _handleSignup(form) {
    const name = form.querySelector('#signup-name').value;
    const email = form.querySelector('#signup-email').value;
    const password = form.querySelector('#signup-password').value;
    const errorEl = form.querySelector('#signup-error');

    this.isLoading = true;
    this._render();

    const result = await this.authManager.signUpWithEmail(email, password, name);

    this.isLoading = false;

    if (result.success) {
      this.hide();
      if (this.onComplete) {
        this.onComplete(this.authManager.getUser());
      }
    } else {
      this._render();
      const newErrorEl = this.el.querySelector('#signup-error');
      if (newErrorEl) {
        newErrorEl.textContent = result.error;
        newErrorEl.classList.remove('hidden');
      }
    }
  }

  async _handlePhoneSend(form) {
    const phoneNumber = form.querySelector('#phone-number').value;
    const errorEl = form.querySelector('#phone-error');

    this.isLoading = true;
    this.phoneNumber = phoneNumber;
    this._render();

    const result = await this.authManager.sendPhoneVerification(phoneNumber, 'phone-submit-btn');

    this.isLoading = false;

    if (result.success) {
      this.mode = 'verify';
      this._render();
    } else {
      this._render();
      const newErrorEl = this.el.querySelector('#phone-error');
      if (newErrorEl) {
        newErrorEl.textContent = result.error;
        newErrorEl.classList.remove('hidden');
      }
    }
  }

  async _handlePhoneVerify(form) {
    const code = form.querySelector('#verify-code').value;
    const errorEl = form.querySelector('#verify-error');

    this.isLoading = true;
    this._render();

    const result = await this.authManager.verifyPhoneCode(code);

    this.isLoading = false;

    if (result.success) {
      this.hide();
      if (this.onComplete) {
        this.onComplete(this.authManager.getUser());
      }
    } else {
      this._render();
      const newErrorEl = this.el.querySelector('#verify-error');
      if (newErrorEl) {
        newErrorEl.textContent = result.error;
        newErrorEl.classList.remove('hidden');
      }
    }
  }
}
