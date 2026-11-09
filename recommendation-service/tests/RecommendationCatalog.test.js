import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

import RecommendationService from '../src/services/RecommendationService.js';

test('uses the fallback catalog only in development', async (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAxiosGet = axios.get;
  const service = new RecommendationService();
  let fallbackCalls = 0;
  service.repository.getAllProducts = async () => {
    fallbackCalls += 1;
    return [{ _id: 'dev-product', nombre: 'Producto de desarrollo' }];
  };

  t.after(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    axios.get = originalAxiosGet;
  });

  axios.get = async () => {
    throw new Error('catalog unavailable');
  };

  process.env.NODE_ENV = 'production';
  await assert.rejects(service.getProducts(), /catalog unavailable/);
  assert.equal(fallbackCalls, 0);

  axios.get = async () => ({ data: [] });
  await assert.rejects(service.getProducts(), /lista vacía o inválida/);
  assert.equal(fallbackCalls, 0);

  process.env.NODE_ENV = 'development';
  const products = await service.getProducts();
  assert.equal(products[0]._id, 'dev-product');
  assert.equal(fallbackCalls, 1);
});

test('does not use fallback products for an unknown catalog product', async (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAxiosGet = axios.get;
  const service = new RecommendationService();
  process.env.NODE_ENV = 'development';

  t.after(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    axios.get = originalAxiosGet;
  });

  axios.get = async () => {
    throw new Error('product endpoint unavailable');
  };

  assert.equal(await service.getProductById('unknown-product'), null);
});

test('caches and shares concurrent catalog requests', async (t) => {
  const originalAxiosGet = axios.get;
  const service = new RecommendationService();
  let requests = 0;
  const catalog = [{ _id: 'product-1', nombre: 'Producto' }];

  t.after(() => {
    axios.get = originalAxiosGet;
  });

  axios.get = async () => {
    requests += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { data: catalog };
  };

  const [first, second] = await Promise.all([
    service.getProducts(),
    service.getProducts()
  ]);
  const third = await service.getProducts();

  assert.equal(requests, 1);
  assert.equal(first, catalog);
  assert.equal(second, catalog);
  assert.equal(third, catalog);
});
