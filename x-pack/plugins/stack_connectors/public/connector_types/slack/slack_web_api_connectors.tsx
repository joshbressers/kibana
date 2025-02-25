/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ActionConnectorFieldsProps,
  SecretsFieldSchema,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from './translations';

const secretsFormSchema: SecretsFieldSchema[] = [
  {
    id: 'token',
    label: i18n.TOKEN_LABEL,
    isPasswordField: true,
  },
];

export const SlackWebApiActionsFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => (
  <SimpleConnectorForm
    isEdit={isEdit}
    readOnly={readOnly}
    configFormSchema={[]}
    secretsFormSchema={secretsFormSchema}
  />
);
