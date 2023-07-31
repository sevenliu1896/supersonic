package com.tencent.supersonic.chat.service;

import com.tencent.supersonic.chat.api.pojo.request.QueryRequest;
import com.tencent.supersonic.chat.api.pojo.response.SearchResult;
import java.util.List;

/**
 * search service
 */
public interface SearchService {

    List<SearchResult> search(QueryRequest queryCtx);

}