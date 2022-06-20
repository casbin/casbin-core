import { add, complete, cycle, suite, save } from 'benny';
import { newEnforcer, Model, MemoryAdapter } from '../../src';

function rawEnforce(sub: string, obj: string, act: string): boolean {
  const policy: string[][] = [
    ['alice', 'data1', 'read'],
    ['bob', 'data2', 'write'],
  ];

  for (const rule of policy) {
    if (sub === rule[0] && obj === rule[1] && act === rule[2]) {
      return true;
    }
  }

  return false;
}

export default async function BenchmarkModel(): Promise<void> {
  await suite(
    'Benchmark RawEnforce',
    add('RawEnforce', () => {
      rawEnforce('alice', 'data1', 'read');
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'RawEnforce',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkBasicModel',
    add('Basic Model', async () => {
      const adapter = new MemoryAdapter(`
      p, alice, data1, read
      p, bob, data2, write
      `);
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
      const e = await newEnforcer(model, adapter);
      return async () => {
        await e.enforce('alice', 'data1', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'BasicModel',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkRBACModel',
    add('RBAC Model', async () => {
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
      const e = await newEnforcer(model, adapter);

      return async () => {
        await e.enforce('alice', 'data2', 'read');
      };
    }),
    add('RBAC Model Small', async () => {
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
      const e = await newEnforcer(model, undefined);
      for (let i = 0; i < 100; i++) {
        await e.addPolicy(`group${i}`, `data${i / 10}`, 'read');
      }
      for (let i = 0; i < 100; i++) {
        await e.addGroupingPolicy(`user${i}`, `group${i / 10}`);
      }
      return async () => {
        await e.enforce('user501', 'data9', 'read');
      };
    }),
    add('RBAC Model Medium', async () => {
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
      const e = await newEnforcer(model, undefined);
      const pPolicies: string[][] = [];
      for (let i = 0; i < 1000; i++) {
        pPolicies.push([`group${i}`, `data${i / 10}`, `read`]);
      }
      await e.addPolicies(pPolicies);

      const gPolicies: string[][] = [];
      for (let i = 0; i < 1000; i++) {
        gPolicies.push([`user${i}`, `group${i / 10}`]);
      }
      await e.addGroupingPolicies(gPolicies);
      return async () => {
        await e.enforce('user5001', 'data99', 'read');
      };
    }),
    add('RBAC Model Large', async () => {
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
      const e = await newEnforcer(model, undefined);
      const pPolicies = [];
      for (let i = 0; i < 10000; i++) {
        pPolicies.push([`group${i}`, `data${i / 10}`, `read`]);
      }

      await e.addPolicies(pPolicies);

      const gPolicies = [];
      for (let i = 0; i < 10000; i++) {
        gPolicies.push([`user${i}`, `group${i / 10}`]);
      }

      await e.addGroupingPolicies(gPolicies);

      return async () => {
        await e.enforce('user50001', 'data999', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'RBACModel',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkRBACModelWithResourceRoles',
    add('RBAC With Resource Roles', async () => {
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
      const e = await newEnforcer(model, adapter);
      return async () => {
        await e.enforce('alice', 'data1', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'RBACModelWithResourceRoles',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkRBACModelWithDomains',
    add('RBAC With Domains', async () => {
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
      const e = await newEnforcer(model, adapter);
      return async () => {
        await e.enforce('alice', 'domain1', 'data1', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'RBACModelWithDomains',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkKeyMatchModel',
    add('Key Match Model', async () => {
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
      const e = await newEnforcer(model, adapter);
      return async () => {
        await e.enforce('alice', '/alice_data/resource1', 'GET');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'KeyMatchModel',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkRBACModelWithDeny',
    add('RBAC With Deny', async () => {
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
      const e = await newEnforcer(model, adapter);
      return async () => {
        await e.enforce('alice', 'data1', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'RBACModelWithDeny',
      format: 'json',
      details: true,
    })
  );

  await suite(
    'BenchmarkPriorityModel',
    add('Priority Model', async () => {
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
      const e = await newEnforcer(model, adapter);
      return async () => {
        await e.enforce('alice', 'data1', 'read');
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'PriorityModel',
      format: 'json',
      details: true,
    })
  );
}

BenchmarkModel();
