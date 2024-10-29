import {
  ChatContextType,
  DateInfoType,
  EntityInfoType,
  FilterItemType,
  MsgDataType,
  ParseStateEnum,
  ParseTimeCostType,
  RangeValue,
  SimilarQuestionType,
} from '../../common/type';
import { useEffect, useState } from 'react';
import { chatExecute, chatParse, queryData, deleteQuery, switchEntity } from '../../service';
import { PARSE_ERROR_TIP, PREFIX_CLS, SEARCH_EXCEPTION_TIP } from '../../common/constants';
import { Spin } from 'antd';
import IconFont from '../IconFont';
import ExpandParseTip from './ExpandParseTip';
import ParseTip from './ParseTip';
import ExecuteItem from './ExecuteItem';
import { isMobile } from '../../utils/utils';
import classNames from 'classnames';
import Tools from '../Tools';
import SqlItem from './SqlItem';
import SimilarQuestionItem from './SimilarQuestionItem';
import { AgentType } from '../../Chat/type';
import dayjs, { Dayjs } from 'dayjs';
import { exportCsvFile } from '../../utils/utils';

type Props = {
  msg: string;
  conversationId?: number;
  modelId?: number;
  agentId?: number;
  score?: number;
  filter?: any[];
  parseInfos?: ChatContextType[];
  parseTimeCostValue?: ParseTimeCostType;
  msgData?: MsgDataType;
  triggerResize?: boolean;
  isDeveloper?: boolean;
  integrateSystem?: string;
  executeItemNode?: React.ReactNode;
  renderCustomExecuteNode?: boolean;
  isSimpleMode?: boolean;
  isDebugMode?: boolean;
  currentAgent?: AgentType;
  isLastMessage?: boolean;
  onMsgDataLoaded?: (data: MsgDataType, valid: boolean, isRefresh?: boolean) => void;
  onUpdateMessageScroll?: () => void;
  onSendMsg?: (msg: string) => void;
};

const ChatItem: React.FC<Props> = ({
  msg,
  conversationId,
  modelId,
  agentId,
  score,
  filter,
  triggerResize,
  parseInfos,
  parseTimeCostValue,
  msgData,
  isDeveloper,
  integrateSystem,
  executeItemNode,
  renderCustomExecuteNode,
  isSimpleMode,
  currentAgent,
  isDebugMode,
  isLastMessage,
  onMsgDataLoaded,
  onUpdateMessageScroll,
  onSendMsg,
}) => {
  const [parseLoading, setParseLoading] = useState(false);
  const [parseTimeCost, setParseTimeCost] = useState<ParseTimeCostType>();
  const [parseInfo, setParseInfo] = useState<ChatContextType>();
  const [parseInfoOptions, setParseInfoOptions] = useState<ChatContextType[]>([]);
  const [parseTip, setParseTip] = useState('');
  const [executeMode, setExecuteMode] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [executeTip, setExecuteTip] = useState('');
  const [executeErrorMsg, setExecuteErrorMsg] = useState('');
  const [data, setData] = useState<MsgDataType>();
  const [entitySwitchLoading, setEntitySwitchLoading] = useState(false);
  const [dimensionFilters, setDimensionFilters] = useState<FilterItemType[]>([]);
  const [dateInfo, setDateInfo] = useState<DateInfoType>({} as DateInfoType);
  const [entityInfo, setEntityInfo] = useState<EntityInfoType>({} as EntityInfoType);
  const [dataCache, setDataCache] = useState<Record<number, { tip: string; data?: MsgDataType }>>(
    {}
  );
  const [isParserError, setIsParseError] = useState<boolean>(false);

  const resetState = () => {
    setParseLoading(false);
    setParseTimeCost(undefined);
    setParseInfo(undefined);
    setParseInfoOptions([]);
    setParseTip('');
    setExecuteMode(false);
    setDimensionFilters([]);
    setData(undefined);
    setExecuteErrorMsg('');
    setDateInfo({} as DateInfoType);
    setEntityInfo({} as EntityInfoType);
    setDataCache({});
    setIsParseError(false);
  };

  const prefixCls = `${PREFIX_CLS}-item`;

  const updateData = (res: Result<MsgDataType>) => {
    let tip: string = '';
    let data: MsgDataType | undefined = undefined;
    const { queryColumns, queryResults, queryState, queryMode, response, chatContext, errorMsg } =
      res.data || {};
    setExecuteErrorMsg(errorMsg);
    if (res.code === 400 || res.code === 401 || res.code === 412) {
      tip = res.msg;
    } else if (res.code !== 200) {
      tip = SEARCH_EXCEPTION_TIP;
    } else if (queryState !== 'SUCCESS') {
      tip = response && typeof response === 'string' ? response : SEARCH_EXCEPTION_TIP;
    } else if (
      (queryColumns && queryColumns.length > 0 && queryResults) ||
      queryMode === 'WEB_PAGE' ||
      queryMode === 'WEB_SERVICE' ||
      queryMode === 'PLAIN_TEXT'
    ) {
      data = res.data;
      tip = '';
    }
    if (chatContext) {
      setDataCache({ ...dataCache, [chatContext!.id!]: { tip, data } });
    }
    if (data) {
      setData(data);
      setExecuteTip('');
      return true;
    }
    setExecuteTip(tip || SEARCH_EXCEPTION_TIP);
    return false;
  };

  const onExecute = async (
    parseInfoValue: ChatContextType,
    parseInfos?: ChatContextType[],
    isSwitchParseInfo?: boolean,
    isRefresh = false
  ) => {
    setExecuteMode(true);
    if (isSwitchParseInfo) {
      setEntitySwitchLoading(true);
    } else {
      setExecuteLoading(true);
    }
    try {
      const res: any = await chatExecute(msg, conversationId!, parseInfoValue, agentId);
      const valid = updateData(res);
      onMsgDataLoaded?.(
        {
          ...res.data,
          parseInfos,
          queryId: parseInfoValue.queryId,
        },
        valid,
        isRefresh
      );
    } catch (e) {
      const tip = SEARCH_EXCEPTION_TIP;
      setExecuteTip(SEARCH_EXCEPTION_TIP);
      setDataCache({ ...dataCache, [parseInfoValue!.id!]: { tip } });
    }
    if (isSwitchParseInfo) {
      setEntitySwitchLoading(false);
    } else {
      setExecuteLoading(false);
    }
  };

  const updateDimensionFitlers = (filters: FilterItemType[]) => {
    setDimensionFilters(
      filters.sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      })
    );
  };

  const sendMsg = async () => {
    setParseLoading(true);
    const parseData: any = await chatParse({
      queryText: msg,
      chatId: conversationId,
      modelId,
      agentId,
      filters: filter,
    });
    setParseLoading(false);
    const { code, data } = parseData || {};
    const { state, selectedParses, candidateParses, queryId, parseTimeCost, errorMsg } = data || {};
    const parses = selectedParses?.concat(candidateParses || []) || [];
    if (
      code !== 200 ||
      state === ParseStateEnum.FAILED ||
      !parses.length ||
      (!parses[0]?.properties?.type && !parses[0]?.queryMode)
    ) {
      setParseTip(state === ParseStateEnum.FAILED && errorMsg ? errorMsg : PARSE_ERROR_TIP);

      setParseInfo({ queryId } as any);
      return;
    }
    onUpdateMessageScroll?.();
    const parseInfos = parses.slice(0, 5).map((item: any) => ({
      ...item,
      queryId,
    }));

    setParseInfoOptions(parseInfos || []);
    const parseInfoValue = parseInfos[0];
    if (!(currentAgent?.enableFeedback === 1 && parseInfos.length > 1)) {
      setParseInfo(parseInfoValue);
    }
    setParseTimeCost(parseTimeCost);
    setEntityInfo(parseInfoValue.entityInfo || {});
    updateDimensionFitlers(parseInfoValue?.dimensionFilters || []);
    setDateInfo(parseInfoValue?.dateInfo);
    if (parseInfos.length === 1) {
      onExecute(parseInfoValue, parseInfos);
    }
  };

  const initChatItem = (msg, msgData) => {
    if (msgData) {
      const parseInfoOptionsValue =
        parseInfos && parseInfos.length > 0
          ? parseInfos.map(item => ({ ...item, queryId: msgData.queryId }))
          : [{ ...msgData.chatContext, queryId: msgData.queryId }];
      const parseInfoValue = parseInfoOptionsValue[0];
      setParseInfoOptions(parseInfoOptionsValue);
      setParseInfo(parseInfoValue);
      setParseTimeCost(parseTimeCostValue);
      updateDimensionFitlers(parseInfoValue.dimensionFilters || []);
      setDateInfo(parseInfoValue.dateInfo);
      setExecuteMode(true);
      updateData({ code: 200, data: msgData, msg: 'success' });
    } else if (msg) {
      sendMsg();
    }
  };

  useEffect(() => {
    if (data !== undefined || executeTip !== '' || parseLoading) {
      return;
    }
    initChatItem(msg, msgData);
  }, [msg, msgData]);

  const onSwitchEntity = async (entityId: string) => {
    setEntitySwitchLoading(true);
    const res = await switchEntity(entityId, data?.chatContext?.modelId, conversationId || 0);
    setEntitySwitchLoading(false);
    setData(res.data);
    const { chatContext, entityInfo } = res.data || {};
    const chatContextValue = { ...(chatContext || {}), queryId: parseInfo?.queryId };
    setParseInfo(chatContextValue);
    setEntityInfo(entityInfo);
    updateDimensionFitlers(chatContextValue?.dimensionFilters || []);
    setDateInfo(chatContextValue?.dateInfo);
    setDataCache({ ...dataCache, [chatContextValue.id!]: { tip: '', data: res.data } });
  };

  const onFiltersChange = (dimensionFilters: FilterItemType[]) => {
    setDimensionFilters(dimensionFilters);
  };

  const onDateInfoChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      const [start, end] = dates;
      setDateInfo({
        ...(dateInfo || {}),
        startDate: dayjs(start).format('YYYY-MM-DD'),
        endDate: dayjs(end).format('YYYY-MM-DD'),
        dateMode: 'BETWEEN',
        unit: 0,
      });
    }
  };

  const handlePresetClick = (range: RangeValue) => {
    setDateInfo({
      ...(dateInfo || {}),
      startDate: dayjs(range[0]).format('YYYY-MM-DD'),
      endDate: dayjs(range[1]).format('YYYY-MM-DD'),
      dateMode: 'BETWEEN',
      unit: 0,
    });
  };

  const onRefresh = async (parseInfoValue?: ChatContextType) => {
    setEntitySwitchLoading(true);
    const { dimensions, metrics, id, queryId } = parseInfoValue || parseInfo || {};
    const chatContextValue = {
      dimensions,
      metrics,
      dateInfo,
      dimensionFilters,
      parseId: id,
      queryId,
    };
    const res: any = await queryData(chatContextValue);
    setEntitySwitchLoading(false);
    if (res.code === 200) {
      const resChatContext = res.data?.chatContext;
      const contextValue = { ...(resChatContext || chatContextValue), queryId };
      const dataValue = {
        ...res.data,
        chatContext: contextValue,
        parseInfos: parseInfoOptions,
        queryId,
      };
      onMsgDataLoaded?.(dataValue, true, true);
      setData(dataValue);
      setParseInfo(contextValue);
      setDataCache({ ...dataCache, [id!]: { tip: '', data: dataValue } });
    }
  };

  const deleteQueryInfo = async (queryId: number) => {
    const { code, data } = await deleteQuery(queryId);
    if (code === 200) {
      resetState();
      initChatItem(msg, undefined);
    }
  };

  const onSelectParseInfo = async (parseInfoValue: ChatContextType) => {
    setParseInfo(parseInfoValue);
    updateDimensionFitlers(parseInfoValue.dimensionFilters || []);
    setDateInfo(parseInfoValue.dateInfo);
    if (parseInfoValue.entityInfo) {
      setEntityInfo(parseInfoValue.entityInfo);
    }
    if (dataCache[parseInfoValue.id!]) {
      const { tip, data } = dataCache[parseInfoValue.id!];
      setExecuteTip(tip);
      setData(data);
      onMsgDataLoaded?.(
        {
          ...(data as any),
          parseInfos,
          queryId: parseInfoValue.queryId,
        },
        true,
        true
      );
    } else {
      onExecute(parseInfoValue, parseInfoOptions, true);
    }
  };

  const onExpandSelectParseInfo = async (parseInfoValue: ChatContextType) => {
    setParseInfo(parseInfoValue);
    if (dataCache[parseInfoValue.id!]) {
      const { tip, data } = dataCache[parseInfoValue.id!];
      setExecuteTip(tip);
      setData(data);
      onMsgDataLoaded?.(
        {
          ...(data as any),
          parseInfos,
          queryId: parseInfoValue.queryId,
        },
        true,
        true
      );
    } else {
      const { id: parseId, queryId } = parseInfoValue;
      setExecuteMode(true);
      setEntitySwitchLoading(true);
      const { code, data }: any = await chatParse({
        queryText: msg,
        chatId: conversationId,
        modelId,
        agentId,
        filters: filter,
        parseId,
        queryId,
        parseInfo: parseInfoValue,
      });

      setEntitySwitchLoading(false);
      if (code === 200) {
        setParseTimeCost(data.parseTimeCost);
        const parseInfo = data.selectedParses[0];
        parseInfo.queryId = data.queryId;
        setParseInfoOptions([parseInfo]);
        setParseInfo(parseInfo);
        updateDimensionFitlers(parseInfo.dimensionFilters || []);
        setDateInfo(parseInfo.dateInfo);
        if (parseInfo.entityInfo) {
          setEntityInfo(parseInfo.entityInfo);
        }
        onExecute(parseInfo, [parseInfo], true, true);
      }
    }
  };

  const onExportData = () => {
    const { queryColumns, queryResults } = data || {};
    if (!!queryResults) {
      const exportData = queryResults.map(item => {
        return Object.keys(item).reduce((result, key) => {
          const columnName = queryColumns?.find(column => column.nameEn === key)?.name || key;
          result[columnName] = item[key];
          return result;
        }, {});
      });
      exportCsvFile(exportData);
    }
  };

  const onSelectQuestion = (question: SimilarQuestionType) => {
    onSendMsg?.(question.queryText);
  };

  const contentClass = classNames(`${prefixCls}-content`, {
    [`${prefixCls}-content-mobile`]: isMobile,
  });

  const { llmReq, llmResp } = parseInfo?.properties?.CONTEXT || {};

  return (
    <div className={prefixCls} key={parseInfo?.queryId}>
      {!isMobile && <IconFont type="icon-zhinengsuanfa" className={`${prefixCls}-avatar`} />}
      <div className={isMobile ? `${prefixCls}-mobile-msg-card` : ''}>
        <div className={`${prefixCls}-time`}>
          {parseTimeCost?.parseStartTime
            ? dayjs(parseTimeCost.parseStartTime).format('M月D日 HH:mm')
            : ''}
        </div>
        <div className={contentClass}>
          {!isSimpleMode && (
            <>
              {currentAgent?.enableFeedback === 1 && parseInfoOptions.length > 1 ? (
                <ExpandParseTip
                  parseLoading={parseLoading}
                  parseInfoOptions={parseInfoOptions}
                  parseTip={parseTip}
                  currentParseInfo={parseInfo}
                  agentId={agentId}
                  dimensionFilters={dimensionFilters}
                  dateInfo={dateInfo}
                  entityInfo={entityInfo}
                  integrateSystem={integrateSystem}
                  parseTimeCost={parseTimeCost?.parseTime}
                  isDeveloper={isDeveloper}
                  onSelectParseInfo={onExpandSelectParseInfo}
                  onSwitchEntity={onSwitchEntity}
                  onFiltersChange={onFiltersChange}
                  onDateInfoChange={onDateInfoChange}
                  onRefresh={onRefresh}
                  handlePresetClick={handlePresetClick}
                />
              ) : (
                <ParseTip
                  parseLoading={parseLoading}
                  parseInfoOptions={parseInfoOptions}
                  parseTip={parseTip}
                  currentParseInfo={parseInfo}
                  agentId={agentId}
                  dimensionFilters={dimensionFilters}
                  dateInfo={dateInfo}
                  entityInfo={entityInfo}
                  integrateSystem={integrateSystem}
                  parseTimeCost={parseTimeCost?.parseTime}
                  isDeveloper={isDeveloper}
                  onSelectParseInfo={onSelectParseInfo}
                  onSwitchEntity={onSwitchEntity}
                  onFiltersChange={onFiltersChange}
                  onDateInfoChange={onDateInfoChange}
                  onRefresh={() => {
                    onRefresh();
                  }}
                  handlePresetClick={handlePresetClick}
                />
              )}
            </>
          )}

          {executeMode && (
            <Spin spinning={entitySwitchLoading}>
              {!isMobile && parseInfo?.sqlInfo && isDeveloper && isDebugMode && !isSimpleMode && (
                <SqlItem
                  agentId={agentId}
                  queryId={parseInfo.queryId}
                  question={msg}
                  llmReq={llmReq}
                  llmResp={llmResp}
                  integrateSystem={integrateSystem}
                  queryMode={parseInfo.queryMode}
                  sqlInfo={parseInfo.sqlInfo}
                  sqlTimeCost={parseTimeCost?.sqlTime}
                  executeErrorMsg={executeErrorMsg}
                />
              )}
              <ExecuteItem
                isSimpleMode={isSimpleMode}
                queryId={parseInfo?.queryId}
                question={msg}
                queryMode={parseInfo?.queryMode}
                executeLoading={executeLoading}
                // entitySwitchLoading={entitySwitchLoading}
                executeTip={executeTip}
                chartIndex={0}
                data={data}
                triggerResize={triggerResize}
                executeItemNode={executeItemNode}
                isDeveloper={isDeveloper}
                renderCustomExecuteNode={renderCustomExecuteNode}
              />
            </Spin>
          )}
          {executeMode &&
            !executeLoading &&
            !isSimpleMode &&
            parseInfo?.queryMode !== 'PLAIN_TEXT' && (
              <SimilarQuestionItem
                queryId={parseInfo?.queryId}
                defaultExpanded={parseTip !== '' || executeTip !== ''}
                similarQueries={data?.similarQueries}
                onSelectQuestion={onSelectQuestion}
              />
            )}
        </div>
        {(parseTip !== '' || (executeMode && !executeLoading)) &&
          parseInfo?.queryMode !== 'PLAIN_TEXT' && (
            <Tools
              isLastMessage={isLastMessage}
              queryId={parseInfo?.queryId || 0}
              scoreValue={score}
              isParserError={isParserError}
              onExportData={() => {
                onExportData();
              }}
              onReExecute={queryId => {
                deleteQueryInfo(queryId);
              }}
            />
          )}
      </div>
    </div>
  );
};

export default ChatItem;
