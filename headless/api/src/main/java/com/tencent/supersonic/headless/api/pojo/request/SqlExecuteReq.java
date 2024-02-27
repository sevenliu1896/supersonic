package com.tencent.supersonic.headless.api.pojo.request;


import com.tencent.supersonic.headless.api.pojo.SqlVariable;
import lombok.Data;
import org.apache.commons.lang3.StringUtils;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.util.List;

@Data
public class SqlExecuteReq {
    public static final String LIMIT_WRAPPER = " SELECT * FROM ( %s ) a LIMIT 1000 ";

    @NotNull(message = "modelId can not be null")
    private Long id;

    @NotBlank(message = "sql can not be blank")
    private String sql;

    private List<SqlVariable> sqlVariables;

    public String getSql() {
        if (StringUtils.isNotBlank(sql) && sql.endsWith(";")) {
            sql = sql.substring(0, sql.length() - 1);
        }
        return String.format(LIMIT_WRAPPER, sql);
    }

}
