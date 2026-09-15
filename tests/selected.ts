// SPDX-License-Identifier: MPL-2.0
export type SelectedBuild = { directory: string; sourceDir: string; production: boolean };
export const selectedBuilds: SelectedBuild[] = process.env.FOOD_HELP_TEST_DEPLOYMENTS
  ? JSON.parse(process.env.FOOD_HELP_TEST_DEPLOYMENTS)
  : [{ directory: 'dist/exampleville', sourceDir: 'examples/exampleville', production: false }];
