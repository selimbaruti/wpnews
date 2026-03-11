/**
 * Source Definitions Index
 *
 * This file exports all source configurations.
 *
 * TO ADD A NEW SOURCE:
 * 1. Create a new file in this directory (e.g., ora-news.ts)
 * 2. Export your SourceConfig from that file
 * 3. Import and add it to the array below
 *
 * That's it! The source will automatically be:
 * - Registered in the source registry
 * - Available for syncing
 * - Shown in the frontend
 */

import type { SourceConfig } from '../../core/types';
import { balkanwebSource } from './balkanweb';
import { topChannelSource } from './topchannel';
import { ditarSource } from './ditar';
import { monitorSource } from './monitor';
import { ekofinSource } from './ekofin';

/**
 * All source configurations.
 * Add new sources here after creating their definition files.
 */
export const sourceDefinitions: readonly SourceConfig[] = [
  balkanwebSource,
  topChannelSource,
  ditarSource,
  monitorSource,
  ekofinSource,
];

/**
 * Re-export individual sources for direct access if needed
 */
export { balkanwebSource } from './balkanweb';
export { topChannelSource } from './topchannel';
export { ditarSource } from './ditar';
export { monitorSource } from './monitor';
export { ekofinSource } from './ekofin';
