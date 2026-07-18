import { supabase, upsert } from '../utilities/db.js';
import * as methods from '../utilities/methods.js';
import '../utilities/main.js';
import {
  populateSelectFromCodeTable,
  loadAllCodeTables,
  getNameFromCodeTable,
  getNameInstructor
} from '../utilities/code-tables.js';

const form = document.getElementById('productForm');
const messageDiv = document.getElementById('message');


const { data: userData, error: authError } = await supabase.auth.getUser();
console.log("userData");
console.log(userData);

form.addEventListener('submit', async (e) => {


  e.preventDefault();
  messageDiv.textContent = '';

  const name = document.getElementById('name').value.trim();
  const description = document.getElementById('description').value.trim();
  const price = parseFloat(document.getElementById('price').value);
  const category = document.getElementById('category').value.trim();
  const imageFile = document.getElementById('image').files[0];

  console.log("imageFile");
  console.log(imageFile);
  let imageUrl = null;

  if (imageFile) {
    const filePath = `products-images/${Date.now()}_${imageFile.name}`;
    console.log("filePath");
    console.log(filePath);
    const { data, error: uploadError } = await supabase.storage
    .from('products-images')
    .upload(filePath, imageFile, {
      cacheControl: '3600',
      upsert: false // אפשר גם true אם את רוצה לדרוס קובץ קיים
    });

    if (uploadError) {
      messageDiv.textContent = 'שגיאה בהעלאת תמונה';
      return;
    }

    imageUrl = `${supabase.storageUrl}/products-images/${filePath}`;
    console.log(imageUrl);
  }

  const product = {
    name,
    description,
    price,
    category,
    image_url: imageUrl
  };
  console.log(product);
  const result = await upsert('products', product);

  if (!result) {
    messageDiv.textContent = 'שגיאה בשמירת המוצר';
  } else {
    messageDiv.textContent = '✅ המוצר נשמר בהצלחה!';
    form.reset();
  }
});
