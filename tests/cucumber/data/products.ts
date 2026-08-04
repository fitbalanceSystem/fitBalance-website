export interface TestProduct {
  name:        string;
  description: string;
  price:       number;
  stock:       number;
  category:    string;
  sku:         string;
}

export const testProducts: TestProduct[] = [
  {
    name:        'Auto Test Product',
    description: 'Product created by automated tests',
    price:       99.90,
    stock:       10,
    category:    'Equipment',
    sku:         'TEST-001',
  },
  {
    name:        'Test Sports Socks',
    description: 'Socks for automated testing',
    price:       29.90,
    stock:       50,
    category:    'Apparel',
    sku:         'TEST-002',
  },
];

export function getTestProduct(index = 0): TestProduct {
  return testProducts[index];
}
