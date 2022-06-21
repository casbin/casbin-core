import { add, complete, cycle, suite, save } from 'benny';
import { random } from 'lodash';
import { newEnforcer, Model } from '../../src';

export default async function BenchmarkManagementAPI(): Promise<void> {
  await suite(
    'BenchmarkHasPolicy',
    add('HasPolicy Small', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act

      [policy_definition]
      p = sub, obj, act

      [policy_effect]
      e = some(where (p.eft == allow))

      [matchers]
      m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
      `);
      const e = await newEnforcer(model, undefined);

      for (let i = 0; i < 100; i++) {
        await e.addPolicy(`user${i}`, `data${i / 10}`, 'read');
      }

      return async () => {
        await e.hasPolicy(`user${random(0, 100, false)}`, `data${random(0, 100, false) / 10}`, 'read');
      };
    }),
    add('HasPolicy Medium', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act

      [policy_definition]
      p = sub, obj, act

      [policy_effect]
      e = some(where (p.eft == allow))

      [matchers]
      m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
      `);
      const e = await newEnforcer(model, undefined);

      const pPolicies: string[][] = [];
      for (let i = 0; i < 1000; i++) {
        pPolicies.push([`user${i}`, `data${i / 10}`, 'read']);
      }
      await e.addPolicies(pPolicies);

      return async () => {
        await e.hasPolicy(`user${random(0, 1000, false)}`, `data${random(0, 1000) / 10}`, 'read');
      };
    }),
    add('HasPolicy Large', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act

      [policy_definition]
      p = sub, obj, act

      [policy_effect]
      e = some(where (p.eft == allow))

      [matchers]
      m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
      `);
      const e = await newEnforcer(model, undefined);

      const pPolicies: string[][] = [];
      for (let i = 0; i < 10000; i++) {
        pPolicies.push([`user${i}`, `data${i / 10}`, 'read']);
      }

      await e.addPolicies(pPolicies);

      return async () => {
        await e.hasPolicy(`user${random(0, 10000)}`, `data${random(0, 10000) / 10}`, 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'HasPolicy',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkAddPolicySmall',
    add('AddPolicy Small', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act

      [policy_definition]
      p = sub, obj, act

      [policy_effect]
      e = some(where (p.eft == allow))

      [matchers]
      m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
      `);

      const e = await newEnforcer(model, undefined);

      for (let i = 0; i < 100; i++) {
        await e.addPolicy(`user${i}`, `data${i / 10}`, 'read');
      }

      return async () => {
        await e.addPolicy(`user${random(0, 100, false) + 100}`, `data${(random(0, 100, false) + 100) / 10}`, 'read');
      };
    }),
    add('AddPolicy Medium', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act
  
      [policy_definition]
      p = sub, obj, act
  
      [policy_effect]
      e = some(where (p.eft == allow))
  
      [matchers]
      m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
      `);

      const e = await newEnforcer(model, undefined);

      const pPolicies: string[][] = [];
      for (let i = 0; i < 1000; i++) {
        pPolicies.push([`user${i}`, `data${i / 10}`, 'read']);
      }
      await e.addPolicies(pPolicies);

      return async () => {
        await e.addPolicy(`user${random(0, 1000, false) + 1000}`, `data${(random(0, 1000) + 1000) / 10}`, 'read');
      };
    }),
    add('AddPolicy Large', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act
  
      [policy_definition]
      p = sub, obj, act
  
      [policy_effect]
      e = some(where (p.eft == allow))
  
      [matchers]
      m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
      `);

      const e = await newEnforcer(model, undefined);

      const pPolicies: string[][] = [];
      for (let i = 0; i < 10000; i++) {
        pPolicies.push([`user${i}`, `data${i / 10}`, 'read']);
      }
      await e.addPolicies(pPolicies);

      return async () => {
        await e.addPolicy(`user${random(0, 10000) + 10000}`, `data${(random(0, 10000) + 10000) / 10}`, 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'AddPolicy',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkRemovePolicy',
    add('RemovePolicy Small', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act
  
      [policy_definition]
      p = sub, obj, act
  
      [policy_effect]
      e = some(where (p.eft == allow))
  
      [matchers]
      m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
      `);

      const e = await newEnforcer(model, undefined);

      for (let i = 0; i < 100; i++) {
        await e.addPolicy(`user{i}`, `data${i / 10}`, 'read');
      }

      return async () => {
        await e.removePolicy(`user${random(0, 100, false)}`, `data${random(0, 100) / 10}`, 'read');
      };
    }),
    add('RemovePolicy Medium', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act
  
      [policy_definition]
      p = sub, obj, act
  
      [policy_effect]
      e = some(where (p.eft == allow))
  
      [matchers]
      m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
      `);

      const e = await newEnforcer(model, undefined);

      const pPolicies: string[][] = [];
      for (let i = 0; i < 1000; i++) {
        pPolicies.push([`user${i}`, `data${i / 10}`, 'read']);
      }

      await e.addPolicies(pPolicies);

      return async () => {
        await e.removePolicy(`user${random(0, 1000)}`, `data${random(0, 1000) / 10}`, 'read');
      };
    }),
    add('RemovePolicy Large', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act
  
      [policy_definition]
      p = sub, obj, act
  
      [policy_effect]
      e = some(where (p.eft == allow))
  
      [matchers]
      m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
      `);

      const e = await newEnforcer(model, undefined);

      const pPolicies: string[][] = [];
      for (let i = 0; i < 10000; i++) {
        pPolicies.push([`user${i}`, `data${i / 10}`, 'read']);
      }
      await e.addPolicies(pPolicies);

      return async () => {
        await e.removePolicy(`user${random(0, 10000, false)}`, `data${random(0, 10000) / 10}`, 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'RemovePolicy',
      format: 'json',
      details: true,
    })
  );
}
