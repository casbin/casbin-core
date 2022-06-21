import BenchmarkEnforcerCached from './cachedEnforcer';
import BenchmarkManagementAPI from './managementAPI';
import BenchmarkModel from './model';

async function Benchmark(): Promise<void> {
  await BenchmarkModel();
  await BenchmarkEnforcerCached();
  await BenchmarkManagementAPI();
}

Benchmark();
