import { add, complete, cycle, suite, save } from 'benny';
import { newCachedEnforcer, Model, MemoryAdapter } from '../../src';

export default async function BenchmarkEnforcerCached(): Promise<void> {
  await suite(
    'BenchmarkCachedBasicModel',
    add('Cached Basic Model', async () => {
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
      const adapter = new MemoryAdapter(`
      p, alice, data1, read
      p, bob, data2, write
      `);
      const e = await newCachedEnforcer(model, adapter);

      return async () => {
        await e.enforce('alice', 'data1', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'CachedBasicModel',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkCachedRBACModel',
    add('Cached RBAC Model', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act

      [policy_definition]
      p = sub, obj, act

      [role_definition]
      g = _, _

      [policy_effect]
      e = some(where (p.eft == allow))

      [matchers]
      m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
      `);
      const adapter = new MemoryAdapter(`
      p, alice, data1, read
      p, bob, data2, write
      p, data2_admin, data2, read
      p, data2_admin, data2, write
      g, alice, data2_admin
      `);

      const e = await newCachedEnforcer(model, adapter);
      return async () => {
        await e.enforce('alice', 'data1', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'CachedRBACModel',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkCachedRBACModelSmall',
    add('Cached RBAC Model Small', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act

      [policy_definition]
      p = sub, obj, act

      [role_definition]
      g = _, _

      [policy_effect]
      e = some(where (p.eft == allow))

      [matchers]
      m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
      `);
      const e = await newCachedEnforcer(model, undefined);

      for (let i = 0; i < 100; i++) {
        await e.addPolicy(`group${i}`, `data${i / 10}`, 'read');
      }

      for (let i = 0; i < 1000; i++) {
        await e.addGroupingPolicy(`user${i}`, `group${i / 10}`);
      }

      return async () => {
        await e.enforce('user501', 'data9', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'CachedRBACModelSmall',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkCachedRBACModelMedium',
    add('Cached RBAC Model Medium', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act

      [policy_definition]
      p = sub, obj, act

      [role_definition]
      g = _, _

      [policy_effect]
      e = some(where (p.eft == allow))

      [matchers]
      m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
      `);

      const e = await newCachedEnforcer(model, undefined);

      const pPolicies: string[][] = [];
      for (let i = 0; i < 1000; i++) {
        pPolicies.push([`group${i}`, `data${i / 10}`, 'read']);
      }

      await e.addPolicies(pPolicies);

      const gPolicies: string[][] = [];
      for (let i = 0; i < 10000; i++) {
        gPolicies.push([`user${i}`, `group${i / 10}`]);
      }

      await e.addGroupingPolicies(gPolicies);

      return async () => {
        await e.enforce('user5001', 'data150', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'CachedRBACModelMedium',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkCachedRBACModelLarge',
    add('Cached RBAC Model Large', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act

      [policy_definition]
      p = sub, obj, act

      [role_definition]
      g = _, _

      [policy_effect]
      e = some(where (p.eft == allow))

      [matchers]
      m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
      `);

      const e = await newCachedEnforcer(model, undefined);

      const pPolicies: string[][] = [];
      for (let i = 0; i < 10000; i++) {
        pPolicies.push([`group${i}`, `data${i / 10}`, 'read']);
      }

      const gPolicies: string[][] = [];
      for (let i = 0; i < 100000; i++) {
        gPolicies.push([`user${i}`, `group${i / 10}`]);
      }
      await e.addGroupingPolicies(gPolicies);

      return async () => {
        await e.enforce('user50001', 'data1500', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'CachedRBACModelLarge',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkCachedRBACModelWithResourceRoles',
    add('Cached RBAC Model With Resource Roles', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act

      [policy_definition]
      p = sub, obj, act

      [role_definition]
      g = _, _
      g2 = _, _

      [policy_effect]
      e = some(where (p.eft == allow))

      [matchers]
      m = g(r.sub, p.sub) && g2(r.obj, p.obj) && r.act == p.act
      `);

      const adapter = new MemoryAdapter(`
      p, alice, data1, read
      p, bob, data2, write
      p, data_group_admin, data_group, write

      g, alice, data_group_admin
      g2, data1, data_group
      g2, data2, data_group
      `);

      const e = await newCachedEnforcer(model, adapter);

      return async () => {
        await e.enforce('alice', 'data1', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'CachedRBACModelWithResourceRoles',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkCachedRBACModelWithDomains',
    add('Cached RBAC Model With Domains', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, dom, obj, act

      [policy_definition]
      p = sub, dom, obj, act

      [role_definition]
      g = _, _, _

      [policy_effect]
      e = some(where (p.eft == allow))

      [matchers]
      m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act
      `);

      const adapter = new MemoryAdapter(`
      p, admin, domain1, data1, read
      p, admin, domain1, data1, write
      p, admin, domain2, data2, read
      p, admin, domain2, data2, write

      g, alice, admin, domain1
      g, bob, admin, domain2
      `);

      const e = await newCachedEnforcer(model, adapter);

      return async () => {
        await e.enforce('alice', 'domain1', 'data1', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'CachedRBACModelWithDomains',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkCachedKeyMatchModel',
    add('Cached KeyMatch Model', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act

      [policy_definition]
      p = sub, obj, act

      [policy_effect]
      e = some(where (p.eft == allow))

      [matchers]
      m = r.sub == p.sub && keyMatch(r.obj, p.obj) && regexMatch(r.act, p.act)
      `);

      const adapter = new MemoryAdapter(`
      p, alice, /alice_data/*, GET
      p, alice, /alice_data/resource1, POST

      p, bob, /alice_data/resource2, GET
      p, bob, /bob_data/*, POST

      p, cathy, /cathy_data, (GET)|(POST)
      `);

      const e = await newCachedEnforcer(model, adapter);

      return async () => {
        await e.enforce('alice', '/alice_data/resource1', 'GET');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'CachedKeyMatchModel',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkCachedRBACModelWithDeny',
    add('Cached RBAC Model With Deny', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act

      [policy_definition]
      p = sub, obj, act, eft

      [role_definition]
      g = _, _

      [policy_effect]
      e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

      [matchers]
      m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
      `);

      const adapter = new MemoryAdapter(`
      p, alice, data1, read, allow
      p, bob, data2, write, allow
      p, data2_admin, data2, read, allow
      p, data2_admin, data2, write, allow
      p, alice, data2, write, deny

      g, alice, data2_admin
      `);

      const e = await newCachedEnforcer(model, adapter);

      return async () => {
        await e.enforce('alice', 'data1', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'CachedRBACModelWithDeny',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkCachedPriorityModel',
    add('Cached Priority Model', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act

      [policy_definition]
      p = sub, obj, act, eft

      [role_definition]
      g = _, _

      [policy_effect]
      e = priority(p.eft) || deny

      [matchers]
      m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
      `);

      const adapter = new MemoryAdapter(`
      p, alice, data1, read, allow
      p, data1_deny_group, data1, read, deny
      p, data1_deny_group, data1, write, deny
      p, alice, data1, write, allow

      g, alice, data1_deny_group

      p, data2_allow_group, data2, read, allow
      p, bob, data2, read, deny
      p, bob, data2, write, deny

      g, bob, data2_allow_group
      `);

      const e = await newCachedEnforcer(model, adapter);

      return async () => {
        await e.enforce('alice', 'data1', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'CachedPriorityModel',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkCachedRBACModelMediumParallel',
    add('Cached RBAC Model Medium Parallel', async () => {
      const model = new Model(`
      [request_definition]
      r = sub, obj, act

      [policy_definition]
      p = sub, obj, act

      [role_definition]
      g = _, _

      [policy_effect]
      e = some(where (p.eft == allow))

      [matchers]
      m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
      `);
      const e = await newCachedEnforcer(model, undefined);

      const pPolicies: string[][] = [];
      for (let i = 0; i < 10000; i++) {
        pPolicies.push([`group${i}`, `data${i / 10}`, 'read']);
      }
      await e.addPolicies(pPolicies);

      const gPolicies: string[][] = [];
      for (let i = 0; i < 100000; i++) {
        gPolicies.push([`user${i}`, `group${i / 10}`]);
      }

      await e.addGroupingPolicies(gPolicies);

      return async () => {
        await e.enforce('user5001', 'data150', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'CachedRBACModelMediumParallel',
      format: 'json',
      details: true,
    })
  );
}
