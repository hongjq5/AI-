import { history } from '@umijs/max';
import { Button, Result } from 'antd';
import React from 'react';

const NoFoundPage: React.FC = () => (
  <Result
    status="404"
    title="404"
    subTitle="这个页面不存在，返回工作台继续分析数据。"
    extra={
      <Button type="primary" onClick={() => history.push('/')}>
        返回工作台
      </Button>
    }
  />
);

export default NoFoundPage;
