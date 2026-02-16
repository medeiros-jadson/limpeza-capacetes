import type { DataSource } from 'typeorm';

let _getDataSource: () => Promise<DataSource>;

export async function getDataSource(): Promise<DataSource> {
  if (!_getDataSource) {
    const mod = await import('./data-source');
    _getDataSource = mod.getDataSource;
  }
  return _getDataSource();
}
