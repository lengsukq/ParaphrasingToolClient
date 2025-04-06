declare module '@/lib/request' {
  export function post(url: string, data: any): Promise<any>;
  export function upload(url: string, data: any): Promise<any>;
}