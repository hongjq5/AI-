import type { UploadFile, UploadProps } from 'antd';
import { message, Upload } from 'antd';
import type { UploadChangeParam } from 'antd/es/upload';

export type ChartFormValues = API.genChartByAiUsingPOSTParams & { file?: UploadFile[] };

export const normalizeUpload = (event: UploadChangeParam<UploadFile> | UploadFile[]) =>
  (Array.isArray(event) ? event : event?.fileList) ?? [];

export const getExcelFileError = (file?: Pick<File, 'name' | 'size'>) => {
  if (!file) return '请上传 Excel 文件';
  if (!/\.(xlsx|xls)$/i.test(file.name)) return '仅支持 xlsx、xls 格式的 Excel 文件';
  if (file.size === 0) return '文件不能为空';
  if (file.size > 1024 * 1024) return '文件大小不能超过 1MB';
  return undefined;
};

export const beforeExcelUpload: UploadProps['beforeUpload'] = (file) => {
  const error = getExcelFileError(file);
  if (error) {
    message.error(error);
    return Upload.LIST_IGNORE;
  }
  return false;
};
