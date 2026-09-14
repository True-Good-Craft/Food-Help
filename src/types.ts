// SPDX-License-Identifier: MPL-2.0
import type { Site } from '../.generated/site.d.ts';
import type { Dataset } from '../.generated/dataset.d.ts';
export type { Site, Dataset };
export type Resource = Dataset['resources'][number];
export type Organization = Dataset['organizations'][number];
export type PublicDataset = Dataset & Required<Pick<Dataset, 'deployment_id' | 'dataset_version' | 'compatibility_id' | 'data_updated_on'>>;
export type Usage = { schema_version: 1; deployment_id: string; period_start: string; period_end: string; generated_at: string; counts: Record<'page_starts' | 'call_actions' | 'directions_actions' | 'source_link_actions' | 'installation_signals', number | null> };
export type RuntimeConfig = { site: Site; compatibility_id: string; data_url: string };
