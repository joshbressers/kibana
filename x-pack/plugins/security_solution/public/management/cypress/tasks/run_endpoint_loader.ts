/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const runEndpointLoaderScript = () => {
  // FIXME:PT remove use of `hostname` and `configport` nad use `KIBANA_URL`
  const {
    ELASTICSEARCH_USERNAME,
    ELASTICSEARCH_PASSWORD,
    ELASTICSEARCH_URL,
    hostname,
    configport,
  } = Cypress.env();

  const ES_URL = new URL(ELASTICSEARCH_URL);
  ES_URL.username = ELASTICSEARCH_USERNAME;
  ES_URL.password = ELASTICSEARCH_PASSWORD;

  const KBN_URL = new URL(
    `${ES_URL.protocol}//${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD}@${hostname}:${configport}`
  );

  // FIXME: remove use of cli script and use instead data loaders
  const script = `node scripts/endpoint/resolver_generator.js --node="${ES_URL.toString()}" --kibana="${KBN_URL.toString()}" --delete --numHosts=1 --numDocs=1 --fleet --withNewUser=santaEndpoint:changeme --anc=1 --gen=1 --ch=1 --related=1 --relAlerts=1`;

  cy.exec(script, { env: { NODE_TLS_REJECT_UNAUTHORIZED: 1 } });
};
