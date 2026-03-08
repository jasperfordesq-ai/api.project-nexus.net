/**
 * Client-side form validation following GOV.UK Design System patterns
 * Provides immediate feedback while maintaining progressive enhancement
 */

(function() {
  'use strict';

  // Validation rules
  const validators = {
    required: {
      validate: (value) => value.trim().length > 0,
      message: (label) => `Enter ${label.toLowerCase()}`
    },
    email: {
      validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: () => 'Enter a valid email address'
    },
    minLength: {
      validate: (value, min) => !value || value.length >= min,
      message: (label, min) => `${label} must be at least ${min} characters`
    },
    maxLength: {
      validate: (value, max) => !value || value.length <= max,
      message: (label, max) => `${label} must be ${max} characters or fewer`
    },
    matches: {
      validate: (value, otherFieldName, form) => {
        const otherField = form.querySelector(`[name="${otherFieldName}"]`);
        return !value || !otherField || value === otherField.value;
      },
      message: (label, otherLabel) => `${label} must match ${otherLabel.toLowerCase()}`
    },
    number: {
      validate: (value) => !value || !isNaN(parseFloat(value)),
      message: (label) => `${label} must be a number`
    },
    min: {
      validate: (value, min) => !value || parseFloat(value) >= min,
      message: (label, min) => `${label} must be ${min} or more`
    },
    max: {
      validate: (value, max) => !value || parseFloat(value) <= max,
      message: (label, max) => `${label} must be ${max} or fewer`
    },
    pattern: {
      validate: (value, pattern) => !value || new RegExp(pattern).test(value),
      message: (label) => `Enter a valid ${label.toLowerCase()}`
    }
  };

  /**
   * Initialize validation on a form
   * @param {HTMLFormElement} form - The form element to validate
   */
  function initFormValidation(form) {
    if (!form || form.dataset.validated) return;
    form.dataset.validated = 'true';

    const fields = form.querySelectorAll('[data-validate]');

    // Add blur validation for each field
    fields.forEach(field => {
      field.addEventListener('blur', () => {
        validateField(field, form);
      });

      // Clear error on input (provides immediate feedback)
      field.addEventListener('input', () => {
        const formGroup = field.closest('.govuk-form-group');
        if (formGroup && formGroup.classList.contains('govuk-form-group--error')) {
          clearFieldError(field);
        }
      });
    });

    // Validate all fields on submit
    form.addEventListener('submit', (e) => {
      const errors = validateForm(form);

      if (errors.length > 0) {
        e.preventDefault();
        showErrorSummary(form, errors);

        // Focus first error field
        const firstErrorField = form.querySelector('.govuk-form-group--error input, .govuk-form-group--error textarea, .govuk-form-group--error select');
        if (firstErrorField) {
          firstErrorField.focus();
        }
      }
    });
  }

  /**
   * Validate a single field
   * @param {HTMLElement} field - The field to validate
   * @param {HTMLFormElement} form - The parent form
   * @returns {Object|null} Error object or null if valid
   */
  function validateField(field, form) {
    const rules = field.dataset.validate.split(' ');
    const label = getFieldLabel(field);
    const value = field.value;

    for (const rule of rules) {
      const [ruleName, ...params] = rule.split(':');
      const validator = validators[ruleName];

      if (!validator) continue;

      const isValid = validator.validate(value, ...params, form);

      if (!isValid) {
        const message = validator.message(label, ...params);
        showFieldError(field, message);
        return { field: field.id || field.name, message, href: `#${field.id || field.name}` };
      }
    }

    clearFieldError(field);
    return null;
  }

  /**
   * Validate all fields in a form
   * @param {HTMLFormElement} form - The form to validate
   * @returns {Array} Array of error objects
   */
  function validateForm(form) {
    const errors = [];
    const fields = form.querySelectorAll('[data-validate]');

    fields.forEach(field => {
      const error = validateField(field, form);
      if (error) {
        errors.push(error);
      }
    });

    return errors;
  }

  /**
   * Get the label text for a field
   * @param {HTMLElement} field - The field element
   * @returns {string} The label text
   */
  function getFieldLabel(field) {
    // Check for data-label attribute first
    if (field.dataset.label) {
      return field.dataset.label;
    }

    // Try to find associated label
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label) {
      return label.textContent.trim().replace(/\*$/, '').trim();
    }

    // Fall back to name or placeholder
    return field.name || field.placeholder || 'this field';
  }

  /**
   * Show error on a field (GOV.UK style)
   * @param {HTMLElement} field - The field with the error
   * @param {string} message - The error message
   */
  function showFieldError(field, message) {
    const formGroup = field.closest('.govuk-form-group');
    if (!formGroup) return;

    // Remove existing error
    clearFieldError(field);

    // Add error class to form group
    formGroup.classList.add('govuk-form-group--error');

    // Add error class to input
    field.classList.add('govuk-input--error');

    // Create error message element
    const errorSpan = document.createElement('p');
    errorSpan.id = `${field.id || field.name}-error`;
    errorSpan.className = 'govuk-error-message';
    errorSpan.innerHTML = `<span class="govuk-visually-hidden">Error:</span> ${message}`;

    // Insert before the input
    const inputWrapper = field.closest('.govuk-input__wrapper') || field;
    inputWrapper.parentNode.insertBefore(errorSpan, inputWrapper);

    // Update aria-describedby
    field.setAttribute('aria-describedby', errorSpan.id);
  }

  /**
   * Clear error from a field
   * @param {HTMLElement} field - The field to clear
   */
  function clearFieldError(field) {
    const formGroup = field.closest('.govuk-form-group');
    if (!formGroup) return;

    formGroup.classList.remove('govuk-form-group--error');
    field.classList.remove('govuk-input--error');

    const errorSpan = formGroup.querySelector('.govuk-error-message');
    if (errorSpan) {
      errorSpan.remove();
    }

    field.removeAttribute('aria-describedby');
  }

  /**
   * Show error summary at top of form
   * @param {HTMLFormElement} form - The form
   * @param {Array} errors - Array of error objects
   */
  function showErrorSummary(form, errors) {
    // Remove existing summary
    const existingSummary = form.querySelector('.govuk-error-summary');
    if (existingSummary) {
      existingSummary.remove();
    }

    // Create error summary
    const summary = document.createElement('div');
    summary.className = 'govuk-error-summary';
    summary.setAttribute('data-module', 'govuk-error-summary');
    summary.setAttribute('tabindex', '-1');
    summary.setAttribute('role', 'alert');

    const errorList = errors.map(err =>
      `<li><a href="${err.href}">${err.message}</a></li>`
    ).join('');

    summary.innerHTML = `
      <div role="alert">
        <h2 class="govuk-error-summary__title">There is a problem</h2>
        <div class="govuk-error-summary__body">
          <ul class="govuk-list govuk-error-summary__list">
            ${errorList}
          </ul>
        </div>
      </div>
    `;

    // Insert at top of form or before first form group
    const firstFormGroup = form.querySelector('.govuk-form-group');
    if (firstFormGroup) {
      form.insertBefore(summary, firstFormGroup);
    } else {
      form.prepend(summary);
    }

    // Focus the summary
    summary.focus();

    // Scroll to summary
    summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Auto-initialize forms with data-validate-form attribute
   */
  function autoInit() {
    const forms = document.querySelectorAll('form[data-validate-form]');
    forms.forEach(form => initFormValidation(form));
  }

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  // Export for manual initialization
  window.NEXUSValidation = {
    init: initFormValidation,
    validate: validateForm,
    validators: validators
  };
})();
