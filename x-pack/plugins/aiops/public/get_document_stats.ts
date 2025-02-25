/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, get } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { SignificantTerm } from '@kbn/ml-agg-utils';
import type { Query } from '@kbn/es-query';

import { buildExtendedBaseFilterCriteria } from './application/utils/build_extended_base_filter_criteria';
import { GroupTableItem } from './components/spike_analysis_table/types';

export interface DocumentCountStats {
  interval?: number;
  buckets?: { [key: string]: number };
  timeRangeEarliest?: number;
  timeRangeLatest?: number;
  totalCount: number;
}

export interface DocumentStatsSearchStrategyParams {
  earliest?: number;
  latest?: number;
  intervalMs?: number;
  index: string;
  searchQuery: Query['query'];
  timeFieldName?: string;
  runtimeFieldMap?: estypes.MappingRuntimeFields;
  fieldsToFetch?: string[];
  selectedSignificantTerm?: SignificantTerm;
  includeSelectedSignificantTerm?: boolean;
  selectedGroup?: GroupTableItem | null;
}

export const getDocumentCountStatsRequest = (params: DocumentStatsSearchStrategyParams) => {
  const {
    index,
    timeFieldName,
    earliest: earliestMs,
    latest: latestMs,
    runtimeFieldMap,
    searchQuery,
    intervalMs,
    fieldsToFetch,
    selectedSignificantTerm,
    includeSelectedSignificantTerm,
    selectedGroup,
  } = params;

  const size = 0;
  const filterCriteria = buildExtendedBaseFilterCriteria(
    timeFieldName,
    earliestMs,
    latestMs,
    searchQuery,
    selectedSignificantTerm,
    includeSelectedSignificantTerm,
    selectedGroup
  );

  // Don't use the sampler aggregation as this can lead to some potentially
  // confusing date histogram results depending on the date range of data amongst shards.
  const aggs = {
    eventRate: {
      date_histogram: {
        field: timeFieldName,
        fixed_interval: `${intervalMs}ms`,
        min_doc_count: 0,
        extended_bounds: {
          min: earliestMs,
          max: latestMs,
        },
      },
    },
  };

  const searchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    ...(!fieldsToFetch && timeFieldName !== undefined && intervalMs !== undefined && intervalMs > 0
      ? { aggs }
      : {}),
    ...(isPopulatedObject(runtimeFieldMap) ? { runtime_mappings: runtimeFieldMap } : {}),
    track_total_hits: true,
    size,
  };
  return {
    index,
    body: searchBody,
  };
};

export const processDocumentCountStats = (
  body: estypes.SearchResponse | undefined,
  params: DocumentStatsSearchStrategyParams
): DocumentCountStats | undefined => {
  if (!body) return undefined;

  const totalCount = (body.hits.total as estypes.SearchTotalHits).value ?? body.hits.total ?? 0;

  if (
    params.intervalMs === undefined ||
    params.earliest === undefined ||
    params.latest === undefined
  ) {
    return {
      totalCount,
    };
  }
  const buckets: { [key: string]: number } = {};
  const dataByTimeBucket: Array<{ key: string; doc_count: number }> = get(
    body,
    ['aggregations', 'eventRate', 'buckets'],
    []
  );
  each(dataByTimeBucket, (dataForTime) => {
    const time = dataForTime.key;
    buckets[time] = dataForTime.doc_count;
  });

  return {
    interval: params.intervalMs,
    buckets,
    timeRangeEarliest: params.earliest,
    timeRangeLatest: params.latest,
    totalCount,
  };
};
