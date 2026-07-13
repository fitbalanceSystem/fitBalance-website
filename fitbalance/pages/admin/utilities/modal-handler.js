// js/modal-handler.js
export function openModal(modalId, formData = {}) {
    const modal = document.getElementById(modalId);
    Object.keys(formData).forEach(key => {
      const input = modal.querySelector(`[name="${key}"]`);
      if (input) input.value = formData[key];
    });
    modal.dataset.mode = formData.id ? 'edit' : 'create';
    modal.dataset.id = formData.id || '';
    modal.classList.add('open');
  }
  
  export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('open');
  }
  