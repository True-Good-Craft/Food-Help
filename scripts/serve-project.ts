// SPDX-License-Identifier: MPL-2.0
import { serve } from './serve.ts';
const index = process.argv.indexOf('--port');
const port = index < 0 ? 4175 : Number(process.argv[index + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('--port requires a valid port number');
await serve({ root: 'dist/project', port });
