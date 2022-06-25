import BenchmarkEnforcerCached from './cachedEnforcer';
import BenchmarkManagementAPI from './managementAPI';
import BenchmarkModel from './model';
import BenchmarkRoleManager from './roleManager';

async function Benchmark(): Promise<void> {
  await BenchmarkModel();
  await BenchmarkEnforcerCached();
  await BenchmarkManagementAPI();
  await BenchmarkRoleManager();
}

Benchmark();
