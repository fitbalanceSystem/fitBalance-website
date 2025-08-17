import { selectFromTable, uploadFileToStorage } from '../utilities/dbservice.js';
import { getCurrentUser, checkAuth, logout } from '../utilities/auth.js';

// checkAuth();
const slides = document.querySelectorAll('.slide');
const sliderContainer = document.querySelector('.slider-container');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
let current = 0;
let intervalId;
const intervalTime = 4000; // 4 שניות בין תמונות

function showSlide(index) {
  slides.forEach((s,i)=> s.style.opacity = i===index ? '1' : '0');
}

function nextSlide() {
  current = (current + 1) % slides.length;
  showSlide(current);
}

function prevSlide() {
  current = (current - 1 + slides.length) % slides.length;
  showSlide(current);
}

function startSlider() {
  intervalId = setInterval(nextSlide, intervalTime);
}

function stopSlider() {
  clearInterval(intervalId);
}

// כפתורים
nextBtn.addEventListener('click', ()=>{ nextSlide(); });
prevBtn.addEventListener('click', ()=>{ prevSlide(); });

// עצירה בהובר
sliderContainer.addEventListener('mouseenter', stopSlider);
sliderContainer.addEventListener('mouseleave', startSlider);

// התחלת הסליידר
showSlide(current);
startSlider();