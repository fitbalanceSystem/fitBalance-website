
import { selectFromTable, uploadFileToStorage } from '../utilities/dbservice.js';
import { getCurrentUser, checkAuth, logout } from '../utilities/auth.js'
  
// checkAuth()

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    
    // כל התמונות שבקטלוג
    const images = document.querySelectorAll('main img');

    images.forEach(img => {
      img.addEventListener('click', () => {
        modalImg.src = img.src;
        modal.classList.remove('hidden');
      });
    });

    // סגירה בלחיצה מחוץ לתמונה
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        modalImg.src = '';
      }
    });
  });