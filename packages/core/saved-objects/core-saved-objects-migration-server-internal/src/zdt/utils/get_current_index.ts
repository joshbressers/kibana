/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { escapeRegExp } from 'lodash';
import type { FetchIndexResponse } from '../../actions';

export const getCurrentIndex = (
  indices: FetchIndexResponse,
  indexPrefix: string
): string | undefined => {
  const matcher = new RegExp(`^${escapeRegExp(indexPrefix)}[_](?<counter>\\d+)$`);

  let lastCount = -1;
  Object.keys(indices).forEach((indexName) => {
    const match = matcher.exec(indexName);
    if (match && match.groups?.counter) {
      const suffix = parseInt(match.groups.counter, 10);
      lastCount = Math.max(lastCount, suffix);
    }
  });

  return lastCount === -1 ? undefined : `${indexPrefix}_${lastCount}`;
};
