// app.js

export function saveUserToStorage(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }
  
  export function getUserFromStorage() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
  
  export function logoutUser() {
    localStorage.removeItem('user');
    window.location.href = '/index.html';
  }
  
  export function redirectIfNotLoggedIn() {
    const user = getUserFromStorage();
    if (!user) {
      window.location.href = '/index.html';
    }
  }
  