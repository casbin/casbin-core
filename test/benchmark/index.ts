import BenchmarkEnforcerCached from './cachedEnforcer';
import BenchmarkModel from './model';

async function Benchmark(): Promise<void> {
  await BenchmarkModel();
  await BenchmarkEnforcerCached();
}

Benchmark();
