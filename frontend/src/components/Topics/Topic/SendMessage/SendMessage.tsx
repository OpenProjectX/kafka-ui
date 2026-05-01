import React from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { RouteParamsClusterTopic } from 'lib/paths';
import { Button } from 'components/common/Button/Button';
import Editor from 'components/common/Editor/Editor';
import InputWithOptions from 'components/common/InputWithOptions/InputWithOptions';
import MultiSelect from 'components/common/MultiSelect/MultiSelect.styled';
import Select from 'components/common/Select/Select';
import Switch from 'components/common/Switch/Switch';
import Tooltip from 'components/common/Tooltip/Tooltip';
import InfoIcon from 'components/common/Icons/InfoIcon';
import useAppParams from 'lib/hooks/useAppParams';
import { showAlert } from 'lib/errorHandling';
import { useSendMessage, useTopicDetails } from 'lib/hooks/api/topics';
import { InputLabel } from 'components/common/Input/InputLabel.styled';
import { useSerdes } from 'lib/hooks/api/topicMessages';
import {
  SerdeDescription,
  SerdeParameter,
  SerdeUsage,
} from 'generated-sources';
import { MessageFormData } from 'lib/interfaces/message';
import { Option } from 'react-multi-select-component';

import * as S from './SendMessage.styled';
import {
  getDefaultValues,
  getPartitionOptions,
  getSerdeOptions,
  validateBySchema,
} from './utils';

interface SendMessageProps {
  closeSidebar: () => void;
  messageData?: Partial<MessageFormData> | null;
}

const getSerdeParameters = (
  serdeName: string | undefined,
  serdeList: SerdeDescription[] | undefined
): SerdeParameter[] => {
  if (!serdeName || !serdeList) return [];
  const serde = serdeList.find((s) => s.name === serdeName);
  return serde?.parameters ?? [];
};

const SendMessage: React.FC<SendMessageProps> = ({
  closeSidebar,
  messageData = null,
}) => {
  const { clusterName, topicName } = useAppParams<RouteParamsClusterTopic>();
  const [searchParams] = useSearchParams();
  const urlKeySerde = searchParams.get('keySerde');
  const urlValueSerde = searchParams.get('valueSerde');
  const { data: topic } = useTopicDetails({ clusterName, topicName });
  const { data: serdes = {} } = useSerdes({
    clusterName,
    topicName,
    use: SerdeUsage.SERIALIZE,
  });
  const sendMessage = useSendMessage({ clusterName, topicName });
  const defaultValues = React.useMemo(() => getDefaultValues(serdes), [serdes]);
  const partitionOptions = React.useMemo(
    () => getPartitionOptions(topic?.partitions || []),
    [topic]
  );

  const formDefaults = React.useMemo(() => {
    const defaultPartition = Number(partitionOptions[0]?.value || 0);
    const selectedPartitions =
      messageData?.partitions ||
      (messageData?.partition !== undefined
        ? [messageData.partition]
        : [defaultPartition]);

    return {
      ...defaultValues,
      ...(urlKeySerde ? { keySerde: urlKeySerde } : {}),
      ...(urlValueSerde ? { valueSerde: urlValueSerde } : {}),
      partition: selectedPartitions[0] ?? defaultPartition,
      partitions: selectedPartitions,
      messageCount: 1,
      keepContents: false,
      ...messageData,
    };
  }, [
    defaultValues,
    partitionOptions,
    messageData,
    urlKeySerde,
    urlValueSerde,
  ]);

  const {
    handleSubmit,
    formState: { isSubmitting },
    control,
    setValue,
  } = useForm<MessageFormData>({
    mode: 'onChange',
    defaultValues: formDefaults,
  });

  const keySerde = useWatch({ control, name: 'keySerde' });
  const valueSerde = useWatch({ control, name: 'valueSerde' });

  const keySerdeParameters = React.useMemo(
    () => getSerdeParameters(keySerde, serdes.key),
    [keySerde, serdes.key]
  );

  const valueSerdeParameters = React.useMemo(
    () => getSerdeParameters(valueSerde, serdes.value),
    [valueSerde, serdes.value]
  );

  const prevKeySerde = React.useRef(keySerde);
  React.useEffect(() => {
    if (prevKeySerde.current !== keySerde) {
      setValue('keySerdeParams', undefined);
      prevKeySerde.current = keySerde;
    }
  }, [keySerde, setValue]);

  const prevValueSerde = React.useRef(valueSerde);
  React.useEffect(() => {
    if (prevValueSerde.current !== valueSerde) {
      setValue('valueSerdeParams', undefined);
      prevValueSerde.current = valueSerde;
    }
  }, [valueSerde, setValue]);

  const renderParameters = (
    parameters: SerdeParameter[],
    prefix: 'keySerdeParams' | 'valueSerdeParams'
  ) => {
    return parameters.map((param) => {
      if (!param.allowedValues || param.allowedValues.length === 0) return null;
      const fieldName = `${prefix}.${param.name}`;
      const label = param.visibleName || param.name;
      const options = param.allowedValues.map((v) => ({
        label: v,
        value: v,
      }));
      return (
        <div key={fieldName}>
          <InputLabel>{label}</InputLabel>
          <Controller
            control={control}
            name={fieldName as keyof MessageFormData}
            render={({ field: { name, onChange, value } }) => (
              <InputWithOptions
                name={name}
                onChange={onChange}
                minWidth="100%"
                options={options}
                value={value as string}
                placeholder={`Search ${label.toLowerCase()}...`}
                inputSize="L"
              />
            )}
          />
        </div>
      );
    });
  };

  const submit = async ({
    keySerde: formKeySerde,
    valueSerde: formValueSerde,
    key,
    content,
    headers,
    partition,
    partitions,
    messageCount,
    keySerdeParams,
    valueSerdeParams,
    keepContents,
  }: MessageFormData) => {
    let errors: string[] = [];
    const selectedPartitions =
      partitions === undefined ? [partition || 0] : partitions;
    const selectedMessageCount = Number(messageCount) || 0;

    if (selectedPartitions.length === 0) {
      errors.push('At least one partition must be selected');
    }

    if (!Number.isInteger(selectedMessageCount) || selectedMessageCount < 1) {
      errors.push('Message count must be greater than zero');
    }

    if (formKeySerde) {
      const selectedKeySerde = serdes.key?.find((k) => k.name === formKeySerde);
      errors = validateBySchema(key, selectedKeySerde?.schema, 'key');
    }

    if (formValueSerde) {
      const selectedValue = serdes.value?.find(
        (v) => v.name === formValueSerde
      );
      errors = [
        ...errors,
        ...validateBySchema(content, selectedValue?.schema, 'content'),
      ];
    }

    let parsedHeaders;
    if (headers) {
      try {
        parsedHeaders = JSON.parse(headers);
      } catch (error) {
        errors.push('Wrong header format');
      }
    }

    if (errors.length > 0) {
      showAlert('error', {
        id: `${clusterName}-${topicName}-createTopicMessageError`,
        title: 'Validation Error',
        message: (
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ),
      });
      return;
    }
    try {
      await sendMessage.mutateAsync({
        key: key || null,
        value: content || null,
        headers: parsedHeaders,
        partition: selectedPartitions[0] || 0,
        partitions: selectedPartitions,
        messageCount: selectedMessageCount,
        keySerde: formKeySerde,
        valueSerde: formValueSerde,
        ...(keySerdeParams && Object.keys(keySerdeParams).length > 0
          ? { keySerdeProperties: keySerdeParams }
          : {}),
        ...(valueSerdeParams && Object.keys(valueSerdeParams).length > 0
          ? { valueSerdeProperties: valueSerdeParams }
          : {}),
      });
      if (!keepContents) {
        setValue('key', defaultValues.key || '');
        setValue('content', defaultValues.content || '');
        closeSidebar();
      }
    } catch (e) {
      // do nothing
    }
  };

  return (
    <S.Wrapper>
      <form onSubmit={handleSubmit(submit)}>
        <S.Columns>
          <S.FlexItem>
            <InputLabel id="partitionOptionsLabel">Partitions</InputLabel>
            <Controller
              control={control}
              name="partitions"
              render={({ field: { onChange, value } }) => (
                <MultiSelect
                  labelledBy="partitionOptionsLabel"
                  minWidth="100%"
                  options={partitionOptions}
                  value={
                    (value || [])
                      .map((selectedPartition) =>
                        partitionOptions.find(
                          ({ value: optionValue }) =>
                            Number(optionValue) === selectedPartition
                        )
                      )
                      .filter(Boolean) as Option[]
                  }
                  onChange={(selected: Option[]) =>
                    onChange(
                      selected.map(({ value: optionValue }) =>
                        Number(optionValue)
                      )
                    )
                  }
                  disabled={isSubmitting}
                  overrideStrings={{ selectSomeItems: 'Select partitions' }}
                />
              )}
            />
          </S.FlexItem>
          <S.FlexItem>
            <InputLabel htmlFor="messageCount">Message Count</InputLabel>
            <Controller
              control={control}
              name="messageCount"
              render={({ field: { name, onChange, value } }) => (
                <S.NumberInput
                  id="messageCount"
                  name={name}
                  type="number"
                  min={1}
                  step={1}
                  value={value ?? ''}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    onChange(
                      event.target.value === ''
                        ? undefined
                        : Number(event.target.value)
                    )
                  }
                />
              )}
            />
          </S.FlexItem>
          <S.Flex>
            <S.FlexItem>
              <div>
                <InputLabel id="keySerdeOptionsLabel">Key Serde</InputLabel>
                <Controller
                  control={control}
                  name="keySerde"
                  render={({ field: { name, onChange, value } }) => (
                    <Select
                      id="selectKeySerdeOptions"
                      aria-labelledby="keySerdeOptionsLabel"
                      name={name}
                      onChange={onChange}
                      minWidth="100%"
                      options={getSerdeOptions(serdes.key || [])}
                      value={value}
                    />
                  )}
                />
              </div>
              {renderParameters(keySerdeParameters, 'keySerdeParams')}
            </S.FlexItem>
            <S.FlexItem>
              <div>
                <InputLabel id="valueSerdeOptionsLabel">Value Serde</InputLabel>
                <Controller
                  control={control}
                  name="valueSerde"
                  render={({ field: { name, onChange, value } }) => (
                    <Select
                      id="selectValueSerdeOptions"
                      aria-labelledby="valueSerdeOptionsLabel"
                      name={name}
                      onChange={onChange}
                      minWidth="100%"
                      options={getSerdeOptions(serdes.value || [])}
                      value={value}
                    />
                  )}
                />
              </div>
              {renderParameters(valueSerdeParameters, 'valueSerdeParams')}
            </S.FlexItem>
          </S.Flex>
        </S.Columns>
        <S.Columns>
          <div>
            <InputLabel>Key</InputLabel>
            <Controller
              control={control}
              name="key"
              render={({ field: { name, onChange, value } }) => (
                <Editor
                  readOnly={isSubmitting}
                  name={name}
                  onChange={onChange}
                  value={value}
                  height="40px"
                />
              )}
            />
          </div>
          <div>
            <InputLabel>Value</InputLabel>
            <Controller
              control={control}
              name="content"
              render={({ field: { name, onChange, value } }) => (
                <Editor
                  readOnly={isSubmitting}
                  name={name}
                  onChange={onChange}
                  value={value}
                  height="280px"
                />
              )}
            />
          </div>
        </S.Columns>
        <S.Columns>
          <div>
            <InputLabel>Headers</InputLabel>
            <Controller
              control={control}
              name="headers"
              render={({ field: { name, onChange, value } }) => (
                <Editor
                  readOnly={isSubmitting}
                  name={name}
                  onChange={onChange}
                  value={value || '{}'}
                  height="40px"
                />
              )}
            />
          </div>
        </S.Columns>
        <S.Columns>
          <S.Flex>
            <Controller
              control={control}
              name="keepContents"
              render={({ field: { name, onChange, value } }) => (
                <Switch name={name} onChange={onChange} checked={value} />
              )}
            />
            <InputLabel>Keep contents after producing a message</InputLabel>
            <Tooltip
              value={<InfoIcon />}
              content="When enabled, the form will remain populated after sending a message."
            />
          </S.Flex>
        </S.Columns>
        <Button
          buttonSize="M"
          buttonType="primary"
          type="submit"
          disabled={isSubmitting}
        >
          Produce Message
        </Button>
      </form>
    </S.Wrapper>
  );
};

export default SendMessage;
