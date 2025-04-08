declare module '@/lib/request' {
  export function post(url: string, data: any): Promise<any>;
  export function upload(url: string, data: any): Promise<any>;
  export function openAIAct(api_key:any,base_url:any,model:any, prompt:any,content:any): Promise<any>;

}