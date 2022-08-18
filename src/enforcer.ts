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

import { ManagementEnforcer } from './managementEnforcer';
import { Model } from './model';
import { Adapter, MemoryAdapter } from './persist';
import { getLogger } from './log';
import { arrayRemoveDuplicates } from './util';

/**
 * Enforcer = ManagementEnforcer + RBAC API.
 */
export class Enforcer extends ManagementEnforcer {
  /**
   * initWithModelAndAdapter initializes an enforcer with a model and a database adapter.
   * @param m model instance
   * @param adapter current adapter instance
   * @param lazyLoad whether to load policy at initial time
   */
  public async initWithModelAndAdapter(m: Model, adapter?: Adapter, lazyLoad = false): Promise<void> {
    if (adapter) {
      this.adapter = adapter;
    }

    this.model = m;
    this.model.printModel();

    this.initRmMap();

    if (!lazyLoad && this.adapter) {
      await this.loadPolicy();
    }
  }

  /**
   * getRolesForUser gets the roles that a user has.
   *
   * @param name the user.
   * @param domain the domain.
   * @return the roles that the user has.
   */
  public async getRolesForUser(name: string, domain?: string): Promise<string[]> {
    const rm = this.rmMap.get('g');
    if (rm) {
      if (domain === undefined) {
        return rm.getRoles(name);
      } else {
        return rm.getRoles(name, domain);
      }
    }
    throw new Error("RoleManager didn't exist.");
  }

  /**
   * getUsersForRole gets the users that has a role.
   *
   * @param name the role.
   * @param domain the domain.
   * @return the users that has the role.
   */
  public async getUsersForRole(name: string, domain?: string): Promise<string[]> {
    const rm = this.rmMap.get('g');
    if (rm) {
      if (domain === undefined) {
        return rm.getUsers(name);
      } else {
        return rm.getUsers(name, domain);
      }
    }
    throw new Error("RoleManager didn't exist.");
  }

  /**
   * hasRoleForUser determines whether a user has a role.
   *
   * @param name the user.
   * @param role the role.
   * @param domain the domain.
   * @return whether the user has the role.
   */
  public async hasRoleForUser(name: string, role: string, domain?: string): Promise<boolean> {
    const roles = await this.getRolesForUser(name, domain);
    let hasRole = false;
    for (const r of roles) {
      if (r === role) {
        hasRole = true;
        break;
      }
    }

    return hasRole;
  }

  /**
   * addRoleForUser adds a role for a user.
   * Returns false if the user already has the role (aka not affected).
   *
   * @param user the user.
   * @param role the role.
   * @param domain the domain.
   * @return succeeds or not.
   */
  public async addRoleForUser(user: string, role: string, domain?: string): Promise<boolean> {
    if (domain === undefined) {
      return this.addGroupingPolicy(user, role);
    } else {
      return this.addGroupingPolicy(user, role, domain);
    }
  }

  /**
   * addRoleForUserInDomain adds a role for a user.
   * Returns false if the user already has the role (aka not affected).
   *
   * @param user the user.
   * @param role the role.
   * @param domain the domain.
   * @return succeeds or not.
   */
  public async addRoleForUserInDomain(user: string, role: string, domain: string): Promise<boolean> {
    return this.addGroupingPolicy(user, role, domain);
  }

  /**
   * deleteRoleForUser deletes a role for a user.
   * Returns false if the user does not have the role (aka not affected).
   *
   * @param user the user.
   * @param role the role.
   * @param domain the domain.
   * @return succeeds or not.
   */
  public async deleteRoleForUser(user: string, role: string, domain?: string): Promise<boolean> {
    if (domain === undefined) {
      return this.removeGroupingPolicy(user, role);
    } else {
      return this.removeGroupingPolicy(user, role, domain);
    }
  }
  /**
   * deleteRoleForUserInDomain deletes a role for a user.
   * Returns false if the user does not have the role (aka not affected).
   *
   * @param user the user.
   * @param role the role.
   * @param domain the domain.
   * @return succeeds or not.
   */
  public async deleteRoleForUserInDomain(user: string, role: string, domain?: string): Promise<boolean> {
    return this.deleteRoleForUser(user, role, domain);
  }

  /**
   * deleteRolesForUser deletes all roles for a user.
   * Returns false if the user does not have any roles (aka not affected).
   *
   * @param user the user.
   * @param domain the domain.
   * @return succeeds or not.
   */
  public async deleteRolesForUser(user: string, domain?: string): Promise<boolean> {
    if (domain === undefined) {
      return this.removeFilteredGroupingPolicy(0, user);
    } else {
      return this.removeFilteredGroupingPolicy(0, user, '', domain);
    }
  }

  /**
   * deleteRolesForUserInDomain deletes all roles for a user.
   * Returns false if the user does not have any roles (aka not affected).
   *
   * @param user the user.
   * @param domain the domain.
   * @return succeeds or not.
   */
  public async deleteRolesForUserInDomain(user: string, domain?: string): Promise<boolean> {
    return this.deleteRolesForUser(user, domain);
  }

  /**
   * GetAllUsersByDomain would get all users associated with the domain.
   *
   * @param domain the domain.
   * @returns Array of all users in the domain.
   */
  public async getAllUsersByDomain(domain: string): Promise<string[]> {
    const index = await this.getFieldIndex('p', 'dom');
    if (index === -1) {
      return [];
    }
    const users: string[] = [];
    const m = new Map();
    const g = this.model.model.get('g')?.get('g');
    const p = this.model.model.get('p')?.get('p');

    function getUser(index: number, policies: string[][], domain: string, m: Map<string, unknown>): string[] {
      if (policies.length === 0 || policies[0].length <= index) {
        return [];
      }
      const res: string[] = [];
      for (const policy of policies) {
        const ok = m.get(policy[0]);
        if (policy[index] === domain && !ok) {
          res.push(policy[0]);
          m.set(policy[0], {});
        }
      }
      return res;
    }

    if (g?.policy) {
      users.push(...getUser(2, g?.policy, domain, m));
    }
    if (p?.policy) {
      users.push(...getUser(index, p?.policy, domain, m));
    }
    return users;
  }

  /**
   * DeleteAllUsersByDomain would delete all users associated with the domain. Returns false if has no domain defined in model.
   *
   * @param domain the domain.
   * @returns succeeds or not.
   */
  public async deleteAllUsersByDomain(domain: string): Promise<boolean> {
    const index = await this.getFieldIndex('p', 'dom');
    if (index === -1) {
      return false;
    }
    const g = this.model.model.get('g')?.get('g');
    const p = this.model.model.get('p')?.get('p');

    function getUsers(policies: string[][], domain: string): string[][] {
      if (policies.length === 0 || policies[0].length <= index) {
        return [];
      }
      const res: string[][] = [];
      for (const policy of policies) {
        if (policy.indexOf(domain) !== -1) {
          res.push(policy);
        }
      }
      return res;
    }

    if (g?.policy && p?.policy) {
      let users = getUsers(p?.policy, domain);
      if (!(await this.removePolicies(users))) {
        return false;
      }

      users = getUsers(g?.policy, domain);
      if (!(await this.removeGroupingPolicies(users))) {
        return false;
      }
    } else {
      return false;
    }

    return true;
  }

  /**
   * deleteUser deletes a user.
   * Returns false if the user does not exist (aka not affected).
   *
   * @param user the user.
   * @return succeeds or not.
   */
  public async deleteUser(user: string): Promise<boolean> {
    const res1 = await this.removeFilteredGroupingPolicy(0, user);
    const res2 = await this.removeFilteredPolicy(0, user);
    return res1 || res2;
  }

  /**
   * deleteRole deletes a role.
   * Returns false if the role does not exist (aka not affected).
   *
   * @param role the role.
   * @return succeeds or not.
   */
  public async deleteRole(role: string): Promise<boolean> {
    const res1 = await this.removeFilteredGroupingPolicy(1, role);
    const res2 = await this.removeFilteredPolicy(0, role);
    return res1 || res2;
  }

  /**
   * deletePermission deletes a permission.
   * Returns false if the permission does not exist (aka not affected).
   *
   * @param permission the permission, usually be (obj, act). It is actually the rule without the subject.
   * @return succeeds or not.
   */
  public async deletePermission(...permission: string[]): Promise<boolean> {
    return this.removeFilteredPolicy(1, ...permission);
  }

  /**
   * DeleteDomains would delete all associated users and roles.
   * It would delete all domains if parameter is not provided.
   *
   * @param domains the domains to be deleted.
   * @return succeeds or not.
   */
  public async deleteDomains(...domains: string[]): Promise<boolean> {
    if (domains.length === 0) {
      this.clearPolicy();
      return true;
    }

    for (const domain of domains) {
      if (!(await this.deleteAllUsersByDomain(domain))) {
        return false;
      }
    }

    const rm = this.getRoleManager();
    await rm.clear();

    return true;
  }

  /**
   * getAllDomains would get all domains.
   */
  public async getAllDomains(): Promise<string[]> {
    const rm = this.getRoleManager();
    return rm.getAllDomains();
  }

  /**
   * addPermissionForUser adds a permission for a user or role.
   * Returns false if the user or role already has the permission (aka not affected).
   *
   * @param user the user.
   * @param permission the permission, usually be (obj, act). It is actually the rule without the subject.
   * @return succeeds or not.
   */
  public async addPermissionForUser(user: string, ...permission: string[]): Promise<boolean> {
    permission.unshift(user);
    return this.addPolicy(...permission);
  }

  /**
   * deletePermissionForUser deletes a permission for a user or role.
   * Returns false if the user or role does not have the permission (aka not affected).
   *
   * @param user the user.
   * @param permission the permission, usually be (obj, act). It is actually the rule without the subject.
   * @return succeeds or not.
   */
  public async deletePermissionForUser(user: string, ...permission: string[]): Promise<boolean> {
    permission.unshift(user);
    return this.removePolicy(...permission);
  }

  /**
   * deletePermissionsForUser deletes permissions for a user or role.
   * Returns false if the user or role does not have any permissions (aka not affected).
   *
   * @param user the user.
   * @return succeeds or not.
   */
  public async deletePermissionsForUser(user: string): Promise<boolean> {
    return this.removeFilteredPolicy(0, user);
  }

  /**
   * getPermissionsForUser gets permissions for a user or role.
   *
   * @param user the user.
   * @return the permissions, a permission is usually like (obj, act). It is actually the rule without the subject.
   */
  public async getPermissionsForUser(user: string): Promise<string[][]> {
    return this.getFilteredPolicy(0, user);
  }

  /**
   * hasPermissionForUser determines whether a user has a permission.
   *
   * @param user the user.
   * @param permission the permission, usually be (obj, act). It is actually the rule without the subject.
   * @return whether the user has the permission.
   */
  public async hasPermissionForUser(user: string, ...permission: string[]): Promise<boolean> {
    permission.unshift(user);
    return this.hasPolicy(...permission);
  }

  /**
   * getImplicitRolesForUser gets implicit roles that a user has.
   * Compared to getRolesForUser(), this function retrieves indirect roles besides direct roles.
   * For example:
   * g, alice, role:admin
   * g, role:admin, role:user
   *
   * getRolesForUser("alice") can only get: ["role:admin"].
   * But getImplicitRolesForUser("alice") will get: ["role:admin", "role:user"].
   */
  public async getImplicitRolesForUser(name: string, ...domain: string[]): Promise<string[]> {
    const res = new Set<string>();
    const q = [name];
    let n: string | undefined;
    while ((n = q.shift()) !== undefined) {
      for (const rm of this.rmMap.values()) {
        const role = await rm.getRoles(n, ...domain);
        role.forEach((r) => {
          if (!res.has(r)) {
            res.add(r);
            q.push(r);
          }
        });
      }
    }

    return Array.from(res);
  }

  /**
   * getImplicitPermissionsForUser gets implicit permissions for a user or role.
   * Compared to getPermissionsForUser(), this function retrieves permissions for inherited roles.
   * For example:
   * p, admin, data1, read
   * p, alice, data2, read
   * g, alice, admin
   *
   * getPermissionsForUser("alice") can only get: [["alice", "data2", "read"]].
   * But getImplicitPermissionsForUser("alice") will get: [["admin", "data1", "read"], ["alice", "data2", "read"]].
   */
  public async getImplicitPermissionsForUser(user: string, ...domain: string[]): Promise<string[][]> {
    const roles = await this.getImplicitRolesForUser(user, ...domain);
    roles.unshift(user);
    const res: string[][] = [];
    const withDomain = domain && domain.length !== 0;

    for (const n of roles) {
      if (withDomain) {
        const p = await this.getFilteredPolicy(0, n, ...domain);
        res.push(...p);
      } else {
        const p = await this.getPermissionsForUser(n);
        res.push(...p);
      }
    }

    return res;
  }

  /**
   * getPermissionsForUserInDomain gets implicit permissions for a user or role.
   * Compared to getPermissionsForUser(), this function retrieves permissions for inherited roles.
   */

  public async getPermissionsForUserInDomain(user: string, domain: string): Promise<string[][]> {
    const res = await this.getImplicitPermissionsForUser(user, domain);
    return res;
  }

  /**
   * getImplicitUsersForRole gets implicit users that a role has.
   * Compared to getUsersForRole(), this function retrieves indirect users besides direct users.
   * For example:
   * g, alice, role:admin
   * g, role:admin, role:user
   *
   * getUsersForRole("user") can only get: ["role:admin"].
   * But getImplicitUsersForRole("user") will get: ["role:admin", "alice"].
   */
  public async getImplicitUsersForRole(role: string, ...domain: string[]): Promise<string[]> {
    const res = new Set<string>();
    const q = [role];
    let n: string | undefined;
    while ((n = q.shift()) !== undefined) {
      for (const rm of this.rmMap.values()) {
        const user = await rm.getUsers(n, ...domain);
        user.forEach((u) => {
          if (!res.has(u)) {
            res.add(u);
            q.push(u);
          }
        });
      }
    }

    return Array.from(res);
  }

  /**
   * getRolesForUserInDomain gets the roles that a user has inside a domain
   * An alias for getRolesForUser with the domain params.
   *
   * @param name the user.
   * @param domain the domain.
   * @return the roles that the user has.
   */
  public async getRolesForUserInDomain(name: string, domain: string): Promise<string[]> {
    return this.getRolesForUser(name, domain);
  }

  /**
   * getUsersForRoleInFomain gets the users that has a role inside a domain
   * An alias for getUsesForRole with the domain params.
   *
   * @param name the role.
   * @param domain the domain.
   * @return the users that has the role.
   */
  public async getUsersForRoleInDomain(name: string, domain: string): Promise<string[]> {
    return this.getUsersForRole(name, domain);
  }

  /**
   * getImplicitUsersForPermission gets implicit users for a permission.
   * For example:
   * p, admin, data1, read
   * p, bob, data1, read
   * g, alice, admin
   *
   * getImplicitUsersForPermission("data1", "read") will get: ["alice", "bob"].
   * Note: only users will be returned, roles (2nd arg in "g") will be excluded.
   */
  public async getImplicitUsersForPermission(...permission: string[]): Promise<string[]> {
    const res: string[] = [];
    const policySubjects = await this.getAllSubjects();
    const subjects = arrayRemoveDuplicates([...policySubjects, ...this.model.getValuesForFieldInPolicyAllTypes('g', 0)]);
    const inherits = this.model.getValuesForFieldInPolicyAllTypes('g', 1);

    for (const user of subjects) {
      const allowed = await this.enforce(user, ...permission);
      if (allowed) {
        res.push(user);
      }
    }

    return res.filter((n) => !inherits.some((m) => n === m));
  }
}

export async function newEnforcerWithClass<T extends Enforcer>(
  enforcer: new () => T,
  model?: Model,
  adapter: Adapter = new MemoryAdapter([]),
  enableLog = false
): Promise<T> {
  const e = new enforcer();

  if (enableLog) {
    getLogger().enableLog(enableLog);
  }

  if (model) {
    await e.initWithModelAndAdapter(model, adapter);
  }

  return e;
}

/**
 * newEnforcer creates an enforcer via Model and Adapter.
 *
 * @example
 * const m = new Model(`
 * [request_definition]
 * r = sub, obj, act
 *
 * [policy_definition]
 * p = sub, obj, act
 *
 * [policy_effect]
 * e = some(where (p.eft == allow))
 *
 * [matchers]
 * m = r.sub == p.sub && r.obj == p.obj && r.act == p.act`)
 * `)
 *
 * const a = new MemoryAdapter(`
 * p, alice, data1, read
 * p, bob, data2, write
 * `)
 * const e = await newEnforcer(m, a, true)
 *
 * @param model the Model instance
 * @param adapter the Adapter instance
 * @param enableLog whether to enable the logging
 */
export async function newEnforcer(model?: Model, adapter: Adapter = new MemoryAdapter([]), enableLog = false): Promise<Enforcer> {
  return newEnforcerWithClass(Enforcer, model, adapter, enableLog);
}
