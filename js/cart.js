document.addEventListener('DOMContentLoaded', () => {
    loadCartItems();
  });
  
  function loadCartItems() {
    // כאן נטען פריטים לדוגמה (במקום נתונים אמיתיים מה-DB)
    const cartItems = [
      { name: 'מנוי פילאטיס', price: 120 },
      { name: 'חוג עיצוב לנערות', price: 90 },
    ];
  
    const container = document.getElementById('cart-items');
    const totalPriceEl = document.getElementById('total-price');
  
    let total = 0;
  
    cartItems.forEach(item => {
      total += item.price;
  
      const itemDiv = document.createElement('div');
      itemDiv.className = 'flex justify-between border-b pb-2';
      itemDiv.innerHTML = `
        <span>${item.name}</span>
        <span>₪${item.price}</span>
      `;
      container.appendChild(itemDiv);
    });
  
    totalPriceEl.textContent = `₪${total}`;
  }
  