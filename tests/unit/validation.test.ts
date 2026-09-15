import { describe, it } from 'node:test';
import { expect } from '@playwright/test';
import sourceJSON from '../../examples/exampleville/resources.json' with { type: 'json' };
import { assertDataset, publicDataset, reviewDataset } from '../../src/validation.ts';
import type { Dataset } from '../../src/types.ts';

const fixture = () => structuredClone(sourceJSON) as unknown as Dataset;
const removeCostEvidence = (data: Dataset) => data.resources[0]!.evidence.forEach(item => {
  const index = item.supports.indexOf('cost');
  if (index >= 0) item.supports.splice(index, 1);
});

describe('published cost classification', () => {
  it('accepts resolved public costs while allowing an unresolved draft sentinel', () => {
    const data = fixture();
    expect(data.resources.find(resource => resource.id === 'draft-example')?.cost?.state).toBe('unknown');
    expect(() => assertDataset(data)).not.toThrow();
  });

  it('rejects a published non-closed resource with missing or unknown cost', () => {
    const missing = fixture();
    delete missing.resources[0]!.cost;
    removeCostEvidence(missing);
    expect(() => assertDataset(missing)).toThrow(/resolved cost classification/);

    const unknown = fixture();
    unknown.resources[0]!.cost = { state: 'unknown', description: 'Not yet classified.' };
    expect(() => assertDataset(unknown)).toThrow(/resolved cost classification/);
  });

  it('requires evidence for a published cost without imposing that rule on closed records', () => {
    const unsupported = fixture();
    removeCostEvidence(unsupported);
    expect(() => assertDataset(unsupported)).toThrow(/cost evidence/);

    const closed = fixture();
    const record = closed.resources.find(resource => resource.id === 'closed-example')!;
    record.cost = { state: 'unknown', description: 'Historical cost is unresolved.' };
    expect(() => assertDataset(closed)).not.toThrow();
  });

  it('accepts generated draft data only through the isolated review validator', () => {
    const source = fixture();
    const resources = source.resources.filter(resource => resource.publication_status !== 'withdrawn' && resource.service_condition !== 'closed');
    const compatibility = 'a'.repeat(64);
    const review = { ...source, resources, deployment_id: 'exampleville', compatibility_id: compatibility, dataset_version: 'b'.repeat(64), data_updated_on: '2026-09-15' };
    expect(() => reviewDataset(review, 'exampleville', compatibility)).not.toThrow();
    expect(() => publicDataset(review, 'exampleville', compatibility)).toThrow(/Unpublished record/);
    expect(() => reviewDataset(review, 'another-deployment', compatibility)).toThrow(/another deployment/);
  });
});
