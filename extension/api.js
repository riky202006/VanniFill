/**
 * VaaniFill AI - Isolated API Service Module
 * Handles all communication with the VaaniFill backend at http://localhost:5000.
 * Conforms to shared/api-contracts/form-api.json and backend routes.
 *
 * Features:
 * - In-flight lock preventing duplicate concurrent API calls
 * - Automatic fetch timeouts with AbortController
 * - Actionable, user-friendly error normalization
 * - NEVER stores API keys
 */

export const DEFAULT_BACKEND_URL = 'http://localhost:5000';
export const DEFAULT_TIMEOUT_MS = 25000;

class ApiService {
  constructor(baseUrl = DEFAULT_BACKEND_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.isExtracting = false;
    this.isValidating = false;
  }

  /**
   * Set a custom backend URL if running on a custom port/host
   * @param {string} url
   */
  setBaseUrl(url) {
    if (url && typeof url === 'string') {
      this.baseUrl = url.trim().replace(/\/+$/, '');
    }
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  /**
   * Helper: Fetch with timeout
   */
  async fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. Please check if the backend is responsive.`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check backend health
   * GET /api/health
   */
  async checkHealth() {
    const url = `${this.baseUrl}/api/health`;
    try {
      const res = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }, 5000);

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      return data;
    } catch (err) {
      if (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        throw new Error(
          `Cannot reach VaaniFill backend at ${this.baseUrl}. Please ensure the server is started with 'npm --prefix backend start'.`
        );
      }
      throw err;
    }
  }

  /**
   * Universal voice extraction endpoint
   * POST /api/extract
   * Request accepts: { transcript, language, formId, fields, current_values }
   * Response includes: { success, isComplete, values, missing_fields, validation_errors, follow_up_question, reply, fields }
   *
   * @param {Object} params
   * @param {string} params.transcript - Spoken user speech transcript
   * @param {string} [params.language='hi-IN'] - 'hi-IN' or 'en-IN'
   * @param {string} [params.formId='custom'] - Form identifier
   * @param {Array<Object>} [params.fields=[]] - Detected DOM form fields schema
   * @param {Object} [params.current_values={}] - Currently recognized or pre-filled values
   */
  async extract({ transcript, language = 'hi-IN', formId = 'custom', fields = [], current_values = {} }) {
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      throw new Error('Please speak or type your details before submitting.');
    }

    if (this.isExtracting) {
      throw new Error('An extraction request is already running. Please wait a moment.');
    }

    this.isExtracting = true;

    const cleanFields = Array.isArray(fields)
      ? fields.map((f) => ({
          id: f.id,
          label: f.label || f.id,
          type: f.type || 'text',
          required: Boolean(f.required),
          ...(Array.isArray(f.options) && f.options.length > 0 ? { options: f.options } : {})
        }))
      : [];

    const payload = {
      transcript: transcript.trim(),
      language: language || 'hi-IN',
      formId: formId || 'custom',
      fields: cleanFields,
      current_values: current_values && typeof current_values === 'object' ? current_values : {}
    };

    const url = `${this.baseUrl}/api/extract`;
    try {
      const res = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`Malformed response from server (HTTP ${res.status}). Expected JSON.`);
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}: Extraction failed.`);
      }

      return {
        success: Boolean(data.success),
        isComplete: Boolean(data.isComplete),
        values: data.values || {},
        missing_fields: Array.isArray(data.missing_fields) ? data.missing_fields : [],
        validation_errors: data.validation_errors || {},
        follow_up_question: data.follow_up_question || (data.nextQuestion ? data.nextQuestion.text : null),
        nextQuestion: data.nextQuestion || null,
        reply: data.reply || '',
        fields: Array.isArray(data.fields) ? data.fields : []
      };
    } catch (err) {
      if (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        throw new Error(
          `Failed to connect to VaaniFill backend at ${this.baseUrl}. Make sure the backend server is running on port 5000.`
        );
      }
      throw err;
    } finally {
      this.isExtracting = false;
    }
  }

  /**
   * Deterministic client-side field validation
   * POST /api/validate
   *
   * @param {Object} params
   * @param {Array<Object>} params.fields - Field schema
   * @param {Object} params.values - Field key-value pairs
   * @param {string} [params.language='hi-IN'] - 'hi-IN' or 'en-IN'
   * @param {string} [params.formId='custom']
   */
  async validate({ fields = [], values = {}, language = 'hi-IN', formId = 'custom' }) {
    if (this.isValidating) {
      // Allow fast-debounce overrides without crashing
    }

    this.isValidating = true;
    const url = `${this.baseUrl}/api/validate`;

    try {
      const res = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          fields,
          current_values: values,
          language: language || 'hi-IN',
          formId: formId || 'custom'
        })
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`Malformed validation response from server (HTTP ${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || `Validation failed (HTTP ${res.status})`);
      }

      return {
        success: Boolean(data.success),
        isComplete: Boolean(data.isComplete),
        values: data.values || {},
        missing_fields: Array.isArray(data.missing_fields) ? data.missing_fields : [],
        validation_errors: data.validation_errors || {},
        nextQuestion: data.nextQuestion || null,
        summary: data.summary || { total: fields.length, matched: 0, missing: 0, invalid: 0 },
        fields: Array.isArray(data.fields) ? data.fields : []
      };
    } catch (err) {
      if (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        throw new Error(`Cannot reach backend for validation at ${this.baseUrl}.`);
      }
      throw err;
    } finally {
      this.isValidating = false;
    }
  }

  /**
   * Fetch pre-configured form schemas
   * GET /api/forms
   */
  async getForms() {
    const url = `${this.baseUrl}/api/forms`;
    const res = await this.fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Failed to load forms: HTTP ${res.status}`);
    return await res.json();
  }

  /**
   * Fetch specific form schema
   * GET /api/forms/:id
   */
  async getFormById(id) {
    const url = `${this.baseUrl}/api/forms/${encodeURIComponent(id)}`;
    const res = await this.fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Failed to load form schema ${id}: HTTP ${res.status}`);
    return await res.json();
  }
}

export const api = new ApiService();
export default api;
