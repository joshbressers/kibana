/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextAreaWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { WebhookParams } from '../../../common/slack/types';

export const SlackWebhookParamsFields: React.FunctionComponent<
  ActionParamsProps<WebhookParams>
> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  defaultMessage,
  useDefaultMessage,
}) => {
  const { message } = actionParams;

  useEffect(() => {
    if (useDefaultMessage || !message) {
      editAction('message', defaultMessage, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultMessage, useDefaultMessage]);

  return (
    <TextAreaWithMessageVariables
      index={index}
      editAction={editAction}
      messageVariables={messageVariables}
      paramsProperty="message"
      inputTargetValue={message}
      label={i18n.translate('xpack.stackConnectors.components.slack.messageTextAreaFieldLabel', {
        defaultMessage: 'Message',
      })}
      errors={(errors.message ?? []) as string[]}
    />
  );
};
