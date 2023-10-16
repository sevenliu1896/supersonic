import React, { ReactNode } from 'react';
import { AGG_TYPE_MAP, PREFIX_CLS } from '../../common/constants';
import { ChatContextType, DateInfoType, EntityInfoType, FilterItemType } from '../../common/type';
import { DatePicker } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import Loading from './Loading';
import FilterItem from './FilterItem';
import moment from 'moment';

const { RangePicker } = DatePicker;

type Props = {
  parseLoading: boolean;
  parseInfoOptions: ChatContextType[];
  parseTip: string;
  currentParseInfo?: ChatContextType;
  agentId?: number;
  dimensionFilters: FilterItemType[];
  dateInfo: DateInfoType;
  entityInfo: EntityInfoType;
  onSelectParseInfo: (parseInfo: ChatContextType) => void;
  onSwitchEntity: (entityId: string) => void;
  onFiltersChange: (filters: FilterItemType[]) => void;
  onDateInfoChange: (dateRange: any) => void;
};

const MAX_OPTION_VALUES_COUNT = 2;

const ParseTip: React.FC<Props> = ({
  parseLoading,
  parseInfoOptions,
  parseTip,
  currentParseInfo,
  agentId,
  dimensionFilters,
  dateInfo,
  entityInfo,
  onSelectParseInfo,
  onSwitchEntity,
  onFiltersChange,
  onDateInfoChange,
}) => {
  const prefixCls = `${PREFIX_CLS}-item`;

  const getNode = (tipTitle: ReactNode, tipNode?: ReactNode, parseSucceed?: boolean) => {
    return (
      <div className={`${prefixCls}-parse-tip`}>
        <div className={`${prefixCls}-title-bar`}>
          <CheckCircleFilled className={`${prefixCls}-step-icon`} />
          <div className={`${prefixCls}-step-title`}>
            {tipTitle}
            {!tipNode && <Loading />}
          </div>
        </div>
        {tipNode && <div className={`${prefixCls}-content-container`}>{tipNode}</div>}
      </div>
    );
  };

  if (parseLoading) {
    return getNode('意图解析中');
  }

  if (parseTip) {
    return getNode('意图解析失败', parseTip);
  }

  if (parseInfoOptions.length === 0) {
    return null;
  }

  const {
    modelId,
    modelName,
    dimensions,
    metrics,
    aggType,
    queryMode,
    properties,
    entity,
    elementMatches,
    nativeQuery,
  } = currentParseInfo || {};

  const { type } = properties || {};
  const entityAlias = entity?.alias?.[0]?.split('.')?.[0];
  const entityName = elementMatches?.find(item => item.element?.type === 'ID')?.element.name;

  const entityDimensions = entityInfo?.dimensions?.filter(
    item =>
      !['zyqk_song_id', 'song_name', 'singer_id', 'zyqk_cmpny_id'].includes(item.bizName) &&
      !(
        entityInfo?.dimensions?.some(dimension => dimension.bizName === 'singer_id') &&
        item.bizName === 'singer_name'
      ) &&
      !(
        entityInfo?.dimensions?.some(dimension => dimension.bizName === 'zyqk_cmpny_id') &&
        item.bizName === 'cmpny_name'
      )
  );

  const getTipNode = () => {
    const dimensionItems = dimensions?.filter(item => item.type === 'DIMENSION');
    const metric = metrics?.[0];

    const itemValueClass = `${prefixCls}-tip-item-value`;
    const entityId = dimensionFilters?.length > 0 ? dimensionFilters[0].value : undefined;
    const entityAlias = entity?.alias?.[0]?.split('.')?.[0];
    const entityName = elementMatches?.find(item => item.element?.type === 'ID')?.element.name;

    const { type: agentType, name: agentName } = properties || {};

    const fields =
      queryMode === 'ENTITY_DETAIL' ? dimensionItems?.concat(metrics || []) : dimensionItems;

    return (
      <div className={`${prefixCls}-tip-content`}>
        {!!agentType && queryMode !== 'DSL' ? (
          <div className={`${prefixCls}-tip-item`}>
            将由{agentType === 'plugin' ? '插件' : '内置'}工具
            <span className={itemValueClass}>{agentName}</span>来解答
          </div>
        ) : (
          <>
            {(queryMode?.includes('ENTITY') || queryMode === 'DSL') &&
            typeof entityId === 'string' &&
            !!entityAlias &&
            !!entityName ? (
              <div className={`${prefixCls}-tip-item`}>
                <div className={`${prefixCls}-tip-item-name`}>{entityAlias}：</div>
                <div className={itemValueClass}>{entityName}</div>
              </div>
            ) : (
              <div className={`${prefixCls}-tip-item`}>
                <div className={`${prefixCls}-tip-item-name`}>数据模型：</div>
                <div className={itemValueClass}>{modelName}</div>
              </div>
            )}
            {!queryMode?.includes('ENTITY') &&
              metric &&
              !dimensions?.some(item => item.bizName?.includes('_id')) && (
                <div className={`${prefixCls}-tip-item`}>
                  <div className={`${prefixCls}-tip-item-name`}>指标：</div>
                  <div className={itemValueClass}>{metric.name}</div>
                </div>
              )}
            {['METRIC_GROUPBY', 'METRIC_ORDERBY', 'ENTITY_DETAIL', 'DSL'].includes(queryMode!) &&
              fields &&
              fields.length > 0 && (
                <div className={`${prefixCls}-tip-item`}>
                  <div className={`${prefixCls}-tip-item-name`}>
                    {queryMode === 'DSL'
                      ? nativeQuery
                        ? '查询字段'
                        : '下钻维度'
                      : queryMode === 'ENTITY_DETAIL'
                      ? '查询字段'
                      : '下钻维度'}
                    ：
                  </div>
                  <div className={itemValueClass}>
                    {fields
                      .slice(0, MAX_OPTION_VALUES_COUNT)
                      .map(field => field.name)
                      .join('、')}
                    {fields.length > MAX_OPTION_VALUES_COUNT && '...'}
                  </div>
                </div>
              )}
            {queryMode !== 'ENTITY_ID' &&
              entityDimensions &&
              entityDimensions?.length > 0 &&
              !dimensions?.some(item => item.bizName?.includes('_id')) &&
              entityDimensions.some(dimension => dimension.value != null) &&
              entityDimensions.map(dimension => (
                <div className={`${prefixCls}-tip-item`} key={dimension.itemId}>
                  <div className={`${prefixCls}-tip-item-name`}>{dimension.name}：</div>
                  <div className={itemValueClass}>{dimension.value}</div>
                </div>
              ))}
            {queryMode === 'METRIC_ORDERBY' && aggType && aggType !== 'NONE' && (
              <div className={`${prefixCls}-tip-item`}>
                <div className={`${prefixCls}-tip-item-name`}>聚合方式：</div>
                <div className={itemValueClass}>{AGG_TYPE_MAP[aggType]}</div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const getFilterContent = (filters: any) => {
    const itemValueClass = `${prefixCls}-tip-item-value`;
    const { startDate, endDate } = dateInfo || {};
    return (
      <div className={`${prefixCls}-tip-item-filter-content`}>
        <div className={`${prefixCls}-tip-item-option`}>
          <span className={`${prefixCls}-tip-item-filter-name`}>数据时间：</span>
          {nativeQuery ? (
            <span className={itemValueClass}>
              {startDate === endDate ? startDate : `${startDate} ~ ${endDate}`}
            </span>
          ) : (
            <RangePicker
              className={`${prefixCls}-range-picker`}
              value={[moment(startDate), moment(endDate)]}
              onChange={onDateInfoChange}
              allowClear={false}
            />
          )}
        </div>
        {filters?.map((filter: any) => (
          <FilterItem
            modelId={modelId!}
            filters={dimensionFilters}
            filter={filter}
            chatContext={currentParseInfo!}
            entityAlias={entityAlias}
            agentId={agentId}
            onFiltersChange={onFiltersChange}
            onSwitchEntity={onSwitchEntity}
            key={filter.name}
          />
        ))}
      </div>
    );
  };

  const getFiltersNode = () => {
    return (
      <div className={`${prefixCls}-tip-item`}>
        <div className={`${prefixCls}-tip-item-name`}>筛选条件：</div>
        <div className={`${prefixCls}-tip-item-content`}>{getFilterContent(dimensionFilters)}</div>
      </div>
    );
  };

  const tipNode = (
    <div className={`${prefixCls}-tip`}>
      {getTipNode()}
      {getFiltersNode()}
      {(!type || queryMode === 'DSL') && entityAlias && entityAlias !== '厂牌' && entityName && (
        <div className={`${prefixCls}-switch-entity-tip`}>
          (如未匹配到相关{entityAlias}，可点击{entityAlias === '艺人' ? '歌手' : entityAlias}ID切换)
        </div>
      )}
    </div>
  );

  return getNode(
    <div className={`${prefixCls}-title-bar`}>
      <div>意图解析{parseInfoOptions?.length > 1 ? '：' : ''}</div>
      {parseInfoOptions?.length > 1 && (
        <div className={`${prefixCls}-content-options`}>
          {parseInfoOptions.map((parseInfo, index) => (
            <div
              className={`${prefixCls}-content-option ${
                parseInfo.id === currentParseInfo?.id ? `${prefixCls}-content-option-active` : ''
              }`}
              onClick={() => {
                onSelectParseInfo(parseInfo);
              }}
              key={parseInfo.id}
            >
              解析{index + 1}
            </div>
          ))}
        </div>
      )}
    </div>,
    tipNode,
    true
  );
};

export default ParseTip;
