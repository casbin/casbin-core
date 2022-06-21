import { add, complete, cycle, suite, save } from 'benny';
import { random } from 'lodash';
import { newEnforcer, Model, MemoryAdapter } from '../../src';

export default async function BenchmarkRoleManager(): Promise<void> {
  await suite(
    'BenchmarkRoleManager',
    add('RoleManager Small', async () => {
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

      e.enableAutoBuildRoleLinks(true);

      const pPolicies: string[][] = [];
      for (let i = 0; i < 100; i++) {
        pPolicies.push([`group${i}`, `data${i / 10}`, 'read']);
      }

      await e.addPolicies(pPolicies);

      const gPolicies: string[][] = [];
      for (let i = 0; i < 1000; i++) {
        gPolicies.push([`user${i}`, `group${i / 10}`]);
      }

      await e.addGroupingPolicies(gPolicies);

      const rm = e.getRoleManager();

      return async () => {
        await rm.hasLink('user501', `group${random(0, 100, false)}`);
      };
    }),
    add('RoleManager Medium', async () => {
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

      e.enableAutoBuildRoleLinks(true);

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

      await e.buildRoleLinks();

      const rm = e.getRoleManager();

      return async () => {
        rm.hasLink('user501', `group${random(0, 1000, false)}`);
      };
    }),
    add('RoleManager Large', async () => {
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
      for (let i = 0; i < 10000; i++) {
        pPolicies.push([`group${i}`, `data${i / 10}`, 'read']);
      }

      await e.addPolicies(pPolicies);

      const gPolicies: string[][] = [];
      for (let i = 0; i < 100000; i++) {
        gPolicies.push([`user${i}`, `group${i / 10}`]);
      }

      await e.addGroupingPolicies(gPolicies);

      const rm = e.getRoleManager();

      return async () => {
        rm.hasLink(`user501`, `group${random(0, 10000, false)}`);
      };
    }),
    cycle(),
    complete(),
    save({
      folder: 'test/benchmark/results',
      file: 'RoleManager',
      format: 'json',
      details: true,
    })
  );
}
