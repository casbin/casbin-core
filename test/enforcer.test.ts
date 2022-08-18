// Copyright 2018 The Casbin Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { readFileSync } from 'fs';

import { NewEnforceContext, EnforceContext } from '../src/enforceContext';
import { newEnforcer, Enforcer, MemoryAdapter, Util, Model } from '../src';
import { getEnforcerWithPath, getStringAdapter } from './utils';

async function testEnforce(e: Enforcer, sub: any, obj: string, act: string, res: boolean): Promise<void> {
  await expect(e.enforce(sub, obj, act)).resolves.toBe(res);
}

function testEnforceSync(e: Enforcer, sub: any, obj: string, act: string, res: boolean): void {
  expect(e.enforceSync(sub, obj, act)).toBe(res);
}

async function testEnforceEx(e: Enforcer, sub: any, obj: string, act: string, res: [boolean, string[]]): Promise<void> {
  await expect(e.enforceEx(sub, obj, act)).resolves.toEqual(res);
}

function testEnforceExSync(e: Enforcer, sub: any, obj: string, act: string, res: [boolean, string[]]): void {
  expect(e.enforceExSync(sub, obj, act)).toEqual(res);
}

async function testGetPolicy(e: Enforcer, res: string[][]): Promise<void> {
  const myRes = await e.getPolicy();
  console.log('Policy: ', myRes);

  expect(Util.array2DEquals(res, myRes)).toBe(true);
}

test('TestKeyMatchModelInMemory', async () => {
  const m = new Model();
  m.addDef('r', 'r', 'sub, obj, act');
  m.addDef('p', 'p', 'sub, obj, act');
  m.addDef('e', 'e', 'some(where (p.eft == allow))');
  m.addDef('m', 'm', 'r.sub == p.sub && keyMatch(r.obj, p.obj) && regexMatch(r.act, p.act)');

  const a = getStringAdapter('examples/keymatch_policy.csv');

  let e = await newEnforcer(m, a);

  await testEnforce(e, 'alice', '/alice_data/resource1', 'GET', true);
  await testEnforce(e, 'alice', '/alice_data/resource1', 'POST', true);
  await testEnforce(e, 'alice', '/alice_data/resource2', 'GET', true);
  await testEnforce(e, 'alice', '/alice_data/resource2', 'POST', false);
  await testEnforce(e, 'alice', '/bob_data/resource1', 'GET', false);
  await testEnforce(e, 'alice', '/bob_data/resource1', 'POST', false);
  await testEnforce(e, 'alice', '/bob_data/resource2', 'GET', false);
  await testEnforce(e, 'alice', '/bob_data/resource2', 'POST', false);

  await testEnforce(e, 'bob', '/alice_data/resource1', 'GET', false);
  await testEnforce(e, 'bob', '/alice_data/resource1', 'POST', false);
  await testEnforce(e, 'bob', '/alice_data/resource2', 'GET', true);
  await testEnforce(e, 'bob', '/alice_data/resource2', 'POST', false);
  await testEnforce(e, 'bob', '/bob_data/resource1', 'GET', false);
  await testEnforce(e, 'bob', '/bob_data/resource1', 'POST', true);
  await testEnforce(e, 'bob', '/bob_data/resource2', 'GET', false);
  await testEnforce(e, 'bob', '/bob_data/resource2', 'POST', true);

  await testEnforce(e, 'cathy', '/cathy_data', 'GET', true);
  await testEnforce(e, 'cathy', '/cathy_data', 'POST', true);
  await testEnforce(e, 'cathy', '/cathy_data', 'DELETE', false);

  e = await newEnforcer(m);
  await a.loadPolicy(e.getModel());

  await testEnforce(e, 'alice', '/alice_data/resource1', 'GET', true);
  await testEnforce(e, 'alice', '/alice_data/resource1', 'POST', true);
  await testEnforce(e, 'alice', '/alice_data/resource2', 'GET', true);
  await testEnforce(e, 'alice', '/alice_data/resource2', 'POST', false);
  await testEnforce(e, 'alice', '/bob_data/resource1', 'GET', false);
  await testEnforce(e, 'alice', '/bob_data/resource1', 'POST', false);
  await testEnforce(e, 'alice', '/bob_data/resource2', 'GET', false);
  await testEnforce(e, 'alice', '/bob_data/resource2', 'POST', false);

  await testEnforce(e, 'bob', '/alice_data/resource1', 'GET', false);
  await testEnforce(e, 'bob', '/alice_data/resource1', 'POST', false);
  await testEnforce(e, 'bob', '/alice_data/resource2', 'GET', true);
  await testEnforce(e, 'bob', '/alice_data/resource2', 'POST', false);
  await testEnforce(e, 'bob', '/bob_data/resource1', 'GET', false);
  await testEnforce(e, 'bob', '/bob_data/resource1', 'POST', true);
  await testEnforce(e, 'bob', '/bob_data/resource2', 'GET', false);
  await testEnforce(e, 'bob', '/bob_data/resource2', 'POST', true);

  await testEnforce(e, 'cathy', '/cathy_data', 'GET', true);
  await testEnforce(e, 'cathy', '/cathy_data', 'POST', true);
  await testEnforce(e, 'cathy', '/cathy_data', 'DELETE', false);
});

test('TestKeyMatchModelInMemoryDeny', async () => {
  const m = new Model();
  m.addDef('r', 'r', 'sub, obj, act');
  m.addDef('p', 'p', 'sub, obj, act');
  m.addDef('e', 'e', '!some(where (p.eft == deny))');
  m.addDef('m', 'm', 'r.sub == p.sub && keyMatch(r.obj, p.obj) && regexMatch(r.act, p.act)');

  const a = getStringAdapter('examples/keymatch_policy.csv');

  const e = await newEnforcer(m, a);

  await testEnforce(e, 'alice', '/alice_data/resource2', 'POST', true);
});

test('TestRBACModelInMemoryIndeterminate', async () => {
  const m = new Model();
  m.addDef('r', 'r', 'sub, obj, act');
  m.addDef('p', 'p', 'sub, obj, act');
  m.addDef('g', 'g', '_, _');
  m.addDef('e', 'e', 'some(where (p.eft == allow))');
  m.addDef('m', 'm', 'g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act');

  const e = await newEnforcer(m);

  await e.addPermissionForUser('alice', 'data1', 'invalid');

  await testEnforce(e, 'alice', 'data1', 'read', false);
});

test('TestRBACModelInMemory', async () => {
  const m = new Model();
  m.addDef('r', 'r', 'sub, obj, act');
  m.addDef('p', 'p', 'sub, obj, act');
  m.addDef('g', 'g', '_, _');
  m.addDef('e', 'e', 'some(where (p.eft == allow))');
  m.addDef('m', 'm', 'g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act');

  const e = await newEnforcer(m);

  await e.addPermissionForUser('alice', 'data1', 'read');
  await e.addPermissionForUser('bob', 'data2', 'write');
  await e.addPermissionForUser('data2_admin', 'data2', 'read');
  await e.addPermissionForUser('data2_admin', 'data2', 'write');
  await e.addRoleForUser('alice', 'data2_admin');

  await testEnforce(e, 'alice', 'data1', 'read', true);
  await testEnforce(e, 'alice', 'data1', 'write', false);
  await testEnforce(e, 'alice', 'data2', 'read', true);
  await testEnforce(e, 'alice', 'data2', 'write', true);
  await testEnforce(e, 'bob', 'data1', 'read', false);
  await testEnforce(e, 'bob', 'data1', 'write', false);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', true);

  await e.deletePermissionForUser('alice', 'data1', 'read');
  await e.deletePermissionForUser('bob', 'data2', 'write');
  await e.deletePermissionForUser('data2_admin', 'data2', 'read');
  await e.deletePermissionForUser('data2_admin', 'data2', 'write');

  await testEnforce(e, 'alice', 'data1', 'read', false);
  await testEnforce(e, 'alice', 'data1', 'write', false);
  await testEnforce(e, 'alice', 'data2', 'read', false);
  await testEnforce(e, 'alice', 'data2', 'write', false);
  await testEnforce(e, 'bob', 'data1', 'read', false);
  await testEnforce(e, 'bob', 'data1', 'write', false);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', false);

  await e.addPermissionForUser('bob', 'data2', 'write');
  await e.addPermissionForUser('data2_admin', 'data2', 'read');
  await e.addPermissionForUser('data2_admin', 'data2', 'write');
  await e.addRoleForUser('alice', 'data2_admin');

  await testEnforce(e, 'alice', 'data2', 'read', true);
  await testEnforce(e, 'alice', 'data2', 'write', true);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', true);

  await e.deletePermission('data2', 'write');

  await testEnforce(e, 'alice', 'data2', 'read', true);
  await testEnforce(e, 'alice', 'data2', 'write', false);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', false);

  await e.addPermissionForUser('bob', 'data2', 'write');
  await e.addPermissionForUser('data2_admin', 'data2', 'read');
  await e.addPermissionForUser('data2_admin', 'data2', 'write');

  await testEnforce(e, 'alice', 'data2', 'read', true);
  await testEnforce(e, 'alice', 'data2', 'write', true);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', true);

  await e.deletePermissionsForUser('data2_admin');

  await testEnforce(e, 'alice', 'data2', 'read', false);
  await testEnforce(e, 'alice', 'data2', 'write', false);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', true);
});

test('TestRBACModelInMemory2', async () => {
  const text = `
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
`;
  const m = new Model(text);
  // The above is the same as:
  // const m = newModel();
  // m.loadModelFromText(text);

  const e = await newEnforcer(m);

  await e.addPermissionForUser('alice', 'data1', 'read');
  await e.addPermissionForUser('bob', 'data2', 'write');
  await e.addPermissionForUser('data2_admin', 'data2', 'read');
  await e.addPermissionForUser('data2_admin', 'data2', 'write');
  await e.addRoleForUser('alice', 'data2_admin');

  await testEnforce(e, 'alice', 'data1', 'read', true);
  await testEnforce(e, 'alice', 'data1', 'write', false);
  await testEnforce(e, 'alice', 'data2', 'read', true);
  await testEnforce(e, 'alice', 'data2', 'write', true);
  await testEnforce(e, 'bob', 'data1', 'read', false);
  await testEnforce(e, 'bob', 'data1', 'write', false);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', true);
});

test('TestNotUsedRBACModelInMemory', async () => {
  const m = new Model();
  m.addDef('r', 'r', 'sub, obj, act');
  m.addDef('p', 'p', 'sub, obj, act');
  m.addDef('g', 'g', '_, _');
  m.addDef('e', 'e', 'some(where (p.eft == allow))');
  m.addDef('m', 'm', 'g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act');

  const e = await newEnforcer(m);

  await e.addPermissionForUser('alice', 'data1', 'read');
  await e.addPermissionForUser('bob', 'data2', 'write');

  await testEnforce(e, 'alice', 'data1', 'read', true);
  await testEnforce(e, 'alice', 'data1', 'write', false);
  await testEnforce(e, 'alice', 'data2', 'read', false);
  await testEnforce(e, 'alice', 'data2', 'write', false);
  await testEnforce(e, 'bob', 'data1', 'read', false);
  await testEnforce(e, 'bob', 'data1', 'write', false);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', true);
});

test('TestReloadPolicy', async () => {
  const e = await getEnforcerWithPath('examples/rbac_model.conf', 'examples/rbac_policy.csv');

  await e.loadPolicy();
  await testGetPolicy(e, [
    ['alice', 'data1', 'read'],
    ['bob', 'data2', 'write'],
    ['data2_admin', 'data2', 'read'],
    ['data2_admin', 'data2', 'write'],
  ]);
});

test('TestSavePolicy', async () => {
  const e = await getEnforcerWithPath('examples/rbac_model.conf', 'examples/rbac_policy.csv');

  expect(e.savePolicy()).rejects.toThrowError(new Error('not implemented'));
});

test('TestClearPolicy', async () => {
  const e = await getEnforcerWithPath('examples/rbac_model.conf', 'examples/rbac_policy.csv');

  e.clearPolicy();
});

test('TestEnableEnforce', async () => {
  const e = await getEnforcerWithPath('examples/basic_model.conf', 'examples/basic_policy.csv');

  e.enableEnforce(false);
  await testEnforce(e, 'alice', 'data1', 'read', true);
  await testEnforce(e, 'alice', 'data1', 'write', true);
  await testEnforce(e, 'alice', 'data2', 'read', true);
  await testEnforce(e, 'alice', 'data2', 'write', true);
  await testEnforce(e, 'bob', 'data1', 'read', true);
  await testEnforce(e, 'bob', 'data1', 'write', true);
  await testEnforce(e, 'bob', 'data2', 'read', true);
  await testEnforce(e, 'bob', 'data2', 'write', true);

  e.enableEnforce(true);
  await testEnforce(e, 'alice', 'data1', 'read', true);
  await testEnforce(e, 'alice', 'data1', 'write', false);
  await testEnforce(e, 'alice', 'data2', 'read', false);
  await testEnforce(e, 'alice', 'data2', 'write', false);
  await testEnforce(e, 'bob', 'data1', 'read', false);
  await testEnforce(e, 'bob', 'data1', 'write', false);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', true);
});

test('TestEnableLog', async () => {
  const e = await getEnforcerWithPath('examples/basic_model.conf', 'examples/basic_policy.csv', true);
  // The log is enabled by default, so the above is the same with:
  // const e = await getEnforcerWithPath('examples/basic_model.conf', 'examples/basic_policy.csv');

  await testEnforce(e, 'alice', 'data1', 'read', true);
  await testEnforce(e, 'alice', 'data1', 'write', false);
  await testEnforce(e, 'alice', 'data2', 'read', false);
  await testEnforce(e, 'alice', 'data2', 'write', false);
  await testEnforce(e, 'bob', 'data1', 'read', false);
  await testEnforce(e, 'bob', 'data1', 'write', false);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', true);

  // The log can also be enabled or disabled at run-time.
  e.enableLog(false);
  await testEnforce(e, 'alice', 'data1', 'read', true);
  await testEnforce(e, 'alice', 'data1', 'write', false);
  await testEnforce(e, 'alice', 'data2', 'read', false);
  await testEnforce(e, 'alice', 'data2', 'write', false);
  await testEnforce(e, 'bob', 'data1', 'read', false);
  await testEnforce(e, 'bob', 'data1', 'write', false);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', true);
});

test('TestEnableAutoSave', async () => {
  const e = await getEnforcerWithPath('examples/basic_model.conf', 'examples/basic_policy.csv');

  e.enableAutoSave(false);
  // Because AutoSave is disabled, the policy change only affects the policy in Casbin enforcer,
  // it doesn't affect the policy in the storage.
  await e.removePolicy('alice', 'data1', 'read');
  // Reload the policy from the storage to see the effect.
  await e.loadPolicy();
  await testEnforce(e, 'alice', 'data1', 'read', true);
  await testEnforce(e, 'alice', 'data1', 'write', false);
  await testEnforce(e, 'alice', 'data2', 'read', false);
  await testEnforce(e, 'alice', 'data2', 'write', false);
  await testEnforce(e, 'bob', 'data1', 'read', false);
  await testEnforce(e, 'bob', 'data1', 'write', false);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', true);

  e.enableAutoSave(true);
  // TODO debug
  // Because AutoSave is enabled, the policy change not only affects the policy in Casbin enforcer,
  // but also affects the policy in the storage.
  // await e.removePolicy('alice', 'data1', 'read');

  // Reload the policy from the storage to see the effect.
  // await e.loadPolicy();
  await testEnforce(e, 'alice', 'data1', 'read', true); // Will not be false here.
  await testEnforce(e, 'alice', 'data1', 'write', false);
  await testEnforce(e, 'alice', 'data2', 'read', false);
  await testEnforce(e, 'alice', 'data2', 'write', false);
  await testEnforce(e, 'bob', 'data1', 'read', false);
  await testEnforce(e, 'bob', 'data1', 'write', false);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', true);
});

test('TestInitWithAdapter', async () => {
  const adapter = getStringAdapter('examples/basic_policy.csv');
  const e = await getEnforcerWithPath('examples/basic_model.conf', adapter);

  await testEnforce(e, 'alice', 'data1', 'read', true);
  await testEnforce(e, 'alice', 'data1', 'write', false);
  await testEnforce(e, 'alice', 'data2', 'read', false);
  await testEnforce(e, 'alice', 'data2', 'write', false);
  await testEnforce(e, 'bob', 'data1', 'read', false);
  await testEnforce(e, 'bob', 'data1', 'write', false);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', true);
});

test('TestInitWithStringAdapter', async () => {
  const policy = readFileSync('examples/basic_policy.csv').toString();
  const adapter = new MemoryAdapter(policy);
  const e = await getEnforcerWithPath('examples/basic_model.conf', adapter);

  await testEnforce(e, 'alice', 'data1', 'read', true);
  await testEnforce(e, 'alice', 'data1', 'write', false);
  await testEnforce(e, 'alice', 'data2', 'read', false);
  await testEnforce(e, 'alice', 'data2', 'write', false);
  await testEnforce(e, 'bob', 'data1', 'read', false);
  await testEnforce(e, 'bob', 'data1', 'write', false);
  await testEnforce(e, 'bob', 'data2', 'read', false);
  await testEnforce(e, 'bob', 'data2', 'write', true);
});

test('TestRoleLinks', async () => {
  const e = await getEnforcerWithPath('examples/rbac_model.conf');
  e.enableAutoBuildRoleLinks(false);
  await e.buildRoleLinks();
  await e.enforce('user501', 'data9', 'read');
});

test('TestGetAndSetModel', async () => {
  const e = await getEnforcerWithPath('examples/basic_model.conf', 'examples/basic_policy.csv');
  const e2 = await getEnforcerWithPath('examples/basic_with_root_model.conf', 'examples/basic_policy.csv');

  await testEnforce(e, 'root', 'data1', 'read', false);

  e.setModel(e2.getModel());

  await testEnforce(e, 'root', 'data1', 'read', true);
});

test('TestGetAndSetAdapterInMem', async () => {
  const e = await getEnforcerWithPath('examples/basic_model.conf', 'examples/basic_policy.csv');
  const e2 = await getEnforcerWithPath('examples/basic_model.conf', 'examples/basic_inverse_policy.csv');

  await testEnforce(e, 'alice', 'data1', 'read', true);
  await testEnforce(e, 'alice', 'data1', 'write', false);

  const a2 = e2.getAdapter();
  e.setAdapter(a2);
  await e.loadPolicy();
  await testEnforce(e, 'alice', 'data1', 'read', false);
  await testEnforce(e, 'alice', 'data1', 'write', true);
});

test('TestSetAdapterFromFile', async () => {
  const e = await getEnforcerWithPath('examples/basic_model.conf');

  await testEnforce(e, 'alice', 'data1', 'read', false);

  const a = getStringAdapter('examples/basic_policy.csv');
  e.setAdapter(a);
  await e.loadPolicy();

  await testEnforce(e, 'alice', 'data1', 'read', true);
});

test('TestSetAdapterFromString', async () => {
  const e = await getEnforcerWithPath('examples/basic_model.conf');

  await testEnforce(e, 'alice', 'data1', 'read', false);

  const policy = readFileSync('examples/basic_policy.csv').toString();

  const a = new MemoryAdapter(policy);
  e.setAdapter(a);
  await e.loadPolicy();

  await testEnforce(e, 'alice', 'data1', 'read', true);
});

test('TestInitEmpty with File Adapter', async () => {
  const e = await getEnforcerWithPath();

  const m = new Model();
  m.addDef('r', 'r', 'sub, obj, act');
  m.addDef('p', 'p', 'sub, obj, act');
  m.addDef('e', 'e', 'some(where (p.eft == allow))');
  m.addDef('m', 'm', 'r.sub == p.sub && keyMatch(r.obj, p.obj) && regexMatch(r.act, p.act)');

  const a = getStringAdapter('examples/keymatch_policy.csv');

  e.setModel(m);
  e.setAdapter(a);
  await e.loadPolicy();

  await testEnforce(e, 'alice', '/alice_data/resource1', 'GET', true);
});

test('TestInitEmpty with String Adapter', async () => {
  const e = await getEnforcerWithPath();

  const m = new Model();
  m.addDef('r', 'r', 'sub, obj, act');
  m.addDef('p', 'p', 'sub, obj, act');
  m.addDef('e', 'e', 'some(where (p.eft == allow))');
  m.addDef('m', 'm', 'r.sub == p.sub && keyMatch(r.obj, p.obj) && regexMatch(r.act, p.act)');

  const policy = readFileSync('examples/keymatch_policy.csv').toString();
  const a = new MemoryAdapter(policy);

  e.setModel(m);
  e.setAdapter(a);
  await e.loadPolicy();

  await testEnforce(e, 'alice', '/alice_data/resource1', 'GET', true);
});

describe('Unimplemented File Adapter methods', () => {
  let e = {} as Enforcer;
  let a = {} as MemoryAdapter;

  beforeEach(async () => {
    a = getStringAdapter('examples/basic_policy.csv');
    e = await getEnforcerWithPath('examples/basic_model.conf', a);
  });

  test('removeFilteredPolicy', async () => {
    await expect(a.removeFilteredPolicy('', '', 0, '')).rejects.toThrow('not implemented');
  });
});

describe('Unimplemented String Adapter methods', () => {
  let e = {} as Enforcer;
  let a = {} as MemoryAdapter;

  beforeEach(async () => {
    const policy = readFileSync('examples/basic_policy.csv').toString();
    a = new MemoryAdapter(policy);
    e = await getEnforcerWithPath('examples/basic_model.conf', a);
  });

  test('removeFilteredPolicy', async () => {
    await expect(a.removeFilteredPolicy('', '', 0, '')).rejects.toThrow('not implemented');
  });
});

class TestSub {
  Name: string;
  Age: number;

  constructor(name: string, age: number) {
    this.Name = name;
    this.Age = age;
  }
}

test('test ABAC Scaling', async () => {
  const e = await getEnforcerWithPath('examples/abac_rule_model.conf', 'examples/abac_rule_policy.csv');

  const sub1 = new TestSub('alice', 16);
  const sub2 = new TestSub('alice', 20);
  const sub3 = new TestSub('alice', 65);

  await testEnforce(e, sub1, '/data1', 'read', false);
  await testEnforce(e, sub1, '/data2', 'read', false);
  await testEnforce(e, sub1, '/data1', 'write', false);
  await testEnforce(e, sub1, '/data2', 'write', true);
  await testEnforce(e, sub2, '/data1', 'read', true);
  await testEnforce(e, sub2, '/data2', 'read', false);
  await testEnforce(e, sub2, '/data1', 'write', false);
  await testEnforce(e, sub2, '/data2', 'write', true);
  await testEnforce(e, sub3, '/data1', 'read', true);
  await testEnforce(e, sub3, '/data2', 'read', false);
  await testEnforce(e, sub3, '/data1', 'write', false);
  await testEnforce(e, sub3, '/data2', 'write', false);
});

test('test ABAC multiple eval()', async () => {
  const m = new Model();
  m.addDef('r', 'r', 'sub, obj, act');
  m.addDef('p', 'p', 'sub_rule_1, sub_rule_2, act');
  m.addDef('e', 'e', 'some(where (p.eft == allow))');
  m.addDef('m', 'm', 'eval(p.sub_rule_1) && eval(p.sub_rule_2) && r.act == p.act');

  const policy = new MemoryAdapter(
    `
    p, r.sub > 50, r.obj > 50, read
    `
  );

  const e = await newEnforcer(m, policy);
  await testEnforce(e, 56, (98 as unknown) as string, 'read', true);
  await testEnforce(e, 23, (67 as unknown) as string, 'read', false);
  await testEnforce(e, 78, (34 as unknown) as string, 'read', false);
});

test('TestEnforceSync', async () => {
  const m = new Model();
  m.addDef('r', 'r', 'sub, obj, act');
  m.addDef('p', 'p', 'sub, obj, act');
  m.addDef('g', 'g', '_, _');
  m.addDef('e', 'e', 'some(where (p.eft == allow))');
  m.addDef('m', 'm', 'g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act');

  const e = await getEnforcerWithPath(m);

  await e.addPermissionForUser('alice', 'data1', 'invalid');

  testEnforceSync(e, 'alice', 'data1', 'read', false);
});

test('TestEnforceEx', async () => {
  const m = new Model();
  m.addDef('r', 'r', 'sub, obj, act');
  m.addDef('p', 'p', 'sub, obj, act');
  m.addDef('g', 'g', '_, _');
  m.addDef('e', 'e', 'some(where (p.eft == allow))');
  m.addDef('m', 'm', 'g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act');

  const e = await getEnforcerWithPath(m);

  await e.addPermissionForUser('alice', 'data1', 'invalid');

  await testEnforceEx(e, 'alice', 'data1', 'read', [false, []]);
  await testEnforceEx(e, 'alice', 'data1', 'invalid', [true, ['alice', 'data1', 'invalid']]);
});

test('TestSyncEnforceEx', async () => {
  const m = new Model();
  m.addDef('r', 'r', 'sub, obj, act');
  m.addDef('p', 'p', 'sub, obj, act');
  m.addDef('g', 'g', '_, _');
  m.addDef('e', 'e', 'some(where (p.eft == allow))');
  m.addDef('m', 'm', 'g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act');

  const e = await getEnforcerWithPath(m);

  await e.addPermissionForUser('alice', 'data1', 'invalid');

  testEnforceExSync(e, 'alice', 'data1', 'read', [false, []]);
  testEnforceExSync(e, 'alice', 'data1', 'invalid', [true, ['alice', 'data1', 'invalid']]);
});

test('Test RBAC G2', async () => {
  const e = await getEnforcerWithPath('examples/rbac_g2_model.conf', 'examples/rbac_g2_policy.csv');
  expect(await e.enforce('alice', 'data1', 'read')).toBe(false);
  expect(await e.enforce('admin', 'data1', 'read')).toBe(true);
});

test('test ABAC multiple eval()', async () => {
  const m = new Model();
  m.addDef('r', 'r', 'sub, obj, act');
  m.addDef('p', 'p', 'sub_rule_1, sub_rule_2, act');
  m.addDef('e', 'e', 'some(where (p.eft == allow))');
  m.addDef('m', 'm', 'eval(p.sub_rule_1) && eval(p.sub_rule_2) && r.act == p.act');

  const policy = new MemoryAdapter(
    `
    p, r.sub > 50, r.obj > 50, read
    `
  );

  const e = await newEnforcer(m, policy);
  await testEnforce(e, 56, (98 as unknown) as string, 'read', true);
  await testEnforce(e, 23, (67 as unknown) as string, 'read', false);
  await testEnforce(e, 78, (34 as unknown) as string, 'read', false);
});

test('TestBatchEnforce', async () => {
  const e = await getEnforcerWithPath('examples/basic_model.conf', 'examples/basic_policy.csv');
  const requests: string[][] = [
    ['alice', 'data1', 'read'],
    ['bob', 'data2', 'write'],
  ];
  expect(await e.batchEnforce(requests)).toEqual([true, true]);
});

test('TestEnforce Multiple policies config', async () => {
  const m = new Model();
  m.addDef('r', 'r2', 'sub, obj, act');
  m.addDef('p', 'p2', 'sub, obj, act');
  m.addDef('g', 'g', '_, _');
  m.addDef('e', 'e2', 'some(where (p.eft == allow))');
  m.addDef('m', 'm2', 'g(r2.sub, p2.sub) && r2.obj == p2.obj && r2.act == p2.act');
  const a = getStringAdapter('examples/mulitple_policy.csv');

  const e = await newEnforcer(m, a);

  //const e = await getEnforcerWithPath(m);
  const enforceContext = new EnforceContext('r2', 'p2', 'e2', 'm2');
  await expect(e.enforce(enforceContext, 'alice', 'data1', 'read')).resolves.toStrictEqual(true);
  await expect(e.enforce(enforceContext, 'bob', 'data2', 'write')).resolves.toStrictEqual(true);
});

test('new EnforceContext config', async () => {
  const m = new Model();
  m.addDef('r', 'r2', 'sub, obj, act');
  m.addDef('p', 'p2', 'sub, obj, act');
  m.addDef('g', 'g', '_, _');
  m.addDef('e', 'e2', 'some(where (p.eft == allow))');
  m.addDef('m', 'm2', 'g(r2.sub, p2.sub) && r2.obj == p2.obj && r2.act == p2.act');
  const a = getStringAdapter('examples/mulitple_policy.csv');

  const e = await newEnforcer(m, a);

  //const e = await getEnforcerWithPath(m);
  const enforceContext = new NewEnforceContext('2');
  await expect(e.enforce(enforceContext, 'alice', 'data1', 'read')).resolves.toStrictEqual(true);
  await expect(e.enforce(enforceContext, 'bob', 'data2', 'write')).resolves.toStrictEqual(true);
});

test('TestEnforceEX Multiple policies config', async () => {
  const m = new Model();
  m.addDef('r', 'r2', 'sub, obj, act');
  m.addDef('p', 'p2', 'sub, obj, act');
  m.addDef('g', 'g', '_, _');
  m.addDef('e', 'e2', 'some(where (p.eft == allow))');
  m.addDef('m', 'm2', 'g(r2.sub, p2.sub) && r2.obj == p2.obj && r2.act == p2.act');
  const a = getStringAdapter('examples/mulitple_policy.csv');

  const e = await newEnforcer(m, a);

  //const e = await getEnforcerWithPath(m);
  const enforceContext = new EnforceContext('r2', 'p2', 'e2', 'm2');
  await expect(e.enforceEx(enforceContext, 'alice', 'data1', 'read')).resolves.toStrictEqual([true, ['alice', 'data1', 'read']]);
  await expect(e.enforceEx(enforceContext, 'bob', 'data2', 'write')).resolves.toStrictEqual([true, ['bob', 'data2', 'write']]);
});

test('new EnforceContextEX config', async () => {
  const m = new Model();
  m.addDef('r', 'r2', 'sub, obj, act');
  m.addDef('p', 'p2', 'sub, obj, act');
  m.addDef('g', 'g', '_, _');
  m.addDef('e', 'e2', 'some(where (p.eft == allow))');
  m.addDef('m', 'm2', 'g(r2.sub, p2.sub) && r2.obj == p2.obj && r2.act == p2.act');
  const a = getStringAdapter('examples/mulitple_policy.csv');

  const e = await newEnforcer(m, a);

  //const e = await getEnforcerWithPath(m);
  const enforceContext = new NewEnforceContext('2');
  await expect(e.enforceEx(enforceContext, 'alice', 'data1', 'read')).resolves.toStrictEqual([true, ['alice', 'data1', 'read']]);
  await expect(e.enforceEx(enforceContext, 'bob', 'data2', 'write')).resolves.toStrictEqual([true, ['bob', 'data2', 'write']]);
});

test('TestKeyGet2', async () => {
  const e = await getEnforcerWithPath('examples/basic_keyget2_model.conf', 'examples/basic_keyget2_policy.csv');
  expect(await e.enforce('alice', 'data')).toBe(false);
  expect(await e.enforce('alice', '/data')).toBe(false);
  expect(await e.enforce('alice', '/data/1')).toBe(true);
});

test('TestEnforceExWithRBACDenyModel', async () => {
  const e = await getEnforcerWithPath('examples/rbac_with_deny_model.conf', 'examples/rbac_with_deny_policy.csv');
  testEnforceEx(e, 'alice', 'data1', 'read', [true, ['alice', 'data1', 'read', 'allow']]);
  testEnforceEx(e, 'bob', 'data2', 'write', [true, ['bob', 'data2', 'write', 'allow']]);
  testEnforceEx(e, 'alice', 'data2', 'write', [false, ['alice', 'data2', 'write', 'deny']]);
  testEnforceEx(e, 'data2_admin', 'data2', 'read', [true, ['data2_admin', 'data2', 'read', 'allow']]);
  testEnforceEx(e, 'data2_admin', 'data2', 'write', [true, ['data2_admin', 'data2', 'write', 'allow']]);
  testEnforceEx(e, 'data2_admin', 'data1', 'read', [false, []]);
  testEnforceEx(e, 'data2_admin', 'data1', 'write', [false, []]);
});

test('TestEnforceExWithGlobModel', async () => {
  const e = await getEnforcerWithPath('examples/glob_model.conf', 'examples/glob_policy.csv');
  testEnforceEx(e, 'u1', '/foo/1', 'read', [true, ['u1', '/foo/*', 'read']]);
  testEnforceEx(e, 'u2', '/foo1', 'read', [true, ['u2', '/foo*', 'read']]);
  testEnforceEx(e, 'u3', '/foo/2', 'read', [false, []]);
});

test('TestEnforceExWithKeyMatchModel', async () => {
  const e = await getEnforcerWithPath('examples/keymatch_model.conf', 'examples/keymatch_policy.csv');
  testEnforceEx(e, 'alice', '/alice_data/1', 'GET', [true, ['alice', '/alice_data/*', 'GET']]);
  testEnforceEx(e, 'bob', '/alice_data/1', 'POST', [false, []]);
});

test('TestEnforceExWithPriorityModel', async () => {
  const e = await getEnforcerWithPath('examples/priority_model.conf', 'examples/priority_policy.csv');
  testEnforceEx(e, 'alice', 'data1', 'read', [true, ['alice', 'data1', 'read', 'allow']]);
  testEnforceEx(e, 'bob', 'data2', 'read', [true, ['data2_allow_group', 'data2', 'read', 'allow']]);
  testEnforceEx(e, 'alice', 'data2', 'read', [false, []]);
});

test('testgetAllUsersByDomain', async () => {
  const e = await getEnforcerWithPath('examples/rbac_with_domains_model.conf', 'examples/rbac_with_domains_policy.csv');
  expect(await e.getAllUsersByDomain('domain1')).toStrictEqual(['alice', 'admin']);
  expect(await e.getAllUsersByDomain('domain2')).toStrictEqual(['bob', 'admin']);
});

test('testgetAllDomains', async () => {
  const e = await getEnforcerWithPath('examples/rbac_with_domains_model.conf', 'examples/rbac_with_domains_policy.csv');
  expect(await e.getAllDomains()).toStrictEqual(['domain1', 'domain2']);
});

test('testdeleteAllUsersByDomain', async () => {
  const e = await getEnforcerWithPath('examples/rbac_with_domains_model.conf', 'examples/rbac_with_domains_policy.csv');
  expect(await e.getAllUsersByDomain('domain1')).toStrictEqual(['alice', 'admin']);
  expect(await e.deleteAllUsersByDomain('domain1')).toBe(true);
  expect(await e.getAllUsersByDomain('domain1')).toStrictEqual([]);
});

test('testdeleteDomains', async () => {
  const e = await getEnforcerWithPath('examples/rbac_with_domains_model.conf', 'examples/rbac_with_domains_policy.csv');
  expect(await e.getAllDomains()).toStrictEqual(['domain1', 'domain2']);
  expect(await e.deleteDomains('domain1', 'domain2')).toBe(true);
  expect(await e.enforce('alice', 'domain1', 'data1', 'read')).toBe(false);
  expect(await e.getAllUsersByDomain('domain1')).toStrictEqual([]);
  expect(await e.getAllUsersByDomain('domain2')).toStrictEqual([]);
});
